/**
 * @file leave-type-card.tsx
 * @description Card component for displaying leave type configuration with management actions
 * @module components/domains/hr
 */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

interface LeaveType {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  defaultDays: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  isPaid: boolean;
  isActive: boolean;
  maxConsecutiveDays?: number | null;
  minNoticeDays: number;
  allowCarryForward: boolean;
  maxCarryForwardDays?: number | null;
}

interface LeaveTypeCardProps {
  leaveType: LeaveType;
  onEdit?: (leaveType: LeaveType) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
}

export function LeaveTypeCard({ leaveType, onEdit, onDelete, onToggleActive }: LeaveTypeCardProps) {
  return (
    <Card className={!leaveType.isActive ? 'opacity-60' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: leaveType.color }}
            />
            <CardTitle className="text-lg">{leaveType.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            {onToggleActive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleActive(leaveType.id, !leaveType.isActive)}
                title={leaveType.isActive ? 'Deactivate' : 'Activate'}
              >
                {leaveType.isActive ? (
                  <ToggleRight className="h-4 w-4 text-green-600" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(leaveType)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(leaveType.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {leaveType.description && (
          <p className="text-sm text-gray-600 mb-3">{leaveType.description}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline">
            {leaveType.defaultDays} days
          </Badge>
          {leaveType.isPaid ? (
            <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>
          ) : (
            <Badge variant="outline" className="text-gray-600">Unpaid</Badge>
          )}
          {leaveType.requiresDocument && (
            <Badge variant="secondary">Document Required</Badge>
          )}
          {!leaveType.isActive && (
            <Badge variant="destructive">Inactive</Badge>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          {leaveType.minNoticeDays > 0 && (
            <p>Min notice: {leaveType.minNoticeDays} days</p>
          )}
          {leaveType.maxConsecutiveDays && (
            <p>Max consecutive: {leaveType.maxConsecutiveDays} days</p>
          )}
          {leaveType.allowCarryForward && leaveType.maxCarryForwardDays && (
            <p>Carry forward: up to {leaveType.maxCarryForwardDays} days</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
