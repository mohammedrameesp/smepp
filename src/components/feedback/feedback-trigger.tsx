'use client';

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FeedbackDialog } from './feedback-dialog';

export function FeedbackTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <MessageSquarePlus className="h-5 w-5" />
              <span className="sr-only">Send feedback</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Send feedback</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
