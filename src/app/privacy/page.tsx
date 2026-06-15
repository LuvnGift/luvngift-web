import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How DOCH FX INC (Luvngift) collects, uses, stores, and shares your personal information when you use our services.',
  alternates: { canonical: `${BASE_URL}/privacy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="June 15, 2026">
      <p>
        This Privacy Notice for DOCH FX INC (doing business as Luvngift) (&quot;we,&quot; &quot;us,&quot;
        or &quot;our&quot;) describes how and why we might access, collect, store, use, and/or share
        (&quot;process&quot;) your personal information when you use our services (&quot;Services&quot;),
        including when you:
      </p>
      <ul>
        <li>Visit our website at <a href="https://www.luvngift.com">www.luvngift.com</a>, or any website of ours that links to this Privacy Notice</li>
        <li>Download and use our mobile application (Luvngift), or any other application of ours that links to this Privacy Notice</li>
        <li>Engage with us in other related ways, including any marketing or events</li>
      </ul>
      <p>
        <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your
        privacy rights and choices. We are responsible for making decisions about how your personal
        information is processed. If you do not agree with our policies and practices, please do not use
        our Services. If you still have any questions or concerns, please contact us at{' '}
        <a href="mailto:info@luvngift.com">info@luvngift.com</a>.
      </p>

      <h2>Summary of key points</h2>
      <p>
        This summary provides key points from our Privacy Notice. You can find more details about any of
        these topics in the relevant section below.
      </p>
      <ul>
        <li><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use.</li>
        <li><strong>Do we process any sensitive personal information?</strong> Some of the information may be considered &quot;special&quot; or &quot;sensitive&quot; in certain jurisdictions. We may process sensitive personal information when necessary with your consent or as otherwise permitted by applicable law.</li>
        <li><strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.</li>
        <li><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law.</li>
        <li><strong>When and with whom do we share personal information?</strong> We may share information in specific situations and with specific third parties.</li>
        <li><strong>How do we keep your information safe?</strong> We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission or storage can be guaranteed to be 100% secure.</li>
        <li><strong>What are your rights?</strong> Depending on where you are located geographically, applicable privacy law may mean you have certain rights regarding your personal information.</li>
        <li><strong>How do you exercise your rights?</strong> The easiest way is by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.</li>
      </ul>

      <h2>1. What information do we collect?</h2>
      <h3>Personal information you disclose to us</h3>
      <p><strong>In short:</strong> We collect personal information that you provide to us.</p>
      <p>
        We collect personal information that you voluntarily provide to us when you register on the
        Services, express an interest in obtaining information about us or our products and Services, when
        you participate in activities on the Services, or otherwise when you contact us. The personal
        information we collect may include the following:
      </p>
      <ul>
        <li>names</li>
        <li>phone numbers</li>
        <li>email addresses</li>
        <li>mailing addresses</li>
        <li>usernames</li>
        <li>passwords</li>
        <li>contact preferences</li>
        <li>contact or authentication data</li>
        <li>billing addresses</li>
      </ul>
      <p>
        <strong>Payment Data.</strong> When you make a purchase, your payment is processed by our payment
        processor, Stripe. We do <strong>not</strong> collect or store your full payment card number or
        security code on our servers — these are handled and stored directly by Stripe. We may receive
        limited, non-sensitive details (such as the card brand and last four digits) for order management
        and support. You may find Stripe&apos;s privacy notice here:{' '}
        <a href="https://stripe.com/en-ca/privacy">https://stripe.com/en-ca/privacy</a>.
      </p>
      <p>
        <strong>Social Media Login Data.</strong> We may provide you with the option to register with us
        using your existing social media account details. If you choose to register in this way, we will
        collect certain profile information about you from the social media provider, as described in the
        section &quot;How do we handle your social logins?&quot; below.
      </p>
      <p>
        <strong>Application Data.</strong> If you use our application(s), we also may collect the following
        information if you choose to provide us with access or permission:
      </p>
      <ul>
        <li><strong>Geolocation Information.</strong> We may request access or permission to track location-based information from your mobile device to provide certain location-based services. You can change our access or permissions in your device&apos;s settings.</li>
        <li><strong>Mobile Device Data.</strong> We may automatically collect device information (such as your mobile device ID, model, and manufacturer), operating system and version information, device and application identification numbers, browser type and version, hardware model, Internet service provider and/or mobile carrier, and IP address.</li>
        <li><strong>Push Notifications.</strong> We may request to send you push notifications regarding your account or certain features of the application(s). You can opt out in your device&apos;s settings.</li>
      </ul>
      <p>
        All personal information that you provide to us must be true, complete, and accurate, and you must
        notify us of any changes to such personal information.
      </p>
      <h3>Google API</h3>
      <p>
        Our use of information received from Google APIs will adhere to the Google API Services User Data
        Policy, including the Limited Use requirements.
      </p>

      <h2>2. How do we process your information?</h2>
      <p>
        <strong>In short:</strong> We process your information to provide, improve, and administer our
        Services, communicate with you, for security and fraud prevention, and to comply with law. We may
        also process your information for other purposes only with your prior explicit consent.
      </p>
      <ul>
        <li>To facilitate account creation and authentication and otherwise manage user accounts.</li>
        <li>To deliver and facilitate delivery of services to the user.</li>
        <li>To respond to user inquiries and offer support to users.</li>
        <li>To send administrative information to you, such as changes to our terms and policies.</li>
        <li>To fulfill and manage your orders, payments, returns, and exchanges made through the Services.</li>
        <li>To enable user-to-user communications.</li>
        <li>To save or protect an individual&apos;s vital interest, such as to prevent harm.</li>
      </ul>

      <h2>3. What legal bases do we rely on to process your information?</h2>
      <p>
        <strong>In short:</strong> We only process your personal information when we believe it is
        necessary and we have a valid legal reason (i.e., legal basis) to do so under applicable law.
      </p>
      <p><strong>If you are located in the EU or UK,</strong> we may rely on the following legal bases to process your personal information:</p>
      <ul>
        <li><strong>Consent.</strong> You can withdraw your consent at any time.</li>
        <li><strong>Performance of a Contract.</strong> To fulfill our contractual obligations to you, including providing our Services.</li>
        <li><strong>Legal Obligations.</strong> Where necessary for compliance with our legal obligations.</li>
        <li><strong>Vital Interests.</strong> Where necessary to protect your vital interests or those of a third party.</li>
      </ul>
      <p>
        <strong>If you are located in Canada,</strong> we may process your information if you have given us
        express consent, or where your permission can be inferred (implied consent). You can withdraw your
        consent at any time. In some exceptional cases we may be legally permitted to process your
        information without your consent, for example for fraud detection and prevention, or to comply with
        a subpoena, warrant, or court order.
      </p>

      <h2>4. When and with whom do we share your personal information?</h2>
      <p><strong>In short:</strong> We may share information in specific situations described in this section and/or with the following third parties.</p>
      <ul>
        <li><strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
        <li><strong>Other Users.</strong> When you share personal information or otherwise interact with public areas of the Services, such information may be viewed by other users and may be publicly available. Other users will be able to view descriptions of your activity, communicate with you within our Services, and view your profile.</li>
      </ul>

      <h2>5. Do we use cookies and other tracking technologies?</h2>
      <p><strong>In short:</strong> We may use cookies and other tracking technologies to collect and store your information.</p>
      <p>
        We may use cookies and similar tracking technologies (like web beacons and pixels) to gather
        information when you interact with our Services. Some online tracking technologies help us maintain
        the security of our Services and your account, prevent crashes, fix bugs, save your preferences, and
        assist with basic site functions.
      </p>
      <p>
        We may also use analytics cookies to understand how the Services are used so we can improve them. We
        do <strong>not</strong> use cookies to sell or share your personal information, and we do not use
        them for cross-context targeted advertising. Specific information about how we use these technologies
        and how you can refuse certain cookies is set out in our{' '}
        <a href="/cookie-policy">Cookie Policy</a>.
      </p>

      <h2>6. How do we handle your social logins?</h2>
      <p><strong>In short:</strong> If you choose to register or log in to our Services using a social media account, we may have access to certain information about you.</p>
      <p>
        Our Services offer you the ability to register and log in using your third-party social media
        account details. Where you choose to do this, we will receive certain profile information about you
        from your social media provider, which will often include your name, email address, and profile
        picture. We will use the information we receive only for the purposes described in this Privacy
        Notice or that are otherwise made clear to you on the relevant Services.
      </p>

      <h2>7. How long do we keep your information?</h2>
      <p><strong>In short:</strong> We keep your information for as long as necessary to provide the Services and meet our legal obligations. When you delete your account it is deactivated, and you can request full deletion by contacting support.</p>
      <p>
        When you delete or deactivate your account, we deactivate it so it is no longer accessible to you,
        and we retain your personal information for as long as necessary for the purposes set out in this
        Privacy Notice — including to provide and operate the Services, comply with our legal, tax, and
        accounting obligations, prevent and investigate fraud, resolve disputes, and enforce our agreements.
      </p>
      <p>
        If you would like your personal information to be <strong>permanently deleted</strong>, you can
        request this at any time by contacting our support team at{' '}
        <a href="mailto:info@luvngift.com">info@luvngift.com</a>. On receiving a verified request, we will
        delete or anonymize your personal information, except where we are required or permitted by law to
        retain it (for example, transaction and tax records).
      </p>

      <h2>8. How do we keep your information safe?</h2>
      <p><strong>In short:</strong> We aim to protect your personal information through a system of organizational and technical security measures.</p>
      <p>
        We have implemented appropriate and reasonable technical and organizational security measures
        designed to protect the security of any personal information we process. However, despite our
        safeguards, no electronic transmission over the Internet or information storage technology can be
        guaranteed to be 100% secure. You should only access the Services within a secure environment.
      </p>

      <h2>9. Do we collect information from minors?</h2>
      <p><strong>In short:</strong> We do not knowingly collect data from or market to children under 18 years of age.</p>
      <p>
        We do not knowingly collect, solicit data from, or market to children under 18 years of age (or the
        equivalent age as specified by law in your jurisdiction), nor do we knowingly sell such personal
        information. By using the Services, you represent that you are at least 18 or that you are the parent
        or guardian of such a minor and consent to their use of the Services. If we learn that personal
        information from users less than 18 years of age has been collected, we will deactivate the account
        and take reasonable measures to promptly delete such data. If you become aware of any data we may
        have collected from children under age 18, please contact us at{' '}
        <a href="mailto:info@luvngift.com">info@luvngift.com</a>.
      </p>

      <h2>10. What are your privacy rights?</h2>
      <p><strong>In short:</strong> Depending on your state or region of residence (such as the EEA, UK, Switzerland, and Canada), you have rights that allow you greater access to and control over your personal information.</p>
      <p>
        These may include the right (i) to request access and obtain a copy of your personal information,
        (ii) to request rectification or erasure, (iii) to restrict the processing of your personal
        information, (iv) if applicable, to data portability, and (v) not to be subject to automated
        decision-making. You can make such a request by contacting us using the contact details provided
        below.
      </p>
      <p>
        If you are located in the EEA or UK and believe we are unlawfully processing your personal
        information, you also have the right to complain to your local data protection authority.
      </p>
      <p>
        <strong>Withdrawing your consent:</strong> If we are relying on your consent to process your
        personal information, you have the right to withdraw your consent at any time by contacting us. This
        will not affect the lawfulness of processing before its withdrawal.
      </p>
      <p>
        <strong>Opting out of marketing communications:</strong> You can unsubscribe at any time by clicking
        the unsubscribe link in our emails, replying &quot;STOP&quot; to our SMS messages, or contacting us.
      </p>

      <h2>11. Controls for do-not-track features</h2>
      <p>
        Most web browsers and some mobile operating systems include a Do-Not-Track (&quot;DNT&quot;) feature.
        At this stage, no uniform technology standard for recognizing and implementing DNT signals has been
        finalized. As such, we do not currently respond to DNT browser signals.
      </p>

      <h2>12. Do United States residents have specific privacy rights?</h2>
      <p>
        <strong>In short:</strong> If you are a resident of certain US states, you may have the right to
        request access to and receive details about the personal information we maintain about you, correct
        inaccuracies, get a copy of, or delete your personal information.
      </p>
      <p>
        We have not disclosed, sold, or shared any personal information to third parties for a business or
        commercial purpose in the preceding twelve (12) months. We will not sell or share personal
        information belonging to website visitors, users, and other consumers in the future.
      </p>
      <p>Your rights under US state data protection laws may include:</p>
      <ul>
        <li>Right to know whether or not we are processing your personal data</li>
        <li>Right to access your personal data</li>
        <li>Right to correct inaccuracies in your personal data</li>
        <li>Right to request deletion of your personal data</li>
        <li>Right to obtain a copy of the personal data you previously shared with us</li>
        <li>Right to non-discrimination for exercising your rights</li>
        <li>Right to opt out of the processing of your personal data for targeted advertising, the sale of personal data, or profiling</li>
      </ul>
      <p>
        To exercise these rights, you can contact us by emailing{' '}
        <a href="mailto:info@luvngift.com">info@luvngift.com</a> or by visiting{' '}
        <a href="https://www.luvngift.com/contact">www.luvngift.com/contact</a>. We will verify your identity
        before processing your request.
      </p>

      <h2>13. Do we make updates to this notice?</h2>
      <p>
        <strong>In short:</strong> Yes, we will update this notice as necessary to stay compliant with
        relevant laws. The updated version will be indicated by an updated &quot;Last updated&quot; date and
        will be effective as soon as it is accessible. We encourage you to review this Privacy Notice
        frequently.
      </p>

      <h2>14. How can you contact us about this notice?</h2>
      <p>
        If you have questions or comments about this notice, you may email us at{' '}
        <a href="mailto:info@luvngift.com">info@luvngift.com</a> or contact us by post at:
      </p>
      <p>
        DOCH FX INC<br />
        3354 Woodroffe Avenue<br />
        Nepean, Ontario K2J 0A8<br />
        Canada
      </p>

      <h2>15. How can you review, update, or delete the data we collect from you?</h2>
      <p>
        Based on the applicable laws of your country or state of residence, you may have the right to request
        access to the personal information we collect from you, details about how we have processed it,
        correct inaccuracies, or delete your personal information. To request to review, update, or delete
        your personal information, please contact us at{' '}
        <a href="mailto:info@luvngift.com">info@luvngift.com</a>.
      </p>
    </LegalPage>
  );
}
