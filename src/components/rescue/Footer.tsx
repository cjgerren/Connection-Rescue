import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Mail, CheckCircle, Shield, Lock } from 'lucide-react';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    const subject = 'ConnectionRescue alert signup';
    const body = [
      `Email: ${email}`,
      '',
      'Please add me to ConnectionRescue rescue alerts and product updates.',
    ].join('\n');

    window.location.href = `mailto:help@connectionrescue.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus('success');
    setEmail('');
  };

  // Mix of internal routes (Link) and placeholders (a href="#")
  const sections: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
    {
      title: 'Travelers',
      links: [
        { label: 'Mobile App', href: '#' },
        { label: 'Rescue Plans', href: '#' },
        { label: 'Lounge Network', href: '#' },
        { label: 'Hotel Partners', href: '#' },
        { label: 'Membership Wallet', href: '#' },
      ],
    },
    {
      title: 'For Airlines',
      links: [
        { label: 'SaaS Integration', href: '#' },
        { label: 'API Docs', href: '#' },
        { label: 'Operations Console', href: '#' },
        { label: 'White Label', href: '#' },
        { label: 'Pricing', href: '#' },
      ],
    },
    {
      title: 'For Airports',
      links: [
        { label: 'Terminal Kiosks', href: '#' },
        { label: 'Lounge Partners', href: '#' },
        { label: 'Concierge Network', href: '#' },
        { label: 'Case Studies', href: '#' },
        { label: 'Contact Sales', to: '/contact' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', to: '/about' },
        { label: 'Contact', to: '/contact' },
        { label: 'Press Kit', href: '#' },
        { label: 'Privacy', to: '/privacy' },
        { label: 'Terms', to: '/terms' },
      ],
    },
  ];

  return (
    <footer className="bg-[#0a1d3a] text-blue-100 mt-12">
      {/* CTA strip */}
      <div className="border-y border-white/10 bg-gradient-to-r from-red-700 to-red-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-2xl font-bold text-white">Get rescue alerts before you even know you need them.</h3>
            <p className="text-red-100/90 text-sm mt-1">Real-time disruption monitoring + first-class recovery, in your inbox.</p>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full lg:w-auto gap-2">
            <div className="relative flex-1 lg:w-80">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/15 border border-white/25 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-5 py-3 rounded-lg bg-white text-red-700 font-bold hover:bg-blue-50 transition disabled:opacity-60"
            >
              {status === 'loading' ? '...' : status === 'success' ? 'Subscribed' : 'Subscribe'}
            </button>
          </form>
          {status === 'success' && (
            <div className="flex items-center gap-1 text-white text-sm">
              <CheckCircle className="w-4 h-4" /> Your email app is ready.
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-6 gap-8">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                <Plane className="w-5 h-5 text-white -rotate-45" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">
                  Connection<span className="text-red-500">Rescue</span>
                </p>
                <p className="text-blue-200/70 text-[10px] uppercase tracking-widest mt-0.5">First Class Recovery</p>
              </div>
            </Link>
            <p className="mt-4 text-sm text-blue-200/80 leading-relaxed max-w-sm">
              Travel disruption recovery for travelers, airlines, and airports. Rebook flights, secure hotels, and access lounges in seconds — wherever you are.
            </p>
            <div className="mt-5 flex gap-2">
              <a href="#" className="px-3 py-2 rounded-lg bg-black text-white text-xs font-medium border border-white/15 hover:bg-white/10 transition">
                App Store
              </a>
              <a href="#" className="px-3 py-2 rounded-lg bg-black text-white text-xs font-medium border border-white/15 hover:bg-white/10 transition">
                Google Play
              </a>
            </div>
            {/* Trust badges */}
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-blue-200/80 uppercase tracking-wider">
                <Shield className="w-3 h-3" /> SOC 2 Type II
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-blue-200/80 uppercase tracking-wider">
                <Lock className="w-3 h-3" /> GDPR · CCPA
              </div>
            </div>
          </div>

          {sections.map((s) => (
            <div key={s.title}>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">{s.title}</h4>
              <ul className="space-y-2">
                {s.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className="text-sm text-blue-200/80 hover:text-white transition">
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="text-sm text-blue-200/80 hover:text-white transition">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-200/60">
          <p>© 2026 ConnectionRescue, Inc. Not affiliated with any airline carrier.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/cookies" className="hover:text-white">Cookies</Link>
            <Link to="/data-deletion" className="hover:text-white">Data Deletion</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
