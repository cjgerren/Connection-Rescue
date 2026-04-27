import React from 'react';
import { Bell, User, Plane, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import FlightSearch, { LiveFlight } from './FlightSearch';
import { useTraveler } from '@/contexts/TravelerContext';

interface HeaderProps {
  activeView: string;
  setActiveView: (v: string) => void;
  onFlightFound: (f: LiveFlight) => void;
  onOpenPersonalize: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, onFlightFound, onOpenPersonalize }) => {
  const { profile, hasProfile } = useTraveler();
  const bp = profile.boardingPass;
  const firstName = bp?.passengerName?.split('/')?.pop()?.split(' ')?.[0] || '';
  const tier = bp?.loyaltyTier || 'Exec Platinum';
  const displayName = firstName ? `${firstName.charAt(0)}. ${(bp?.passengerName?.split('/')?.[0] || '').charAt(0).toUpperCase() + (bp?.passengerName?.split('/')?.[0] || '').slice(1).toLowerCase()}` : 'J. Carter';

  const tabs = [
    { id: 'rescue', label: 'Rescue Plan' },
    { id: 'flights', label: 'Rebook Flight' },
    { id: 'hotels', label: 'Hotels' },
    { id: 'lounges', label: 'Lounges' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-[#0a1d3a] via-[#0d2347] to-[#0a1d3a] border-b border-red-600/40 shadow-lg shadow-red-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-red-600 blur-md opacity-60" />
              <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                <Plane className="w-5 h-5 text-white -rotate-45" strokeWidth={2.5} />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-bold text-lg tracking-tight leading-none">
                Connection<span className="text-red-500">Rescue</span>
              </h1>
              <p className="text-blue-200/70 text-[10px] uppercase tracking-widest">First Class Recovery</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="hidden md:block flex-1 max-w-md">
            <FlightSearch onResult={onFlightFound} compact />
          </div>

          <nav className="hidden xl:flex items-center gap-1 bg-white/5 backdrop-blur rounded-full p-1 border border-white/10">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveView(t.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeView === t.id
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {/* Personalize button — prominent if not set up */}
            <button
              onClick={onOpenPersonalize}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                hasProfile
                  ? 'bg-white/10 hover:bg-white/15 text-blue-100 border border-white/15'
                  : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/30 hover:shadow-red-600/50 animate-pulse'
              }`}
              title="Scan boarding pass & share location"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {hasProfile ? 'My Trip' : 'Personalize'}
            </button>

            <Link
              to="/alerts"
              className="relative p-2 text-blue-100 hover:text-white transition"
              aria-label="Alert history"
              title="View your alert timeline"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </Link>
            <button
              onClick={onOpenPersonalize}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 transition"
              title={hasProfile ? 'Manage profile' : 'Set up your profile'}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-white text-xs font-semibold leading-none truncate max-w-[80px]">{displayName}</p>
                <p className="text-blue-200/70 text-[10px] leading-none mt-0.5 truncate max-w-[80px]">{tier}</p>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-3">
          <FlightSearch onResult={onFlightFound} compact />
        </div>

        {/* Tabs (mobile + tablet) */}
        <nav className="xl:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveView(t.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                activeView === t.id
                  ? 'bg-red-600 text-white'
                  : 'bg-white/5 text-blue-100 border border-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={onOpenPersonalize}
            className={`sm:hidden ml-auto px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              hasProfile ? 'bg-white/5 text-blue-100 border border-white/10' : 'bg-red-600 text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            {hasProfile ? 'Trip' : 'Setup'}
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
