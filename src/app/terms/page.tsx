import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms governing your use of Luvngift, operated by DOCH FX INC — accounts, orders, payments, vendor responsibilities, and liability.',
  alternates: { canonical: `${BASE_URL}/terms` },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="June 15, 2026">
      <h2>1. Acceptance of terms</h2>
      <p>
        Welcome to Luvngift (&quot;Platform&quot;, &quot;Service&quot;, &quot;we&quot;, &quot;our&quot;, or
        &quot;us&quot;), operated by DOCH FX INC. By accessing or using Luvngift, you agree to these Terms
        of Service. If you do not agree, do not use the Platform.
      </p>

      <h2>2. Eligibility</h2>
      <p>You must:</p>
      <ul>
        <li>Be at least 18 years old or have parental consent</li>
        <li>Provide accurate account information</li>
        <li>Comply with all applicable laws</li>
      </ul>

      <h2>3. Platform description</h2>
      <p>Luvngift provides a platform that enables users to:</p>
      <ul>
        <li>Purchase gifts</li>
        <li>Send gifts to recipients</li>
        <li>Book gift-related services</li>
        <li>Connect with vendors and service providers</li>
        <li>Manage gift experiences and events</li>
      </ul>
      <p>
        Luvngift is primarily a marketplace facilitator and is not the manufacturer, supplier, or creator of
        products sold by independent vendors.
      </p>

      <h2>4. User accounts</h2>
      <p>You are responsible for:</p>
      <ul>
        <li>Maintaining account security</li>
        <li>Protecting login credentials</li>
        <li>All activity occurring under your account</li>
      </ul>
      <p>You agree not to:</p>
      <ul>
        <li>Share accounts</li>
        <li>Impersonate another person</li>
        <li>Use false information</li>
        <li>Attempt unauthorized access</li>
      </ul>

      <h2>5. Orders and payments</h2>
      <p>
        Payments are processed securely through third-party payment processors such as Stripe. We do not
        store full payment card information on our servers. By making a purchase, you authorize the payment
        processor to charge your selected payment method.
      </p>

      <h2>6. Vendor responsibilities</h2>
      <p>Vendors are responsible for:</p>
      <ul>
        <li>Accurate product descriptions</li>
        <li>Product quality</li>
        <li>Fulfillment and delivery</li>
        <li>Compliance with applicable laws</li>
      </ul>
      <p>Luvngift may suspend or remove vendors who violate platform policies.</p>

      <h2>7. Prohibited activities</h2>
      <p>You may not:</p>
      <ul>
        <li>Use the Platform for unlawful purposes</li>
        <li>Upload malicious code</li>
        <li>Interfere with platform operations</li>
        <li>Harass other users</li>
        <li>Submit fraudulent orders</li>
        <li>Circumvent platform fees</li>
      </ul>

      <h2>8. Intellectual property</h2>
      <p>
        All Luvngift trademarks, branding, logos, software, content, and design elements remain the property
        of DOCH FX INC. You may not copy, reproduce, or distribute our content without permission.
      </p>

      <h2>9. User content</h2>
      <p>You retain ownership of content you submit, including:</p>
      <ul>
        <li>Reviews</li>
        <li>Photos</li>
        <li>Messages</li>
        <li>Listings</li>
      </ul>
      <p>
        By submitting content, you grant Luvngift a worldwide, non-exclusive license to display and use that
        content for platform operations and marketing.
      </p>

      <h2>10. Delivery and fulfillment</h2>
      <p>Delivery estimates are not guaranteed. Luvngift is not responsible for delays caused by:</p>
      <ul>
        <li>Vendors</li>
        <li>Couriers</li>
        <li>Weather</li>
        <li>Force majeure events</li>
      </ul>

      <h2>11. Limitation of liability</h2>
      <p>To the maximum extent permitted by law, Luvngift shall not be liable for:</p>
      <ul>
        <li>Indirect damages</li>
        <li>Consequential damages</li>
        <li>Lost profits</li>
        <li>Lost business opportunities</li>
      </ul>
      <p>Our total liability shall not exceed the amount paid by the user during the preceding 12 months.</p>

      <h2>12. Termination</h2>
      <p>We may suspend or terminate accounts that:</p>
      <ul>
        <li>Violate these Terms</li>
        <li>Engage in fraud</li>
        <li>Harm the Platform or its users</li>
      </ul>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by the laws of Ontario, Canada. Any disputes shall be resolved in Ontario
        courts.
      </p>

      <h2>14. Contact</h2>
      <p>
        Email: <a href="mailto:info@luvngift.com">info@luvngift.com</a>
      </p>
    </LegalPage>
  );
}
