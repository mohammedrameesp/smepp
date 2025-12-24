'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Shield,
  TrendingUp,
  Activity,
  UserPlus,
  ArrowUp,
  Building2,
  CreditCard,
  XCircle,
  Lock,
  AlertTriangle,
  KeyRound,
  Mail,
  MessageCircle,
  Smartphone,
  Bell,
  Server,
  Database,
  ListTodo,
  Bug,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type TabType = 'overview' | 'communication' | 'security' | 'engagement' | 'health';

interface DashboardTabsProps {
  stats: {
    orgCount: number;
    userCount: number;
    pendingInvites: number;
  };
}

export function DashboardTabs({ stats }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'engagement', label: 'Engagement', icon: TrendingUp },
    { id: 'health', label: 'System Health', icon: Activity },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
                  activeTab === tab.id
                    ? 'text-slate-900 border-slate-900'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'communication' && <CommunicationTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'engagement' && <EngagementTab />}
        {activeTab === 'health' && <HealthTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Recent Activity */}
      <div className="col-span-2">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <ActivityItem
            icon={UserPlus}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            title="New user"
            description="joined Acme Corp"
            detail="john@acme.com"
            time="Just now"
          />
          <ActivityItem
            icon={ArrowUp}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            title="TechStart"
            description="upgraded to Professional"
            detail="+$70/mo MRR"
            time="5 min ago"
          />
          <ActivityItem
            icon={Building2}
            iconBg="bg-cyan-100"
            iconColor="text-cyan-600"
            title="New organization"
            description="CloudSync Ltd"
            detail="Free tier"
            time="18 min ago"
          />
          <ActivityItem
            icon={CreditCard}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            title="Payment"
            description="received from Acme Corp"
            detail="$499.00"
            time="32 min ago"
          />
        </div>
      </div>

      {/* Quick Stats & Alerts */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Stats</h3>
        <div className="space-y-3">
          <QuickStatBar label="Emails Today" value={156} percentage={65} color="bg-indigo-500" />
          <QuickStatBar label="2FA Adoption" value="78%" percentage={78} color="bg-green-500" />
          <QuickStatBar label="DAU" value={89} percentage={29} color="bg-cyan-500" />
        </div>

        <h3 className="text-sm font-semibold text-slate-900 mt-6 mb-4">Alerts</h3>
        <div className="space-y-2">
          <AlertItem
            type="error"
            title="Payment failed"
            detail="TechStart Inc"
          />
          <AlertItem
            type="warning"
            title="5 trials expiring"
            detail="Within 3 days"
          />
        </div>
      </div>
    </div>
  );
}

function CommunicationTab() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Messages Sent Today</h3>
        <div className="space-y-4">
          <MessageStatCard
            icon={Mail}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            title="Emails"
            description="Invites, notifications, alerts"
            count={156}
            trend="+12% vs yesterday"
            trendUp={true}
          />
          <MessageStatCard
            icon={MessageCircle}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            title="WhatsApp"
            description="Business messages"
            count={89}
            trend="+8% vs yesterday"
            trendUp={true}
          />
          <MessageStatCard
            icon={Smartphone}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            title="SMS"
            description="OTP, alerts"
            count={34}
            trend="Same as yesterday"
            trendUp={null}
          />
          <MessageStatCard
            icon={Bell}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            title="Push Notifications"
            description="Mobile & web"
            count={203}
            trend="+15% vs yesterday"
            trendUp={true}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Delivery Performance</h3>
        <div className="bg-slate-50 rounded-xl p-6">
          <div className="text-center mb-6">
            <p className="text-5xl font-bold text-green-600">98.5%</p>
            <p className="text-sm text-slate-500 mt-2">Overall Delivery Success Rate</p>
          </div>
          <div className="space-y-3">
            <DeliveryRate channel="Email" rate="99.2%" />
            <DeliveryRate channel="WhatsApp" rate="98.8%" />
            <DeliveryRate channel="SMS" rate="97.1%" />
            <DeliveryRate channel="Push" rate="98.9%" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SecurityStatCard
          icon={XCircle}
          iconColor="text-red-500"
          label="Failed Logins"
          value={12}
          trend="+3 from yesterday"
          trendColor="text-red-500"
        />
        <SecurityStatCard
          icon={Lock}
          iconColor="text-green-500"
          label="2FA Adoption"
          value="78%"
          trend="+5% this week"
          trendColor="text-green-500"
        />
        <SecurityStatCard
          icon={AlertTriangle}
          iconColor="text-amber-500"
          label="Active Alerts"
          value={2}
          trend="Action required"
          trendColor="text-amber-500"
        />
        <SecurityStatCard
          icon={KeyRound}
          iconColor="text-blue-500"
          label="Password Resets"
          value={5}
          trend="Normal rate"
          trendColor="text-slate-400"
        />
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent Security Events</h3>
      <div className="bg-slate-50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Event</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Organization</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <SecurityEventRow
              type="failed"
              event="Failed login"
              user="unknown@test.com"
              org="-"
              time="45 min ago"
            />
            <SecurityEventRow
              type="success"
              event="2FA enabled"
              user="admin@techstart.io"
              org="TechStart"
              time="1 hour ago"
            />
            <SecurityEventRow
              type="info"
              event="Password reset"
              user="john@acme.com"
              org="Acme Corp"
              time="2 hours ago"
            />
          </tbody>
        </table>
      </div>
    </>
  );
}

