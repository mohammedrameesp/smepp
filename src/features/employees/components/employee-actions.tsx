/**
 * @file employee-actions.tsx
 * @description Action buttons for employee list rows, providing navigation to employee details
 * @module components/domains/hr
 */
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EmployeeActionsProps {
  employeeId: string;
}

export function EmployeeActions({ employeeId }: EmployeeActionsProps) {
  return (
    <Link href={`/admin/employees/${employeeId}`}>
      <Button variant="outline" size="sm">
        View
      </Button>
    </Link>
  );
}
