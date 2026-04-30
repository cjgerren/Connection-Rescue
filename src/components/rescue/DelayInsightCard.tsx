import React from 'react';
import { AlertTriangle, Clock3, Plane, Radar, ShieldAlert } from 'lucide-react';

export interface DelayTopSignal {
  bucket?: string;
  source?: string;
  message: string;
}

export interface DelayConnectionRisk {
  missProbability: number;
  minimumConnectionMinutes: number;
  projectedSlackMinutes: number;
  riskBand: 'safe' | 'tight' | 'high_risk' | 'rescue_now';
  recommendedAction: 'monitor' | 'prepare_backup' | 'show_recovery_options' | 'start_rescue_checkout';
}

export interface DelayInsight {
  flightKey: string;
  causeBucket: 'maintenance' | 'faa_atc' | 'weather' | 'late_inbound' | 'crew_ops' | 'ground_ops' | 'security' | 'unknown';
  confidence: number;
  etaMinMinutes: number | null;
  etaMaxMinutes: number | null;
  projectedDepartureAt: string | null;
  projectedArrivalAt: string | null;
  recommendedAction: 'monitor' | 'prepare_backup' | 'show_recovery_options' | 'start_rescue_checkout';
  topSignals: DelayTopSignal[];
  travelerReportsCount?: number;
  connectionRisk: DelayConnectionRisk | null;
}

const causeLabels: Record<DelayInsight['causeBucket'], string> = {
  maintenance: 'Maintenance / airline issue',
  faa_atc: 'FAA / ATC congestion',
  weather: 'Weather / deicing',
  late_inbound: 'Late inbound aircraft',
  crew_ops: 'Crew / dispatch / paperwork',
  ground_ops: 'Gate / ramp / baggage ops',
  security: 'Security issue',
  unknown: 'Cause still unclear',
};

const actionLabels: Record<DelayInsight['recommendedAction'], string> = {
  monitor: 'Monitor closely',
  prepare_backup: 'Prepare backup',
  show_recovery_options: 'Show recovery options',
  start_rescue_checkout: 'Start rescue now',
};

const riskLabels: Record<NonNullable<DelayInsight['connectionRisk']>['riskBand'], string> = {
  safe: 'Safe',
  tight: 'Tight',
  high_risk: 'High risk',
  rescue_now: 'Rescue now',
};

function formatEtaRange(min: number | null, max: number | null) {
  if (min == null && max == null) return 'Updating';
  if (min != null && max != null) return `${min}-${max} min`;
  return `${min ?? max} min`;
}

function formatConfidence(value: number) {
  if (value >= 0.75) return 'High';
  if (value >= 0.45) return 'Medium';
  return 'Low';
}

const DelayInsightCard: React.FC<{ insight: DelayInsight }> = ({ insight }) => {
  const risk = insight.connectionRisk;

  return (
    <div className="mt-5 rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-slate-950/20 to-red-500/10 p-5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-[0.22em]">
            <Radar className="w-3.5 h-3.5" />
            Delay insight
          </div>
          <h3 className="mt-2 text-xl font-bold text-white">{causeLabels[insight.causeBucket]}</h3>
          <p className="mt-1 text-sm text-blue-100/75">
            Confidence {formatConfidence(insight.confidence)} · {actionLabels[insight.recommendedAction]}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-right">
          <div className="text-[10px] uppercase tracking-[0.22em] text-blue-200/60">Estimated additional delay</div>
          <div className="mt-1 text-2xl font-black text-white">{formatEtaRange(insight.etaMinMinutes, insight.etaMaxMinutes)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/70">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            What we're seeing
          </div>
          <ul className="mt-3 space-y-2 text-sm text-blue-50/90">
            {insight.topSignals.length ? (
              insight.topSignals.slice(0, 3).map((signal, idx) => (
                <li key={`${signal.message}-${idx}`} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300 shrink-0" />
                  <span>{signal.message}</span>
                </li>
              ))
            ) : (
              <li className="text-blue-100/65">Waiting for enough signals to explain this delay confidently.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/70">
            <Plane className="w-3.5 h-3.5 text-emerald-300" />
            Connection impact
          </div>
          {risk ? (
            <>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-blue-100/80">Current status</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-bold text-white">
                  {riskLabels[risk.riskBand]}
                </span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-blue-50/90">
                <div className="flex items-center justify-between gap-3">
                  <span>Miss probability</span>
                  <span className="font-semibold text-white">{Math.round(risk.missProbability * 100)}%</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Projected slack</span>
                  <span className="font-semibold text-white">{risk.projectedSlackMinutes} min</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Minimum connection</span>
                  <span className="font-semibold text-white">{risk.minimumConnectionMinutes} min</span>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-3 text-sm text-blue-100/65">
              Add connection context to compute miss probability and rescue timing.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-blue-100/70">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <Clock3 className="w-3.5 h-3.5 text-amber-300" />
          Next move: <span className="font-semibold text-white">{actionLabels[insight.recommendedAction]}</span>
        </div>
        {typeof insight.travelerReportsCount === 'number' && insight.travelerReportsCount > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-300" />
            Traveler reports: <span className="font-semibold text-white">{insight.travelerReportsCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DelayInsightCard;
