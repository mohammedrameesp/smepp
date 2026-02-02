/**
 * @module super-admin/feedback/page
 * @description User feedback management page for viewing bug reports and feature requests.
 * Server component that lists all feedback submissions with status tracking.
 *
 * @features
 * - List all feedback submissions (bugs and feature requests)
 * - Visual differentiation between bug reports and feature requests
 * - Status badges (New, Reviewed, In Progress, Done, Won't Fix)
 * - Screenshot attachment indicators
 * - Summary statistics (total, new, by type)
 * - Click-through to detailed feedback view
 *
 * @feedback-types
 * - BUG: User-reported issues with the platform
 * - FEATURE_REQUEST: User suggestions for new functionality
 *
 * @workflow
 * - NEW -> REVIEWED -> IN_PROGRESS -> DONE (or WONT_FIX)
 * - Detailed view at /super-admin/feedback/[id] for status updates
 */
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bug, Lightbulb, Building2, Calendar, MessageSquare, ExternalLink } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

// Prevent static pre-rendering (requires database)
export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  NEW: { label: 'New', variant: 'default' },
  REVIEWED: { label: 'Reviewed', variant: 'secondary' },
  IN_PROGRESS: { label: 'In Progress', variant: 'outline' },
  DONE: { label: 'Done', variant: 'secondary' },
  WONT_FIX: { label: "Won't Fix", variant: 'destructive' },
};

async function getFeedback() {
  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return feedback;
}

export default async function SuperAdminFeedbackPage() {
  const feedback = await getFeedback();

  const newCount = feedback.filter((f) => f.status === 'NEW').length;
  const bugCount = feedback.filter((f) => f.type === 'BUG').length;
  const featureCount = feedback.filter((f) => f.type === 'FEATURE_REQUEST').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Feedback</h2>
        <p className="text-muted-foreground">
          {feedback.length} submissions ({newCount} new, {bugCount} bugs, {featureCount} feature requests)
        </p>
      </div>

      {feedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className={`${ICON_SIZES['3xl']} text-muted-foreground mb-4`} />
            <h3 className="text-lg font-semibold mb-2">No feedback yet</h3>
            <p className="text-muted-foreground">
              User feedback will appear here when submitted
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {feedback.map((item) => (
            <Link key={item.id} href={`/super-admin/feedback/${item.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {item.type === 'BUG' ? (
                          <Bug className={`${ICON_SIZES.md} text-red-500`} />
                        ) : (
                          <Lightbulb className={`${ICON_SIZES.md} text-amber-500`} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium line-clamp-1">
                          {item.message.length > 80 ? `${item.message.substring(0, 80)}...` : item.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span className="truncate">{item.submittedByEmail}</span>
                          {item.organizationName && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 truncate">
                                <Building2 className={ICON_SIZES.xs} />
                                {item.organizationName}
                              </span>
                            </>
                          )}
                        </div>
                        {item.pageUrl && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                            <ExternalLink className={`${ICON_SIZES.xs} flex-shrink-0`} />
                            <span className="truncate">{item.pageUrl}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pl-13 sm:pl-0">
                      <Badge variant={item.type === 'BUG' ? 'destructive' : 'secondary'}>
                        {item.type === 'BUG' ? 'Bug' : 'Feature'}
                      </Badge>

                      <Badge variant={STATUS_STYLES[item.status]?.variant || 'outline'}>
                        {STATUS_STYLES[item.status]?.label || item.status}
                      </Badge>

                      {item.screenshotUrl && (
                        <Badge variant="outline" className="gap-1">
                          <span className="text-xs">📎</span>
                          Image
                        </Badge>
                      )}

                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className={ICON_SIZES.xs} />
                        <span className="hidden sm:inline">{formatDistanceToNow(item.createdAt, { addSuffix: true })}</span>
                        <span className="sm:hidden">{formatDistanceToNow(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * File: src/app/super-admin/feedback/page.tsx
 * Type: Server Component
 * Last Reviewed: 2026-02-01
 *
 * PURPOSE:
 * Lists all user-submitted feedback (bugs and feature requests) for platform
 * review and management. Serves as the entry point for feedback triage.
 *
 * ARCHITECTURE:
 * - Server component with direct database query
 * - Clickable cards linking to detail view
 * - Status-driven workflow (NEW -> REVIEWED -> IN_PROGRESS -> DONE/WONT_FIX)
 * - Visual differentiation between feedback types
 *
 * DATA MODEL:
 * - Feedback table with type, status, message, metadata
 * - Stores submitter email and organization context
 * - Optional screenshot attachment URL
 * - Page URL for context on where feedback was submitted
 *
 * STATUS WORKFLOW:
 * 1. NEW: Just submitted, needs review
 * 2. REVIEWED: Acknowledged by admin
 * 3. IN_PROGRESS: Being worked on
 * 4. DONE: Resolved/implemented
 * 5. WONT_FIX: Declined with reason
 *
 * UI ELEMENTS:
 * - Type icons: Bug (red), Lightbulb (amber for features)
 * - Status badges with semantic colors
 * - Screenshot indicator badge
 * - Truncated message preview
 *
 * SECURITY CONSIDERATIONS:
 * [+] Read-only list view
 * [+] Message truncation prevents XSS in preview
 * [!] Screenshot URLs should be validated/sanitized
 *
 * POTENTIAL IMPROVEMENTS:
 * - Add filtering by type, status, organization
 * - Implement search functionality
 * - Add pagination for large feedback volumes
 * - Add bulk status update capability
 * - Implement feedback categorization/tagging
 * - Add priority field for triage
 * - Consider email notifications on status change
 *
 * =========================================================================== */
