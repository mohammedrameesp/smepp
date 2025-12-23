import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role, PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { generateWPSSIFFile, getBankCode, generateWPSFileName, validateWPSRecord } from '@/lib/payroll/wps';
import { parseDecimal } from '@/lib/payroll/utils';
import type { WPSEmployeeRecord, WPSFileHeader } from '@/lib/types/payroll';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get payroll run with payslips
    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payslips: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    // Must be processed or paid to generate WPS
    if (payrollRun.status !== PayrollStatus.PROCESSED && payrollRun.status !== PayrollStatus.PAID) {
      return NextResponse.json({
        error: 'Payroll must be PROCESSED or PAID to generate WPS file',
        currentStatus: payrollRun.status,
      }, { status: 400 });
    }

    if (payrollRun.payslips.length === 0) {
      return NextResponse.json({
        error: 'No payslips found for this payroll run',
      }, { status: 400 });
    }

    // Get company settings for WPS
    const molIdSetting = await prisma.systemSettings.findUnique({
      where: { key: 'COMPANY_MOL_ID' },
    });

    const companyNameSetting = await prisma.systemSettings.findUnique({
      where: { key: 'COMPANY_NAME' },
    });

    const employerMolId = molIdSetting?.value || '0000000000';
    const employerName = companyNameSetting?.value || 'COMPANY NAME';

    // Build WPS records
    const wpsRecords: WPSEmployeeRecord[] = [];
    const validationErrors: Array<{ employee: string; errors: string[] }> = [];

    for (const payslip of payrollRun.payslips) {
      const record: WPSEmployeeRecord = {
        qidNumber: payslip.qidNumber || '',
        employeeName: payslip.user.name || 'UNKNOWN',
        bankCode: getBankCode(payslip.bankName || ''),
        iban: payslip.iban || '',
        basicSalary: parseDecimal(payslip.basicSalary),
        housingAllowance: parseDecimal(payslip.housingAllowance),
        otherAllowances:
          parseDecimal(payslip.transportAllowance) +
          parseDecimal(payslip.foodAllowance) +
          parseDecimal(payslip.phoneAllowance) +
          parseDecimal(payslip.otherAllowances),
        totalDeductions: parseDecimal(payslip.totalDeductions),
        netSalary: parseDecimal(payslip.netSalary),
      };

      const errors = validateWPSRecord(record);
      if (errors.length > 0) {
        validationErrors.push({
          employee: payslip.user.name || 'Unknown',
          errors,
        });
      } else {
        wpsRecords.push(record);
      }
    }

    // If ALL employees have invalid data, return error
    if (wpsRecords.length === 0) {
      return NextResponse.json({
        error: 'No employees have valid WPS data. Please update HR profiles with QID and bank details.',
        validationErrors,
        validRecords: 0,
        invalidRecords: validationErrors.length,
      }, { status: 400 });
    }

    // Log warning about skipped employees but continue with valid ones
    if (validationErrors.length > 0) {
      console.warn(`WPS: Skipping ${validationErrors.length} employees with invalid data:`, validationErrors);
    }

    // Calculate totals
    const totalAmount = wpsRecords.reduce((sum, r) => sum + r.netSalary, 0);

    // Build header
    const header: WPSFileHeader = {
      employerMolId,
      employerName,
      paymentMonth: payrollRun.month,
      paymentYear: payrollRun.year,
      paymentDate: new Date(),
      totalRecords: wpsRecords.length,
      totalAmount,
    };

    // Generate SIF file content
    const sifContent = generateWPSSIFFile(header, wpsRecords);
    const fileName = generateWPSFileName(employerMolId, payrollRun.year, payrollRun.month);

    // Update payroll run
    await prisma.$transaction(async (tx) => {
      await tx.payrollRun.update({
        where: { id },
        data: {
          wpsFileGenerated: true,
          wpsGeneratedAt: new Date(),
          // Store file content as base64 in URL field (for now)
          // In production, upload to storage and store URL
          wpsFileUrl: `data:text/plain;base64,${Buffer.from(sifContent).toString('base64')}`,
        },
      });

      await tx.payrollHistory.create({
        data: {
          payrollRunId: id,
          action: 'WPS_GENERATED',
          notes: `Generated WPS file: ${fileName} with ${wpsRecords.length} records`,
          performedById: session.user.id,
        },
      });
    });

    await logAction(
      session.user.id,
      ActivityActions.PAYROLL_WPS_GENERATED,
      'PayrollRun',
      id,
      {
        referenceNumber: payrollRun.referenceNumber,
        fileName,
        recordCount: wpsRecords.length,
        totalAmount,
      }
    );

    // Return file as download
    return new NextResponse(sifContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Filename': fileName,
      },
    });
  } catch (error) {
    console.error('WPS generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate WPS file' },
      { status: 500 }
    );
  }
}
