'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface NoticeRecord { sentAt: string; effectiveFrom: string; sent: number; failed: number }
interface Preview { recipients: number; effectiveFrom: string }

const KEY = ['admin', 'vendors', 'share-terms-notice'];
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * The one-off Vendor Agreement § 6 notice: vendors approved before the change
 * are told by email, and move to the new pay basis 30 days later. It can be
 * sent once; the API refuses a second send.
 */
export function ShareTermsNotice() {
  const qc = useQueryClient();
  const { data: record, isLoading } = useQuery<NoticeRecord | null>({
    queryKey: KEY,
    queryFn: () => api.get('/api/v1/admin/vendors/share-terms-notice').then((r) => r.data.data),
  });
  const [preview, setPreview] = useState<Preview | null>(null);
  const run = useMutation({
    mutationFn: (dryRun: boolean) =>
      api.post('/api/v1/admin/vendors/share-terms-notice', null, { params: { dryRun: String(dryRun) } }).then((r) => r.data.data),
    onSuccess: (data, dryRun) => {
      if (dryRun) return setPreview(data);
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(`Notice sent to ${data.sent} vendor${data.sent === 1 ? '' : 's'}${data.failed ? `, ${data.failed} failed` : ''}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Could not send the notice'),
  });

  if (isLoading) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4" /> Vendor Agreement § 6 update</p>
      {record ? (
        <p className="mt-1 text-muted-foreground">
          Sent on {day(record.sentAt)} to {record.sent} vendor{record.sent === 1 ? '' : 's'}
          {record.failed ? ` (${record.failed} failed: resend those by hand)` : ''}. Vendors approved earlier are paid on
          the value delivered from {day(record.effectiveFrom)}.
        </p>
      ) : (
        <>
          <p className="mt-1 text-muted-foreground">
            Vendors are now paid on the value of the goods delivered (a subscription box: price × how full it is). Vendors
            approved before this change must be told by email, and it applies to them 30 days later. This can be sent once.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!preview ? (
              <Button size="sm" variant="outline" onClick={() => run.mutate(true)} disabled={run.isPending}>
                Preview
              </Button>
            ) : (
              <>
                <span>
                  Emails {preview.recipients} approved vendor{preview.recipients === 1 ? '' : 's'}; applies from {day(preview.effectiveFrom)}.
                </span>
                <Button size="sm" onClick={() => run.mutate(false)} disabled={run.isPending || preview.recipients === 0}>
                  Send notice
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
