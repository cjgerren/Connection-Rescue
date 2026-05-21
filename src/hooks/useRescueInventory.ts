import { useEffect, useState } from 'react';
import { fetchRescueInventory, type RescueInventory } from '@/lib/rescueInventory';

type Args = {
  airportIata: string | null | undefined;
  destinationIata: string | null | undefined;
  destinationCity: string | null | undefined;
};

type Result = RescueInventory & {
  loading: boolean;
};

export function useRescueInventory(args: Args): Result {
  const airportIata = args.airportIata;
  const destinationIata = args.destinationIata;
  const destinationCity = args.destinationCity;
  const [state, setState] = useState<Result>({
    flights: [],
    hotels: [],
    lounges: [],
    source: 'fallback',
    coverage: {
      flights: 'fallback',
      hotels: 'fallback',
      lounges: 'fallback',
    },
    warnings: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    void fetchRescueInventory({ airportIata, destinationIata, destinationCity })
      .then((next) => {
        if (cancelled) return;
        setState({ ...next, loading: false });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          warnings: [...prev.warnings, err instanceof Error ? err.message : 'Inventory load failed'],
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [airportIata, destinationCity, destinationIata]);

  return state;
}
