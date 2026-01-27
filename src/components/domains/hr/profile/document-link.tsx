/**
 * @file document-link.tsx
 * @description Document link component with preview support for images and PDFs
 * @module components/domains/hr
 */
'use client';

import { useState } from 'react';
import { FileText, ExternalLink, Download, Eye, Image as ImageIcon } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DocumentLinkProps {
  /** URL of the document */
  url: string | null | undefined;
  /** Label to display */
  label: string;
  /** Placeholder text when URL is not provided */
  placeholder?: string;
  /** Show as a button instead of link */
  asButton?: boolean;
  /** Show download icon instead of external link */
  showDownload?: boolean;
  /** Enable preview (for images and PDFs) */
  enablePreview?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Check if URL is an image
 */
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some((ext) => lowerUrl.includes(ext));
}

/**
 * Check if URL is a PDF
 */
function isPdfUrl(url: string): boolean {
  return url.toLowerCase().includes('.pdf');
}

/**
 * Display a link to a document with icon and optional preview
 * Shows placeholder if URL is not provided
 */
export function DocumentLink({
  url,
  label,
  placeholder = 'Not uploaded',
  asButton = false,
  showDownload = false,
  enablePreview = true,
  className = '',
}: DocumentLinkProps) {
  const [showPreview, setShowPreview] = useState(false);

  if (!url) {
    return <span className="text-gray-400">{placeholder}</span>;
  }

  const isImage = isImageUrl(url);
  const isPdf = isPdfUrl(url);
  const canPreview = enablePreview && (isImage || isPdf);
  const IconRight = showDownload ? Download : canPreview ? Eye : ExternalLink;

  const handleClick = (e: React.MouseEvent) => {
    if (canPreview) {
      e.preventDefault();
      setShowPreview(true);
    }
  };

  const linkContent = (
    <>
      {isImage ? <ImageIcon className={ICON_SIZES.sm} /> : <FileText className={ICON_SIZES.sm} />}
      {asButton && <span className="ml-2">{label}</span>}
      {!asButton && label}
      <IconRight className={`${ICON_SIZES.xs} ml-2`} />
    </>
  );

  const link = asButton ? (
    <Button
      variant="outline"
      size="sm"
      onClick={canPreview ? handleClick : undefined}
      asChild={!canPreview}
      className={className}
    >
      {canPreview ? (
        <span className="flex items-center">{linkContent}</span>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {linkContent}
        </a>
      )}
    </Button>
  ) : (
    <a
      href={canPreview ? '#' : url}
      target={canPreview ? undefined : '_blank'}
      rel={canPreview ? undefined : 'noopener noreferrer'}
      onClick={handleClick}
      className={`flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline ${className}`}
    >
      {linkContent}
    </a>
  );

  return (
    <>
      {link}
      {canPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{label}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className={`${ICON_SIZES.sm} mr-2`} />
                      Open
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={url} download>
                      <Download className={`${ICON_SIZES.sm} mr-2`} />
                      Download
                    </a>
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center overflow-auto max-h-[calc(90vh-100px)]">
              {isImage ? (
                <img
                  src={url}
                  alt={label}
                  className="max-w-full max-h-full object-contain"
                />
              ) : isPdf ? (
                <iframe
                  src={url}
                  title={label}
                  className="w-full h-[70vh] border-0"
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/**
 * Display multiple document links in a row
 */
export function DocumentLinkGroup({
  documents,
  placeholder = 'No documents uploaded',
}: {
  documents: Array<{ url: string | null | undefined; label: string }>;
  placeholder?: string;
}) {
  const validDocs = documents.filter((d) => d.url);

  if (validDocs.length === 0) {
    return <span className="text-gray-400">{placeholder}</span>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {validDocs.map((doc, index) => (
        <DocumentLink key={index} url={doc.url} label={doc.label} />
      ))}
    </div>
  );
}
