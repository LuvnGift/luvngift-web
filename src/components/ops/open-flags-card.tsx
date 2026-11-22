'use client';

import { Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useOpsNotes } from '@/hooks/use-ops';
import { NoteItem } from './ops-ui';

/**
 * Open flags from the ops dashboard, for admin pages. A flag is a staff member
 * asking head office to act (staff cannot assign partners themselves).
 * Renders nothing while there are none.
 */
export function OpenFlagsCard() {
  const { data } = useOpsNotes({ page: 1, flagsOnly: true, status: 'OPEN' });
  const flags = data?.data ?? [];
  if (flags.length === 0) return null;
  return (
    <Card className="border-destructive/40">
      <CardContent className="p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Flag className="h-4 w-4" />
          Flags from the ops dashboard
          <Badge variant="destructive">{data!.meta.total}</Badge>
        </h2>
        <ul className="divide-y">
          {flags.map((n) => <NoteItem key={n.id} note={n} showTarget />)}
        </ul>
      </CardContent>
    </Card>
  );
}
