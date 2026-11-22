'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Flag } from 'lucide-react';
import {
  OPS_NOTE_MAX,
  StaffPermission,
  createOpsNoteSchema,
  hasStaffPermission,
  type OpsBankStatus,
  type OpsNote,
  type OpsOrderSummary,
} from '@luvngift/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useCreateOpsNote, useOpsMe, useOpsNotes, useResolveOpsFlag } from '@/hooks/use-ops';

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/** "3 days ago", for how long something has been waiting. */
export function since(iso: string): string {
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return 'just now';
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/** Whether bank details are on file and checked. Staff never see the account itself. */
export const BANK_LABELS: Record<OpsBankStatus, string> = {
  NONE: 'No bank details',
  PENDING_VERIFICATION: 'Bank details awaiting check',
  VERIFIED: 'Bank details verified',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Awaiting partner',
  PROCESSING: 'With partner',
  SHIPPED: 'On its way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export function StatusBadge({ order }: { order: Pick<OpsOrderSummary, 'status' | 'partner' | 'isOverdue'> }) {
  const label = order.status === 'PROCESSING' && !order.partner ? 'Awaiting partner' : STATUS_LABELS[order.status];
  return (
    <div className="inline-flex flex-wrap gap-1">
      <Badge variant={order.status === 'DELIVERED' ? 'default' : 'secondary'}>{label ?? order.status}</Badge>
      {order.isOverdue && <Badge variant="destructive">Overdue</Badge>}
    </div>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-4 text-sm">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="text-muted-foreground">Page {page} of {totalPages}</span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}

export function useOpsCan(permission: StaffPermission): boolean {
  const { data: me } = useOpsMe();
  return !!me && hasStaffPermission({ role: me.role, staffPermissions: me.permissions }, permission);
}

export function NoteItem({ note, showTarget = false }: { note: OpsNote; showTarget?: boolean }) {
  const { data: me } = useOpsMe();
  const resolve = useResolveOpsFlag();
  const [resolution, setResolution] = useState('');
  const href = note.orderId ? `/ops/orders/${note.orderId}` : `/ops/partners/${note.vendorId}`;
  const open = note.isFlag && !note.resolvedAt;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {note.isFlag && (
          <Badge variant={open ? 'destructive' : 'secondary'}>
            <Flag className="mr-1 h-3 w-3" />
            {open ? 'Open flag' : 'Resolved'}
          </Badge>
        )}
        {showTarget && <Link href={href} className="font-medium underline underline-offset-2">{note.targetLabel}</Link>}
        <span className="text-muted-foreground">{note.authorName} · {formatDateTime(note.createdAt)}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm">{note.body}</p>
      {note.resolvedAt && (
        <p className="text-muted-foreground mt-1 text-xs">
          Resolved by {note.resolvedByName} on {formatDate(note.resolvedAt)}: {note.resolution}
        </p>
      )}
      {open && me?.role === 'ADMIN' && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className="border-input min-w-[220px] flex-1 rounded-md border px-3 py-1.5 text-sm"
            placeholder="What was done"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
          <Button
            size="sm"
            disabled={resolution.trim().length < 3 || resolve.isPending}
            onClick={() => resolve.mutate({ id: note.id, resolution: resolution.trim() })}
          >
            Resolve
          </Button>
        </div>
      )}
    </li>
  );
}

/**
 * Notes and flags on one order or partner. A flag emails head office: it is
 * how staff ask for something they cannot do themselves, such as assigning a
 * partner. A note is a record for the team.
 */
export function NotesPanel({ targetType, targetId }: { targetType: 'ORDER' | 'PARTNER'; targetId: string }) {
  const canWrite = useOpsCan(StaffPermission.OPS_NOTES);
  const { data, isLoading } = useOpsNotes({ page: 1, targetType, targetId });
  const create = useCreateOpsNote();
  const [body, setBody] = useState('');

  const send = (isFlag: boolean) => {
    const input = { targetType, targetId, body, isFlag };
    if (!createOpsNoteSchema.safeParse(input).success) return;
    create.mutate(input, { onSuccess: () => setBody('') });
  };
  const valid = createOpsNoteSchema.safeParse({ targetType, targetId, body }).success;

  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        <h2 className="font-semibold">Notes and flags</h2>
        {canWrite && (
          <div className="space-y-2">
            <Textarea
              value={body}
              maxLength={OPS_NOTE_MAX}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What happened, or what head office needs to do"
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!valid || create.isPending} onClick={() => send(false)}>
                Save note
              </Button>
              <Button size="sm" disabled={!valid || create.isPending} onClick={() => send(true)}>
                <Flag className="mr-1 h-3 w-3" />
                Flag to head office
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">A flag emails head office straight away.</p>
          </div>
        )}
        {isLoading ? (
          <Spinner />
        ) : (data?.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing yet.</p>
        ) : (
          <ul className="divide-y">
            {(data?.data ?? []).map((n) => <NoteItem key={n.id} note={n} />)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
