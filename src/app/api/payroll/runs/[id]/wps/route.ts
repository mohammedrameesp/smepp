/**
 * @file route.ts
 * @description Generate WPS (Wage Protection System) SIF file for payroll run
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse, notFoundResponse } from '@/lib/http/errors';
import logger from '@/lib/core/log';
import { generateWPSSIFFile, getBankCode, generateWPSFileName, validateWPSRecord } from '@/features/payroll/lib/wps';
import { parseDecimal } from '@/features/payroll/lib/utils';
import type { WPSEmployeeRecord, WPSFileHeader } from '@/features/payroll/types/payroll';

export const POST = withErrorHandler(async (request: NextRequest, { tenant, params }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;
  const id = params?.id;

  if (!id) {
    return badRequestResponse('Payroll run ID is required');
  }

  // Use findFirst with tenantId to prevent cross-tenant access
  const payrollRun = await prisma.payrollRun.findFirst({
    where: { id, tenantId },
    include: {
      payslips: {
        include: {
          member: {
            select: {
              name: true,
              isOnWps: true,
            },
          },
        },
      },
    },
  });

  if (!payrollRun) {
    return notFoundResponse('Payroll run not found');
  }

  // Must be processed or paid to generate WPS
  if (payrollRun.status !== PayrollStatus.PROCESSED && payrollRun.status !== PayrollStatus.PAID) {
    return badRequestResponse(`Payroll must be PROCESSED or PAID to generate WPS file. Current status: ${payrollRun.status}`);
  }

  // Filter payslips to only include WPS employees
  const wpsPayslips = payrollRun.payslips.filter(p => p.member.isOnWps !== false);

  if (wpsPayslips.length === 0) {
    return NextResponse.json({
      error: 'No WPS employees found for this payroll run. Check if employees have "On WPS" enabled.',
    }, { status: 400 });
  }

  // Get company settings for WPS (tenant-scoped)
  const molIdSetting = await prisma.systemSettings.findUnique({
    where: {
      tenantId_key: { tenantId, key: 'COMPANY_MOL_ID' },
    },
  });

  const companyNameSetting = await prisma.systemSettings.findUnique({
    where: {
      tenantId_key: { tenantId, key: 'COMPANY_NAME' },
    },
  });

  const employerMolId = molIdSetting?.value || '0000000000';
  const employerName = companyNameSetting?.value || 'COMPANY NAME';

  // Build WPS records (only from WPS-enabled employees)
  const wpsRecords: WPSEmployeeRecord[] = [];
  const validationErrors: Array<{ employee: string; errors: string[] }> = [];

  for (const payslip of wpsPayslips) {
    const record: WPSEmployeeRecord = {
      qidNumber: payslip.qidNumber || '',
      employeeName: payslip.member.name || 'UNKNOWN',
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
        employee: payslip.member.name || 'Unknown',
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

  // WPS-001: If some employees have invalid data, require explicit override
  if (validationErrors.length > 0) {
    const forcePartial = request.nextUrl.searchParams.get('forcePartial') === 'true';

    if (!forcePartial) {
      // Return error requiring confirmation to proceed with partial data
      return NextResponse.json({
        error: 'Some employees have invalid WPS data and will be excluded from the file.',
        requiresConfirmation: true,
        validationErrors,
        validRecords: wpsRecords.length,
        invalidRecords: validationErrors.length,
        message: `${validationErrors.length} employee(s) will be excluded. Add ?forcePartial=true to proceed anyway.`,
      }, { status: 400 });
    }
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
        performedById: userId,
      },
    });
  });

  await logAction(
    tenantId,
    userId,
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
}, { requireAuth: true, requireAdmin: true, requireFinanceAccess: true, requireModule: 'payroll' });
