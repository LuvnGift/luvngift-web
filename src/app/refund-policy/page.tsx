import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/legal-page';
import { BUSINESS } from '@/lib/business';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description:
    'How to cancel a Luvngift order, what happens if a gift arrives damaged or is not delivered, custom gift and subscription refunds, and how refunds are paid.',
  alternates: { canonical: `${BASE_URL}/refund-policy` },
  robots: { index: true, follow: true },
};

export default function RefundPolicyPage() {
  const mail = <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>;

  return (
    <LegalPage title="Refund Policy" updated="October 19, 2026">
      <p>
        This policy explains what you can expect if you need to cancel an order or something goes
        wrong. It does not limit any rights you have by law as a consumer. Where the law gives you
        more, you get more.
      </p>

      <h2>How to reach us</h2>
      <p>
        Email {mail}, or reply to any email about your order, and include your order number (it
        starts with #). If something arrived damaged or wrong, a photo helps us sort it out faster.
      </p>

      <h2>1. Cancelling a gift order</h2>
      <ul>
        <li>
          <strong>Before we start preparing it:</strong> contact us and we will cancel the order
          and refund you in full.
        </li>
        <li>
          <strong>Once preparation has started:</strong> items may already have been bought or
          packed, often fresh food, so we may not be able to cancel. Tell us anyway: if we can
          stop the order or reduce the loss, we will refund whatever we can.
        </li>
      </ul>
      <p>
        Your order page shows its status. &quot;Processing&quot; means preparation has started.
      </p>

      <h2>2. If there is a problem with a delivered gift</h2>
      <p>
        Tell us within 14 days of delivery if an item:
      </p>
      <ul>
        <li>arrived damaged, spoiled or faulty</li>
        <li>was wrong or missing</li>
        <li>was significantly different from its description</li>
      </ul>
      <p>
        Depending on what happened and what you prefer, we will send a replacement, deliver what
        was missing, or refund the affected items. Substitutions made under our{' '}
        <Link href="/substitution-policy">Substitution &amp; Quality Promise</Link> are not errors,
        but if you are unhappy with one, that policy explains how we put it right.
      </p>

      <h2>3. If a gift is not delivered</h2>
      <p>
        If we do not deliver your gift, you can choose a full refund, or have us deliver it again at
        no extra cost.
      </p>
      <p>
        If delivery fails because the recipient&apos;s details were wrong or the recipient could not
        be reached after reasonable attempts, we will contact you to arrange another delivery. If
        that cannot be arranged, we will refund you. We may not be able to refund perishable items
        that spoiled while we were waiting.
      </p>

      <h2>4. Change of mind</h2>
      <p>
        Gifts are prepared for a specific person and delivered quickly, and many contain fresh food.
        Once preparation has started, we cannot normally refund a change of mind. This is
        especially true for perishable items, personalised items and custom gifts. Where the law
        gives you a right to cancel, this section does not limit it.
      </p>

      <h2>5. Custom gifts</h2>
      <p>
        Nothing is charged until you accept a quote and pay. After that, a custom gift is treated
        like any other order: you can cancel for a full refund before we start sourcing it, and
        sections 2 and 3 apply once it is on its way.
      </p>

      <h2>6. Subscriptions</h2>
      <ul>
        <li>
          You can skip, pause or cancel at any time from your account. Skipping the next cycle means
          you are not charged for it.
        </li>
        <li>
          Cancelling takes effect at the end of the cycle you have already paid for. That cycle is
          still delivered, so it is not refunded.
        </li>
        <li>
          If you are charged after cancelling or pausing because of our mistake, we will refund
          that charge in full.
        </li>
        <li>
          Problems with a subscription delivery are handled under sections 2 and 3, and items we
          could not supply are made good under our{' '}
          <Link href="/substitution-policy">Substitution &amp; Quality Promise</Link>.
        </li>
      </ul>

      <h2>7. How refunds are paid</h2>
      <p>
        Refunds go back to the card you paid with, in the currency you paid in. We aim to issue an
        approved refund within 5 business days. Your bank may then take 5–10 business days to show
        it on your statement.
      </p>

      <h3>Currency and exchange rates</h3>
      <p>
        We refund the full approved amount in the currency you were charged. We do not deduct
        exchange-rate differences or payment processing fees.
      </p>
      <p>
        If your card or bank account is held in a different currency, your bank converts the refund
        at its own rate on the day it arrives. Because rates move, the amount credited may be
        slightly higher or lower than the amount originally taken. That difference is set by your
        bank, not by us.
      </p>

      <h2>8. Disputes with your card issuer</h2>
      <p>
        If something has gone wrong, please contact us first: we can usually fix it faster than a
        card dispute. This does not affect your right to raise a dispute with your card issuer.
      </p>
    </LegalPage>
  );
}
