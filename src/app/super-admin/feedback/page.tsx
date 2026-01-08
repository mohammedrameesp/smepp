import { prisma } from '@/lib/core/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bug, Lightbulb, Building2, Calendar, MessageSquare, ExternalLink } from 'lucide-react';
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
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
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
                          <Bug className="h-5 w-5 text-red-500" />
                        ) : (
                          <Lightbulb className="h-5 w-5 text-amber-500" />
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
                                <Building2 className="h-3 w-3" />
                                {item.organizationName}
                              </span>
                            </>
                          )}
                        </div>
                        {item.pageUrl && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
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
                        <Calendar className="h-3 w-3" />
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
