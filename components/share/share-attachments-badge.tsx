import React from 'react';
import { FileText, Image as ImageIcon, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Attachment } from '@/lib/types';

interface ShareAttachmentsBadgeProps {
  attachments: Attachment[];
  className?: string;
}

function getAttachmentLabel(attachment: Attachment, index: number): string {
  if (attachment.name) return attachment.name;
  if (attachment.url) {
    const lastSegment = attachment.url.split('/').pop() ?? '';
    const [fileName] = lastSegment.split('?');
    if (fileName) return fileName;
  }
  return `File ${index + 1}`;
}

function getAttachmentKind(attachment: Attachment): 'image' | 'document' | 'file' {
  const contentType = attachment.contentType || attachment.mediaType || '';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/pdf' || contentType.startsWith('text/')) return 'document';
  if (
    contentType.includes('sheet') ||
    contentType.includes('excel') ||
    contentType.includes('spreadsheet') ||
    contentType.includes('word') ||
    contentType.includes('presentation')
  ) {
    return 'document';
  }
  return 'file';
}

export function ShareAttachmentsBadge({ attachments, className }: ShareAttachmentsBadgeProps) {
  if (!attachments.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {attachments.map((attachment, index) => {
        const label = getAttachmentLabel(attachment, index);
        const kind = getAttachmentKind(attachment);
        const Icon = kind === 'image' ? ImageIcon : kind === 'document' ? FileText : File;

        return (
          <div
            key={`${label}-${index}`}
            className="flex max-w-full items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate" title={label}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
