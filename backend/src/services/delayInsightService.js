import { supabaseAdmin } from './supabaseAdmin.js';
import { buildFlightKey, fetchLiveFlightStatus, parseFlightCode } from './flightStatusService.js';

const CAUSE_BUCKETS = [
  'maintenance',
  'faa_atc',
  'weather',
  'late_inbound',
  'crew_ops',
  'ground_ops',
  'security',
  'unknown',
];

const ACTIONS = ['monitor', 'prepare_backup', 'show_recovery_options', 'start_rescue_checkout'];

const KEYWORDS = {
  maintenance: ['maintenance', 'mechanic', 'mechanical', 'signoff', 'sign off', 'equipment', 'mx', 'maint'],
  faa_atc: ['atc', 'faa', 'ground stop', 'ground delay', 'gdp', 'traffic', 'congestion', 'flow control'],
  weather: ['weather', 'storm', 'thunderstorm', 'lightning', 'rain', 'snow', 'ice', 'deicing', 'de-icing', 'fog'],
  late_inbound: ['late inbound', 'incoming aircraft', 'previous flight', 'aircraft arriving', 'plane is late', 'awaiting aircraft'],
  crew_ops: ['crew', 'paperwork', 'dispatch', 'release', 'pilot', 'flight attendant', 'staffing', 'legality'],
  ground_ops: ['fuel', 'fueling', 'baggage', 'bags', 'ramp', 'gate', 'catering', 'jet bridge', 'bridge'],
  security: ['security', 'tsa', 'screening', 'police', 'law enforcement'],
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function dedupeSignals(signals, limit = 4) {
  const seen = new Set();
  const out = [];
  for (const signal of signals) {
    const key = `${signal.bucket}|${signal.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(signal);
    if (out.length >= limit) break;
  }
  return out;
}

function detectTextBuckets(text, sourceLabel, signals, scores) {
  const normalized = normalizeText(text);
  if (!normalized) return;

  for (const bucket of Object.keys(KEYWORDS)) {
    for (const keyword of KEYWORDS[bucket]) {
      if (!normalized.includes(keyword)) continue;
      const weight = bucket === 'unknown' ? 0.1 : 0.55;
      scores[bucket] += weight;
      signals.push({
        bucket,
        weight,
        source: sourceLabel,
        message: `${sourceLabel} mentioned ${keyword}`,
      });
      break;
    }
  }
}

function deriveEtaRange(delayMinutes, topBucket, topScore) {
  const delay = Math.max(0, Number(delayMinutes || 0));

  if (delay < 15 && topScore < 0.35) return { min: 0, max: 15 };

  const baseByBucket = {
    maintenance: [25, 75],
    faa_atc: [20, 60],
    weather: [30, 90],
    late_inbound: [15, 45],
    crew_ops: [20, 50],
    ground_ops: [10, 35],
    security: [20, 60],
    unknown: [15, 45],
  };

  const [baseMin, baseMax] = baseByBucket[topBucket] || baseByBucket.unknown;
  const scaledMin = Math.max(baseMin, Math.round(delay * 0.6));
  const scaledMax = Math.max(baseMax, delay + Math.max(20, Math.round(delay * 0.5)));

  return {
    min: Math.max(0, Math.round(scaledMin / 5) * 5),
    max: Math.max(Math.round(scaledMin / 5) * 5, Math.round(scaledMax / 5) * 5),
  };
}

function deriveProjectedTimes(flight, etaRange) {
  const departureActual = safeDate(flight?.departure?.actual);
  const departureEstimated = safeDate(flight?.departure?.estimated);
  const departureScheduled = safeDate(flight?.departure?.scheduled);
  const arrivalEstimated = safeDate(flight?.arrival?.estimated);
  const arrivalScheduled = safeDate(flight?.arrival?.scheduled);
  const now = new Date();

  const projectedDepartureAt =
    departureActual ||
    departureEstimated ||
    (departureScheduled ? addMinutes(departureScheduled, etaRange.min) : addMinutes(now, etaRange.min));

  let projectedArrivalAt = arrivalEstimated || arrivalScheduled;
  if (!projectedArrivalAt && departureScheduled && arrivalScheduled) {
    const scheduledDuration = arrivalScheduled.getTime() - departureScheduled.getTime();
    projectedArrivalAt = new Date(projectedDepartureAt.getTime() + Math.max(0, scheduledDuration));
  } else if (!projectedArrivalAt) {
    projectedArrivalAt = addMinutes(projectedDepartureAt, 90);
  }

  if (arrivalScheduled && !arrivalEstimated) {
    projectedArrivalAt = addMinutes(arrivalScheduled, etaRange.min);
  }

  return {
    projectedDepartureAt: projectedDepartureAt.toISOString(),
    projectedArrivalAt: projectedArrivalAt.toISOString(),
  };
}

function deriveConnectionRisk({ projectedArrivalAt, connectionDepartureAt, minimumConnectionMinutes }) {
  const arrival = safeDate(projectedArrivalAt);
  const connectionDeparture = safeDate(connectionDepartureAt);
  const minimum = Number.isFinite(Number(minimumConnectionMinutes))
    ? Math.max(0, Number(minimumConnectionMinutes))
    : 45;

  if (!arrival || !connectionDeparture) return null;

  const availableMinutes = Math.round((connectionDeparture.getTime() - arrival.getTime()) / 60_000);
  const projectedSlackMinutes = availableMinutes - minimum;

  let riskBand = 'safe';
  let missProbability = 0.12;
  let recommendedAction = 'monitor';

  if (projectedSlackMinutes < -30) {
    riskBand = 'rescue_now';
    missProbability = 0.9;
    recommendedAction = 'start_rescue_checkout';
  } else if (projectedSlackMinutes < 0) {
    riskBand = 'high_risk';
    missProbability = 0.68;
    recommendedAction = 'show_recovery_options';
  } else if (projectedSlackMinutes < 25) {
    riskBand = 'tight';
    missProbability = 0.38;
    recommendedAction = 'prepare_backup';
  }

  return {
    missProbability,
    minimumConnectionMinutes: minimum,
    projectedSlackMinutes,
    riskBand,
    recommendedAction,
  };
}

function chooseRecommendedAction(delayMinutes, connectionRisk, confidence, topBucket) {
  if (connectionRisk?.recommendedAction && ACTIONS.includes(connectionRisk.recommendedAction)) {
    return connectionRisk.recommendedAction;
  }

  if (delayMinutes >= 90) return 'start_rescue_checkout';
  if (delayMinutes >= 45 || topBucket === 'maintenance' || topBucket === 'weather') {
    return confidence >= 0.55 ? 'show_recovery_options' : 'prepare_backup';
  }
  if (delayMinutes >= 20) return 'prepare_backup';
  return 'monitor';
}

export function inferDelayInsight({ flight, reports = [], connectionContext = {} }) {
  const scores = Object.fromEntries(CAUSE_BUCKETS.map((bucket) => [bucket, 0]));
  const signals = [];
  const delayMinutes = Math.max(0, Number(flight?.delayMinutes || 0));
  const statusRaw = normalizeText(flight?.statusRaw);

  if (delayMinutes >= 15) {
    scores.unknown += 0.2;
    signals.push({
      bucket: 'unknown',
      weight: 0.2,
      source: 'flight_status',
      message: `Flight is currently delayed by ${delayMinutes} minutes`,
    });
  }

  if (statusRaw === 'cancelled') {
    scores.security += 0.1;
    scores.weather += 0.1;
    scores.unknown += 0.3;
  }

  if (flight?.departure?.gate && delayMinutes >= 20 && !flight?.departure?.actual) {
    scores.ground_ops += 0.15;
    signals.push({
      bucket: 'ground_ops',
      weight: 0.15,
      source: 'flight_status',
      message: 'Flight is still gate-bound after departure time pressure started',
    });
  }

  if (flight?.live && delayMinutes > 0) {
    scores.late_inbound += 0.15;
    signals.push({
      bucket: 'late_inbound',
      weight: 0.15,
      source: 'flight_status',
      message: 'Aircraft is airborne, so remaining delay impact is likely downstream',
    });
  }

  for (const report of reports) {
    const flags = report?.structured_flags || report?.structuredFlags || {};
    const freeText = report?.free_text || report?.freeText || '';
    const sourceLabel = report?.report_type || report?.reportType || 'traveler_report';

    detectTextBuckets(freeText, sourceLabel, signals, scores);

    if (flags.maintenance_mentioned) {
      scores.maintenance += 0.55;
      signals.push({ bucket: 'maintenance', weight: 0.55, source: sourceLabel, message: 'Traveler reported maintenance being mentioned' });
    }
    if (flags.weather_mentioned) {
      scores.weather += 0.5;
      signals.push({ bucket: 'weather', weight: 0.5, source: sourceLabel, message: 'Traveler reported weather being mentioned' });
    }
    if (flags.crew_mentioned || flags.paperwork_mentioned) {
      scores.crew_ops += 0.45;
      signals.push({ bucket: 'crew_ops', weight: 0.45, source: sourceLabel, message: 'Traveler reported crew or paperwork issues' });
    }
    if (flags.returned_to_gate) {
      scores.maintenance += 0.35;
      scores.ground_ops += 0.1;
      signals.push({ bucket: 'maintenance', weight: 0.35, source: sourceLabel, message: 'Aircraft reportedly returned to gate' });
    }
    if (flags.pushback_started && flags.returned_to_gate) {
      scores.maintenance += 0.2;
    }
    if (flags.boarded && delayMinutes >= 20) {
      scores.maintenance += 0.1;
      scores.crew_ops += 0.1;
      signals.push({ bucket: 'maintenance', weight: 0.1, source: sourceLabel, message: 'Traveler is boarded and delay continues past departure time' });
    }
  }

  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  let [topBucket, topScore] = sortedScores[0];
  const secondScore = sortedScores[1]?.[1] || 0;

  if (topScore < 0.35) {
    topBucket = 'unknown';
    topScore = Math.max(topScore, 0.2);
  }

  const totalScore = sortedScores.reduce((sum, [, value]) => sum + value, 0) || 1;
  const confidence = clamp(0.25 + (topScore / totalScore) * 0.45 + (topScore - secondScore) * 0.4, 0.2, 0.95);

  const etaRange = deriveEtaRange(delayMinutes, topBucket, topScore);
  const projectedTimes = deriveProjectedTimes(flight, etaRange);
  const connectionRisk = deriveConnectionRisk({
    projectedArrivalAt: projectedTimes.projectedArrivalAt,
    connectionDepartureAt: connectionContext.connectionDepartureAt,
    minimumConnectionMinutes: connectionContext.minimumConnectionMinutes,
  });
  const recommendedAction = chooseRecommendedAction(delayMinutes, connectionRisk, confidence, topBucket);

  return {
    causeBucket: topBucket,
    confidence,
    etaMinMinutes: etaRange.min,
    etaMaxMinutes: etaRange.max,
    projectedDepartureAt: projectedTimes.projectedDepartureAt,
    projectedArrivalAt: projectedTimes.projectedArrivalAt,
    recommendedAction,
    topSignals: dedupeSignals(
      signals
        .filter((signal) => signal.bucket === topBucket || topBucket === 'unknown')
        .sort((a, b) => b.weight - a.weight),
      4
    ),
    connectionRisk,
  };
}

async function listRecentDelayReports(flightKey) {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from('user_delay_reports')
    .select('id, report_type, free_text, structured_flags, reported_at')
    .eq('flight_key', flightKey)
    .order('reported_at', { ascending: false })
    .limit(20);

  if (error) {
    console.warn('[delay-insight] listRecentDelayReports failed', error.message);
    return [];
  }

  return data || [];
}

async function persistDelayArtifacts({ flightKey, tripId, bookingId, liveFlight, reports, insight, connectionContext }) {
  if (!supabaseAdmin) return;

  const travelerSignalCount = reports.length;
  const signalSnapshot = {
    statusRaw: liveFlight.statusRaw,
    delayMinutes: liveFlight.delayMinutes,
    departure: liveFlight.departure,
    arrival: liveFlight.arrival,
    reportTypes: reports.map((report) => report.report_type),
    topSignals: insight.topSignals,
  };

  const writes = [
    supabaseAdmin.from('flight_monitor_events').insert({
      flight_key: flightKey,
      trip_id: tripId || null,
      booking_id: bookingId || null,
      source: liveFlight.source || 'aviationstack',
      event_type: 'status_fetch',
      observed_at: new Date().toISOString(),
      payload: liveFlight,
    }),
    supabaseAdmin.from('delay_signal_snapshots').insert({
      flight_key: flightKey,
      snapshot_at: new Date().toISOString(),
      delay_minutes: liveFlight.delayMinutes,
      faa_status: null,
      weather_status: null,
      inbound_status: null,
      traveler_signal_count: travelerSignalCount,
      signals: signalSnapshot,
    }),
    supabaseAdmin.from('delay_inference_results').insert({
      flight_key: flightKey,
      trip_id: tripId || null,
      booking_id: bookingId || null,
      computed_at: new Date().toISOString(),
      cause_bucket: insight.causeBucket,
      cause_confidence: insight.confidence,
      eta_min_minutes: insight.etaMinMinutes,
      eta_max_minutes: insight.etaMaxMinutes,
      projected_departure_at: insight.projectedDepartureAt,
      projected_arrival_at: insight.projectedArrivalAt,
      recommended_action: insight.recommendedAction,
      top_signals: insight.topSignals,
      model_version: 'rules_v1',
    }),
  ];

  if (tripId && connectionContext.connectionKey && insight.connectionRisk) {
    writes.push(
      supabaseAdmin.from('connection_risk_scores').insert({
        trip_id: tripId,
        connection_key: connectionContext.connectionKey,
        computed_at: new Date().toISOString(),
        miss_probability: insight.connectionRisk.missProbability,
        minimum_connection_minutes: insight.connectionRisk.minimumConnectionMinutes,
        projected_slack_minutes: insight.connectionRisk.projectedSlackMinutes,
        risk_band: insight.connectionRisk.riskBand,
        recommended_action: insight.connectionRisk.recommendedAction,
        inputs: {
          connectionDepartureAt: connectionContext.connectionDepartureAt || null,
          flightKey,
        },
      })
    );
  }

  const results = await Promise.allSettled(writes);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('[delay-insight] persistence failed', result.reason?.message || result.reason);
    }
  }
}

export async function getDelayInsight({ flightNumber, fallbackDate, tripId, bookingId, connectionContext = {} }) {
  const liveFlight = await fetchLiveFlightStatus(flightNumber);
  const flightKey = buildFlightKey(liveFlight, fallbackDate);
  const reports = await listRecentDelayReports(flightKey);
  const insight = inferDelayInsight({ flight: liveFlight, reports, connectionContext });

  await persistDelayArtifacts({
    flightKey,
    tripId,
    bookingId,
    liveFlight,
    reports,
    insight,
    connectionContext,
  });

  return {
    flightKey,
    flight: liveFlight,
    travelerReportsCount: reports.length,
    ...insight,
  };
}

export function parseFlightKey(rawFlightKey) {
  const value = String(rawFlightKey || '').trim();
  if (!value) return null;
  const [flightNumber, date, departureAirport, arrivalAirport] = value.split('|');
  if (!parseFlightCode(flightNumber)) return null;
  return {
    flightKey: value,
    flightNumber,
    date: date || null,
    departureAirport: departureAirport || null,
    arrivalAirport: arrivalAirport || null,
  };
}

export async function createUserDelayReport({
  flightKey,
  tripId,
  bookingId,
  travelerEmail,
  travelerUserId,
  reportType,
  freeText,
  structuredFlags,
  reportedAt,
}) {
  if (!supabaseAdmin) {
    const err = new Error('supabase_not_configured');
    err.statusCode = 503;
    err.error = 'supabase_not_configured';
    throw err;
  }

  const payload = {
    flight_key: flightKey,
    trip_id: tripId || null,
    booking_id: bookingId || null,
    traveler_email: travelerEmail || null,
    traveler_user_id: travelerUserId || null,
    report_type: reportType,
    free_text: freeText || null,
    structured_flags: structuredFlags || {},
    reported_at: reportedAt || new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('user_delay_reports')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    const err = new Error(error.message);
    err.statusCode = 500;
    err.error = 'delay_report_insert_failed';
    throw err;
  }

  await supabaseAdmin.from('flight_monitor_events').insert({
    flight_key: flightKey,
    trip_id: tripId || null,
    booking_id: bookingId || null,
    source: 'traveler',
    event_type: 'user_delay_report',
    observed_at: payload.reported_at,
    payload: {
      reportType,
      freeText: freeText || null,
      structuredFlags: structuredFlags || {},
      travelerEmail: travelerEmail || null,
    },
  });

  return data;
}
