import React, { useState, useEffect } from 'react';
import Header from './rescue/Header';
import Hero from './rescue/Hero';
import RescuePlan from './rescue/RescuePlan';
import PricingSection from './rescue/PricingSection';
import FlightRebook from './rescue/FlightRebook';
import HotelRescue from './rescue/HotelRescue';
import LoungeAccess from './rescue/LoungeAccess';
import Footer from './rescue/Footer';
import ConfirmationBar from './rescue/ConfirmationBar';
import PersonalizeModal from './rescue/PersonalizeModal';
import { Flight, Hotel, Lounge } from '@/data/rescueData';
import { LiveFlight } from './rescue/FlightSearch';
import { useTraveler } from '@/contexts/TravelerContext';

const AppLayout: React.FC = () => {
  const [activeView, setActiveView] = useState('rescue');
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedLounge, setSelectedLounge] = useState<Lounge | null>(null);
  const [liveFlight, setLiveFlight] = useState<LiveFlight | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const { hasProfile, profile } = useTraveler();

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

  const handleClear = () => {
    setSelectedFlight(null);
    setSelectedHotel(null);
    setSelectedLounge(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        onFlightFound={handleFlightFound}
        onOpenPersonalize={() => setPersonalizeOpen(true)}
      />
      <main>
        <Hero
          onStartRescue={() => setActiveView('flights')}
          liveFlight={liveFlight}
          onPersonalize={() => setPersonalizeOpen(true)}
          onViewPricing={() => setActiveView('pricing')}
        />
        <RescuePlan
          selectedFlight={selectedFlight}
          selectedHotel={selectedHotel}
          selectedLounge={selectedLounge}
          onJump={setActiveView}
        />
        <PricingSection />
        <FlightRebook
          selectedFlight={selectedFlight}
          setSelectedFlight={setSelectedFlight}
          liveFlight={liveFlight}
        />
        <HotelRescue selectedHotel={selectedHotel} setSelectedHotel={setSelectedHotel} />
        <LoungeAccess selectedLounge={selectedLounge} setSelectedLounge={setSelectedLounge} />
      </main>
      <Footer />
      <ConfirmationBar
        selectedFlight={selectedFlight}
        selectedHotel={selectedHotel}
        selectedLounge={selectedLounge}
        onClear={handleClear}
      />
      <PersonalizeModal open={personalizeOpen} onClose={() => setPersonalizeOpen(false)} />
    </div>
  );
};

export default AppLayout;
