import React from 'react';
import LegalLayout from '@/components/legal/LegalLayout';

const Terms: React.FC = () => {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The agreement between you and ConnectionRescue when you use our app or services."
    >
      <h2>1. Acceptance</h2>
      <p>By creating an account or using ConnectionRescue, you agree to these Terms and our <a href="/privacy">Privacy Policy</a>.
        If you don't agree, don't use the service. If you're using the service for an organization, you confirm you have authority to bind that organization.</p>

      <h2>2. The service</h2>
      <p>ConnectionRescue helps travelers recover from flight disruptions by surfacing rebooking options, hotels, and
        lounges. <strong>We are a technology platform, not an airline, hotel, or travel agency.</strong> All travel
        services are provided by third-party suppliers under their own terms.</p>

      <h2>3. Eligibility</h2>
      <p>You must be at least 18 years old (or the age of majority in your jurisdiction) to make bookings. Users
        between 13–17 may use informational features with parental consent.</p>

      <h2>4. Your account</h2>
      <ul>
        <li>Provide accurate information and keep it current.</li>
        <li>Keep your credentials confidential. You're responsible for activity on your account.</li>
        <li>Notify us immediately at <a href="mailto:security@connectionrescue.app">security@connectionrescue.app</a> if you suspect unauthorized access.</li>
      </ul>

      <h2>5. Bookings and payments</h2>
      <ul>
        <li>Prices, availability, and rules are set by the underlying airline, hotel, or lounge operator.</li>
        <li>Cancellation, refund, and change policies are set by the supplier and disclosed before checkout.</li>
        <li>Payments are processed by Stripe. You authorize us to charge your selected payment method.</li>
        <li>A non-refundable Rescue Assist fee may apply per rescue booking; this is shown clearly before payment.</li>
      </ul>

      <h2>6. Refunds</h2>
      <p>Supplier refunds are governed by the supplier. ConnectionRescue Rescue Assist fees are refundable within 24 hours of
        purchase if no booking has been delivered. Email <a href="mailto:billing@connectionrescue.app">billing@connectionrescue.app</a> with your confirmation code to request a refund.</p>


      <h2>7. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the service for unlawful purposes or to violate any third-party rights.</li>
        <li>Scrape, reverse-engineer, or interfere with the service.</li>
        <li>Submit false boarding-pass data or impersonate another traveler.</li>
        <li>Resell or redistribute access without written permission.</li>
      </ul>

      <h2>8. Intellectual property</h2>
      <p>The ConnectionRescue name, logo, software, and content are owned by ConnectionRescue, Inc. We grant you a
        limited, revocable, non-exclusive license to use the app for personal travel purposes. You retain ownership of
        any content you submit but grant us a license to use it to operate the service.</p>

      <h2>9. Disclaimers</h2>
      <p>The service is provided "as is" and "as available." We do not warrant that flight, hotel, or lounge data is
        complete, accurate, or uninterrupted. Travel suppliers may change or cancel services at any time. <strong>Use of
        ConnectionRescue does not guarantee that a flight will be rebooked, a hotel will be available, or a lounge will
        admit you.</strong></p>

      <h2>10. Limitation of liability</h2>
      <p>To the maximum extent permitted by law, ConnectionRescue's total liability to you for any claim arising from
        the service is limited to the greater of (a) the fees you paid us in the 12 months before the claim or (b)
        US$100. We are not liable for indirect, incidental, special, or consequential damages, including missed
        connections, lost luggage, or trip cancellations caused by suppliers.</p>

      <h2>11. Indemnification</h2>
      <p>You agree to indemnify ConnectionRescue against claims arising from your misuse of the service or violation of these Terms.</p>

      <h2>12. Termination</h2>
      <p>We may suspend or terminate your account for violation of these Terms or to comply with law. You may delete
        your account at any time via <a href="/data-deletion">Data Deletion</a>.</p>

      <h2>13. Governing law and disputes</h2>
      <p>These Terms are governed by the laws of the State of Delaware, USA. Disputes will be resolved by binding
        individual arbitration administered by JAMS in San Francisco, California, except that either party may seek
        injunctive relief in court. <strong>You waive any right to a jury trial or class action.</strong> EU/UK consumers retain
        any non-waivable rights under local law.</p>

      <h2>14. Changes</h2>
      <p>We may update these Terms; material changes take effect 30 days after notice. Continued use means acceptance.</p>

      <h2>15. Contact</h2>
      <p>
        ConnectionRescue, Inc.<br />
        1209 Orange Street, Wilmington, DE 19801, USA<br />
        <a href="mailto:legal@connectionrescue.app">legal@connectionrescue.app</a>
      </p>
    </LegalLayout>
  );
};

export default Terms;
