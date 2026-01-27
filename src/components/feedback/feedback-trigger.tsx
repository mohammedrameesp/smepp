'use client';

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ClientOnly } from '@/components/ui/client-only';
import { FeedbackDialog } from './feedback-dialog';

// Fallback button shown during SSR to prevent layout shift
function FeedbackButtonFallback({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="h-9 w-9 text-muted-foreground hover:text-foreground"
    >
      <MessageSquarePlus className={ICON_SIZES.md} />
      <span className="sr-only">Send feedback</span>
    </Button>
  );
}

export function FeedbackTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ClientOnly fallback={<FeedbackButtonFallback />}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <MessageSquarePlus className={ICON_SIZES.md} />
                <span className="sr-only">Send feedback</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Send feedback</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ClientOnly>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
