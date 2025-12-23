import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import ExcelJS from 'exceljs';
import {
  getExpiryStatus,
  calculateProfileCompletion,
  maskSensitiveData,
  PROFILE_COMPLETION_THRESHOLD,
} from '@/lib/hr-utils';

// GET /api/employees/export - Export all employees to Excel
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can export employee data
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all employees with HR profiles
    const employees = await prisma.user.findMany({
      where: {
        isSystemAccount: false,
        role: {
          in: [Role.EMPLOYEE, Role.TEMP_STAFF, Role.ADMIN],
        },
      },
      include: {
        hrProfile: true,
        _count: {
          select: {
            assets: true,
            subscriptions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DAMP System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Employees', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    // Define columns (sensitive data columns are masked)
    worksheet.columns = [
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Nationality', key: 'nationality', width: 15 },
      { header: 'Qatar Mobile', key: 'qatarMobile', width: 15 },
      { header: 'Personal Email', key: 'personalEmail', width: 25 },
      { header: 'QID Number (Masked)', key: 'qidNumber', width: 18 },
      { header: 'QID Expiry', key: 'qidExpiry', width: 15 },
      { header: 'Passport Number (Masked)', key: 'passportNumber', width: 20 },
      { header: 'Passport Expiry', key: 'passportExpiry', width: 15 },
      { header: 'Health Card Expiry', key: 'healthCardExpiry', width: 18 },
      { header: 'Sponsorship Type', key: 'sponsorshipType', width: 15 },
      { header: 'Date of Joining', key: 'dateOfJoining', width: 15 },
      { header: 'Bank Name', key: 'bankName', width: 25 },
      { header: 'IBAN (Masked)', key: 'iban', width: 20 },
      { header: 'Assets Count', key: 'assetsCount', width: 12 },
      { header: 'Subscriptions Count', key: 'subscriptionsCount', width: 18 },
      { header: 'Profile Status', key: 'profileStatus', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF374151' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Helper function for date formatting
    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      return date.toISOString().split('T')[0];
    };

    // Add data rows
    employees.forEach((emp) => {
      const hr = emp.hrProfile;

      // Calculate profile completion using shared utility
      const completion = calculateProfileCompletion(hr);
      const profileStatusText = completion.isComplete
        ? 'Complete'
        : `${completion.percentage}% Incomplete`;

      const row = worksheet.addRow({
        employeeId: hr?.employeeId || '',
        name: emp.name || '',
        email: emp.email,
        role: emp.role,
        designation: hr?.designation || '',
        dateOfBirth: formatDate(hr?.dateOfBirth || null),
        gender: hr?.gender || '',
        nationality: hr?.nationality || '',
        qatarMobile: hr?.qatarMobile ? `+974 ${hr.qatarMobile}` : '',
        personalEmail: hr?.personalEmail || '',
        // Mask sensitive data for security
        qidNumber: maskSensitiveData(hr?.qidNumber, 4),
        qidExpiry: formatDate(hr?.qidExpiry || null),
        passportNumber: maskSensitiveData(hr?.passportNumber, 4),
        passportExpiry: formatDate(hr?.passportExpiry || null),
        healthCardExpiry: formatDate(hr?.healthCardExpiry || null),
        sponsorshipType: hr?.sponsorshipType || '',
        dateOfJoining: formatDate(hr?.dateOfJoining || null),
        bankName: hr?.bankName || '',
        iban: maskSensitiveData(hr?.iban, 4),
        assetsCount: emp._count.assets,
        subscriptionsCount: emp._count.subscriptions,
        profileStatus: profileStatusText,
        createdAt: emp.createdAt.toISOString(),
      });

      // Highlight expired/expiring cells
      const highlightExpiryCell = (cellLetter: string, date: Date | null) => {
        const status = getExpiryStatus(date);
        const cell = row.getCell(cellLetter);
        if (status === 'expired') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' },
          };
          cell.font = { color: { argb: 'FFDC2626' } };
        } else if (status === 'expiring') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF3C7' },
          };
          cell.font = { color: { argb: 'FFD97706' } };
        }
      };

      // Apply highlighting to expiry columns (L=QID, N=Passport, O=HealthCard)
      if (hr) {
        highlightExpiryCell('L', hr.qidExpiry);
        highlightExpiryCell('N', hr.passportExpiry);
        highlightExpiryCell('O', hr.healthCardExpiry);
      }

      // Highlight incomplete profiles (V=Profile Status column)
      if (!completion.isComplete) {
        const statusCell = row.getCell('V');
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' },
        };
        statusCell.font = { color: { argb: 'FFD97706' } };
      }
    });

    // Auto-filter for the data (23 columns now)
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: employees.length + 1, column: 23 },
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="employees-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export employees error:', error);
    return NextResponse.json(
      { error: 'Failed to export employees' },
      { status: 500 }
    );
  }
}
