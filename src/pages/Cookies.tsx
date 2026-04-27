import React from 'react';
import LegalLayout from '@/components/legal/LegalLayout';

const Cookies: React.FC = () => {
  return (
    <LegalLayout
      title="Cookie Policy"
      subtitle="What we store on your device and why."
    >
      <h2>What are cookies?</h2>
      <p>Cookies and similar technologies (localStorage, IndexedDB, SDK identifiers) are small data files placed on
        your device. We use them to keep you signed in, remember preferences, and measure how the app performs.</p>

      <h2>Categories we use</h2>
      <h3>Strictly necessary</h3>
      <p>Required for the service. Includes session tokens, CSRF protection, and your boarding-pass profile (stored
        only on your device unless you sync). Cannot be disabled.</p>

      <h3>Functional</h3>
      <p>Remembers preferences like language, theme, and recent searches.</p>

      <h3>Analytics</h3>
      <p>Anonymized usage data via PostHog (self-hosted). IP addresses are truncated. You can opt out in Settings.</p>

      <h3>Marketing</h3>
      <p>We do <strong>not</strong> use third-party advertising cookies.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Use the consent banner shown on first visit (EEA / UK / California).</li>
        <li>Adjust analytics in Settings → Privacy.</li>
        <li>Clear cookies in your browser or app settings.</li>
      </ul>

      <h2>Contact</h2>
      <p>Questions: <a href="mailto:privacy@connectionrescue.app">privacy@connectionrescue.app</a></p>
    </LegalLayout>
  );
};

export default Cookies;
