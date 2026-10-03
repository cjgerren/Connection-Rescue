import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './rescue/Header';
import Hero from './rescue/Hero';
import RescuePlan from './rescue/RescuePlan';
import PricingSection from './rescue/PricingSection';
import FlightRebook from './rescue/FlightRebook';
import HotelRescue from './rescue/HotelRescue';
import LoungeAccess from './rescue/LoungeAccess';
import DemoModeCoach from './rescue/DemoModeCoach';
import Footer from './rescue/Footer';
import ConfirmationBar from './rescue/ConfirmationBar';
import PersonalizeModal from './rescue/PersonalizeModal';
import RescueAssistGate from './rescue/RescueAssistGate';
import { Flight, Hotel, Lounge, ORIGINAL_FLIGHT } from '@/data/rescueData';
import { LiveFlight } from './rescue/FlightSearch';
import { useTraveler } from '@/contexts/TravelerContext';
import { useRescueInventory } from '@/hooks/useRescueInventory';
import { useRescueAccess } from '@/hooks/useRescueAccess';
import { RESCUE_SERVICE_FEE_CENTS } from '@/lib/api';

const AppLayout: React.FC = () => {
  const [activeView, setActiveView] = useState('rescue');
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedLounge, setSelectedLounge] = useState<Lounge | null>(null);
  const [liveFlight, setLiveFlight] = useState<LiveFlight | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [searchParams] = useSearchParams();
  const { hasProfile, profile } = useTraveler();
  const displayedFlightNumber = liveFlight?.flightNumber
    || searchParams.get('flight')
    || profile.boardingPass?.flightNumber
    || ORIGINAL_FLIGHT.flightNum;
  const assistPrice = `$${(RESCUE_SERVICE_FEE_CENTS / 100).toFixed(2)}`;
  const access = useRescueAccess(displayedFlightNumber);
  const optionsUnlocked = access.unlocked;
  const inventory = useRescueInventory({
    airportIata: liveFlight?.departure.airport || profile.boardingPass?.from || ORIGINAL_FLIGHT.from,
    destinationIata: liveFlight?.arrival.airport || profile.boardingPass?.to || ORIGINAL_FLIGHT.to,
    destinationCity: liveFlight?.arrival.city || profile.boardingPass?.toCity || ORIGINAL_FLIGHT.toCity,
    enabled: optionsUnlocked,
  });
  const routeLabel = `${liveFlight?.departure.airport || profile.boardingPass?.from || ORIGINAL_FLIGHT.from} → ${liveFlight?.arrival.airport || profile.boardingPass?.to || ORIGINAL_FLIGHT.to}`;

  const requestView = (view: string) => {
    const gated = view === 'flights' || view === 'hotels' || view === 'lounges';
    if (gated && !optionsUnlocked) {
      setActiveView('rescue-assist');
      return;
    }
    setActiveView(view);
  };

  // Auto-open the personalize modal on first visit (no setup yet)
  useEffect(() => {
    if (!hasProfile && !profile.setupCompletedAt) {
      const t = setTimeout(() => setPersonalizeOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [hasProfile, profile.setupCompletedAt]);

  useEffect(() => {
    if (activeView === 'rescue') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(activeView);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeView]);

  const handleFlightFound = (flight: LiveFlight) => {
    setLiveFlight(flight);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveView('rescue');
  };

  const handleFlightUpdated = (flight: LiveFlight) => {
    setLiveFlight(flight);
  };

  const handleClear = () => {
    setSelectedFlight(null);
    setSelectedHotel(null);
    setSelectedLounge(null);
  };

  const runDemoFlight = () => {
    const demoLiveFlight: LiveFlight = {
      source: 'demo',
      flightNumber: ORIGINAL_FLIGHT.flightNum.replace(/\s+/g, ''),
      carrier: 'American Airlines',
      status: 'Delayed',
      statusRaw: 'DELAYED',
      delayMinutes: 95,
      reason: 'Thunderstorms over the New York metro corridor. Estimated departure now 8:20 PM.',
      departure: {
        airport: ORIGINAL_FLIGHT.from,
        city: "Chicago O'Hare",
        gate: ORIGINAL_FLIGHT.gate,
        terminal: '3',
        scheduled: new Date().toISOString(),
        estimated: new Date(Date.now() + 95 * 60 * 1000).toISOString(),
        actual: null,
      },
      arrival: {
        airport: ORIGINAL_FLIGHT.to,
        city: ORIGINAL_FLIGHT.toCity,
        gate: null,
        terminal: 'B',
        scheduled: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
        estimated: new Date(Date.now() + 275 * 60 * 1000).toISOString(),
        actual: null,
      },
      aircraft: 'Boeing 737-800',
      live: null,
      usedFallback: true,
      apiConfigured: true,
      delayInsight: null,
    };

    setLiveFlight(demoLiveFlight);
  };

  const startDemoMode = () => {
    setDemoMode(true);
    setDemoStep(0);
    setActiveView('rescue');
    setPersonalizeOpen(false);
    handleClear();
    setLiveFlight(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stopDemoMode = () => {
    setDemoMode(false);
    setDemoStep(0);
  };

  const runDemoStep = () => {
    if (demoStep === 0) {
      runDemoFlight();
      setDemoStep(1);
      setActiveView(optionsUnlocked ? 'flights' : 'rescue-assist');
      return;
    }
    if (!optionsUnlocked) {
      setActiveView('rescue-assist');
      return;
    }
    if (demoStep === 1) {
      setSelectedFlight(inventory.flights.find((flight) => (flight.sameDest ?? false)) || inventory.flights[0] || null);
      setDemoStep(2);
      setActiveView('hotels');
      return;
    }
    if (demoStep === 2) {
      setSelectedHotel(inventory.hotels[0] || null);
      setDemoStep(3);
      setActiveView('lounges');
      return;
    }
    if (demoStep === 3) {
      setSelectedLounge(inventory.lounges[0] || null);
      setDemoStep(4);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }
    stopDemoMode();
  };

  useEffect(() => {
    if (!demoMode || !optionsUnlocked) return;

    if (demoStep === 1 && selectedFlight) {
      setDemoStep(2);
      setActiveView('hotels');
      return;
    }
    if (demoStep === 2 && selectedHotel) {
      setDemoStep(3);
      setActiveView('lounges');
      return;
    }
    if (demoStep === 3 && selectedLounge) {
      setDemoStep(4);
    }
  }, [demoMode, demoStep, selectedFlight, selectedHotel, selectedLounge, optionsUnlocked]);

  useEffect(() => {
    if (optionsUnlocked) return;
    setSelectedFlight(null);
    setSelectedHotel(null);
    setSelectedLounge(null);
  }, [optionsUnlocked]);

  const sectionHighlight = (section: 'flights' | 'hotels' | 'lounges') => {
    if (!demoMode) return '';
    if (section === 'flights' && demoStep === 1) return 'ring-2 ring-red-500/70 ring-offset-2';
    if (section === 'hotels' && demoStep === 2) return 'ring-2 ring-red-500/70 ring-offset-2';
    if (section === 'lounges' && demoStep === 3) return 'ring-2 ring-red-500/70 ring-offset-2';
    return '';
  };

  return (
    <div className="min-h-screen bg-white">
      <Header
        activeView={activeView}
        setActiveView={requestView}
        onFlightFound={handleFlightFound}
        onOpenPersonalize={() => setPersonalizeOpen(true)}
        onStartDemo={startDemoMode}
        demoMode={demoMode}
      />
      <DemoModeCoach
        active={demoMode}
        step={demoStep}
        completed={{ flight: !!selectedFlight, hotel: !!selectedHotel, lounge: !!selectedLounge }}
        onNext={runDemoStep}
        onClose={stopDemoMode}
        optionsUnlocked={optionsUnlocked}
      />
      <main>
        <Hero
          onStartRescue={() => requestView(optionsUnlocked ? 'flights' : 'rescue-assist')}
          optionsUnlocked={optionsUnlocked}
          assistPrice={assistPrice}
          liveFlight={liveFlight}
          fallbackFlightNumber={displayedFlightNumber}
          onFlightUpdated={handleFlightUpdated}
          onPersonalize={() => setPersonalizeOpen(true)}
          onViewPricing={() => requestView('pricing')}
          onStartDemo={startDemoMode}
          demoMode={demoMode}
        />
        <RescuePlan
          selectedFlight={selectedFlight}
          selectedHotel={selectedHotel}
          selectedLounge={selectedLounge}
          onJump={requestView}
          locked={!optionsUnlocked}
        />
        <PricingSection />
        {optionsUnlocked ? (
          <div data-testid="rescue-options" data-rescue-options="unlocked">
            <div className={`transition-shadow ${sectionHighlight('flights')}`}>
              <FlightRebook
                selectedFlight={selectedFlight}
                setSelectedFlight={setSelectedFlight}
                liveFlight={liveFlight}
          fallbackFlightNumber={displayedFlightNumber}
                flightOptions={inventory.flights}
                inventoryCoverage={inventory.coverage.flights}
                loadingOptions={inventory.loading}
              />
            </div>
            <div className={`transition-shadow ${sectionHighlight('hotels')}`}>
              <HotelRescue
                selectedHotel={selectedHotel}
                setSelectedHotel={setSelectedHotel}
                hotelOptions={inventory.hotels}
                inventoryCoverage={inventory.coverage.hotels}
                loadingOptions={inventory.loading}
                airportCode={liveFlight?.departure.airport || profile.boardingPass?.from || ORIGINAL_FLIGHT.from}
              />
            </div>
            <div className={`transition-shadow ${sectionHighlight('lounges')}`}>
              <LoungeAccess
                selectedLounge={selectedLounge}
                setSelectedLounge={setSelectedLounge}
                loungeOptions={inventory.lounges}
                inventoryCoverage={inventory.coverage.lounges}
                loadingOptions={inventory.loading}
                airportCode={liveFlight?.departure.airport || profile.boardingPass?.from || ORIGINAL_FLIGHT.from}
              />
            </div>
          </div>
        ) : (
          <RescueAssistGate
            flightNumber={displayedFlightNumber}
            flightKey={access.flightKey || displayedFlightNumber.replace(/\s+/g, '').toUpperCase()}
            sessionId={access.sessionId}
            routeLabel={routeLabel}
            travelerName={profile.boardingPass?.passengerName ?? undefined}
          />
        )}
      </main>
      <Footer />
      <ConfirmationBar
        selectedFlight={selectedFlight}
        selectedHotel={selectedHotel}
        selectedLounge={selectedLounge}
        onClear={handleClear}
        demoMode={demoMode}
        onDemoFinish={stopDemoMode}
      />
      <PersonalizeModal open={personalizeOpen} onClose={() => setPersonalizeOpen(false)} />
    </div>
  );
};

export default AppLayout;
