import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Substitution & Quality Promise',
  description:
    'What Luvngift does when an item in your gift is unavailable — our replacement priority, dietary safety rules, and how we make it good if something has to be left out.',
  alternates: { canonical: `${BASE_URL}/substitution-policy` },
  robots: { index: true, follow: true },
};

export default function SubstitutionPolicyPage() {
  return (
    <LegalPage title="Substitution &amp; Quality Promise" updated="August 5, 2026">
      <h2>Our promise</h2>
      <p>
        At Luvngift, every gift represents your love and thoughtfulness. If an item isn&apos;t
        available when we&apos;re preparing your order, we&apos;ll carefully select a suitable
        replacement so your recipient still receives a complete, high-quality gift on time.
      </p>
      <p>
        We will never knowingly replace an item with something of lower quality simply because it
        is cheaper or easier to source.
      </p>

      <h2>1. When we substitute</h2>
      <p>We may substitute an item if it is:</p>
      <ul>
        <li>Out of stock</li>
        <li>No longer produced</li>
        <li>Not available in your recipient&apos;s region</li>
        <li>Seasonal or temporarily unavailable</li>
        <li>Below our freshness or quality standards</li>
        <li>Damaged before packing</li>
        <li>Unsafe or unsuitable for delivery</li>
      </ul>
      <p>Our goal is to protect the quality of your gift — not simply to complete an order.</p>

      <h2>2. Our substitution principles</h2>
      <p>Every substitute must satisfy all of the following:</p>
      <ul>
        <li>Equal or better quality</li>
        <li>Equal or greater value</li>
        <li>Similar purpose</li>
        <li>Suitable for the recipient</li>
        <li>Consistent with the overall gift</li>
      </ul>
      <p>If we cannot satisfy these principles, we will not substitute the item.</p>

      <h2>3. Dietary safety and religious requirements</h2>
      <p>
        <strong>This takes priority over every other clause in this policy.</strong>
      </p>
      <p>
        We will not substitute across a dietary or religious boundary, in either direction, under
        any circumstances. We will not introduce an ingredient that was not present in the item you
        chose where doing so could cause harm or offence — including but not limited to peanuts and
        groundnut products, tree nuts, dairy, gluten, shellfish, alcohol, pork and non-halal meat.
      </p>
      <p>
        Where no substitute clears this bar, the item is omitted and made good under section 5. We
        will never take a risk with a recipient&apos;s health or beliefs in order to keep a box
        complete.
      </p>
      <p>
        If you have told us about an allergy or dietary requirement for your recipient, that
        instruction overrides our substitution priority entirely.
      </p>

      <h2>4. Our replacement priority</h2>
      <p>Our team works down this order.</p>
      <h3>Level 1 — Same product, different brand</h3>
      <p>
        Equivalent size and quality. For example, 5kg Mama Gold Rice becomes 5kg Cap Rice.
      </p>
      <h3>Level 2 — Closest equivalent</h3>
      <p>
        The closest comparable product serving the same purpose. For example, brown bread becomes
        premium wheat bread; fresh tomatoes become premium plum tomatoes.
      </p>
      <h3>Level 3 — Upgrade</h3>
      <p>
        Where no like-for-like equivalent exists, we upgrade rather than downgrade — for example a
        ₦10,000 chocolate hamper becomes a ₦12,500 premium hamper. <strong>You never pay the
        difference.</strong>
      </p>
      <h3>Level 4 — Omit and make good</h3>
      <p>Only when no suitable substitute exists. See section 5.</p>

      <h2>5. If we have to leave something out</h2>
      <p>
        When an item can&apos;t be substituted, we don&apos;t simply drop it and move on. We do one
        of two things, and we tell you which:
      </p>
      <ul>
        <li>
          <strong>Add it to your next delivery.</strong> Our first choice — your recipient still
          gets what you chose, just a little later.
        </li>
        <li>
          <strong>Refund its value</strong> to your original payment method, if a make-good
          isn&apos;t practical or you&apos;d rather not wait.
        </li>
      </ul>
      <p>Nothing is silently omitted.</p>

      <h2>6. We don&apos;t downgrade</h2>
      <p>We will not knowingly substitute:</p>
      <ul>
        <li>Premium for budget</li>
        <li>Large for small</li>
        <li>Fresh for stale</li>
        <li>A recognised quality brand for an inferior alternative</li>
      </ul>
      <p>
        If the only available option is worse, we won&apos;t use it — the item is omitted and made
        good under section 5 instead.
      </p>

      <h2>7. Major changes</h2>
      <p>
        If more than 40% of the items you chose would need to be substituted or omitted, and at
        least two items are affected, we treat this as a material change and contact you before
        delivering.
      </p>
      <p>You can choose to:</p>
      <ul>
        <li>Approve the updated gift</li>
        <li>Have the missing items added to your next delivery</li>
        <li>Receive a full refund for the cycle</li>
      </ul>
      <p>
        If we don&apos;t hear from you within 24 hours, we deliver what we can and make good on the
        rest under section 5, so your recipient isn&apos;t left with nothing. You keep every option
        in section 11 afterwards.
      </p>

      <h2>8. Your substitution preference</h2>
      <p>Set per subscription, and changeable at any time from your account.</p>
      <ul>
        <li>
          <strong>Smart Substitute (recommended).</strong> Our team chooses the best replacement
          using the priority above. No delivery delay.
        </li>
        <li>
          <strong>Ask Me First.</strong> We contact you before substituting and wait up to 24
          hours. If we don&apos;t hear back, we apply Smart Substitute so your delivery stays on
          schedule.
        </li>
        <li>
          <strong>No Substitutions.</strong> Unavailable items aren&apos;t replaced. Anything
          omitted is made good under section 5.
        </li>
      </ul>

      <h2>9. Complete transparency</h2>
      <p>Every delivery record shows:</p>
      <ul>
        <li>Which items were substituted</li>
        <li>The original item and the replacement</li>
        <li>The reason for the substitution</li>
        <li>A photo taken on delivery</li>
      </ul>
      <p>Nothing is hidden.</p>

      <h2>10. Fresh produce</h2>
      <p>
        Fresh food varies with season, weather, harvest and local market availability. Where
        necessary we choose the freshest available equivalent that meets our quality standards.
      </p>
      <p>We don&apos;t knowingly send produce we wouldn&apos;t buy for our own families.</p>

      <h2>11. Our happiness guarantee</h2>
      <p>
        If you&apos;re unhappy with a substitution, tell us within 7 days of delivery and
        we&apos;ll review the order. Where appropriate we may offer a replacement item, a partial
        refund, or a complimentary addition to a future delivery.
      </p>
      <p>
        We allow seven days rather than forty-eight hours because the person receiving the gift
        usually isn&apos;t the person who bought it — word has to travel, often across several time
        zones.
      </p>
      <p>
        This section is in addition to, and does not limit, the rights set out in our{' '}
        <a href="/refund-policy">Refund Policy</a> or any rights you have under the consumer law of
        your country.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:info@luvngift.com">info@luvngift.com</a>
      </p>
    </LegalPage>
  );
}
