import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/legal-page';
import { BUSINESS } from '@/lib/business';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What personal information Luvngift (DOCH FX INC) collects about buyers and gift recipients, why, who it is shared with, how long it is kept, and your rights.',
  alternates: { canonical: `${BASE_URL}/privacy` },
  robots: { index: true, follow: true },
};

/**
 * Written to describe what the code actually does. When a feature starts
 * collecting, sharing or keeping personal data differently — a new provider, a
 * new form field, a new retention job — this page has to change with it.
 */
export default function PrivacyPage() {
  const mail = <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>;

  return (
    <LegalPage title="Privacy Policy" updated="October 19, 2026">
      <p>
        This policy explains how {BUSINESS.legalName}, trading as {BUSINESS.tradingName} (&quot;we&quot;,
        &quot;us&quot;), handles personal information when you use our website, our mobile app, or
        contact us. It covers two groups of people: <strong>buyers</strong>, who order gifts, and{' '}
        <strong>recipients</strong>, the people in Nigeria those gifts are delivered to.
      </p>
      <p>
        We are the organisation responsible for your information. Questions go to our Privacy
        Officer at {mail} (details in section 12).
      </p>

      <h2>1. What we collect</h2>
      <h3>When you create an account</h3>
      <ul>
        <li>Your name, email address, username and password (stored only as a one-way hash)</li>
        <li>Your date of birth, used only to confirm you are 18 or older</li>
        <li>Optionally, your phone number</li>
        <li>
          If you sign in with Google: your name, email address and profile picture from your Google
          account. We do not receive your Google password.
        </li>
        <li>Two-factor authentication settings, if you turn them on</li>
      </ul>

      <h3>When you buy a gift or subscribe</h3>
      <ul>
        <li>
          Your billing address and country. We use them to set the currency you pay in and to keep
          the records our accounting and tax obligations require.
        </li>
        <li>
          Payment details. Card payments are handled by Stripe. We never see or store your full card
          number or security code. We receive only limited details such as the card brand, the last
          four digits and the expiry date, so you can recognise saved cards.
        </li>
        <li>Your order history, invoices, refunds and any messages about a custom gift request</li>
      </ul>

      <h3>About the person receiving the gift</h3>
      <p>
        To deliver a gift we need the recipient&apos;s name, phone number and delivery address in
        Nigeria, along with any personal message you write for them. For grocery subscriptions you
        can also tell us about dietary needs, such as allergies, or religious requirements, such as
        halal food. This information can reveal health or religious details, so we ask for it only
        to keep the delivery safe and suitable, and use it for nothing else.
      </p>
      <p>
        When a gift is delivered, our delivery partner may take a photo as proof of delivery. We
        show it to you, the buyer.
      </p>
      <p>
        <strong>If you are a buyer,</strong> please give us only the recipient details needed for
        delivery, and only where the recipient would expect you to share them.{' '}
        <strong>If you are a recipient</strong> and have questions about your information, contact
        us at {mail}.
      </p>

      <h3>When you contact us</h3>
      <ul>
        <li>Messages you send through our contact form, by email or in the support chat</li>
        <li>
          If you use the support chat without an account and ask to speak to a person: your name
          and email address, so we can reply
        </li>
      </ul>

      <h3>When you apply to work with us</h3>
      <ul>
        <li>
          <strong>Job applicants:</strong> your name, email address, phone number, CV and cover
          letter
        </li>
        <li>
          <strong>Vendor applicants:</strong> your business name, contact name, email address, phone
          number, business address and state
        </li>
        <li>
          <strong>Roadmap updates:</strong> your email address, if you ask to be told when a feature
          launches
        </li>
      </ul>

      <h3>Collected automatically</h3>
      <ul>
        <li>
          Technical information such as your IP address, browser and device type, and the pages you
          request. This is recorded in our server logs for security, fraud prevention and fixing
          faults.
        </li>
        <li>
          Error reports. When a page breaks in your browser we receive a technical report so we can
          fix it. These reports exclude cookies and form contents.
        </li>
        <li>
          Visit and page-speed statistics, <strong>only if you accept analytics</strong> in our
          cookie banner. See our <Link href="/cookie-policy">Cookie Policy</Link>.
        </li>
      </ul>
      <p>We do not collect your precise location, and the mobile app does not track you.</p>

      <h2>2. How we use it</h2>
      <ul>
        <li>To create and secure your account, sign you in, and confirm you are 18 or older</li>
        <li>
          To take payment, calculate tax, and source, pack and deliver your gift, including
          arranging substitutions when an item is unavailable
        </li>
        <li>
          To send you messages about your orders by email and SMS: confirmations, invoices,
          delivery updates, quotes and replies
        </li>
        <li>To answer questions and support requests</li>
        <li>To review job and vendor applications</li>
        <li>To prevent fraud, keep our services secure, and find and fix faults</li>
        <li>To keep the tax and accounting records the law requires</li>
      </ul>
      <p>
        We do not sell personal information, we do not use it for targeted advertising, and we do
        not make decisions about you by automated means alone. Our support chat assistant only
        answers from help content we have written, and passes anything it cannot answer to a
        person.
      </p>
      <p>
        We do not currently send marketing emails. If we start, we will ask for your permission
        first, and every message will include an unsubscribe link.
      </p>

      <h2>3. Our legal reasons for using it</h2>
      <p>
        Where the law asks us to identify a legal basis (for example in the UK and the European
        Union), we rely on:
      </p>
      <ul>
        <li>
          <strong>Contract:</strong> to provide the account, the gift or the subscription you asked
          for
        </li>
        <li>
          <strong>Legal obligation:</strong> to keep tax and accounting records and respond to
          lawful requests
        </li>
        <li>
          <strong>Legitimate interests:</strong> to deliver a gift to its recipient, prevent fraud,
          secure our systems and fix faults
        </li>
        <li>
          <strong>Consent:</strong> for analytics and for dietary or religious requirements. You can
          withdraw your consent at any time.
        </li>
      </ul>
      <p>
        In Canada we rely on your consent, which you give when you use the services for the
        purposes described here, and on the exceptions the law allows, such as fraud prevention.
      </p>

      <h2>4. Who we share it with</h2>
      <h3>Delivery partners in Nigeria</h3>
      <p>
        The independent vendor who prepares and delivers a gift receives what they need for that
        delivery: the recipient&apos;s name, phone number and address, the items, your personal
        message, and any dietary or religious requirements. They do not receive your name, contact
        details or payment information.
      </p>

      <h3>Service providers who work on our behalf</h3>
      <p>
        These companies process personal information only to provide their service to us:
      </p>
      <ul>
        <li><strong>Stripe</strong>: payments and saved cards</li>
        <li><strong>Resend</strong>: sending email</li>
        <li><strong>Twilio</strong>: sending SMS</li>
        <li><strong>Cloudinary</strong>: storing images, delivery photos, invoices and CVs</li>
        <li><strong>Neon</strong>: database hosting</li>
        <li><strong>Railway</strong>: hosting our servers</li>
        <li><strong>Vercel</strong>: hosting our website, and analytics if you accept them</li>
        <li><strong>Upstash</strong>: the job queue that sends emails and messages</li>
        <li><strong>Sentry</strong>: website error reports</li>
        <li><strong>Axiom</strong>: server logs</li>
        <li><strong>Google</strong>: sign-in, if you choose to sign in with Google</li>
      </ul>

      <h3>Others</h3>
      <p>
        We may disclose information where the law requires it, to protect people from harm or
        fraud, or as part of a sale or reorganisation of our business. In a sale or reorganisation,
        the new owner must honour this policy.
      </p>

      <h2>5. International transfers</h2>
      <p>
        We are based in Canada. Most of our service providers store data in the United States, and
        recipient details go to delivery partners in Nigeria so the gift can be delivered. Some of
        these countries have different data protection laws from yours. Where the law requires it,
        we rely on our providers&apos; data processing terms. Those terms include the safeguards
        required for international transfers, such as the EU and UK standard contractual clauses.
      </p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li>
          <strong>Your account:</strong> until you delete it.{' '}
          <Link href="/account-deletion">How to delete your account</Link>.
        </li>
        <li>
          <strong>Orders, payments, refunds and invoices:</strong> six years after the end of the
          tax year they relate to, as Canadian tax law requires, including after you delete your
          account
        </li>
        <li>
          <strong>Support chats:</strong> with your account, and deleted when you delete it. Chats
          started without an account are kept for up to 24 months.
        </li>
        <li>
          <strong>Job applications:</strong> up to 12 months after the role is filled or closed,
          unless you ask us to delete them sooner
        </li>
        <li>
          <strong>Vendor applications:</strong> for as long as you work with us, and up to 12
          months after that if your application is not accepted
        </li>
        <li>
          <strong>Server logs and error reports:</strong> up to 90 days
        </li>
      </ul>

      <h2>7. How we protect it</h2>
      <p>
        We encrypt information in transit, store passwords only as one-way hashes, offer two-factor
        authentication, and limit staff access to what each person needs. Our logs automatically
        remove passwords, tokens and authentication details. No system is completely secure. If a
        breach puts you at real risk, we will tell you and the relevant regulator as the law
        requires.
      </p>

      <h2>8. Your rights</h2>
      <p>Depending on where you live, you have the right to:</p>
      <ul>
        <li>see the personal information we hold about you and get a copy of it</li>
        <li>have it corrected</li>
        <li>
          have it deleted. You can delete your account yourself from your account page or the app.
        </li>
        <li>object to or restrict how we use it, or withdraw consent you have given</li>
        <li>receive your data in a portable format</li>
      </ul>
      <p>
        To use these rights, email {mail}. We will confirm your identity and reply within 30 days.
        Exercising your rights will never affect the price or service you receive. If you are
        unhappy with our response, you can complain to your data protection authority: in Canada,
        the Office of the Privacy Commissioner of Canada; in the UK, the Information
        Commissioner&apos;s Office; in the EU, your local supervisory authority; in Nigeria, the
        Nigeria Data Protection Commission.
      </p>

      <h2>9. Children</h2>
      <p>
        Our services are for adults. You must be 18 or older to create an account or place an
        order. When you sign up with email we ask for your date of birth and do not open accounts
        for anyone under 18. Anyone signing in with Google must confirm they are 18 or older. We do
        not knowingly collect information from children. A gift may be for a
        child, in which case we collect only the delivery details a parent or other adult buyer
        provides. If you believe a child has given us their information, contact us and we will
        delete it.
      </p>

      <h2>10. Cookies</h2>
      <p>
        We use essential cookies to keep you signed in and to process payments. Analytics run only
        if you accept them, and you can change your choice at any time using{' '}
        <strong>Cookie settings</strong> in the footer. Details are in our{' '}
        <Link href="/cookie-policy">Cookie Policy</Link>.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        If we change this policy, we will update the date at the top. If a change materially
        affects how we use your information, we will tell you by email or in the app before it
        takes effect.
      </p>

      <h2>12. Contact us</h2>
      <p>
        Privacy Officer
        <br />
        {BUSINESS.legalName}
        <br />
        {BUSINESS.address.street}
        <br />
        {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}
        <br />
        {BUSINESS.address.country}
        <br />
        Email: {mail}
        {BUSINESS.phone && (
          <>
            <br />
            Phone: {BUSINESS.phone}
          </>
        )}
      </p>
    </LegalPage>
  );
}
