'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, FileEdit } from 'lucide-react';
import Link from 'next/link';
import { LeaveRequestForm } from '@/features/leave/components';
import { getAnnualLeaveDetails } from '@/lib/leave-utils';
import { PageHeader, PageContent } from '@/components/ui/page-header';

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
    <>
      <PageHeader
        title="Request Leave"
        subtitle="Submit a new leave request for approval"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'My Leave', href: '/employee/leave' },
          { label: 'New Request' }
        ]}
        actions={
          <Link href="/employee/leave">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Leave
            </Button>
          </Link>
        }
      />

      <PageContent className="max-w-2xl">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileEdit className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Leave Request Form</h2>
              <p className="text-sm text-slate-500">Fill in the details below. Your request will be sent for approval.</p>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : balances.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-900 font-medium mb-2">No leave balances available.</p>
                <p className="text-sm text-slate-500">Please contact HR to set up your leave entitlements.</p>
              </div>
            ) : (
              <LeaveRequestForm
                leaveTypes={leaveTypes}
                balances={balances}
                onSuccess={handleSuccess}
                isAdmin={isAdmin}
              />
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}
