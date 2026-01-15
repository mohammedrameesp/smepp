'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User } from 'lucide-react';
import { LeaveRequestForm } from '@/features/leave/components';
import { getAnnualLeaveDetails } from '@/features/leave/lib/leave-utils';
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

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  hrProfile?: {
    dateOfJoining?: string | null;
    employeeId?: string | null;
    designation?: string | null;
  };
}

export default function AdminNewLeavePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [, setDateOfJoining] = useState<Date | null>(null);
  const [weekendDays, setWeekendDays] = useState<number[]>([5, 6]); // Default Friday-Saturday

  // Fetch employees and leave types on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [employeesRes, typesRes, orgRes] = await Promise.all([
          fetch('/api/users?includeHrProfile=true'),
          fetch('/api/leave/types'),
          fetch('/api/admin/organization'),
        ]);

        if (employeesRes.ok) {
          const data = await employeesRes.json();
          // Filter to show users who are employees (have hrProfile with correct tenant)
          // The API already filters hrProfile by tenantId
          const employeeList = (data.users || data || []).filter(
            (u: Employee) => u.hrProfile
          );
          setEmployees(employeeList);
        }

        if (typesRes.ok) {
          const data = await typesRes.json();
          setLeaveTypes(data.leaveTypes || []);
        }

        // Get organization's weekend days setting
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          if (orgData.organization?.weekendDays?.length > 0) {
            setWeekendDays(orgData.organization.weekendDays);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch balances when employee is selected
  useEffect(() => {
    if (!selectedEmployeeId) {
      setBalances([]);
      setDateOfJoining(null);
      return;
    }

    const fetchEmployeeData = async () => {
      setLoadingBalances(true);
      try {
        const currentYear = new Date().getFullYear();
        const balancesRes = await fetch(
          `/api/leave/balances?userId=${selectedEmployeeId}&year=${currentYear}&ps=100`
        );

        let balancesData: LeaveBalance[] = [];

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

        // Get the selected employee's date of joining
        const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
        const employeeDateOfJoining = selectedEmployee?.hrProfile?.dateOfJoining
          ? new Date(selectedEmployee.hrProfile.dateOfJoining)
          : null;
        setDateOfJoining(employeeDateOfJoining);

        // Add accrual info to balances for accrual-based leave types
        const now = new Date();
        const enrichedBalances = balancesData.map((balance: LeaveBalance) => {
          if (balance.leaveType.accrualBased) {
            if (employeeDateOfJoining) {
              const annualDetails = getAnnualLeaveDetails(employeeDateOfJoining, currentYear, now);
              return {
                ...balance,
                accrued: annualDetails.accrued,
              };
            } else {
              return {
                ...balance,
                accrued: 0,
              };
            }
          }
          return balance;
        });

        setBalances(enrichedBalances);
      } catch (error) {
        console.error('Failed to fetch employee data:', error);
      } finally {
        setLoadingBalances(false);
      }
    };

    fetchEmployeeData();
  }, [selectedEmployeeId, employees]);

  const handleSuccess = () => {
    router.push('/admin/leave/requests');
    router.refresh();
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  return (
    <>
      <PageHeader
        title="Create Leave Request"
        subtitle="Submit a leave request on behalf of an employee"
        breadcrumbs={[
          { label: 'Leave', href: '/admin/leave' },
          { label: 'Requests', href: '/admin/leave/requests' },
          { label: 'New' },
        ]}
      />
      <PageContent>
        <div className="max-w-2xl">
          {/* Employee Selector Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Select Employee
            </CardTitle>
            <CardDescription>
              Choose an employee to create a leave request for
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading employees...</span>
              </div>
            ) : (
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select an employee --</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name || employee.email}
                    {employee.hrProfile?.employeeId && ` (${employee.hrProfile.employeeId})`}
                    {employee.hrProfile?.designation && ` - ${employee.hrProfile.designation}`}
                  </option>
                ))}
              </select>
            )}
          </CardContent>
        </Card>

        {/* Leave Request Form Card */}
        {selectedEmployeeId && (
          <Card>
            <CardHeader>
              <CardTitle>Leave Request Form</CardTitle>
              <CardDescription>
                Creating leave request for{' '}
                <span className="font-medium text-gray-900">
                  {selectedEmployee?.name || selectedEmployee?.email}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBalances ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading leave balances...</span>
                </div>
              ) : balances.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No leave balances available for this employee.</p>
                  <p className="text-sm">Please set up their leave entitlements first.</p>
                </div>
              ) : (
                <LeaveRequestForm
                  leaveTypes={leaveTypes}
                  balances={balances}
                  onSuccess={handleSuccess}
                  isAdmin={true}
                  employeeId={selectedEmployeeId}
                  weekendDays={weekendDays}
                />
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </PageContent>
    </>
  );
}
