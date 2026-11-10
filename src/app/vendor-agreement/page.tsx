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
    <LegalPage title="Vendor Agreement" updated="November 6, 2026">
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

      <h2>6. Pay and payouts</h2>
      <p>
        An order can have up to three parts: buying the goods, managing the order (the agent&apos;s
        part), and delivery. You may be given one part or all of them. For each part you are given,
        Luvngift tells you in naira, on the order, what you are paid for it. That amount is fixed
        when the order is placed: it does not change with exchange rates, with what the customer
        paid, or if the customer uses reward points, and Luvngift pays payment-processing fees from
        its own share. For buying the goods, the amount is what the goods cost; for a subscription
        delivery, it is what the box the customer ordered costs, so a substitution you make under
        our substitution policy does not reduce it.
      </p>
      <p>
        When you are paid depends on your payout schedule, set out in your approval email (which
        forms part of this agreement) and shown on each order:
      </p>
      <ul>
        <li><strong>Advance:</strong> the goods money is paid to you before you buy; the rest once
          the order is delivered.</li>
        <li><strong>Reimburse:</strong> the goods money is paid once Luvngift approves the receipts
          you upload for the order, up to the amount for the goods; the rest once the order is
          delivered.</li>
        <li><strong>Split:</strong> the stated percentage of each amount is paid when you are
          assigned the order, and the rest once it is delivered.</li>
      </ul>
      <p>
        An order is delivered when the delivery photo is uploaded and, where Luvngift asks for it,
        the recipient has confirmed receiving it with the code we text them. Luvngift may set a
        different schedule for a particular order, and tells you on the order if it does. If an
        order is cancelled or moved to another partner, nothing more falls due to you on it, and you
        must return any advance you have not spent on it (with receipts for what you have spent).
        The schedule may be changed with at least 30 days&apos; notice by email, and a change never
        applies to an order already assigned to you.
      </p>
      <p>
        If you were approved before November 10, 2026 and are paid a share of the price, that share
        continues until the date given in our notice email, which is at least 30 days after we sent
        it.
      </p>

      <h2>6A. Vetting, receipts and ratings</h2>
      <p>
        Before approving an individual fulfilment agent, Luvngift checks their identity, guarantor
        and references, may visit their address, interviews them and trains them. Shops and
        delivery companies are visited and interviewed. Receipts you upload must be genuine and for
        the order they are uploaded to. Luvngift rates the work done on each delivered order
        (punctuality, quality and communication) and uses these ratings, with on-time delivery and
        recipient confirmation, when deciding who is offered orders.
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

      <h2>9. Recipient information and delivery photos</h2>
      <p>
        For each order, Luvngift shares the recipient&apos;s name, phone number, delivery address,
        any personal message and any dietary or religious requirements. The Vendor must:
      </p>
      <ul>
        <li>use this information only to prepare and deliver that order, and never to contact the
          recipient for any other purpose or share it with anyone else</li>
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
