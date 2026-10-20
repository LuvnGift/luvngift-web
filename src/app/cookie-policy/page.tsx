import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/legal-page';
import { BUSINESS } from '@/lib/business';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'Every cookie and browser storage item Luvngift (DOCH FX INC) uses, what it is for, how long it lasts, and how to change your choice.',
  alternates: { canonical: `${BASE_URL}/cookie-policy` },
  robots: { index: true, follow: true },
};

/**
 * An inventory, not a template: each row is something the code actually sets.
 * Adding a cookie, storage key or third-party script means adding a row here —
 * and, if it is not strictly necessary, gating it behind `hasAnalyticsConsent()`.
 */
const ESSENTIAL: [string, string, string][] = [
  ['accessToken', 'Keeps you signed in. Only our servers can read it.', '15 minutes'],
  ['refreshToken', 'Renews your sign-in without asking for your password again. Only our servers can read it.', '7 days'],
  ['session', 'Tells the site you are signed in, so it shows the right pages', '7 days'],
  ['cookie_consent', 'Remembers your cookie choice', '1 year'],
  ['Stripe cookies (__stripe_mid, __stripe_sid)', 'Set by Stripe on checkout pages to prevent card fraud', 'Up to 1 year'],
];

const STORAGE: [string, string, string][] = [
  ['auth-user (local storage)', 'Remembers whether you are signed in. It holds no personal details.', 'Until you sign out'],
  ['luvngift.guestChat (local storage)', 'Lets you continue a support chat without an account', 'Until you clear it'],
  ['customGiftDraft (session storage)', 'Keeps a custom gift request you are writing if you sign in part-way through', 'Until you close the tab'],
];

function CookieTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="mb-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-foreground">
            <th className="py-2 pr-4 font-semibold">Name</th>
            <th className="py-2 pr-4 font-semibold">Purpose</th>
            <th className="py-2 font-semibold">Lasts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, purpose, duration]) => (
            <tr key={name} className="border-b align-top">
              <td className="py-2 pr-4 font-mono text-xs">{name}</td>
              <td className="py-2 pr-4">{purpose}</td>
              <td className="py-2 whitespace-nowrap">{duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy" updated="October 19, 2026">
      <p>
        This policy explains the cookies and similar technologies {BUSINESS.legalName} (trading as{' '}
        {BUSINESS.tradingName}) uses on www.luvngift.com, and how you can control them.
      </p>

      <h2>What cookies are</h2>
      <p>
        Cookies are small files a website stores in your browser. Similar technologies, such as your
        browser&apos;s local storage, work in much the same way. We describe all of them here.
      </p>

      <h2>Essential cookies</h2>
      <p>
        These are needed for the site to work: to sign you in, keep your account secure and take
        payments. They do not need your consent and cannot be switched off without breaking those
        features.
      </p>
      <CookieTable rows={ESSENTIAL} />

      <h3>Browser storage</h3>
      <CookieTable rows={STORAGE} />

      <h2>Analytics (only with your consent)</h2>
      <p>
        If you choose <strong>Accept all</strong>, we load two tools from our host, Vercel:
      </p>
      <ul>
        <li>
          <strong>Vercel Web Analytics</strong> counts page visits and shows which pages are
          popular.
        </li>
        <li>
          <strong>Vercel Speed Insights</strong> measures how quickly pages load on real devices.
        </li>
      </ul>
      <p>
        Neither tool sets cookies, and neither identifies you or follows you across other websites.
        We still ask first, and neither loads until you accept. If you reject them, or later change
        your mind, they do not run.
      </p>

      <h2>Error reports</h2>
      <p>
        If a page breaks in your browser, we receive a technical error report through Sentry so we
        can fix it. It sets no cookies, and the report excludes your cookies and anything you typed
        into forms. We treat this as necessary to keep the site working.
      </p>

      <h2>Signing in with Google</h2>
      <p>
        If you choose to sign in with Google, you are taken to Google&apos;s site, where Google&apos;s
        own cookies apply. See Google&apos;s privacy policy for details.
      </p>

      <h2>What we do not use</h2>
      <p>
        We do not use advertising or tracking cookies, we do not sell information collected through
        cookies, and our emails contain no tracking pixels. If that ever changes, we will update this
        policy and ask for your consent first.
      </p>

      <h2>Changing your choice</h2>
      <p>
        Choose <strong>Cookie settings</strong> at the bottom of any page to change your choice at
        any time. You can also delete cookies in your browser settings. If you delete essential
        cookies, you will be signed out.
      </p>

      <h2>Mobile app</h2>
      <p>
        The {BUSINESS.tradingName} app does not use cookies or analytics. It stores your sign-in
        securely on your device so you stay signed in.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If we change this policy, we will update the date at the top. Questions:{' '}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. See also our{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
