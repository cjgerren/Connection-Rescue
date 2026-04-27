import React from 'react';
import LegalLayout from '@/components/legal/LegalLayout';
import { Plane, Building2, MapPin, Users, Award, Globe2 } from 'lucide-react';

const About: React.FC = () => {
  return (
    <LegalLayout
      title="About ConnectionRescue"
      subtitle="First-class recovery for the 1-in-5 flights that go sideways."
    >
      <h2>Why we exist</h2>
      <p>Every year, more than 800 million travelers experience a flight delay or cancellation. Most spend hours in
        line, scrambling for a hotel, or sleeping at a gate. ConnectionRescue was founded in 2024 by former airline
        operations engineers and frequent flyers who were tired of watching the same broken playbook unfold over and over.</p>
      <p>We built the rescue layer the airlines didn't — independent of any single carrier, working in your pocket the
        moment something goes wrong.</p>

      <h2>What we do</h2>
      <ul>
        <li><strong>Detect disruptions</strong> in real time across 200+ airlines.</li>
        <li><strong>Rebook flights</strong> with award-aware fare search and elite-priority routing.</li>
        <li><strong>Secure hotels</strong> at distressed-rate inventory near your stranded airport.</li>
        <li><strong>Open lounges</strong> with same-day passes and partner-network access.</li>
      </ul>

      <h2 className="not-prose sr-only">Stats</h2>
      <div className="not-prose grid sm:grid-cols-3 gap-4 my-8">
        {[
          { icon: Users, stat: '180K+', label: 'Travelers rescued' },
          { icon: Plane, stat: '92%', label: 'Same-day rebook rate' },
          { icon: Globe2, stat: '47', label: 'Countries supported' },
        ].map(({ icon: Icon, stat, label }) => (
          <div key={label} className="p-5 rounded-2xl border border-slate-200 bg-white">
            <Icon className="w-5 h-5 text-red-600 mb-2" />
            <p className="text-3xl font-bold text-slate-900">{stat}</p>
            <p className="text-sm text-slate-600 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <h2>The company</h2>
      <p>
        <strong>ConnectionRescue, Inc.</strong> is a Delaware C-Corp headquartered in San Francisco with a remote
        engineering team across North America and Europe. We are backed by aviation-focused angel investors and a
        seed round closed in Q4 2025.
      </p>

      <h2 className="not-prose sr-only">Pillars</h2>
      <div className="not-prose grid sm:grid-cols-2 gap-4 my-8">
        <div className="p-5 rounded-2xl border border-slate-200">
          <Building2 className="w-5 h-5 text-red-600 mb-2" />
          <p className="font-bold text-slate-900">Independent</p>
          <p className="text-sm text-slate-600 mt-1">Not owned by any airline or GDS. We work for travelers, not carriers.</p>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200">
          <Award className="w-5 h-5 text-red-600 mb-2" />
          <p className="font-bold text-slate-900">First-class by default</p>
          <p className="text-sm text-slate-600 mt-1">Recovery options are sorted by quality, not commission.</p>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200">
          <MapPin className="w-5 h-5 text-red-600 mb-2" />
          <p className="font-bold text-slate-900">Privacy-first</p>
          <p className="text-sm text-slate-600 mt-1">Boarding-pass data lives on your device. We don't sell anything.</p>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200">
          <Plane className="w-5 h-5 text-red-600 mb-2" />
          <p className="font-bold text-slate-900">Operator-grade data</p>
          <p className="text-sm text-slate-600 mt-1">Sub-60-second disruption detection from primary feeds.</p>
        </div>
      </div>

      <h2>Press & partnerships</h2>
      <p>
        Press: <a href="mailto:press@connectionrescue.app">press@connectionrescue.app</a><br />
        Partnerships: <a href="mailto:partners@connectionrescue.app">partners@connectionrescue.app</a><br />
        Investors: <a href="mailto:ir@connectionrescue.app">ir@connectionrescue.app</a>
      </p>

      <h2>Headquarters</h2>
      <p>
        ConnectionRescue, Inc.<br />
        1209 Orange Street, Wilmington, DE 19801, USA<br />
        SF Office: 535 Mission St, San Francisco, CA 94105
      </p>
    </LegalLayout>
  );
};

export default About;
