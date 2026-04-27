import React, { useState } from 'react';
import LegalLayout from '@/components/legal/LegalLayout';
import { Mail, MessageSquare, Building2, Headphones, Users, AlertTriangle, CheckCircle } from 'lucide-react';

const Contact: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', topic: 'support', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.message) return;
    setStatus('loading');
    const subject = `ConnectionRescue contact: ${form.topic}`;
    const body = [
      `Name: ${form.name || 'Not provided'}`,
      `Email: ${form.email}`,
      `Topic: ${form.topic}`,
      '',
      form.message,
    ].join('\n');

    window.location.href = `mailto:help@connectionrescue.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus('success');
    setForm({ name: '', email: '', topic: 'support', message: '' });
  };

  const channels = [
    { icon: Headphones, title: '24/7 Traveler Support', desc: 'Active rescue, billing, account help', email: 'help@connectionrescue.app', sla: 'Avg. 4 min response' },
    { icon: Building2, title: 'Airline & Airport Sales', desc: 'SaaS partnerships, white-label, kiosks', email: 'sales@connectionrescue.app', sla: '1 business day' },
    { icon: Users, title: 'Press', desc: 'Media inquiries and assets', email: 'press@connectionrescue.app', sla: '2 business days' },
    { icon: AlertTriangle, title: 'Security & Privacy', desc: 'Vulnerabilities, GDPR/CCPA requests', email: 'security@connectionrescue.app', sla: '24 hours' },
  ];

  return (
    <LegalLayout
      title="Contact"
      subtitle="Real humans, fast responses. Pick the right channel below."
    >
      <div className="not-prose grid sm:grid-cols-2 gap-3 my-6">
        {channels.map(({ icon: Icon, title, desc, email, sla }) => (
          <a
            key={email}
            href={`mailto:${email}`}
            className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-red-300 hover:shadow-md transition group"
          >
            <Icon className="w-5 h-5 text-red-600 mb-3" />
            <p className="font-bold text-slate-900">{title}</p>
            <p className="text-sm text-slate-600 mt-0.5">{desc}</p>
            <p className="text-sm text-red-600 font-medium mt-2 group-hover:underline">{email}</p>
            <p className="text-xs text-slate-500 mt-1">{sla}</p>
          </a>
        ))}
      </div>

      <h2>Or send us a message</h2>
      <form onSubmit={handleSubmit} className="not-prose space-y-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              placeholder="Jane Traveler"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                placeholder="you@email.com"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">Topic</label>
          <select
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white"
          >
            <option value="support">Traveler support</option>
            <option value="billing">Billing or refund</option>
            <option value="partnership">Partnership / sales</option>
            <option value="press">Press inquiry</option>
            <option value="privacy">Privacy / data request</option>
            <option value="bug">Bug report</option>
            <option value="other">Something else</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">Message</label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <textarea
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              placeholder="Tell us what's going on. Include flight numbers if relevant."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white font-semibold hover:from-red-700 hover:to-red-900 transition disabled:opacity-60"
        >
          {status === 'loading' ? 'Sending…' : 'Send message'}
        </button>

        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
            <CheckCircle className="w-4 h-4" /> Got it — we'll reply within the SLA above.
          </div>
        )}
      </form>

      <h2>Mailing address</h2>
      <p>
        ConnectionRescue, Inc.<br />
        1209 Orange Street, Wilmington, DE 19801, USA
      </p>
    </LegalLayout>
  );
};

export default Contact;
