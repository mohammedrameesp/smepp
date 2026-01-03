import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { AlertsClient } from './client';

export const metadata: Metadata = {
  title: 'Alerts | Durj',
  description: 'Upcoming birthdays, anniversaries, expiries, and renewals',
};

export interface Alert {
  id: string;
  type: 'birthday' | 'anniversary' | 'employee_document' | 'company_document' | 'subscription';
  title: string;
  subtitle?: string;
  date: string;
  daysUntil: number;
  status: 'today' | 'upcoming' | 'expired' | 'expiring';
  entityId: string;
  entityLink: string;
}

interface AlertCounts {
  total: number;
  birthdays: number;
  anniversaries: number;
  employeeDocuments: number;
  companyDocuments: number;
  subscriptions: number;
  expired: number;
}

async function getAlerts(tenantId: string): Promise<{ alerts: Alert[]; counts: AlertCounts }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Fetch all data in parallel
  const [
    teamMembers,
    companyDocuments,
    subscriptions,
  ] = await Promise.all([
    // Team members for birthdays, anniversaries, and document expiries
    prisma.teamMember.findMany({
      where: {
        tenantId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        dateOfBirth: true,
        dateOfJoining: true,
        qidExpiry: true,
        passportExpiry: true,
        healthCardExpiry: true,
        licenseExpiry: true,
        contractExpiry: true,
      },
    }),
    // Company documents expiring
    prisma.companyDocument.findMany({
      where: {
        tenantId,
        expiryDate: { lte: thirtyDaysFromNow },
      },
      select: {
        id: true,
        documentTypeName: true,
        expiryDate: true,
      },
    }),
    // Subscriptions renewing
    prisma.subscription.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        renewalDate: { lte: thirtyDaysFromNow },
      },
      select: {
        id: true,
        serviceName: true,
        renewalDate: true,
      },
    }),
  ]);

  const alerts: Alert[] = [];

  // Process birthdays
  teamMembers.forEach((member) => {
    if (!member.dateOfBirth) return;
    const dob = new Date(member.dateOfBirth);
    const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (thisYearBday < today) {
      thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
    }
    const daysUntil = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 30) {
      alerts.push({
        id: `birthday-${member.id}`,
        type: 'birthday',
        title: `${member.name}'s Birthday`,
        date: thisYearBday.toISOString(),
        daysUntil,
        status: daysUntil === 0 ? 'today' : 'upcoming',
        entityId: member.id,
        entityLink: `/admin/employees/${member.id}`,
      });
    }
  });

  // Process work anniversaries
  teamMembers.forEach((member) => {
    if (!member.dateOfJoining) return;
    const joinDate = new Date(member.dateOfJoining);
    const yearsWorked = today.getFullYear() - joinDate.getFullYear();
    if (yearsWorked < 1) return;

    const thisYearAnniv = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate());
    if (thisYearAnniv < today) {
      thisYearAnniv.setFullYear(thisYearAnniv.getFullYear() + 1);
    }
    const daysUntil = Math.ceil((thisYearAnniv.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 30) {
      const nextYears = thisYearAnniv.getFullYear() - joinDate.getFullYear();
      alerts.push({
        id: `anniversary-${member.id}`,
        type: 'anniversary',
        title: `${member.name}'s Work Anniversary`,
        subtitle: `${nextYears} year${nextYears > 1 ? 's' : ''}`,
        date: thisYearAnniv.toISOString(),
        daysUntil,
        status: daysUntil === 0 ? 'today' : 'upcoming',
        entityId: member.id,
        entityLink: `/admin/employees/${member.id}`,
      });
    }
  });

  // Process employee document expiries
  const docTypes = [
    { field: 'qidExpiry', name: 'QID' },
    { field: 'passportExpiry', name: 'Passport' },
    { field: 'healthCardExpiry', name: 'Health Card' },
    { field: 'licenseExpiry', name: 'Driving License' },
    { field: 'contractExpiry', name: 'Contract' },
  ] as const;

  teamMembers.forEach((member) => {
    docTypes.forEach(({ field, name }) => {
      const expiryDate = member[field];
      if (!expiryDate) return;
      const expiry = new Date(expiryDate);
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 30) {
        alerts.push({
          id: `emp-doc-${member.id}-${field}`,
          type: 'employee_document',
          title: `${member.name}'s ${name}`,
          subtitle: daysUntil < 0 ? 'Expired' : 'Expiring',
          date: expiry.toISOString(),
          daysUntil,
          status: daysUntil < 0 ? 'expired' : daysUntil <= 7 ? 'expiring' : 'upcoming',
          entityId: member.id,
          entityLink: `/admin/employees/${member.id}`,
        });
      }
    });
  });

  // Process company documents
  companyDocuments.forEach((doc) => {
    if (!doc.expiryDate) return;
    const expiry = new Date(doc.expiryDate);
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({
      id: `company-doc-${doc.id}`,
      type: 'company_document',
      title: doc.documentTypeName || 'Company Document',
      subtitle: daysUntil < 0 ? 'Expired' : 'Expiring',
      date: expiry.toISOString(),
      daysUntil,
      status: daysUntil < 0 ? 'expired' : daysUntil <= 7 ? 'expiring' : 'upcoming',
      entityId: doc.id,
      entityLink: `/admin/company-documents/${doc.id}`,
    });
  });

  // Process subscriptions
  subscriptions.forEach((sub) => {
    if (!sub.renewalDate) return;
    const renewal = new Date(sub.renewalDate);
    const daysUntil = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({
      id: `sub-${sub.id}`,
      type: 'subscription',
      title: sub.serviceName,
      subtitle: 'Renewal',
      date: renewal.toISOString(),
      daysUntil,
      status: daysUntil < 0 ? 'expired' : daysUntil <= 7 ? 'expiring' : 'upcoming',
      entityId: sub.id,
      entityLink: `/admin/subscriptions/${sub.id}`,
    });
  });

  // Sort by days until (expired first, then soonest upcoming)
  alerts.sort((a, b) => a.daysUntil - b.daysUntil);

  // Calculate counts
  const counts: AlertCounts = {
    total: alerts.length,
    birthdays: alerts.filter((a) => a.type === 'birthday').length,
    anniversaries: alerts.filter((a) => a.type === 'anniversary').length,
    employeeDocuments: alerts.filter((a) => a.type === 'employee_document').length,
    companyDocuments: alerts.filter((a) => a.type === 'company_document').length,
    subscriptions: alerts.filter((a) => a.type === 'subscription').length,
    expired: alerts.filter((a) => a.status === 'expired').length,
  };

  return { alerts, counts };
}

