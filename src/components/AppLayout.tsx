import React, { useState, useEffect } from 'react';
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
import { Flight, Hotel, Lounge, ORIGINAL_FLIGHT } from '@/data/rescueData';
import { LiveFlight } from './rescue/FlightSearch';
import { useTraveler } from '@/contexts/TravelerContext';
import { useRescueInventory } from '@/hooks/useRescueInventory';

const AppLayout: React.FC = () => {
  const [activeView, setActiveView] = useState('rescue');
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedLounge, setSelectedLounge] = useState<Lounge | null>(null);
  const [liveFlight, setLiveFlight] = useState<LiveFlight | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const { hasProfile, profile } = useTraveler();
  const inventory = useRescueInventory({
    airportIata: liveFlight?.departure.airport || profile.boardingPass?.from || ORIGINAL_FLIGHT.from,
    destinationIata: liveFlight?.arrival.airport || profile.boardingPass?.to || ORIGINAL_FLIGHT.to,
    destinationCity: liveFlight?.arrival.city || profile.boardingPass?.toCity || ORIGINAL_FLIGHT.toCity,
  });

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
      setActiveView('flights');
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
    if (!demoMode) return;

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
  }, [demoMode, demoStep, selectedFlight, selectedHotel, selectedLounge]);

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
        setActiveView={setActiveView}
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
      />
      <main>
        <Hero
          onStartRescue={() => setActiveView('flights')}
          liveFlight={liveFlight}
          onFlightUpdated={handleFlightUpdated}
          onPersonalize={() => setPersonalizeOpen(true)}
          onViewPricing={() => setActiveView('pricing')}
          onStartDemo={startDemoMode}
          demoMode={demoMode}
        />
        <RescuePlan
          selectedFlight={selectedFlight}
          selectedHotel={selectedHotel}
          selectedLounge={selectedLounge}
          onJump={setActiveView}
        />
        <PricingSection />
        <div className={`transition-shadow ${sectionHighlight('flights')}`}>
          <FlightRebook
            selectedFlight={selectedFlight}
            setSelectedFlight={setSelectedFlight}
            liveFlight={liveFlight}
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
          />
        </div>
        <div className={`transition-shadow ${sectionHighlight('lounges')}`}>
          <LoungeAccess
            selectedLounge={selectedLounge}
            setSelectedLounge={setSelectedLounge}
            loungeOptions={inventory.lounges}
            inventoryCoverage={inventory.coverage.lounges}
            loadingOptions={inventory.loading}
          />
        </div>
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
