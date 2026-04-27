import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface BoardingPass {
  passengerName: string | null;
  flightNumber: string | null;
  carrier: string | null;
  from: string | null;
  to: string | null;
  fromCity: string | null;
  toCity: string | null;
  departureDate: string | null;
  departureTime: string | null;
  boardingTime: string | null;
  gate: string | null;
  terminal: string | null;
  seat: string | null;
  cabin: string | null;
  loyaltyNumber: string | null;
  loyaltyTier: string | null;
  confirmationCode: string | null;
}

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: string;
}

export interface TravelerProfile {
  boardingPass: BoardingPass | null;
  location: LocationData | null;
  locationGranted: boolean;
  setupCompletedAt: string | null;
}

interface TravelerContextValue {
  profile: TravelerProfile;
  setBoardingPass: (bp: BoardingPass) => void;
  setLocation: (loc: LocationData | null, granted: boolean) => void;
  completeSetup: () => void;
  clearProfile: () => void;
  hasProfile: boolean;
}

const STORAGE_KEY = 'connection-rescue-traveler';

const defaultProfile: TravelerProfile = {
  boardingPass: null,
  location: null,
  locationGranted: false,
  setupCompletedAt: null,
};

const TravelerContext = createContext<TravelerContextValue>({
  profile: defaultProfile,
  setBoardingPass: () => {},
  setLocation: () => {},
  completeSetup: () => {},
  clearProfile: () => {},
  hasProfile: false,
});

export const useTraveler = () => useContext(TravelerContext);

export const TravelerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<TravelerProfile>(() => {
    if (typeof window === 'undefined') return defaultProfile;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return defaultProfile;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  const setBoardingPass = (boardingPass: BoardingPass) => {
    setProfile((p) => ({ ...p, boardingPass }));
  };

  const setLocation = (location: LocationData | null, granted: boolean) => {
    setProfile((p) => ({ ...p, location, locationGranted: granted }));
  };

  const completeSetup = () => {
    setProfile((p) => ({ ...p, setupCompletedAt: new Date().toISOString() }));
  };

  const clearProfile = () => {
    setProfile(defaultProfile);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const hasProfile = !!profile.setupCompletedAt && !!profile.boardingPass;

  return (
    <TravelerContext.Provider
      value={{ profile, setBoardingPass, setLocation, completeSetup, clearProfile, hasProfile }}
    >
      {children}
    </TravelerContext.Provider>
  );
};