export default async function AlertsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  if (!session.user.organizationId) {
    redirect('/');
  }

  const { alerts, counts } = await getAlerts(session.user.organizationId);

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Upcoming birthdays, anniversaries, expiries, and renewals"
      >
        {/* Summary Chips */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
            <span className="text-slate-300 text-sm font-medium">{counts.total} total</span>
          </div>
          {counts.expired > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 rounded-lg">
              <span className="text-rose-400 text-sm font-medium">{counts.expired} expired</span>
            </div>
          )}
          {counts.birthdays > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
              <span className="text-blue-400 text-sm font-medium">{counts.birthdays} birthdays</span>
            </div>
          )}
          {counts.anniversaries > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
              <span className="text-emerald-400 text-sm font-medium">{counts.anniversaries} anniversaries</span>
            </div>
          )}
          {(counts.employeeDocuments + counts.companyDocuments) > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
              <span className="text-amber-400 text-sm font-medium">{counts.employeeDocuments + counts.companyDocuments} documents</span>
            </div>
          )}
          {counts.subscriptions > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg">
              <span className="text-purple-400 text-sm font-medium">{counts.subscriptions} subscriptions</span>
            </div>
          )}
        </div>
      </PageHeader>

      <PageContent>
        <AlertsClient alerts={alerts} counts={counts} />
      </PageContent>
    </>
  );
}
