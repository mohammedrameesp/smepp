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
    const baseUrl = process.env.NODE_ENV === 'production'
      ? `https://${organizationSlug}.durj.com`
      : `http://${organizationSlug}.localhost:3000`;

    const registrationLink = `${baseUrl}/suppliers/register`;

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
