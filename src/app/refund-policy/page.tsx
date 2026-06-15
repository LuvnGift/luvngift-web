import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description:
    'Luvngift refund eligibility for physical products and gift services, delivery issues, chargebacks, and processing times.',
  alternates: { canonical: `${BASE_URL}/refund-policy` },
  robots: { index: true, follow: true },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy" updated="June 15, 2026">
      <h2>Overview</h2>
      <p>
        At Luvngift, customer satisfaction is important to us. Refund eligibility depends on the nature of
        the purchase.
      </p>

      <h2>Physical products</h2>
      <p>Refunds may be approved when:</p>
      <ul>
        <li>The product is defective</li>
        <li>The product arrives damaged</li>
        <li>An incorrect item is received</li>
        <li>The item is significantly different from its description</li>
      </ul>
      <p>Requests must be submitted within 14 days of delivery.</p>

      <h2>Non-refundable situations</h2>
      <p>Refunds are generally not available for:</p>
      <ul>
        <li>Change of mind</li>
        <li>Personalized items</li>
        <li>Custom-made products</li>
        <li>Perishable goods</li>
        <li>Digital products already delivered</li>
      </ul>

      <h2>Gift services</h2>
      <p>For booked services:</p>
      <ul>
        <li><strong>More than 48 hours before service:</strong> full refund.</li>
        <li><strong>24–48 hours before service:</strong> 50% refund.</li>
        <li><strong>Less than 24 hours before service:</strong> no refund.</li>
      </ul>
      <p>Unless required by law or approved by the service provider.</p>

      <h2>Delivery issues</h2>
      <p>If an order is lost or not delivered:</p>
      <ul>
        <li>An investigation may be initiated</li>
        <li>A replacement or refund may be offered</li>
      </ul>

      <h2>Chargebacks</h2>
      <p>
        Users agree to contact Luvngift before initiating chargebacks with their bank. Fraudulent
        chargebacks may result in account suspension.
      </p>

      <h2>Refund processing</h2>
      <p>
        Approved refunds are typically processed within 5–10 business days. Processing times may vary by
        financial institution.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:info@luvngift.com">info@luvngift.com</a>
      </p>
    </LegalPage>
  );
}
