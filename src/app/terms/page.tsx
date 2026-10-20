import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/legal-page';
import { BUSINESS } from '@/lib/business';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms for buying gifts and subscriptions from Luvngift (DOCH FX INC): ordering, prices and currency, custom requests, subscriptions, delivery in Nigeria, and your rights.',
  alternates: { canonical: `${BASE_URL}/terms` },
  robots: { index: true, follow: true },
};

/**
 * Describes how the business actually operates: Luvngift is the seller the
 * customer contracts with, and vendors are fulfilment partners we assign. Keep
 * it in step with the Refund Policy, Substitution Promise and Privacy Policy.
 */
export default function TermsPage() {
  const mail = <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>;

  return (
    <LegalPage title="Terms of Service" updated="October 19, 2026">
      <h2>1. About us and these terms</h2>
      <p>
        {BUSINESS.tradingName} is operated by {BUSINESS.legalName}, a company based in Ontario,
        Canada, at {BUSINESS.address.street}, {BUSINESS.address.city}, {BUSINESS.address.region}{' '}
        {BUSINESS.address.postalCode}. You can contact us at {mail}.
      </p>
      <p>
        These terms apply when you use our website or app, create an account, or buy from us. Please
        read them with our <Link href="/refund-policy">Refund Policy</Link>,{' '}
        <Link href="/substitution-policy">Substitution &amp; Quality Promise</Link> and{' '}
        <Link href="/privacy">Privacy Policy</Link>, which form part of them. Nothing in these terms
        takes away rights you have by law as a consumer.
      </p>

      <h2>2. Who can use Luvngift</h2>
      <p>
        You must be at least 18 years old to create an account or place an order. You agree to give
        accurate information and to keep it up to date.
      </p>

      <h2>3. What we do</h2>
      <p>
        We sell gift bundles, custom gifts and recurring grocery and gift subscriptions, delivered to
        recipients in Nigeria. When you place an order, your contract is with {BUSINESS.legalName}.
      </p>
      <p>
        Gifts are prepared and delivered by independent delivery partners in Nigeria whom we choose
        and manage. We stay responsible to you for your order whichever partner handles it.
      </p>

      <h2>4. Your account</h2>
      <p>
        Keep your password secure and do not share your account. You are responsible for activity
        on your account. Tell us straight away if you think someone else has used it. You can delete
        your account at any time. See <Link href="/account-deletion">how to delete your account</Link>.
      </p>

      <h2>5. Recipient details</h2>
      <p>
        When you order, you give us the recipient&apos;s name, phone number and delivery address,
        and you may add a personal message. You confirm that the details are accurate, and that you
        are entitled to share them with us so we can deliver the gift. We use them only as described
        in our <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <p>
        If we cannot deliver because the details are wrong or the recipient cannot be reached after
        reasonable attempts, we will contact you to arrange delivery. Our{' '}
        <Link href="/refund-policy">Refund Policy</Link> explains what happens if delivery is not
        possible.
      </p>

      <h2>6. Prices, currency and tax</h2>
      <ul>
        <li>
          You pay in Canadian dollars, US dollars or British pounds. Our catalogue prices are set in
          US dollars and converted to your currency at our current exchange rate, so the price you
          see can change from day to day until you pay.
        </li>
        <li>
          Delivery within Nigeria is included in the price. There are no separate delivery or
          service fees.
        </li>
        <li>
          If your billing address is in Canada, we add the GST, HST or PST that applies to your
          province. We show it before you pay. We do not currently charge sales tax to buyers
          outside Canada.
        </li>
        <li>
          You see the full amount, including any tax, before you pay. That is the amount we charge.
          If your card is in a different currency from the one you pay in, your bank may convert it
          and charge its own fees. Those fees are outside our control.
        </li>
      </ul>

      <h2>7. Placing an order</h2>
      <p>
        Your order is accepted when your payment succeeds and we send you a confirmation. Payments
        are processed by Stripe. We never see or store your full card number. If you choose to save
        a card, Stripe stores it so you can use it again, and you can remove it from your account at
        any time.
      </p>
      <p>
        We may cancel an order before it is prepared if we suspect fraud, if an obvious pricing
        error was made, or if we cannot fulfil it. If we do, we will tell you and refund you in
        full.
      </p>

      <h2>8. Custom gift requests</h2>
      <ul>
        <li>
          Describe what you would like and we will reply, ask questions if we need to, and send you a
          quote setting out what we will deliver and the price.
        </li>
        <li>
          You can accept a quote, ask for changes, or decline it. A new quote replaces the previous
          one. A quote marked <strong>final</strong> can be accepted or declined, but not changed.
        </li>
        <li>
          Nothing is charged until you accept a quote and pay. Once you accept, the price is fixed.
        </li>
        <li>
          The scope in the accepted quote is what we will deliver. We may decline a request we cannot
          fulfil safely, lawfully or to our quality standards.
        </li>
      </ul>

      <h2>9. Subscriptions</h2>
      <ul>
        <li>
          <strong>Billing:</strong> a subscription is charged monthly or every two weeks, as you
          choose, at the price shown when you subscribe. The first charge is taken when you
          subscribe. Each later charge is taken automatically at the start of each cycle{' '}
          <strong>until you cancel</strong>.
        </li>
        <li>
          <strong>Skip, pause or cancel</strong> from your account at any time, without calling us:
          <ul>
            <li>Skipping the next cycle means that cycle is neither charged nor delivered.</li>
            <li>Pausing stops charges and deliveries until you resume.</li>
            <li>
              Cancelling takes effect at the end of the cycle you have already paid for. That
              cycle is still delivered, and you will not be charged again.
            </li>
          </ul>
        </li>
        <li>
          <strong>Failed payments:</strong> if a charge fails, we will tell you and retry it for up
          to about two weeks. Deliveries may continue during that time. If payment cannot be
          collected, we may cancel the subscription.
        </li>
        <li>
          <strong>Price changes:</strong> we will tell you at least 30 days before a new price
          applies to your subscription. You can cancel before then if you do not want to continue.
        </li>
        <li>
          <strong>What is in the box:</strong> you choose items up to the number your plan
          allows. If you do not choose, we send the plan&apos;s default selection.
        </li>
      </ul>

      <h2>10. Delivery</h2>
      <p>
        Before you pay, we show an estimated delivery window as a range of days. It is an estimate,
        not a guaranteed date: delivery in Nigeria can be affected by location, traffic, weather,
        public holidays and other events. We will keep you updated by email and SMS, and you can
        track your order from your account. When a gift is delivered, our delivery partner may take
        a photo as proof of delivery, which we share with you.
      </p>

      <h2>11. Substitutions</h2>
      <p>
        If an item is unavailable, we replace it with something of equal or better quality and
        value. We never cross a dietary or religious requirement you have told us about. If no
        suitable replacement exists, we make it good. The details are in our{' '}
        <Link href="/substitution-policy">Substitution &amp; Quality Promise</Link>.
      </p>

      <h2>12. Cancellations, problems and refunds</h2>
      <p>
        How to cancel an order, what to do if something goes wrong, and how refunds work are set out
        in our <Link href="/refund-policy">Refund Policy</Link>. Your legal rights as a consumer
        apply in addition to that policy.
      </p>

      <h2>13. Using Luvngift responsibly</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use Luvngift for anything unlawful, fraudulent or harmful</li>
        <li>place orders with payment details you are not authorised to use</li>
        <li>send gifts or messages intended to harass, threaten or deceive the recipient</li>
        <li>try to gain unauthorised access to our systems or interfere with how they work</li>
        <li>upload malicious code, or scrape or copy our site at scale</li>
      </ul>

      <h2>14. Reviews and messages you send</h2>
      <p>
        You keep ownership of reviews, messages and photos you send us. You give us permission to use
        them to run Luvngift, and to show your reviews on our website and app. We may remove content
        that is unlawful, abusive or misleading. We do not remove or edit reviews because they are
        negative.
      </p>

      <h2>15. Our intellectual property</h2>
      <p>
        The {BUSINESS.tradingName} name, logo, website, app and content belong to{' '}
        {BUSINESS.legalName} or our licensors. You may not copy or reuse them without our
        permission.
      </p>

      <h2>16. Our responsibility to you</h2>
      <p>
        If we break these terms, we are responsible for loss you suffer that was a foreseeable
        result of our breach or our failure to take reasonable care. We are not responsible for
        loss that was not foreseeable, for business losses, or for delays or failures caused by
        events outside our reasonable control.
      </p>
      <p>
        Otherwise, our total liability to you for any order is limited to the amount you paid for
        that order or, for a subscription, for the cycle concerned. Nothing in these terms limits
        liability that cannot legally be limited, including liability for death or personal injury
        caused by negligence, for fraud, or under your statutory rights as a consumer.
      </p>

      <h2>17. Suspending or closing accounts</h2>
      <p>
        We may suspend or close an account that is used fraudulently or in serious or repeated
        breach of these terms. Where it is fair to do so, we will tell you why first. Orders already
        paid for will be delivered or refunded.
      </p>

      <h2>18. Changes to these terms</h2>
      <p>
        We may update these terms, for example when we add features or the law changes. The terms
        in force when you place an order apply to that order. If a change affects an active
        subscription, we will tell you beforehand, and you can cancel if you do not agree.
      </p>

      <h2>19. Law and disputes</h2>
      <p>
        These terms are governed by the laws of Ontario and the federal laws of Canada that apply
        there. If you live outside Ontario, you keep the protection of any mandatory consumer laws
        where you live, and you can bring a claim in your local courts where those laws allow.
      </p>
      <p>
        If you have a complaint, contact us first at {mail}. We aim to resolve it within 14 days.
      </p>

      <h2>20. Contact</h2>
      <p>
        {BUSINESS.legalName}
        <br />
        {BUSINESS.address.street}, {BUSINESS.address.city}, {BUSINESS.address.region}{' '}
        {BUSINESS.address.postalCode}, {BUSINESS.address.country}
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
