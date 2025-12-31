'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { LeaveRequestForm } from '@/components/domains/hr/leave';
import { getAnnualLeaveDetails } from '@/lib/leave-utils';

interface LeaveType {
  id: string;
  name: string;
  color: string;
  requiresDocument: boolean;
  minNoticeDays: number;
  maxConsecutiveDays?: number | null;
  isPaid?: boolean;
  accrualBased?: boolean;
}

interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  entitlement: number;
  used: number;
  pending: number;
  carriedForward: number;
  adjustment: number;
  leaveType: {
    id: string;
    name: string;
    color: string;
    isPaid?: boolean;
    accrualBased?: boolean;
  };
  accrued?: number;
}

interface HRProfile {
  dateOfJoining?: string | null;
}

export default function EmployeeNewLeavePage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentYear = new Date().getFullYear();

        // Fetch leave types, balances, and user profile in parallel
        const [typesRes, balancesRes, profileRes] = await Promise.all([
          fetch('/api/leave/types'),
          fetch(`/api/leave/balances?year=${currentYear}&ps=100`),
          fetch('/api/users/me'),
        ]);

        let leaveTypesData: LeaveType[] = [];
        let balancesData: LeaveBalance[] = [];
        let dateOfJoining: Date | null = null;

        if (typesRes.ok) {
          const data = await typesRes.json();
          leaveTypesData = data.leaveTypes || [];
        }

        if (balancesRes.ok) {
          const data = await balancesRes.json();
          balancesData = (data.balances || []).map((b: LeaveBalance) => ({
            ...b,
            entitlement: Number(b.entitlement),
            used: Number(b.used),
            pending: Number(b.pending),
            carriedForward: Number(b.carriedForward),
            adjustment: Number(b.adjustment),
          }));
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.hrProfile?.dateOfJoining) {
            dateOfJoining = new Date(profileData.hrProfile.dateOfJoining);
          }
          // Check if user is admin
          if (profileData.role === 'ADMIN') {
            setIsAdmin(true);
          }
        }

        // Add accrual info to balances for accrual-based leave types
        const now = new Date();
        const enrichedBalances = balancesData.map((balance: LeaveBalance) => {
          if (balance.leaveType.accrualBased) {
            if (dateOfJoining) {
              const annualDetails = getAnnualLeaveDetails(dateOfJoining, currentYear, now);
              return {
                ...balance,
                accrued: annualDetails.accrued,
              };
            } else {
              // No date of joining - set accrued to 0 to prevent over-requesting
              return {
                ...balance,
                accrued: 0,
              };
            }
          }
          return balance;
        });

        setLeaveTypes(leaveTypesData);
        setBalances(enrichedBalances);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSuccess = () => {
    router.push('/employee/leave');
    router.refresh();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/employee/leave">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Leave
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Leave</h1>
          <p className="text-gray-600">
            Submit a new leave request for approval
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leave Request Form</CardTitle>
            <CardDescription>
              Fill in the details below. Your request will be sent for approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : balances.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">No leave balances available.</p>
                <p className="text-sm">Please contact HR to set up your leave entitlements.</p>
              </div>
            ) : (
              <LeaveRequestForm
                leaveTypes={leaveTypes}
                balances={balances}
                onSuccess={handleSuccess}
                isAdmin={isAdmin}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
