/**
 * @file export-user-pdf-button.tsx
 * @description Button component for generating employee exit checklist PDF document
 * @module components/domains/system/users
 */
'use client';

import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/core/datetime';

interface Asset {
  id: string;
  model: string;
  assetTag: string | null;
  type: string;
  serial: string | null;
}

interface Subscription {
  id: string;
  serviceName: string;
  vendor: string | null;
  status: string;
}

interface UserExportData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  assets: Asset[];
  subscriptions: Subscription[];
  createdAt: string;
}

interface ExportUserPDFButtonProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export function ExportUserPDFButton({ userId, userName }: ExportUserPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch user data with assets and subscriptions
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user data');

      const user: UserExportData = await response.json();

      // Dynamically import jspdf to reduce initial bundle size
      const { default: jsPDF } = await import('jspdf');

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Exit Checklist', pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${formatDateTime(new Date())}`, pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Employee Information
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Information', 20, y);
      y += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${user.name || 'N/A'}`, 20, y);
      y += 6;
      doc.text(`Email: ${user.email}`, 20, y);
      y += 6;
      doc.text(`Role: ${user.role}`, 20, y);
      y += 6;
      doc.text(`Employee Since: ${formatDate(user.createdAt)}`, 20, y);
      y += 12;

      // Assets Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Assigned Assets (${user.assets.length})`, 20, y);
      y += 8;

      if (user.assets.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        user.assets.forEach((asset, index) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          doc.text(`${index + 1}. ${asset.model}`, 25, y);
          y += 5;
          doc.text(`   Type: ${asset.type}`, 25, y);
          y += 5;
          if (asset.assetTag) {
            doc.text(`   Asset Tag: ${asset.assetTag}`, 25, y);
            y += 5;
          }
          if (asset.serial) {
            doc.text(`   Serial: ${asset.serial}`, 25, y);
            y += 5;
          }

          // Checkbox for return
          doc.rect(25, y - 3, 3, 3);
          doc.text('Returned', 30, y);
          y += 5;

          // Checkbox for verification
          doc.rect(25, y - 3, 3, 3);
          doc.text('Verified', 30, y);
          y += 8;
        });
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No assets assigned', 25, y);
        y += 10;
      }

      // Subscriptions Section
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Active Subscriptions (${user.subscriptions.filter(s => s.status === 'ACTIVE').length})`, 20, y);
      y += 8;

      const activeSubscriptions = user.subscriptions.filter(s => s.status === 'ACTIVE');

      if (activeSubscriptions.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        activeSubscriptions.forEach((sub, index) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          doc.text(`${index + 1}. ${sub.serviceName}`, 25, y);
          y += 5;
          if (sub.vendor) {
            doc.text(`   Vendor: ${sub.vendor}`, 25, y);
            y += 5;
          }

          // Checkbox for cancellation
          doc.rect(25, y - 3, 3, 3);
          doc.text('Cancelled/Transferred', 30, y);
          y += 5;

          // Checkbox for verification
          doc.rect(25, y - 3, 3, 3);
          doc.text('Verified', 30, y);
          y += 8;
        });
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No active subscriptions', 25, y);
        y += 10;
      }

      // Exit Process Checklist
      if (y > 200) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Exit Process Checklist', 20, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const checklistItems = [
        'All company assets returned',
        'All subscriptions cancelled or transferred',
        'Access credentials revoked',
        'Email account deactivated',
        'Company data backed up/transferred',
        'Exit interview completed',
        'Final documents signed',
      ];

      checklistItems.forEach((item) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.rect(25, y - 3, 3, 3);
        doc.text(item, 30, y);
        y += 7;
      });

      // Signatures
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      y += 15;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');

      // Employee signature
      doc.line(20, y, 90, y);
      y += 5;
      doc.text('Employee Signature', 20, y);
      y += 3;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Date:', 20, y);
      y += 15;

      // Manager signature
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.line(20, y, 90, y);
      y += 5;
      doc.text('Manager Signature', 20, y);
      y += 3;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Date:', 20, y);

      // HR signature
      y -= 40;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.line(pageWidth - 90, y, pageWidth - 20, y);
      y += 5;
      doc.text('HR Representative', pageWidth - 90, y);
      y += 3;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Date:', pageWidth - 90, y);

      // Save PDF
      const filename = `Exit_Checklist_${userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Export Exit Checklist
        </>
      )}
    </Button>
  );
}
