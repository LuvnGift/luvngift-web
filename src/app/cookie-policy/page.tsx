import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'How Luvngift (DOCH FX INC) uses cookies and similar technologies, the types of cookies we use, and how you can control them.',
  alternates: { canonical: `${BASE_URL}/cookie-policy` },
  robots: { index: true, follow: true },
};

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy" updated="June 15, 2026">
      <p>
        This Cookie Policy explains how DOCH FX INC (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, and
        &quot;our&quot;) uses cookies and similar technologies to recognize you when you visit our website at{' '}
        <a href="https://www.luvngift.com">www.luvngift.com</a> (&quot;Website&quot;). It explains what these
        technologies are and why we use them, as well as your rights to control our use of them. In some
        cases we may use cookies to collect personal information, or information that becomes personal
        information if we combine it with other data.
      </p>

      <h2>What are cookies?</h2>
      <p>
        Cookies are small data files placed on your computer or mobile device when you visit a website. They
        are widely used to make websites work more efficiently and to provide reporting information.
      </p>
      <p>
        <strong>First-party cookies</strong> are set by the website owner (DOCH FX INC).{' '}
        <strong>Third-party cookies</strong> are set by external services and can be used to recognize your
        device across different websites.
      </p>

      <h2>Why do we use cookies?</h2>
      <p>We use cookies for the following reasons:</p>
      <ul>
        <li>Essential functionality of the Website (such as keeping you signed in)</li>
        <li>Security and fraud prevention</li>
        <li>Remembering your preferences</li>
        <li>Understanding usage and performance so we can improve the Services (analytics, where enabled)</li>
      </ul>
      <p>
        Some cookies are strictly necessary for the Website to function; others are optional and used for
        analytics. We do <strong>not</strong> currently use advertising or targeting cookies, and we do not
        use cookies to sell or share your personal information.
      </p>

      <h2>Types of cookies we use</h2>
      <h3>Essential cookies</h3>
      <p>Required for core functionality and cannot be disabled without affecting the site:</p>
      <ul>
        <li>Login sessions and authentication</li>
        <li>Security and fraud prevention</li>
        <li>Cart and checkout functionality</li>
      </ul>

      <h3>Functional cookies</h3>
      <p>Used to remember your preferences and improve your experience (for example, saved settings).</p>

      <h3>Analytics cookies</h3>
      <p>
        Where enabled, and with your consent where required by law, analytics cookies help us understand
        visitor behavior, popular pages, and site performance so we can improve the Services. We will update
        this policy if we introduce a specific analytics provider.
      </p>

      <h3>Advertising / targeting cookies</h3>
      <p>
        We do not currently use advertising or targeting cookies. If we introduce them in the future, we
        will update this policy and request your consent before placing them where required by law.
      </p>

      <h2>Third-party cookies</h2>
      <p>Third parties may set cookies when you interact with:</p>
      <ul>
        <li>Stripe (payment processing)</li>
        <li>Google (sign-in / authentication)</li>
        <li>Other social login providers</li>
        <li>Embedded content</li>
      </ul>
      <p>Their use of cookies is governed by their own privacy and cookie policies.</p>

      <h2>Other tracking technologies</h2>
      <p>
        We may also use web beacons (also called tracking pixels or clear gifs) — for example, in emails — to
        understand whether messages were opened and to measure the effectiveness of our communications and
        Services.
      </p>

      <h2>How can you control cookies?</h2>
      <p>
        When you first visit the Website, you can accept or reject non-essential cookies using our cookie
        banner. You can also control cookies through your browser settings — most browsers let you delete or
        block cookies:
      </p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
        <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
        <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer">Apple Safari</a></li>
        <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
        <li><a href="https://help.opera.com/en/latest/web-preferences/" target="_blank" rel="noopener noreferrer">Opera</a></li>
      </ul>
      <p>
        If you reject or remove cookies, some parts of the Website may not function properly. Should we
        introduce advertising cookies in the future, you will also be able to opt out of interest-based
        advertising through tools such as the{' '}
        <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">Digital Advertising Alliance</a>,{' '}
        <a href="https://youradchoices.ca/" target="_blank" rel="noopener noreferrer">Digital Advertising Alliance of Canada</a>, and{' '}
        <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer">European Interactive Digital Advertising Alliance</a>.
      </p>

      <h2>Changes to this Cookie Policy</h2>
      <p>
        We may update this Cookie Policy from time to time. Updates will be posted on this page with a revised
        &quot;Last updated&quot; date.
      </p>

      <h2>Contact us</h2>
      <p>If you have questions about this Cookie Policy, you may contact us at:</p>
      <p>
        DOCH FX INC<br />
        3354 Woodroffe Avenue<br />
        Nepean, Ontario K2J 0A8<br />
        Canada<br />
        Email: <a href="mailto:info@luvngift.com">info@luvngift.com</a>
      </p>
    </LegalPage>
  );
}
