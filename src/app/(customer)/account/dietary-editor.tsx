'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { DIETARY_FLAGS } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useUpdateDietary, type Subscription } from '@/hooks/use-subscriptions';

/**
 * View and change a recipient's dietary and religious requirements. These are
 * SAFETY rules for every delivery (Substitution Promise § 3), and the privacy
 * notice promises they can be changed or removed — the web used to show them
 * read-only, so only app users could.
 */
export function DietaryEditor({ sub, readOnly }: { sub: Subscription; readOnly: boolean }) {
  const update = useUpdateDietary();
  const current = sub.address.dietaryFlags ?? [];
  const [editing, setEditing] = useState(false);
  const [flags, setFlags] = useState<string[]>(current);
  const [notes, setNotes] = useState(sub.address.dietaryNotes ?? '');

  const start = () => {
    setFlags(current);
    setNotes(sub.address.dietaryNotes ?? '');
    setEditing(true);
  };

  const save = () =>
    update.mutate(
      { id: sub.id, dietaryFlags: flags, dietaryNotes: notes.trim() },
      { onSuccess: () => setEditing(false) },
    );

  if (!editing) {
    return (
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2 text-xs">
        <p className="flex items-start gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          <span>
            <span className="font-medium">Dietary:</span>{' '}
            <span className="text-muted-foreground">
              {current.length ? current.join(', ') : 'None given'}
              {sub.address.dietaryNotes ? ` — ${sub.address.dietaryNotes}` : ''}
            </span>
          </span>
        </p>
        {!readOnly && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={start}>
            {current.length || sub.address.dietaryNotes ? 'Edit' : 'Add'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <fieldset className="mt-3 space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium">Allergies &amp; dietary requirements</legend>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {DIETARY_FLAGS.map((flag: string) => (
          <label key={flag} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5"
              checked={flags.includes(flag)}
              onChange={() => setFlags(flags.includes(flag) ? flags.filter((f) => f !== flag) : [...flags, flag])}
            />
            {flag}
          </label>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`dietary-notes-${sub.id}`} className="text-xs">Anything else we should know?</Label>
        <Input
          id={`dietary-notes-${sub.id}`}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. severe reaction to shellfish — please avoid entirely"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        We use these, and share them with the delivery partner who prepares the box, only to keep
        deliveries safe and suitable. Clear every box to remove them. See our{' '}
        <Link href="/privacy" target="_blank" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={update.isPending}>
          {update.isPending ? <Spinner size="sm" className="mr-2" /> : null}
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={update.isPending}>
          Cancel
        </Button>
      </div>
    </fieldset>
  );
}
