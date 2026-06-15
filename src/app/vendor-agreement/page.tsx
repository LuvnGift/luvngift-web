import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Vendor Agreement',
  description:
    'The agreement between DOCH FX INC (Luvngift) and approved vendors — relationship, pricing, fulfillment, revenue share, and responsibilities.',
  alternates: { canonical: `${BASE_URL}/vendor-agreement` },
  robots: { index: true, follow: true },
};

export default function VendorAgreementPage() {
  return (
    <LegalPage title="Vendor Agreement" updated="June 15, 2026">
      <h2>1. Parties</h2>
      <p>
        This Vendor Agreement is between DOCH FX INC (operating as Luvngift) and the approved vendor
        (&quot;Vendor&quot;).
      </p>

      <h2>2. Relationship</h2>
      <p>
        The Vendor operates as an independent contractor. Nothing in this agreement creates an employment,
        partnership, or joint venture relationship.
      </p>

      <h2>3. Products and services</h2>
      <p>
        Vendors provide goods, digital items, or experiences as approved by Luvngift. Vendors do not control
        platform pricing or customer interface.
      </p>

      <h2>4. Pricing control</h2>
      <p>
        All customer-facing prices are set by Luvngift. Vendors agree not to alter pricing independently.
      </p>

      <h2>5. Order fulfillment</h2>
      <p>
        Vendors are responsible for fulfilling orders in a timely and professional manner, including delivery
        of physical items or execution of experiences.
      </p>

      <h2>6. Revenue share and payouts</h2>
      <p>
        Luvngift retains a platform commission on each completed sale. The applicable revenue share, payout
        method, and payout schedule are provided to you during onboarding and may be updated from time to
        time with reasonable notice. Payouts are calculated on net revenue (after applicable taxes and
        payment processing fees) and issued on a schedule determined by Luvngift.
      </p>

      <h2>7. Cancellations and refunds</h2>
      <p>
        Vendor cooperation is required for any cancellation or refund requests. Final approval rests with
        Luvngift.
      </p>

      <h2>8. Quality standards</h2>
      <p>
        Vendors must ensure all goods and services meet reasonable quality expectations. Failure may result
        in suspension or removal from the platform.
      </p>

      <h2>9. Prohibited conduct</h2>
      <p>
        Vendors may not engage in fraud, misrepresentation, or failure to fulfill accepted orders.
      </p>

      <h2>10. Intellectual property</h2>
      <p>
        Vendors grant Luvngift the right to display product images, descriptions, and related content for
        marketing and operational purposes.
      </p>

      <h2>11. Termination</h2>
      <p>
        Luvngift may terminate vendor access at any time for breach of these terms or operational reasons.
      </p>

      <h2>12. Liability</h2>
      <p>Vendors are solely responsible for the fulfillment and legality of their offerings.</p>

      <h2>13. Contact</h2>
      <p>
        Email: <a href="mailto:info@luvngift.com">info@luvngift.com</a>
      </p>
    </LegalPage>
  );
}
