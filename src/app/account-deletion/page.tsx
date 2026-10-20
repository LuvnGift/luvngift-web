import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/legal-page';
import { BUSINESS } from '@/lib/business';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

/**
 * Public, signed-out explanation of account deletion. Google Play requires a
 * web URL where users of the app can learn how to delete their account and
 * request it without reinstalling; this page is that URL.
 */
export const metadata: Metadata = {
  title: 'Delete Your Account',
  description:
    'How to delete your Luvngift account on the web or in the app, what is deleted, and what is kept for legal reasons.',
  alternates: { canonical: `${BASE_URL}/account-deletion` },
  robots: { index: true, follow: true },
};

export default function AccountDeletionPage() {
  return (
    <LegalPage title="Delete Your Account" updated="October 19, 2026">
      <p>
        You can delete your {BUSINESS.tradingName} account at any time, from the website or the
        mobile app. {BUSINESS.tradingName} is operated by {BUSINESS.legalName}.
      </p>

      <h2>How to delete your account</h2>
      <h3>On the website</h3>
      <ul>
        <li>
          Sign in and go to <Link href="/account">My account</Link>.
        </li>
        <li>Scroll to <strong>Delete account</strong> and choose <strong>Delete my account</strong>.</li>
        <li>
          Confirm with your password (and your authenticator code, if you use two-factor
          authentication), then type DELETE.
        </li>
      </ul>
      <h3>In the app</h3>
      <ul>
        <li>Open the {BUSINESS.tradingName} app and go to the <strong>Profile</strong> tab.</li>
        <li>Choose <strong>Delete account</strong> at the bottom and confirm.</li>
      </ul>
      <h3>If you can no longer sign in</h3>
      <p>
        Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> from the address on your
        account and ask us to delete it. We will confirm it is you and complete the request within
        30 days.
      </p>

      <h2>Before you delete</h2>
      <p>
        If you have an active subscription, cancel it first. If a gift you paid for has not been
        delivered yet, you can delete your account once it arrives. This makes sure we can still
        reach you about that delivery.
      </p>

      <h2>What is deleted</h2>
      <ul>
        <li>Your name, email address, phone number, date of birth and profile picture</li>
        <li>Your saved delivery addresses and billing address</li>
        <li>Your saved payment cards (removed from our payment processor, Stripe)</li>
        <li>Your support chat history and notifications</li>
        <li>Your Google sign-in link, password and two-factor settings</li>
      </ul>
      <p>
        You will be signed out and will not be able to sign in again. If you sign up again later,
        it will be a new account.
      </p>

      <h2>What is kept, and why</h2>
      <p>
        Records of past orders, payments, refunds and invoices are kept because tax and accounting
        law requires it. Canadian law requires these records to be kept for six years after the end
        of the tax year they relate to. They are not used for anything else and are deleted after
        that.
      </p>
      <p>
        Reviews you wrote are kept, but are no longer linked to your name or email address.
      </p>

      <h2>Questions</h2>
      <p>
        Contact us at <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. See also our{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
