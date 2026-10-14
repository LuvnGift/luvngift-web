'use client';

import { useState } from 'react';
import { Copy, Link2, Mail, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useVendorLink, useReissueVendorLink } from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

/**
 * The vendor's status link, for ops.
 *
 * The central constraint: **an existing link cannot be shown.** The API stores
 * only a SHA-256 hash, so once a token has gone out in an email it is
 * unrecoverable. Both buttons here therefore REPLACE the link rather than
 * reveal it, and the copy returned by "Copy link" is the only time that URL
 * will ever be readable.
 *
 * The most useful thing on this panel is not either button — it is
 * "Not opened yet", which distinguishes a vendor who is running late from a
 * vendor who never received the work.
 */

function relative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function VendorLinkSection({ orderId }: { orderId: string }) {
  const { data, isLoading } = useVendorLink(orderId);
  const reissue = useReissueVendorLink(orderId);
  const [revealed, setRevealed] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" /> Checking vendor link...
      </div>
    );
  }

  // No vendor means there is nothing to link to. The assign flow issues the
  // first link on its own, so there is no call to action here.
  if (!data?.assigned) return null;

  async function copyLink() {
    const result = await reissue.mutateAsync({ notify: false });
    if (!result.url) return;
    setRevealed(result.url);
    try {
      await navigator.clipboard.writeText(result.url);
      toast.success('New link copied — the previous one no longer works');
    } catch {
      // Clipboard is blocked outside a secure context and in some browsers.
      // The URL is shown below either way, so this is not a failure.
      toast.message('New link ready — copy it from below');
    }
  }

  const link = data.link;

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" />
        Vendor status link
      </p>

      {!link ? (
        <p className="mb-3 flex items-start gap-2 text-sm text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            No active link. {data.vendor?.name ?? 'The vendor'} cannot report progress or upload a
            delivery photo until one is sent.
          </span>
        </p>
      ) : (
        <div className="mb-3 space-y-1 text-sm">
          {link.lastUsedAt ? (
            <p className="flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Last opened {relative(link.lastUsedAt)}
            </p>
          ) : (
            // The whole reason this panel exists.
            <p className="flex items-center gap-1.5 font-medium text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Not opened yet — the vendor may not have seen this order
            </p>
          )}
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Sent {relative(link.issuedAt)} ·{' '}
            {link.expired ? (
              <span className="font-medium text-destructive">expired</span>
            ) : (
              <>expires {formatDate(link.expiresAt)}</>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {link.vendorEmail} · {link.vendorPhone}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={reissue.isPending}
          onClick={() => reissue.mutate({ notify: true })}
        >
          {reissue.isPending ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <Mail className="h-3.5 w-3.5" />
          )}
          {link ? 'Resend link' : 'Send link'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={reissue.isPending}
          onClick={() => void copyLink()}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy link
        </Button>
      </div>

      {/* Shown once, because this is the only moment the URL is readable. */}
      {revealed && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="mb-1.5 text-xs font-medium text-amber-900">
            Copy this now — it cannot be shown again. Anyone with it can update this order.
          </p>
          <code className="block break-all rounded bg-white/70 p-2 text-xs">{revealed}</code>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-amber-900 underline"
            onClick={() => setRevealed(null)}
          >
            Hide
          </button>
        </div>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className="mt-0.5 h-3 w-3 shrink-0" />
        Either button issues a new link and revokes the old one. The vendor needs no password, and
        can only mark the gift on its way and upload the delivery photo.
      </p>
    </div>
  );
}
