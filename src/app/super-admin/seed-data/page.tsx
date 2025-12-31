'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, Check, AlertCircle } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  counts: {
    assets: number;
    subscriptions: number;
    suppliers: number;
  };
}

export default function SeedDataPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    results?: Record<string, { created?: number; updated?: number; skipped?: number }>;
    credentials?: { password: string; ceo: string; hr: string; finance: string };
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  async function fetchOrganizations() {
    try {
      const response = await fetch('/api/super-admin/seed-comprehensive');
      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function seedData() {
    if (!selectedOrg) return;

    setSeeding(true);
    setResult(null);

    try {
      const response = await fetch('/api/super-admin/seed-comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedOrg }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, ...data });
      } else {
        setResult({ success: false, error: data.error || 'Unknown error' });
      }
    } catch (error) {
      setResult({ success: false, error: String(error) });
    } finally {
      setSeeding(false);
    }
  }

  const selectedOrgData = organizations.find(o => o.id === selectedOrg);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Seed Comprehensive Test Data</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Organization</CardTitle>
          <CardDescription>
            Choose an organization to seed with comprehensive test data including employees, assets, subscriptions, projects, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading organizations...
            </div>
          ) : (
            <div className="space-y-4">
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedOrgData && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Current Data:</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Assets: {selectedOrgData.counts.assets}</Badge>
                    <Badge variant="outline">Subscriptions: {selectedOrgData.counts.subscriptions}</Badge>
                    <Badge variant="outline">Suppliers: {selectedOrgData.counts.suppliers}</Badge>
                  </div>
                </div>
              )}

              <Button
                onClick={seedData}
                disabled={!selectedOrg || seeding}
                className="w-full"
              >
                {seeding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Seeding Data...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Seed Comprehensive Test Data
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className={result.success ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  Seeding Complete
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Seeding Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                <p className="text-green-600">{result.message}</p>

                {result.results && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(result.results).map(([key, value]) => (
                      <div key={key} className="p-2 bg-muted rounded text-sm">
                        <span className="font-medium">{key}:</span>{' '}
                        {value.created || 0} created
                        {value.skipped ? `, ${value.skipped} skipped` : ''}
                      </div>
                    ))}
                  </div>
                )}

                {result.credentials && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium mb-2">Login Credentials</h4>
                    <p className="text-sm">Password for all users: <code className="bg-blue-100 px-1 rounded">{result.credentials.password}</code></p>
                    <div className="mt-2 text-sm space-y-1">
                      <p>CEO: <code className="bg-blue-100 px-1 rounded">{result.credentials.ceo}</code></p>
                      <p>HR: <code className="bg-blue-100 px-1 rounded">{result.credentials.hr}</code></p>
                      <p>Finance: <code className="bg-blue-100 px-1 rounded">{result.credentials.finance}</code></p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-600">{result.error}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>What This Seeds</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>15 employees with complete HR profiles (CEO, HR, Finance, Creative, Digital teams)</li>
            <li>7 leave types (Annual, Sick, Maternity, Paternity, Hajj, Compassionate, Unpaid)</li>
            <li>12+ leave requests (pending, approved, rejected, cancelled)</li>
            <li>15+ assets (MacBooks, monitors, tablets, cameras, phones)</li>
            <li>12+ subscriptions (Adobe, Figma, Slack, Microsoft 365, etc.)</li>
            <li>10+ suppliers with engagement history</li>
            <li>10+ projects (active, planning, completed)</li>
            <li>12+ purchase requests with line items</li>
            <li>Salary structures for all employees</li>
            <li>Company document types and documents</li>
            <li>Notifications and activity logs</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
