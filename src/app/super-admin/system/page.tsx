/**
 * @module app/super-admin/system/page
 * @description Super admin system health monitoring page. Displays platform status,
 * service health indicators, resource usage metrics, and database statistics.
 * Shows real database counts (organizations, users, assets, employees, leave requests)
 * with simulated demo data for service metrics and quick actions.
 * Server component with dynamic rendering for real-time database access.
 */

import { prisma } from '@/lib/core/prisma';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ICON_SIZES } from '@/lib/constants';

// Prevent static pre-rendering (requires database)
export const dynamic = 'force-dynamic';

async function getSystemStats() {
  const [orgCount, userCount, assetCount, employeeCount, leaveRequestCount] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.asset.count(),
    prisma.teamMember.count({ where: { isEmployee: true } }),
    prisma.leaveRequest.count(),
  ]);

  return {
    organizations: orgCount,
    users: userCount,
    assets: assetCount,
    employees: employeeCount,
    leaveRequests: leaveRequestCount,
    dbSize: '45.2 MB', // Placeholder
  };
}

export default async function SystemHealthPage() {
  const stats = await getSystemStats();

  const services = [
    { name: 'API Server', status: 'operational', latency: '45ms', uptime: '99.99%' },
    { name: 'Database', status: 'operational', latency: '12ms', uptime: '99.95%' },
    { name: 'Authentication', status: 'operational', latency: '89ms', uptime: '99.99%' },
    { name: 'File Storage', status: 'operational', latency: '156ms', uptime: '99.90%' },
    { name: 'Email Service', status: 'operational', latency: '234ms', uptime: '99.85%' },
    { name: 'Background Jobs', status: 'operational', latency: '67ms', uptime: '99.92%' },
  ];

  const recentEvents = [
    { type: 'success', message: 'Database backup completed', time: '5 minutes ago' },
    { type: 'info', message: 'New organization registered: TechStart Inc', time: '15 minutes ago' },
    { type: 'success', message: 'SSL certificate renewed', time: '2 hours ago' },
    { type: 'warning', message: 'High API usage detected (Acme Corp)', time: '3 hours ago' },
    { type: 'success', message: 'System update applied successfully', time: '1 day ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
          <p className="text-slate-500 text-sm">Monitor platform performance and system status</p>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw className={ICON_SIZES.sm} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }} />
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white/90 text-[9px] font-medium px-1.5 py-0.5 rounded" title="Simulated data">
          <FlaskConical className={ICON_SIZES.xs} />
          DEMO
        </span>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <CheckCircle className={`${ICON_SIZES.xl} text-white`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">All Systems Operational</h2>
              <p className="text-white/80">All services are running smoothly</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">99.99%</p>
            <p className="text-white/80 text-sm">Overall Uptime</p>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="relative">
        <div className="absolute -top-2 right-0 z-10">
          <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-[9px] font-medium px-1.5 py-0.5 rounded" title="Simulated data">
            <FlaskConical className={ICON_SIZES.xs} />
            DEMO DATA
          </span>
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.name} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Server className={`${ICON_SIZES.md} text-slate-500`} />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">{service.name}</h3>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Operational
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-slate-400">Latency</p>
                <p className="font-medium text-slate-900">{service.latency}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">Uptime</p>
                <p className="font-medium text-emerald-600">{service.uptime}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Resource Usage */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden relative">
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-[9px] font-medium px-1.5 py-0.5 rounded z-10" title="Simulated data">
            <FlaskConical className={ICON_SIZES.xs} />
            DEMO
          </span>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Resource Usage</h2>
          </div>
          <div className="p-5 space-y-4">
            <ResourceBar label="CPU Usage" value={34} icon={Cpu} color="blue" />
            <ResourceBar label="Memory Usage" value={67} icon={HardDrive} color="purple" />
            <ResourceBar label="Storage" value={45} icon={Database} color="amber" />
            <ResourceBar label="Network I/O" value={23} icon={Wifi} color="emerald" />
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden relative">
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-[9px] font-medium px-1.5 py-0.5 rounded z-10" title="Simulated data">
            <FlaskConical className={ICON_SIZES.xs} />
            DEMO
          </span>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Events</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentEvents.map((event, index) => (
              <div key={index} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  event.type === 'success' ? 'bg-emerald-100' :
                  event.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                  {event.type === 'success' ? (
                    <CheckCircle className={`${ICON_SIZES.sm} text-emerald-600`} />
                  ) : event.type === 'warning' ? (
                    <AlertTriangle className={`${ICON_SIZES.sm} text-amber-600`} />
                  ) : (
                    <Activity className={`${ICON_SIZES.sm} text-blue-600`} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900">{event.message}</p>
                  <p className="text-xs text-slate-400">{event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Database Stats */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Database Statistics</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-900">{stats.organizations}</p>
              <p className="text-xs text-slate-500 mt-1">Organizations</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-900">{stats.users}</p>
              <p className="text-xs text-slate-500 mt-1">Users</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-900">{stats.assets}</p>
              <p className="text-xs text-slate-500 mt-1">Assets</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-900">{stats.employees}</p>
              <p className="text-xs text-slate-500 mt-1">Employees</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-900">{stats.leaveRequests}</p>
              <p className="text-xs text-slate-500 mt-1">Leave Requests</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl relative">
              <span className="absolute top-1 right-1 inline-flex items-center gap-0.5 bg-violet-100 text-violet-700 text-[8px] font-medium px-1 py-0.5 rounded" title="Simulated">
                <FlaskConical className={ICON_SIZES.xs} />
              </span>
              <p className="text-2xl font-bold text-slate-900">{stats.dbSize}</p>
              <p className="text-xs text-slate-500 mt-1">DB Size</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden relative">
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-[9px] font-medium px-1.5 py-0.5 rounded z-10" title="Not functional">
          <FlaskConical className={ICON_SIZES.xs} />
          DEMO
        </span>
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Quick Actions</h2>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <RefreshCw className={`${ICON_SIZES.md} text-blue-600`} />
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">Clear Cache</p>
              <p className="text-xs text-slate-500">Reset all cached data</p>
            </div>
          </button>
          <button className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Database className={`${ICON_SIZES.md} text-purple-600`} />
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">Backup Now</p>
              <p className="text-xs text-slate-500">Create manual backup</p>
            </div>
          </button>
          <button className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Zap className={`${ICON_SIZES.md} text-amber-600`} />
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">Run Jobs</p>
              <p className="text-xs text-slate-500">Trigger background jobs</p>
            </div>
          </button>
          <button className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Activity className={`${ICON_SIZES.md} text-emerald-600`} />
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">View Logs</p>
              <p className="text-xs text-slate-500">Application logs</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ResourceBar({
  label,
  value,
  icon: Icon,
  color
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const colors: Record<string, { bg: string; fill: string; text: string }> = {
    blue: { bg: 'bg-blue-100', fill: 'bg-blue-500', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-100', fill: 'bg-purple-500', text: 'text-purple-600' },
    amber: { bg: 'bg-amber-100', fill: 'bg-amber-500', text: 'text-amber-600' },
    emerald: { bg: 'bg-emerald-100', fill: 'bg-emerald-500', text: 'text-emerald-600' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`${ICON_SIZES.sm} ${c.text}`} />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className="text-sm font-medium text-slate-900">{value}%</span>
      </div>
      <div className={`h-2 rounded-full ${c.bg}`}>
        <div
          className={`h-full rounded-full ${c.fill} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/*
 * =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * File: src/app/super-admin/system/page.tsx
 * Type: Server Component - System Health Dashboard
 *
 * FUNCTIONALITY:
 * - Overall platform status with uptime indicator
 * - Service health cards with latency and uptime metrics (demo data)
 * - Resource usage bars (CPU, Memory, Storage, Network) (demo data)
 * - Recent system events timeline (demo data)
 * - Real database statistics (orgs, users, assets, employees, leave requests)
 * - Quick action buttons for admin operations (demo, non-functional)
 *
 * ARCHITECTURE:
 * - Server component with dynamic rendering (force-dynamic)
 * - Parallel database queries via Promise.all for efficiency
 * - ResourceBar helper component for consistent progress bar styling
 * - Demo badges clearly mark simulated vs real data
 *
 * DATA SOURCES:
 * [REAL] Database statistics from Prisma queries
 * [DEMO] Service status, latency, uptime - hardcoded demo values
 * [DEMO] Resource usage percentages - hardcoded demo values
 * [DEMO] Recent events - hardcoded demo values
 * [DEMO] Quick actions - non-functional placeholders
 *
 * IMPROVEMENTS SUGGESTED:
 * [HIGH] Implement real service health checks (API ping, DB connection test)
 * [HIGH] Connect quick actions to actual functionality
 * [MEDIUM] Add actual DB size query (pg_database_size or similar)
 * [MEDIUM] Implement real resource monitoring via hosting provider API
 * [LOW] Add auto-refresh for real-time updates
 * [LOW] Add historical trends/charts for metrics
 *
 * =============================================================================
 */
