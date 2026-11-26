'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Mail, Send } from 'lucide-react';
import {
  MARKETING_HEADLINE_MAX,
  MARKETING_INTRO_MAX,
  MARKETING_ISSUE_MAX_BUNDLES,
  MARKETING_RECENT_BUYER_DAYS,
  adminMarketingIssueSchema,
  formatMoney,
  marketingWeekOf,
  type Bundle,
} from '@luvngift/shared';
import { useAdminBundles } from '@/hooks/use-admin';
import {
  useMarketingIssue,
  useMarketingPreview,
  useSaveMarketingIssue,
  useSendMarketingTest,
} from '@/hooks/use-marketing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const DAY_MS = 24 * 60 * 60 * 1000;

const weekLabel = (weekOf: string) => {
  const thursday = new Date(new Date(`${weekOf}T00:00:00Z`).getTime() + 3 * DAY_MS);
  return `Sends Thursday ${thursday.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
};

/**
 * The weekly bundle email. Admin picks the bundles and (optionally) a headline
 * and intro; the job sends it on Thursday to customers who opted in. With no
 * pick, the job chooses the best-rated bundles itself.
 */
export default function AdminMarketingPage() {
  const thisWeek = marketingWeekOf(new Date());
  const nextWeek = marketingWeekOf(new Date(Date.now() + 7 * DAY_MS));
  const [weekOf, setWeekOf] = useState(thisWeek);

  const issue = useMarketingIssue(weekOf);
  const preview = useMarketingPreview(weekOf);
  const save = useSaveMarketingIssue(weekOf);
  const sendTest = useSendMarketingTest(weekOf);
  const { data: bundlePage, isLoading: bundlesLoading } = useAdminBundles(1, 100);
  const liveBundles: Bundle[] = useMemo(
    () => ((bundlePage?.data ?? []) as Bundle[]).filter((b) => b.isActive),
    [bundlePage],
  );

  const [picked, setPicked] = useState<string[]>([]);
  const [headline, setHeadline] = useState('');
  const [intro, setIntro] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Load the saved issue into the form whenever the week (or the saved row) changes.
  useEffect(() => {
    setPicked(issue.data?.bundleIds ?? []);
    setHeadline(issue.data?.headline ?? '');
    setIntro(issue.data?.intro ?? '');
    setFormError(null);
  }, [issue.data, weekOf]);

  const sent = Boolean(issue.data?.sentAt);

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length >= MARKETING_ISSUE_MAX_BUNDLES
          ? current
          : [...current, id],
    );

  const onSave = () => {
    const parsed = adminMarketingIssueSchema.safeParse({ bundleIds: picked, headline, intro });
    if (!parsed.success) {
      setFormError(parsed.error.errors[0].message);
      return;
    }
    setFormError(null);
    save.mutate(parsed.data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing</h1>
        <p className="text-muted-foreground text-sm">
          The weekly bundle email. It goes out on Thursdays at 16:00 UTC to customers who opted in, except anyone who
          paid for an order in the last {MARKETING_RECENT_BUYER_DAYS} days. Each bundle shows the buyer’s own price
          and delivery range, so don’t put prices or delivery times in the headline or intro.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[thisWeek, nextWeek].map((w) => (
          <Button key={w} size="sm" variant={w === weekOf ? 'default' : 'outline'} onClick={() => setWeekOf(w)}>
            {w === thisWeek ? 'This week' : 'Next week'} · {weekLabel(w)}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What goes out</CardTitle>
            <CardDescription>
              {sent
                ? `Sent ${new Date(issue.data!.sentAt!).toLocaleString()}. It can no longer be changed.`
                : issue.data?.chosenByAdmin
                  ? 'Saved. Change it any time before Thursday.'
                  : issue.data
                    ? 'Picked automatically by the job.'
                    : 'Nothing picked yet: the job will choose the best-rated bundles itself.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {sent && issue.data && (
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  ['Sent', issue.data.stats.sent],
                  ['Clicked', issue.data.stats.clicked],
                  ['Unsubscribed', issue.data.stats.unsubscribed],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border p-3">
                    <p className="text-2xl font-semibold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>
                Bundles ({picked.length}/{MARKETING_ISSUE_MAX_BUNDLES})
              </Label>
              {bundlesLoading ? (
                <Spinner />
              ) : liveBundles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active bundles.</p>
              ) : (
                <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-2">
                  {liveBundles.map((b) => {
                    const on = picked.includes(b.id);
                    const full = !on && picked.length >= MARKETING_ISSUE_MAX_BUNDLES;
                    return (
                      <label
                        key={b.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-muted',
                          (full || sent) && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={full || sent}
                          onChange={() => toggle(b.id)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="flex-1 truncate">{b.name}</span>
                        {/* Bundle.price is US$ cents. */}
                        <span className="text-xs text-muted-foreground">{formatMoney(b.price, 'USD')}</span>
                        {on && <span className="text-xs font-medium text-primary">#{picked.indexOf(b.id) + 1}</span>}
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">They appear in the order you tick them.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="headline">Subject and headline (optional)</Label>
              <Input
                id="headline"
                value={headline}
                maxLength={MARKETING_HEADLINE_MAX}
                disabled={sent}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Gift ideas for your loved ones in Nigeria this week"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intro">Intro (optional)</Label>
              <Textarea
                id="intro"
                rows={4}
                value={intro}
                maxLength={MARKETING_INTRO_MAX}
                disabled={sent}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="A line or two about why these bundles, this week."
              />
              <p className="text-xs text-muted-foreground">
                {intro.length}/{MARKETING_INTRO_MAX}
              </p>
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="flex flex-wrap gap-2">
              <Button onClick={onSave} disabled={sent || save.isPending}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => sendTest.mutate()} disabled={sendTest.isPending}>
                <Send className="mr-2 h-4 w-4" />
                {sendTest.isPending ? 'Sending…' : 'Send a test to me'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              To send it now instead of Thursday, use{' '}
              <Link href="/admin/maintenance" className="underline underline-offset-2">
                Maintenance → Weekly bundle email
              </Link>{' '}
              (preview first).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <CardTitle>Preview</CardTitle>
            </div>
            <CardDescription>
              {preview.data
                ? `Would go to ${preview.data.recipients} ${preview.data.recipients === 1 ? 'person' : 'people'} if it ran now. Prices shown in US$; each buyer sees their own currency.`
                : 'Shows the saved version.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preview.isLoading ? (
              <Spinner />
            ) : preview.data ? (
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Subject:</span> {preview.data.subject}
                </p>
                {/* sandbox: the preview runs no script and cannot navigate the dashboard. */}
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={preview.data.html}
                  className="h-[640px] w-full rounded-md border bg-white"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">The preview could not be loaded.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
