'use client';

import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeaderButton } from '@/components/ui/page-header';

interface ShareSupplierLinkButtonProps {
  organizationSlug: string;
}

export function ShareSupplierLinkButton({ organizationSlug }: ShareSupplierLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    // Get the base domain from the current hostname
    // e.g., "becreative.example.com" → "example.com"
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    const baseDomain = parts.length > 2 ? parts.slice(1).join('.') : hostname;
    const protocol = window.location.protocol;

    const registrationLink = `${protocol}//${organizationSlug}.${baseDomain}/suppliers/register`;

    await navigator.clipboard.writeText(registrationLink);
    setCopied(true);
    toast.success('Registration link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageHeaderButton onClick={handleCopyLink} variant="outline">
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
      Share Link
    </PageHeaderButton>
  );
}
