/**
 * @file route.ts
 * @description Export employees to Excel with HR profile data
 * @module hr/employees
 */

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import {
  getExpiryStatus,
  calculateProfileCompletion,
  maskSensitiveData,
} from '@/lib/hr-utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// GET /api/employees/export - Export all employees to Excel
async function exportEmployeesHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  // Fetch all team members with employee data (tenant-scoped via extension)
  const employees = await db.teamMember.findMany({
    where: {
      isEmployee: true,
      isDeleted: false,
    },
    include: {
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
    // Calculate profile completion using shared utility (pass TeamMember data as HR-like object)
    const hrData = {
      dateOfBirth: emp.dateOfBirth,
      gender: emp.gender,
      nationality: emp.nationality,
      qatarMobile: emp.qatarMobile,
      qidNumber: emp.qidNumber,
      qidExpiry: emp.qidExpiry,
      passportNumber: emp.passportNumber,
      passportExpiry: emp.passportExpiry,
      healthCardExpiry: emp.healthCardExpiry,
      sponsorshipType: emp.sponsorshipType,
      dateOfJoining: emp.dateOfJoining,
      bankName: emp.bankName,
      iban: emp.iban,
    };
    const completion = calculateProfileCompletion(hrData);
    const profileStatusText = completion.isComplete
      ? 'Complete'
      : `${completion.percentage}% Incomplete`;

    const row = worksheet.addRow({
      employeeId: emp.employeeCode || '',
      name: emp.name || '',
      email: emp.email,
      role: emp.role,
      designation: emp.designation || '',
      dateOfBirth: formatDate(emp.dateOfBirth || null),
      gender: emp.gender || '',
      nationality: emp.nationality || '',
      qatarMobile: emp.qatarMobile ? `+974 ${emp.qatarMobile}` : '',
      personalEmail: emp.personalEmail || '',
      // Mask sensitive data for security
      qidNumber: maskSensitiveData(emp.qidNumber, 4),
      qidExpiry: formatDate(emp.qidExpiry || null),
      passportNumber: maskSensitiveData(emp.passportNumber, 4),
      passportExpiry: formatDate(emp.passportExpiry || null),
      healthCardExpiry: formatDate(emp.healthCardExpiry || null),
      sponsorshipType: emp.sponsorshipType || '',
      dateOfJoining: formatDate(emp.dateOfJoining || null),
      bankName: emp.bankName || '',
      iban: maskSensitiveData(emp.iban, 4),
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
    highlightExpiryCell('L', emp.qidExpiry);
    highlightExpiryCell('N', emp.passportExpiry);
    highlightExpiryCell('O', emp.healthCardExpiry);

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
}

export const GET = withErrorHandler(exportEmployeesHandler, { requireAdmin: true });
