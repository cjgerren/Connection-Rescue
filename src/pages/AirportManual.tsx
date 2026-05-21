import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plane,
  ShieldCheck,
  ClipboardList,
  Route,
  Bell,
  CreditCard,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Database,
  TerminalSquare,
} from 'lucide-react';

type Step = { title: string; detail: string };
type Item = { name: string; detail: string; status?: 'live' | 'partial' | 'planned' };

const travelerQuickStart: Step[] = [
  { title: 'Open the app home page', detail: 'Start at the main rescue screen and keep the traveler with you.' },
  { title: 'Tap “Get started” in profile setup', detail: 'Scan boarding pass or use demo fallback if camera fails.' },
  { title: 'Allow location (recommended)', detail: 'This improves lounge/gate relevance. Skip is allowed.' },
  { title: 'Track flight', detail: 'Enter flight number in the top search bar and press Track.' },
  { title: 'Pick 1 flight option', detail: 'Choose the best route suggestion first (same destination preferred).' },
  { title: 'Pick hotel/lounges only if needed', detail: 'Add these only when disruption requires it.' },
  { title: 'Press Confirm in green bar', detail: 'Enter traveler email and optional phone, then pay in Stripe.' },
  { title: 'Wait for success page', detail: 'Verify booking ID and payment status on /booking-success.' },
  { title: 'If traveler leaves payment', detail: 'Use /booking-cancelled guidance and retry checkout.' },
];

const travelerFeatures: Item[] = [
  { name: 'Boarding pass scan', detail: 'Parses traveler/flight fields from image via edge function.', status: 'live' },
  { name: 'Location-aware personalization', detail: 'Stores local location context for rescue relevance.', status: 'live' },
  { name: 'Live delay insight + flight status', detail: 'Uses backend delay insight endpoint with traveler report feedback loop.', status: 'live' },
  { name: '3-step rescue planner', detail: 'Flight suggestions, hotel options, lounge options with guided selection.', status: 'live' },
  { name: 'Secure checkout', detail: 'Stripe checkout for service fee and selected add-ons.', status: 'live' },
  { name: 'Booking confirmation flow', detail: 'Success and cancellation pages with clear next actions.', status: 'live' },
  { name: 'Traveler alert timeline', detail: 'OTP login + timeline of detected changes and delivery records.', status: 'live' },
];

const adminFeatures: Item[] = [
  { name: 'Ops Console (/admin)', detail: 'Polling health KPIs, snapshot table, run charts, run detail drawer.', status: 'live' },
  { name: 'Run Detail Drawer', detail: 'Inspect per-flight changes and replay booking emails.', status: 'live' },
  { name: 'Rescue Queue (/admin/rescues)', detail: 'Task queue monitoring with resend/cancel controls.', status: 'live' },
  { name: 'Admin Team (/admin/team)', detail: 'Owner-gated invite/role/revoke management.', status: 'live' },
  { name: 'Audit Log (/admin/audit)', detail: 'Action history for admin/team/rescue mutations.', status: 'live' },
  { name: 'SMS Log (/admin/sms)', detail: 'Inbound SMS log UI is live; provider send path is still stubbed.', status: 'partial' },
];

const apiMap: Item[] = [
  { name: 'GET /health', detail: 'Service health + provider-env flags.' },
  { name: 'GET /api/flights/status', detail: 'Live flight status lookup.' },
  { name: 'GET /api/flights/delay-insight', detail: 'Delay cause/ETA/action insight for a flight.' },
  { name: 'POST /api/delay-reports', detail: 'Traveler-reported delay signals + insight recompute.' },
  { name: 'POST /api/payments/create-checkout-session', detail: 'Creates Stripe session from selected rescue plan.' },
  { name: 'GET /api/payments/checkout-session/:sessionId', detail: 'Checkout/payment/booking status lookup.' },
  { name: 'POST /api/webhooks/stripe', detail: 'Stripe event ingestion and booking/task persistence.' },
  { name: 'POST /api/feedback/concierge-interest', detail: 'Captures concierge demand signals.' },
];

const edgeMap: Item[] = [
  { name: 'verify-admin', detail: 'Checks/promotes admin user by invite/owner rules.', status: 'live' },
  { name: 'manage-admins', detail: 'Owner-only list/invite/remove/role/revoke mutations.', status: 'live' },
  { name: 'parse-boarding-pass', detail: 'OCR-style boarding pass extraction (with fallback behavior).', status: 'live' },
  { name: 'process-rescue-tasks', detail: 'Processes queued rescue tasks and sends option emails.', status: 'live' },
  { name: 'send-booking-email', detail: 'Admin replay/manual email dispatch.', status: 'live' },
  { name: 'send-booking-sms', detail: 'Currently returns “not configured” (501 stub).', status: 'partial' },
];

const troubleRows: Step[] = [
  { title: 'Flight not found', detail: 'Continue with manual rescue plan option and still complete checkout if needed.' },
  { title: 'OCR scan fails', detail: 'Use better-lit image or demo fallback, then manually correct fields in review step.' },
  { title: 'Stripe not opening', detail: 'Check backend URL/CORS/env; retry from Confirm bar after refresh.' },
  { title: 'Booking success delayed', detail: 'Wait 10-15 seconds for webhook persistence; page auto-polls status.' },
  { title: 'Admin cannot access', detail: 'Confirm account is invited/admin via /admin/team and verify-admin function.' },
  { title: 'SMS expected but absent', detail: 'Current MVP sends email-first; SMS send path is not enabled yet.' },
];

