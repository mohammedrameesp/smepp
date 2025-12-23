'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { calculateRemainingBalance } from '@/lib/leave-utils';

interface LeaveBalance {
  id: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  entitlement: number | string;
  used: number | string;
  pending: number | string;
  carriedForward: number | string;
  adjustment: number | string;
  leaveType: {
    id: string;
    name: string;
    color: string;
    isPaid?: boolean;
    accrualBased?: boolean;
  };
  // Accrual information (optional, for accrual-based leave types)
  accrued?: number;
  annualEntitlement?: number;
  monthsWorked?: number;
}

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
  showDetails?: boolean;
}

export function LeaveBalanceCard({ balance, showDetails = true }: LeaveBalanceCardProps) {
  const entitlement = Number(balance.entitlement);
  const used = Number(balance.used);
  const pending = Number(balance.pending);
  const carriedForward = Number(balance.carriedForward);
  const adjustment = Number(balance.adjustment);

  // For accrual-based leave types, use accrued amount instead of full entitlement
  const isAccrualBased = balance.leaveType.accrualBased && balance.accrued !== undefined;
  const effectiveEntitlement = isAccrualBased ? balance.accrued! : entitlement;
  const annualEntitlement = balance.annualEntitlement || entitlement;

  const totalAvailable = effectiveEntitlement + carriedForward + adjustment;
  const remaining = calculateRemainingBalance(effectiveEntitlement, used, pending, carriedForward, adjustment);
  const usedPercentage = totalAvailable > 0 ? ((used + pending) / totalAvailable) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: balance.leaveType.color }}
            />
            <CardTitle className="text-base">{balance.leaveType.name}</CardTitle>
          </div>
          {isAccrualBased && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Accrual
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-3xl font-bold">{remaining.toFixed(1)}</span>
              <span className="text-gray-500 text-sm ml-1">/ {totalAvailable.toFixed(1)}</span>
            </div>
            <span className="text-sm text-gray-500">days remaining</span>
          </div>

          <Progress value={usedPercentage} className="h-2" />

          {showDetails && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {isAccrualBased ? (
                <>
                  <div className="flex justify-between col-span-2 bg-blue-50 p-2 rounded">
                    <span className="text-blue-700">Accrued ({balance.monthsWorked || 0} months)</span>
                    <span className="font-medium text-blue-700">{effectiveEntitlement.toFixed(1)} / {annualEntitlement}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Annual Entitlement</span>
                    <span className="font-medium">{annualEntitlement}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-gray-500">Entitlement</span>
                  <span className="font-medium">{entitlement}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Used</span>
                <span className="font-medium text-red-600">{used}</span>
              </div>
              {carriedForward > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Carried Forward</span>
                  <span className="font-medium text-blue-600">+{carriedForward}</span>
                </div>
              )}
              {adjustment !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Adjustment</span>
                  <span className={`font-medium ${adjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {adjustment >= 0 ? '+' : ''}{adjustment}
                  </span>
                </div>
              )}
              {pending > 0 && (
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-500">Pending</span>
                  <span className="font-medium text-amber-600">{pending}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
