import React from 'react';
import LegalLayout from '@/components/legal/LegalLayout';

const Privacy: React.FC = () => {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How ConnectionRescue collects, uses, and protects your information. Written in plain English."
    >
      <h2>1. Who we are</h2>
      <p>
        ConnectionRescue, Inc. ("ConnectionRescue," "we," "us") provides travel-disruption recovery services through our
        web and Android applications. Our registered office is in Delaware, USA. You can reach our Data Protection
        Officer at <a href="mailto:privacy@connectionrescue.app">privacy@connectionrescue.app</a>.
      </p>

      <h2>2. Information we collect</h2>
      <h3>You give us</h3>
      <ul>
        <li><strong>Account info:</strong> email address, name, optional loyalty program tiers.</li>
        <li><strong>Boarding pass data:</strong> when you scan a boarding pass, we extract flight number, route, gate, seat, cabin, confirmation code, and passenger name.</li>
        <li><strong>Payment info:</strong> processed by Stripe; we never see or store full card numbers.</li>
        <li><strong>Support communications:</strong> messages you send us.</li>
      </ul>
      <h3>Collected automatically</h3>
      <ul>
        <li><strong>Location:</strong> only with your explicit permission, and only while the app is in use, to surface gate-aware lounges and nearby hotels.</li>
        <li><strong>Device & usage:</strong> device model, OS, app version, crash logs, anonymized analytics events.</li>
        <li><strong>Cookies & similar:</strong> see our <a href="/cookies">Cookie Policy</a>.</li>
      </ul>
      <h3>From third parties</h3>
      <ul>
        <li><strong>Flight status:</strong> AviationStack, FlightAware, and airline partners.</li>
        <li><strong>Hotel & lounge inventory:</strong> Booking.com, Priority Pass, LoungeBuddy.</li>
      </ul>

      <h2>3. How we use your information</h2>
      <ul>
        <li>Detect disruptions to flights you've added and alert you.</li>
        <li>Auto-fill rebooking, hotel, and lounge searches.</li>
        <li>Process payments for bookings.</li>
        <li>Improve the product (aggregated, de-identified analytics).</li>
        <li>Comply with legal obligations.</li>
      </ul>
      <p>
        <strong>We do not sell your personal information.</strong> We do not use your data for third-party advertising.
      </p>

      <h2>4. Legal bases (GDPR / UK)</h2>
      <ul>
        <li><strong>Contract:</strong> to provide the rescue services you request.</li>
        <li><strong>Consent:</strong> for location, marketing emails, optional analytics.</li>
        <li><strong>Legitimate interests:</strong> to keep the service secure and improve it.</li>
        <li><strong>Legal obligation:</strong> tax, fraud prevention, lawful requests.</li>
      </ul>

      <h2>5. Sharing</h2>
      <p>We share data only with:</p>
      <ul>
        <li>Booking partners you choose (airline, hotel, lounge) to fulfill your booking.</li>
        <li>Sub-processors: Supabase (database), Stripe (payments), Resend (email), Sentry (crash reports).</li>
        <li>Authorities when legally required.</li>
        <li>An acquirer in the event of a merger — you'll be notified first.</li>
      </ul>

      <h2>6. International transfers</h2>
      <p>
        Data is stored in the United States. If you're in the EEA / UK, we rely on Standard Contractual Clauses
        for any cross-border transfers.
      </p>

      <h2>7. Retention</h2>
      <ul>
        <li>Boarding-pass scans: stored on-device only by default, deleted when you clear your profile.</li>
        <li>Booking records: 7 years (tax and dispute requirements).</li>
        <li>Account data: until you delete your account, then purged within 30 days.</li>
        <li>Crash logs: 90 days.</li>
      </ul>

      <h2>8. Your rights</h2>
      <p>You have the right to access, correct, delete, port, or restrict processing of your data, and to object to or
        withdraw consent at any time. Submit any request via our <a href="/data-deletion">Data Deletion page</a> or
        email <a href="mailto:privacy@connectionrescue.app">privacy@connectionrescue.app</a>. We respond within 30 days.</p>
      <p>
        California residents have additional rights under the CCPA/CPRA, including the right to know and the right to
        delete. We do not "sell" or "share" personal information as those terms are defined under California law.
      </p>

      <h2>9. Children</h2>
      <p>ConnectionRescue is not intended for users under 13 (or 16 in the EEA). We do not knowingly collect data from
        children. If you believe a child has provided us data, contact us and we'll delete it.</p>

      <h2>10. Security</h2>
      <p>We use TLS in transit, AES-256 at rest, role-based access controls, and an annual third-party penetration
        test. No system is perfectly secure — please use a strong, unique password.</p>

      <h2>11. Changes to this policy</h2>
      <p>We'll notify you via email and in-app banner at least 30 days before any material change takes effect.</p>

      <h2>12. Contact</h2>
      <p>
        ConnectionRescue, Inc.<br />
        1209 Orange Street, Wilmington, DE 19801, USA<br />
        <a href="mailto:privacy@connectionrescue.app">privacy@connectionrescue.app</a>
      </p>
    </LegalLayout>
  );
};

export default Privacy;