function EngagementTab() {
  return (
    <>
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
          <p className="text-blue-100 text-sm">Daily Active Users</p>
          <p className="text-4xl font-bold mt-2">89</p>
          <p className="text-blue-200 text-sm mt-2">
            <ArrowUp className="h-3 w-3 inline mr-1" />+12% vs last week
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
          <p className="text-emerald-100 text-sm">Weekly Active Users</p>
          <p className="text-4xl font-bold mt-2">234</p>
          <p className="text-emerald-200 text-sm mt-2">
            <ArrowUp className="h-3 w-3 inline mr-1" />+8% vs last week
          </p>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-6 text-white">
          <p className="text-violet-100 text-sm">Monthly Active Users</p>
          <p className="text-4xl font-bold mt-2">298</p>
          <p className="text-violet-200 text-sm mt-2">
            <ArrowUp className="h-3 w-3 inline mr-1" />+15% vs last month
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Feature Adoption</h3>
          <div className="space-y-4">
            <FeatureAdoptionBar label="Assets Module" percentage={89} color="bg-blue-500" />
            <FeatureAdoptionBar label="Employees Module" percentage={72} color="bg-emerald-500" />
            <FeatureAdoptionBar label="Leave Management" percentage={56} color="bg-amber-500" />
            <FeatureAdoptionBar label="Payroll" percentage={34} color="bg-purple-500" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">User Segments</h3>
          <div className="space-y-3">
            <UserSegmentRow color="bg-green-500" label="Power Users (daily)" count={23} />
            <UserSegmentRow color="bg-blue-500" label="Regular Users (weekly)" count={145} />
            <UserSegmentRow color="bg-amber-500" label="Dormant (30+ days)" count={14} warning />
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Desktop vs Mobile</span>
              <span className="text-sm font-medium">77% / 23%</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function HealthTab() {
  return (
    <>
      <div className="grid grid-cols-5 gap-4 mb-6">
        <HealthStatusCard icon={Server} label="API" status="ok" detail="45ms" />
        <HealthStatusCard icon={Database} label="Database" status="ok" detail="12 connections" />
        <HealthStatusCard icon={ListTodo} label="Jobs" status="ok" detail="3 queued" />
        <HealthStatusCard icon={Bug} label="Errors" status="ok" detail="0.02%" />
        <HealthStatusCard icon={Clock} label="Uptime" status="ok" detail="99.99%" />
      </div>

      <div className="bg-slate-50 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Response Time (Last 24h)</h3>
        <div className="h-32 flex items-end gap-1">
          {[45, 52, 48, 55, 42, 50, 65, 58, 45, 52, 48, 45].map((height, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-t',
                i === 11 ? 'bg-green-500' : 'bg-green-200'
              )}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>Now</span>
        </div>
      </div>
    </>
  );
}

// Helper Components
function ActivityItem({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  detail,
  time,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  detail: string;
  time: string;
}) {
  return (
    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconBg)}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-900">
          <span className="font-medium">{title}</span> {description}
        </p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      <span className="text-xs text-slate-400">{time}</span>
    </div>
  );
}

function QuickStatBar({
  label,
  value,
  percentage,
  color,
}: {
  label: string;
  value: string | number;
  percentage: number;
  color: string;
}) {
  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-lg font-bold text-slate-900">{value}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div className={cn('h-1.5 rounded-full', color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function AlertItem({
  type,
  title,
  detail,
}: {
  type: 'error' | 'warning';
  title: string;
  detail: string;
}) {
  const bgColor = type === 'error' ? 'bg-red-50' : 'bg-amber-50';
  const iconColor = type === 'error' ? 'text-red-500' : 'text-amber-500';
  const titleColor = type === 'error' ? 'text-red-700' : 'text-amber-700';
  const detailColor = type === 'error' ? 'text-red-500' : 'text-amber-500';
  const Icon = type === 'error' ? XCircle : Clock;

  return (
    <div className={cn('flex items-start gap-2 p-3 rounded-lg', bgColor)}>
      <Icon className={cn('h-4 w-4 mt-0.5', iconColor)} />
      <div>
        <p className={cn('text-sm font-medium', titleColor)}>{title}</p>
        <p className={cn('text-xs', detailColor)}>{detail}</p>
      </div>
    </div>
  );
}

function MessageStatCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  count,
  trend,
  trendUp,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  count: number;
  trend: string;
  trendUp: boolean | null;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <div>
          <p className="font-medium text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-slate-900">{count}</p>
        <p className={cn('text-xs', trendUp === true ? 'text-green-600' : trendUp === false ? 'text-red-600' : 'text-slate-500')}>
          {trend}
        </p>
      </div>
    </div>
  );
}

function DeliveryRate({ channel, rate }: { channel: string; rate: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{channel}</span>
      <span className="text-sm font-medium text-slate-900">{rate}</span>
    </div>
  );
}

function SecurityStatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  trend,
  trendColor,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: string | number;
  trend: string;
  trendColor: string;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-4 w-4', iconColor)} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className={cn('text-xs mt-1', trendColor)}>{trend}</p>
    </div>
  );
}

function SecurityEventRow({
  type,
  event,
  user,
  org,
  time,
}: {
  type: 'failed' | 'success' | 'info';
  event: string;
  user: string;
  org: string;
  time: string;
}) {
  const colors = {
    failed: 'text-red-600',
    success: 'text-green-600',
    info: 'text-blue-600',
  };
  const icons = {
    failed: XCircle,
    success: Shield,
    info: KeyRound,
  };
  const Icon = icons[type];

  return (
    <tr>
      <td className="px-4 py-3">
        <span className={cn('flex items-center gap-2', colors[type])}>
          <Icon className="h-4 w-4" />
          {event}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">{user}</td>
      <td className="px-4 py-3 text-slate-600">{org}</td>
      <td className="px-4 py-3 text-slate-400">{time}</td>
    </tr>
  );
}

function FeatureAdoptionBar({
  label,
  percentage,
  color,
}: {
  label: string;
  percentage: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-medium text-slate-900">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className={cn('h-2 rounded-full', color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function UserSegmentRow({
  color,
  label,
  count,
  warning,
}: {
  color: string;
  label: string;
  count: number;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={cn('w-3 h-3 rounded-full', color)} />
        <span className="text-sm text-slate-700">{label}</span>
      </div>
      <span className={cn('font-medium', warning ? 'text-amber-600' : 'text-slate-900')}>{count}</span>
    </div>
  );
}

function HealthStatusCard({
  icon: Icon,
  label,
  status,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  status: 'ok' | 'warning' | 'error';
  detail: string;
}) {
  const statusColors = {
    ok: 'bg-green-50 border-green-200 text-green-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-600',
    error: 'bg-red-50 border-red-200 text-red-600',
  };

  return (
    <div className={cn('border rounded-xl p-4 text-center', statusColors[status])}>
      <Icon className="h-6 w-6 mx-auto mb-2" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs mt-1">{detail}</p>
    </div>
  );
}
