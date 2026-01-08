'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bug,
  Lightbulb,
  ArrowLeft,
  Building2,
  Mail,
  Globe,
  Monitor,
  Calendar,
  ExternalLink,
  Loader2,
  Save,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

interface Feedback {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  submittedByEmail: string;
  submittedByName: string | null;
  type: string;
  message: string;
  pageUrl: string | null;
  userAgent: string | null;
  screenshotUrl: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
  { value: 'WONT_FIX', label: "Won't Fix" },
];

const STATUS_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  NEW: { label: 'New', variant: 'default' },
  REVIEWED: { label: 'Reviewed', variant: 'secondary' },
  IN_PROGRESS: { label: 'In Progress', variant: 'outline' },
  DONE: { label: 'Done', variant: 'secondary' },
  WONT_FIX: { label: "Won't Fix", variant: 'destructive' },
};

export default function FeedbackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    async function loadFeedback() {
      try {
        const res = await fetch(`/api/feedback/${params.id}`);
        if (!res.ok) {
          throw new Error('Failed to load feedback');
        }
        const data = await res.json();
        setFeedback(data);
        setStatus(data.status);
        setAdminNotes(data.adminNotes || '');
      } catch (error) {
        toast.error('Failed to load feedback');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    loadFeedback();
  }, [params.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/feedback/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!res.ok) {
        throw new Error('Failed to update feedback');
      }
      const data = await res.json();
      setFeedback(data.feedback);
      toast.success('Feedback updated');
    } catch (error) {
      toast.error('Failed to update feedback');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Feedback not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/feedback">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {feedback.type === 'BUG' ? (
            <Bug className="h-5 w-5 text-red-500" />
          ) : (
            <Lightbulb className="h-5 w-5 text-amber-500" />
          )}
          <h2 className="text-xl font-bold">
            {feedback.type === 'BUG' ? 'Bug Report' : 'Feature Request'}
          </h2>
          <Badge variant={STATUS_STYLES[feedback.status]?.variant || 'outline'}>
            {STATUS_STYLES[feedback.status]?.label || feedback.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Message */}
          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{feedback.message}</p>
            </CardContent>
          </Card>

          {/* Screenshot */}
          {feedback.screenshotUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Screenshot</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={feedback.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={feedback.screenshotUrl}
                    alt="Screenshot"
                    className="max-w-full rounded-lg border hover:opacity-90 transition-opacity"
                  />
                </a>
              </CardContent>
            </Card>
          )}

          {/* Admin Notes and Status */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
              <CardDescription>Update status and add internal notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add internal notes about this feedback..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Context Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submitter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{feedback.submittedByEmail}</span>
              </div>
              {feedback.submittedByName && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{feedback.submittedByName}</span>
                </div>
              )}
              {feedback.organizationName && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{feedback.organizationName}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.pageUrl && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Page URL
                  </div>
                  <a
                    href={feedback.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all"
                  >
                    {feedback.pageUrl}
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </div>
              )}
              {feedback.userAgent && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    Browser
                  </div>
                  <p className="text-sm text-muted-foreground break-all">{feedback.userAgent}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Submitted</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(feedback.createdAt), 'PPpp')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(feedback.updatedAt), 'PPpp')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
