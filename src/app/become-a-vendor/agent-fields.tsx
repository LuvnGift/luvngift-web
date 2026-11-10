'use client';

/**
 * The extra section an individual fulfilment agent fills in. An agent handles
 * the gift, the recipient's address and an advance of our money on their own,
 * so we vet them before approval: ID, a guarantor, two references.
 *
 * Mirrors the AGENT rules in the API's vendors.routes (applyVendorSchema).
 */

import { ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NIGERIAN_STATES } from '@/lib/nigerian-states';
import type { PartnerRole } from '@/hooks/use-vendor-apply';

export interface Person {
  name: string;
  phone: string;
  relationship: string;
}

export interface AgentDetails {
  idType: '' | 'NIN' | 'PASSPORT' | 'DRIVERS_LICENCE' | 'VOTERS_CARD';
  idNumber: string;
  idDocument: File | null;
  guarantor: Person;
  references: [Person, Person];
  transport: string;
  states: string[];
  roles: PartnerRole[];
}

const blank = (): Person => ({ name: '', phone: '', relationship: '' });

export const EMPTY_AGENT: AgentDetails = {
  idType: '',
  idNumber: '',
  idDocument: null,
  guarantor: blank(),
  references: [blank(), blank()],
  transport: '',
  states: [],
  roles: ['AGENT', 'SOURCING', 'DELIVERY'],
};

const ID_TYPES = [
  { value: 'NIN', label: 'National ID (NIN)' },
  { value: 'PASSPORT', label: 'International passport' },
  { value: 'DRIVERS_LICENCE', label: "Driver's licence" },
  { value: 'VOTERS_CARD', label: "Voter's card" },
] as const;

const ROLE_OPTIONS: { value: PartnerRole; label: string }[] = [
  { value: 'AGENT', label: 'Manage orders end to end' },
  { value: 'SOURCING', label: 'Buy the items' },
  { value: 'DELIVERY', label: 'Deliver' },
];

const PHONE_RE = /^\+?[\d\s\-(). ]{7,20}$/;
const MAX_ID_BYTES = 5 * 1024 * 1024;

const personOk = (p: Person) => p.name.trim().length >= 2 && PHONE_RE.test(p.phone.trim()) && p.relationship.trim().length >= 2;

/** Field → message. Empty = ready to submit. */
export function agentErrors(a: AgentDetails): Record<string, string> {
  const e: Record<string, string> = {};
  if (!a.idType) e.idType = 'Choose the type of ID';
  if (!/^[A-Za-z0-9-]{6,20}$/.test(a.idNumber.trim())) e.idNumber = 'Enter the ID number as printed';
  if (!a.idDocument) e.idDocument = 'Attach a photo or scan of your ID';
  else if (a.idDocument.size > MAX_ID_BYTES) e.idDocument = 'The file must be 5MB or smaller';
  if (!personOk(a.guarantor)) e.guarantor = 'Give your guarantor’s name, phone and how you know them';
  if (!a.references.every(personOk)) e.references = 'Give two references, each with name, phone and how you know them';
  if (a.transport.trim().length < 2) e.transport = 'Tell us how you get around';
  if (!a.states.length || !a.roles.length) e.coverage = 'Choose at least one state and one thing you can do';
  return e;
}

function PersonFields({ label, value, onChange }: { label: string; value: Person; onChange: (p: Person) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input aria-label={`${label} name`} placeholder="Full name" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        <Input aria-label={`${label} phone`} placeholder="Phone" inputMode="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
        <Input aria-label={`${label} relationship`} placeholder="How you know them" value={value.relationship} onChange={(e) => onChange({ ...value, relationship: e.target.value })} />
      </div>
    </fieldset>
  );
}

export function AgentFields({
  value,
  onChange,
  errors,
}: {
  value: AgentDetails;
  onChange: (next: AgentDetails) => void;
  errors: Record<string, string>;
}) {
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const err = (k: string) => errors[k] && <p className="text-destructive text-xs">{errors[k]}</p>;
  return (
    <div className="space-y-5 border-t pt-6">
      <div className="flex items-center gap-2 pb-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold">Vetting (agents)</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Agents look after a gift, the recipient&apos;s address and sometimes an advance of money, on their own, so we
        check who you are before approving you. We keep only the last four characters of your ID number; the ID
        image is stored privately and only our team can open it. See our{' '}
        <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="idType">ID type</Label>
          <select id="idType" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={value.idType} onChange={(e) => onChange({ ...value, idType: e.target.value as AgentDetails['idType'] })}>
            <option value="">Select ID type</option>
            {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {err('idType')}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="idNumber">ID number</Label>
          <Input id="idNumber" autoComplete="off" value={value.idNumber} onChange={(e) => onChange({ ...value, idNumber: e.target.value })} />
          {err('idNumber')}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="idDocument">Photo or scan of your ID</Label>
        <Input id="idDocument" type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" onChange={(e) => onChange({ ...value, idDocument: e.target.files?.[0] ?? null })} />
        <p className="text-xs text-muted-foreground">JPEG, PNG, HEIC or PDF, up to 5MB.</p>
        {err('idDocument')}
      </div>

      <PersonFields label="Guarantor" value={value.guarantor} onChange={(guarantor) => onChange({ ...value, guarantor })} />
      {err('guarantor')}
      <PersonFields label="Reference 1" value={value.references[0]} onChange={(r) => onChange({ ...value, references: [r, value.references[1]] })} />
      <PersonFields label="Reference 2" value={value.references[1]} onChange={(r) => onChange({ ...value, references: [value.references[0], r] })} />
      {err('references')}

      <div className="space-y-1.5">
        <Label htmlFor="transport">How do you get around?</Label>
        <Input id="transport" placeholder="e.g. Own car, motorbike, public transport" value={value.transport} onChange={(e) => onChange({ ...value, transport: e.target.value })} />
        {err('transport')}
      </div>

      <div className="space-y-2">
        <Label>What can you do?</Label>
        <div className="flex flex-wrap gap-4 text-sm">
          {ROLE_OPTIONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={value.roles.includes(r.value)} onChange={() => onChange({ ...value, roles: toggle(value.roles, r.value) })} />
              {r.label}
            </label>
          ))}
        </div>
        <Label className="pt-2 block">Which states can you cover?</Label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 text-sm max-h-56 overflow-y-auto rounded-md border p-2">
          {NIGERIAN_STATES.map((s) => (
            <label key={s} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={value.states.includes(s)} onChange={() => onChange({ ...value, states: toggle(value.states, s) })} />
              {s}
            </label>
          ))}
        </div>
        {err('coverage')}
      </div>
    </div>
  );
}

/** The agent section → the API's application fields. */
export function agentPayload(a: AgentDetails) {
  const person = (p: Person) => ({ name: p.name.trim(), phone: p.phone.trim(), relationship: p.relationship.trim() });
  return {
    idType: a.idType || undefined,
    idNumber: a.idNumber.trim(),
    guarantor: person(a.guarantor),
    references: a.references.map(person),
    transport: a.transport.trim(),
    coverage: a.states.flatMap((state) => a.roles.map((role) => ({ state, role }))),
  };
}
