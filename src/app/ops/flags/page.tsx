'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useOpsNotes } from '@/hooks/use-ops';
import { NoteItem, Pager } from '@/components/ops/ops-ui';

type Status = 'OPEN' | 'RESOLVED';

/** Every flag raised to head office. Admins resolve them here or on the order. */
export default function OpsFlagsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <FlagsList />
    </Suspense>
  );
}

function FlagsList() {
  const initial = useSearchParams().get('status') === 'RESOLVED' ? 'RESOLVED' : 'OPEN';
  const [status, setStatus] = useState<Status>(initial);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOpsNotes({ page, flagsOnly: true, status });

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Flags</h1>
        <p className="text-muted-foreground text-sm">
          Things raised for head office to act on. Each one was emailed when it was raised.
        </p>
      </div>
      <div className="flex gap-1 rounded-lg border p-1">
        {(['OPEN', 'RESOLVED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-md px-3 py-1 text-sm ${status === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            {s === 'OPEN' ? 'Open' : 'Resolved'}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <Spinner />
          ) : (data?.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">{status === 'OPEN' ? 'No open flags.' : 'Nothing resolved yet.'}</p>
          ) : (
            <ul className="divide-y">
              {data!.data.map((n) => <NoteItem key={n.id} note={n} showTarget />)}
            </ul>
          )}
        </CardContent>
      </Card>
      {data && <Pager page={page} totalPages={data.meta.totalPages} onPage={setPage} />}
    </div>
  );
}
