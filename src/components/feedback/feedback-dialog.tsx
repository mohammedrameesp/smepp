'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Bug, Lightbulb, Upload, X, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FeedbackType = 'BUG' | 'FEATURE_REQUEST';

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { data: session } = useSession();
  const [type, setType] = useState<FeedbackType>('BUG');
  const [message, setMessage] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageUrl, setPageUrl] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capture context when dialog opens
  useEffect(() => {
    if (open) {
      setPageUrl(typeof window !== 'undefined' ? window.location.href : '');
      setUserAgent(typeof navigator !== 'undefined' ? navigator.userAgent : '');
    }
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setType('BUG');
      setMessage('');
      setScreenshotUrl(null);
      setScreenshotName(null);
    }
  }, [open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setScreenshotUrl(data.url);
      setScreenshotName(file.name);
      toast.success('Screenshot uploaded');
    } catch {
      toast.error('Failed to upload screenshot');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotUrl(null);
    setScreenshotName(null);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (message.length < 10) {
      toast.error('Message must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          screenshotUrl,
          pageUrl,
          userAgent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      toast.success(
        type === 'BUG' ? 'Bug report submitted. Thank you!' : 'Feature request submitted. Thank you!'
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'BUG' ? (
              <Bug className={cn(ICON_SIZES.md, 'text-red-500')} />
            ) : (
              <Lightbulb className={cn(ICON_SIZES.md, 'text-amber-500')} />
            )}
            {type === 'BUG' ? 'Report a Bug' : 'Request a Feature'}
          </DialogTitle>
          <DialogDescription>
            {type === 'BUG'
              ? 'Help us improve by reporting issues you encounter.'
              : 'Share your ideas for new features or improvements.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FeedbackType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUG">
                  <div className="flex items-center gap-2">
                    <Bug className={cn(ICON_SIZES.sm, 'text-red-500')} />
                    Bug Report
                  </div>
                </SelectItem>
                <SelectItem value="FEATURE_REQUEST">
                  <div className="flex items-center gap-2">
                    <Lightbulb className={cn(ICON_SIZES.sm, 'text-amber-500')} />
                    Feature Request
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">
              {type === 'BUG' ? 'Describe the issue' : 'Describe your idea'}
            </Label>
            <Textarea
              id="message"
              placeholder={
                type === 'BUG'
                  ? 'What happened? What did you expect to happen?'
                  : 'What feature would you like to see? How would it help you?'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{message.length}/5000 characters</p>
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {screenshotUrl ? (
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                <img
                  src={screenshotUrl}
                  alt="Screenshot preview"
                  className="h-12 w-12 object-cover rounded"
                />
                <span className="flex-1 text-sm truncate">{screenshotName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveScreenshot}
                  className="h-8 w-8"
                >
                  <X className={ICON_SIZES.sm} />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className={cn(ICON_SIZES.sm, 'mr-2 animate-spin')} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className={cn(ICON_SIZES.sm, 'mr-2')} />
                    Attach Screenshot
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Auto-captured info notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
            <Info className={cn(ICON_SIZES.sm, 'text-blue-500 mt-0.5 shrink-0')} />
            <div className="text-blue-700 dark:text-blue-300">
              <p className="font-medium">We&apos;ll automatically include:</p>
              <ul className="text-xs mt-1 space-y-0.5 text-blue-600 dark:text-blue-400">
                <li>Current page URL</li>
                <li>Your organization ({session?.user?.organizationSlug || 'Not set'})</li>
                <li>Browser information</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !message.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className={cn(ICON_SIZES.sm, 'mr-2 animate-spin')} />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
