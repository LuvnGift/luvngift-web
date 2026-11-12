import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Vendor Agreement',
  description:
    'The agreement between DOCH FX INC (Luvngift) and approved vendors — relationship, pricing, fulfillment, pay, vetting, and responsibilities.',
  alternates: { canonical: `${BASE_URL}/vendor-agreement` },
  robots: { index: true, follow: true },
};

export default function VendorAgreementPage() {
  return (
    <LegalPage title="Vendor Agreement" updated="November 11, 2026">
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
        Vendors are hamper and gift businesses that source, pack and deliver Luvngift orders in the states
        they cover, as approved by Luvngift. Vendors do not control platform pricing or customer interface.
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

      <h2>6. Pay and payouts</h2>
      <p>
        Each order is given to one Vendor, who sources the goods, packs them in Luvngift packaging and
        delivers them. Luvngift tells you in naira, on the order, what you are paid for it: the cost of
        the goods plus a fulfilment fee for packing and delivering it. The fee depends on the band
        (High, Medium or Low) that the recipient&apos;s state is in. The amount is fixed when the order
        is placed: it does not change with exchange rates, with what the customer paid, if the customer
        uses reward points, or if Luvngift later changes its fees, and Luvngift pays payment-processing
        fees from its own share. For a subscription delivery, the goods amount is what the box the
        customer ordered costs, so a substitution you make under our substitution policy does not reduce it.
      </p>
      <p>
        When you are paid is agreed with you, set out in your approval email (which forms part of this
        agreement) and shown on each order:
      </p>
      <ul>
        <li><strong>On delivery:</strong> the whole amount is paid once the order is delivered.</li>
        <li><strong>Part upfront:</strong> the stated percentage of the amount is paid when you are
          assigned the order, and the rest once it is delivered.</li>
      </ul>
      <p>
        An order is delivered when the delivery photo is uploaded and, where Luvngift asks for it,
        the recipient has confirmed receiving it with the code we text them. If an order is cancelled
        or moved to another Vendor, nothing more falls due to you on it, and you must return any
        upfront payment you have not spent on it (with receipts for what you have spent). Your schedule
        may be changed with at least 30 days&apos; notice by email, and a change never applies to an
        order already assigned to you. Payments are made by bank transfer.
      </p>
      <h2>6A. Vetting, receipts and ratings</h2>
      <p>
        Before approving a Vendor, Luvngift verifies the business address, interviews the Vendor and
        asks them to make a sample hamper in Luvngift packaging, and checks the business&apos;s CAC
        registration where it has one. Receipts you upload must be genuine and for the order they are
        uploaded to; they are a record of what was bought and do not change what you are paid.
        Luvngift rates the work done on each delivered order (punctuality, quality, communication and
        use of Luvngift packaging) and uses these ratings, with on-time delivery and recipient
        confirmation, when deciding who is offered orders.
      </p>

      <h2>6B. Luvngift packaging</h2>
      <p>
        Luvngift supplies its branded boxes and packaging to the Vendor at no charge. The packaging
        remains Luvngift&apos;s property. The Vendor must:
      </p>
      <ul>
        <li>pack every Luvngift order in Luvngift packaging, as briefed, unless Luvngift agrees otherwise for that order</li>
        <li>use Luvngift packaging only for Luvngift orders, never for the Vendor&apos;s own sales or anyone else&apos;s</li>
        <li>store it with reasonable care and tell Luvngift before it runs out</li>
        <li>return or account for any unused packaging when this agreement ends</li>
      </ul>

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

      <h2>9. Recipient information and delivery photos</h2>
      <p>
        For each order, Luvngift shares the recipient&apos;s name, phone number, delivery address,
        any personal message and any dietary or religious requirements. The Vendor must:
      </p>
      <ul>
        <li>use this information only to prepare and deliver that order, and never to contact the
          recipient for any other purpose or share it with anyone else</li>
        <li>not offer the recipient, or anyone they learn is a Luvngift customer, the Vendor&apos;s own
          products or services, or invite them to order directly instead of through Luvngift, during
          this agreement and for 12 months after it ends</li>
        <li>keep it secure, and delete or destroy any copies once the order is delivered</li>
        <li>tell Luvngift immediately if it is lost, stolen or seen by someone who should not have it</li>
        <li>respect every dietary and religious requirement on the order</li>
      </ul>
      <p>
        Proof-of-delivery photos must show the gift at the delivery address. Do not photograph the
        recipient or other people, especially children, unless the recipient clearly agrees. Do not
        keep the photo or use it for anything else once it has been uploaded.
      </p>
      <p>
        The order link sent to the Vendor is personal to that order. Do not forward or share it.
      </p>

      <h2>10. Prohibited conduct</h2>
      <p>
        Vendors may not engage in fraud, misrepresentation, or failure to fulfill accepted orders.
      </p>

      <h2>11. Intellectual property</h2>
      <p>
        Vendors grant Luvngift the right to display product images, descriptions, and related content for
        marketing and operational purposes.
      </p>

      <h2>12. Termination</h2>
      <p>
        Luvngift may terminate vendor access at any time for breach of these terms or operational reasons.
      </p>

      <h2>13. Liability</h2>
      <p>Vendors are solely responsible for the fulfillment and legality of their offerings.</p>

      <h2>14. Contact</h2>
      <p>
        Email: <a href="mailto:info@luvngift.com">info@luvngift.com</a>
      </p>
    </LegalPage>
  );
}
