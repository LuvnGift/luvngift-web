'use client';

import { useState } from 'react';
import {
  STAFF_PERMISSIONS,
  STAFF_PERMISSION_LABELS,
  STAFF_PRESETS,
  STAFF_TITLE_MAX,
  updateUserAccessSchema,
  type StaffPermission,
} from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface StaffAccessValue {
  title: string;
  permissions: StaffPermission[];
}

/**
 * Title + permission switches for a STAFF account. A preset fills both in;
 * admin can then untick anything. Validated with the same shared schema the
 * API uses, so the button is only enabled for something the API will accept.
 */
export function StaffAccessForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: StaffAccessValue;
  submitLabel: string;
  pending: boolean;
  onSubmit: (value: StaffAccessValue) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [permissions, setPermissions] = useState<StaffPermission[]>(initial?.permissions ?? []);

  const valid = updateUserAccessSchema.safeParse({ role: 'STAFF', title, permissions }).success;

  const toggle = (p: StaffPermission) =>
    setPermissions((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STAFF_PRESETS.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setTitle(preset.title);
              setPermissions([...preset.permissions]);
            }}
          >
            Use preset: {preset.title}
          </Button>
        ))}
      </div>

      <div>
        <Label htmlFor="staff-title">Job title</Label>
        <Input
          id="staff-title"
          value={title}
          maxLength={STAFF_TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Country Brand Manager"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">What they can do</legend>
        {STAFF_PERMISSIONS.map((p) => (
          <label key={p} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={permissions.includes(p)}
              onChange={() => toggle(p)}
            />
            <span>{STAFF_PERMISSION_LABELS[p]}</span>
          </label>
        ))}
        <p className="text-muted-foreground text-xs">
          Staff never see money, buyers&apos; details or bank account numbers, and cannot assign
          partners, approve partners, refund or change settings. They must turn on two-step login
          before the dashboard opens.
        </p>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!valid || pending} onClick={() => onSubmit({ title: title.trim(), permissions })}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
