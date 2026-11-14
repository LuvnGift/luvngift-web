'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Landmark, Loader2, ShieldCheck } from 'lucide-react';
import {
  NUBAN_LENGTH,
  partnerBankLinkSubmitSchema,
  type PartnerBankLinkPublicView,
  type PartnerBankLinkSubmitResult,
} from '@luvngift/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';

/**
 * The partner's bank-details form, built for a phone. Write-only: nothing on
 * file is ever shown, so a forwarded or leaked link reveals nothing. The
 * account number is typed twice (pasting into the second box is blocked),
 * because one wrong digit pays a stranger. Field rules come from
 * @luvngift/shared, the schema the API validates.
 */

type Form = { bankName: string; accountNumber: string; confirmAccountNumber: string; accountName: string };
const EMPTY: Form = { bankName: '', accountNumber: '', confirmAccountNumber: '', accountName: '' };

function errorMessage(err: unknown, fallback: string): string {
  const res = (err as { response?: { data?: { error?: { message?: string } } } })?.response;
  return res?.data?.error?.message ?? fallback;
}

function fieldErrors(form: Form): Partial<Record<keyof Form, string>> {
  const parsed = partnerBankLinkSubmitSchema.safeParse(form);
  if (parsed.success) return {};
  const out: Partial<Record<keyof Form, string>> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof Form;
    out[key] ??= issue.message;
  }
  return out;
}

const lagos = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'long', timeStyle: 'short' });

export function BankDetailsClient({ token }: { token: string }) {
  const [link, setLink] = useState<PartnerBankLinkPublicView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [done, setDone] = useState<PartnerBankLinkSubmitResult | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/vendor-portal/bank-details/${token}`);
      setLink(res.data.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, 'We could not open this link. Check your connection and try again.'));
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (done) return <Shell><Submitted result={done} /></Shell>;
  if (loadError) {
    return (
      <Shell>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="font-medium">{loadError}</p>
          <Button variant="outline" className="mt-4" onClick={() => void load()}>Try again</Button>
        </div>
      </Shell>
    );
  }
  if (!link) {
    return <Shell><Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-muted-foreground" /></Shell>;
  }
  return (
    <Shell>
      <BankForm token={token} link={link} onDone={setDone} />
    </Shell>
  );
}

function BankForm({
  token,
  link,
  onDone,
}: {
  token: string;
  link: PartnerBankLinkPublicView;
  onDone: (r: PartnerBankLinkSubmitResult) => void;
}) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errors = touched ? fieldErrors(form) : {};
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const parsed = partnerBankLinkSubmitSchema.safeParse(form);
    if (!parsed.success) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await api.post(`/api/v1/vendor-portal/bank-details/${token}`, parsed.data);
      onDone(res.data.data);
    } catch (err) {
      setSubmitError(errorMessage(err, 'Your details were not saved. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <header className="space-y-2">
        <Landmark className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-semibold">{link.isChange ? 'Change your bank details' : 'Add your bank details'}</h1>
        <p className="text-sm text-muted-foreground">
          Hi {link.partnerName}, enter the account Luvngift should pay you into. This link works once and expires on{' '}
          {lagos(link.expiresAt)} (Lagos time).
        </p>
      </header>

      <Field id="bankName" label="Bank name" error={errors.bankName}>
        <Input id="bankName" autoComplete="off" value={form.bankName} onChange={set('bankName')} placeholder="e.g. GTBank" />
      </Field>
      <Field id="accountNumber" label={`Account number (${NUBAN_LENGTH} digits)`} error={errors.accountNumber}>
        <Input
          id="accountNumber"
          inputMode="numeric"
          autoComplete="off"
          maxLength={NUBAN_LENGTH}
          value={form.accountNumber}
          onChange={set('accountNumber')}
        />
      </Field>
      <Field id="confirmAccountNumber" label="Type the account number again" error={errors.confirmAccountNumber}>
        <Input
          id="confirmAccountNumber"
          inputMode="numeric"
          autoComplete="off"
          maxLength={NUBAN_LENGTH}
          value={form.confirmAccountNumber}
          onChange={set('confirmAccountNumber')}
          onPaste={(e) => e.preventDefault()}
        />
      </Field>
      <Field id="accountName" label="Account name, exactly as your bank shows it" error={errors.accountName}>
        <Input id="accountName" autoComplete="off" value={form.accountName} onChange={set('accountName')} />
      </Field>

      <p className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        We check the account name before sending any payment to a new account. Luvngift will never ask for your PIN,
        password or a one-time code.
      </p>

      {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
      <Button type="submit" className="h-12 w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save bank details'}
      </Button>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function Submitted({ result }: { result: PartnerBankLinkSubmitResult }) {
  return (
    <div className="space-y-3 rounded-xl border p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
      <h1 className="text-lg font-semibold">Thank you, your details are saved</h1>
      <p className="text-sm text-muted-foreground">
        {result.bankName}, account ending {result.accountLast4}. We will check the account name before we pay into it. To
        change these later, contact Luvngift and we will send you a new link.
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="mx-auto min-h-screen w-full max-w-lg px-4 py-8">
      {children}
      <p className="mt-10 text-center text-xs text-muted-foreground">Luvngift · this page is private to you</p>
    </main>
  );
}