const badgeClass = (status?: Item['status']) => {
  if (status === 'live') return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40';
  if (status === 'partial') return 'bg-amber-500/15 text-amber-200 border-amber-500/40';
  if (status === 'planned') return 'bg-blue-500/15 text-blue-200 border-blue-500/40';
  return 'bg-white/10 text-blue-100 border-white/20';
};

const statusLabel = (status?: Item['status']) => {
  if (status === 'live') return 'Live';
  if (status === 'partial') return 'Partial';
  if (status === 'planned') return 'Planned';
  return 'Info';
};

const AirportManual: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1024] via-[#0b1228] to-[#0a1024] text-white">
      <header className="sticky top-0 z-30 bg-[#0a1024]/90 backdrop-blur border-b border-red-600/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-blue-200/80 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to App
          </Link>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-red-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            Airport Operations Manual
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="text-[11px] uppercase tracking-widest text-red-300/80 font-bold">ConnectionRescue</div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
            Airport Handoff Manual
          </h1>
          <p className="mt-3 text-blue-100/80">
            This is the plain-English field guide for gate agents, supervisors, IROP desks, and traveler support staff.
            It explains exactly what the app does, what each feature means operationally, and the simplest step-by-step way to run a rescue.
          </p>
          <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs">
            <Kpi icon={<Plane className="w-4 h-4" />} label="Traveler Journey" value="Profile → Track → Rescue → Pay" />
            <Kpi icon={<TerminalSquare className="w-4 h-4" />} label="Ops Console" value="Health + Queue + Audit" />
            <Kpi icon={<Database className="w-4 h-4" />} label="Core Stack" value="React + Express + Supabase + Stripe" />
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <Card title="Barney-Style Walkthrough (Quick Start)" icon={<ClipboardList className="w-4 h-4 text-red-300" />}>
            <ol className="space-y-2">
              {travelerQuickStart.map((s, idx) => (
                <li key={s.title} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-xs font-bold text-red-300">Step {idx + 1}: {s.title}</div>
                  <div className="text-sm text-blue-100/85">{s.detail}</div>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="What Staff Should Say" icon={<Users className="w-4 h-4 text-blue-300" />}>
            <div className="space-y-2 text-sm text-blue-100/85">
              <Quote line="I’ll walk you through this in under 2 minutes." />
              <Quote line="We’ll scan your pass, pick your best rescue options, and confirm payment securely." />
              <Quote line="If your payment doesn’t finish, no charge is made and we can retry instantly." />
              <Quote line="If live flight data is flaky, we can still continue with manual rescue guidance." />
              <Quote line="You’ll get confirmation and updates by email; timeline is available on Alerts." />
            </div>
          </Card>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <Card title="Traveler Features" icon={<Route className="w-4 h-4 text-emerald-300" />}>
            <FeatureList items={travelerFeatures} />
          </Card>
          <Card title="Admin/Ops Features" icon={<Settings className="w-4 h-4 text-amber-300" />}>
            <FeatureList items={adminFeatures} />
          </Card>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <Card title="Backend API Map" icon={<TerminalSquare className="w-4 h-4 text-purple-300" />}>
            <FeatureList items={apiMap} />
          </Card>
          <Card title="Supabase Edge Functions" icon={<Database className="w-4 h-4 text-cyan-300" />}>
            <FeatureList items={edgeMap} />
          </Card>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <Card title="Troubleshooting (Fast)" icon={<AlertTriangle className="w-4 h-4 text-rose-300" />}>
            <ul className="space-y-2">
              {troubleRows.map((row) => (
                <li key={row.title} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-xs font-bold text-rose-300">{row.title}</div>
                  <div className="text-sm text-blue-100/85">{row.detail}</div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="MVP Boundaries (Important)" icon={<ShieldCheck className="w-4 h-4 text-amber-300" />}>
            <ul className="space-y-2 text-sm text-blue-100/85">
              <Boundary ok text="Live: Flight status + delay insight + rescue option flow + Stripe checkout + admin ops queue." />
              <Boundary ok text="Live: Traveler Alerts page with OTP sign-in and timeline view." />
              <Boundary warn text="Partial: SMS send is not fully enabled; email path is primary right now." />
              <Boundary warn text="Guidance model: Flight suggestions are advisory; airfare purchase happens directly with the airline." />
              <Boundary ok text="Auditability: Admin actions and rescue task changes are persisted for traceability." />
            </ul>
          </Card>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <div className="text-sm text-blue-100/80">
            Manual screen path: <span className="font-mono text-white">/airport-manual</span>
          </div>
          <div className="text-xs text-blue-300/60 mt-1">
            Companion print-friendly doc: <span className="font-mono">docs/airport-operations-manual.md</span>
          </div>
        </section>
      </main>
    </div>
  );
};

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
    {children}
  </section>
);

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
    <div className="text-[10px] uppercase tracking-wider text-blue-300/70 font-bold flex items-center gap-1.5">
      {icon}
      {label}
    </div>
    <div className="text-sm font-semibold text-white mt-1">{value}</div>
  </div>
);

const FeatureList: React.FC<{ items: Item[] }> = ({ items }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item.name} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-white">{item.name}</div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeClass(item.status)}`}>
            {statusLabel(item.status)}
          </span>
        </div>
        <div className="text-xs text-blue-100/75 mt-0.5">{item.detail}</div>
      </li>
    ))}
  </ul>
);

const Quote: React.FC<{ line: string }> = ({ line }) => (
  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">{line}</div>
);

const Boundary: React.FC<{ ok?: boolean; warn?: boolean; text: string }> = ({ ok, warn, text }) => (
  <li className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 flex items-start gap-2">
    {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5" /> : null}
    {warn ? <XCircle className="w-4 h-4 text-amber-300 mt-0.5" /> : null}
    <span>{text}</span>
  </li>
);

export default AirportManual;
