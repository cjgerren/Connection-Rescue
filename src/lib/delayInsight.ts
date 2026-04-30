import type { DelayInsight } from '@/components/rescue/DelayInsightCard';
import type { LiveFlight } from '@/components/rescue/FlightSearch';

interface DelayInsightApiResponse {
  flightKey: string;
  flight: LiveFlight;
  travelerReportsCount?: number;
  causeBucket: DelayInsight['causeBucket'];
  confidence: number;
  etaMinMinutes: number | null;
  etaMaxMinutes: number | null;
  projectedDepartureAt: string | null;
  projectedArrivalAt: string | null;
  recommendedAction: DelayInsight['recommendedAction'];
  topSignals: DelayInsight['topSignals'];
  connectionRisk: DelayInsight['connectionRisk'];
}

export function mergeDelayInsightResponse(data: DelayInsightApiResponse): LiveFlight {
  return {
    ...(data.flight as LiveFlight),
    delayInsight: {
      flightKey: data.flightKey,
      causeBucket: data.causeBucket,
      confidence: data.confidence,
      etaMinMinutes: data.etaMinMinutes,
      etaMaxMinutes: data.etaMaxMinutes,
      projectedDepartureAt: data.projectedDepartureAt,
      projectedArrivalAt: data.projectedArrivalAt,
      recommendedAction: data.recommendedAction,
      topSignals: data.topSignals || [],
      travelerReportsCount: data.travelerReportsCount ?? 0,
      connectionRisk: data.connectionRisk || null,
    },
  };
}
