'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, User } from 'lucide-react';
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
  const [dateOfJoining, setDateOfJoining] = useState<Date | null>(null);

  // Fetch employees and leave types on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [employeesRes, typesRes] = await Promise.all([
          fetch('/api/users?includeHrProfile=true'),
          fetch('/api/leave/types'),
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
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/leave/requests">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leave Requests
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Leave Request</h1>
          <p className="text-gray-600">
            Submit a leave request on behalf of an employee
          </p>
        </div>

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
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
