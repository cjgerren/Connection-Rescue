# Delay Insight Engine Spec

This spec defines the first production version of ConnectionRescue's delay intelligence layer for the current `travel-rescue-luxury` app.

The feature is broader than maintenance. It covers any meaningful delay that can threaten a connection or trigger a rescue workflow.

## Product Goal

For any monitored flight, ConnectionRescue should answer:

1. What is the most likely cause of the delay?
2. How long is this delay likely to continue?
3. What does that mean for the traveler's connection?
4. What should the traveler do next?

This feature should help a traveler faster than raw airline alerts and without pretending to know airline-internal details that public systems do not expose.

## User-Facing Promise

ConnectionRescue does not promise the exact internal airline root cause.

It does promise:

- a likely delay cause bucket
- a confidence level
- an ETA range
- a connection-risk score
- a recommended next move

## Cause Buckets

Version 1 should classify into:

- `maintenance`
- `faa_atc`
- `weather`
- `late_inbound`
- `crew_ops`
- `ground_ops`
- `security`
- `unknown`

### Bucket Definitions

- `maintenance`: airline-controlled technical or signoff issue
- `faa_atc`: airport congestion, ATC program, ground stop, or NAS constraint
- `weather`: local or system weather, deicing, thunderstorms, visibility
- `late_inbound`: the operating aircraft arrives late and cascades the delay
- `crew_ops`: dispatch release, crew legality, paperwork, crew arrival
- `ground_ops`: fueling, bags, catering, jet bridge, ramp, gate conflict
- `security`: security hold, airport security event
- `unknown`: signal set is weak, mixed, or contradictory

## Core Output

For each monitored flight, the engine should compute:

- `cause_bucket`
- `cause_confidence`
- `eta_min_minutes`
- `eta_max_minutes`
- `projected_departure_at`
- `projected_arrival_at`
- `connection_miss_probability`
- `recommended_action`
- `top_signals`

### Output Example

- Likely cause: `late_inbound`
- Confidence: `medium`
- Estimated additional delay: `25-45 min`
- Why: `Inbound aircraft arrived 29 min late`, `No FAA airport-wide delay`, `No severe weather at departure field`
- Connection impact: `High risk`
- Recommended next move: `Prepare backup now`

## MVP Scope

Version 1 includes:

- rule-based cause inference
- ETA ranges, not exact timestamps
- traveler-entered delay signals
- connection-risk integration
- admin visibility into why the engine reached a conclusion

Version 1 does not include:

- exact maintenance codes
- direct airline dispatch integration
- exact signoff countdowns
- full ML-based prediction

## Existing Repo Touchpoints

The feature should integrate with the current repo shape rather than invent a separate product.

### Frontend Files To Extend

- [src/components/rescue/FlightSearch.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/components/rescue/FlightSearch.tsx:1)
- [src/components/rescue/RescuePlan.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/components/rescue/RescuePlan.tsx:1)
- [src/components/rescue/ConfirmationBar.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/components/rescue/ConfirmationBar.tsx:1)
- [src/components/rescue/PersonalizeModal.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/components/rescue/PersonalizeModal.tsx:1)
- [src/contexts/TravelerContext.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/contexts/TravelerContext.tsx:1)
- [src/lib/api.ts](C:/Users/Dell/Projects/travel-rescue-luxury/src/lib/api.ts:1)

### Backend Files To Extend

- [backend/src/server.js](C:/Users/Dell/Projects/travel-rescue-luxury/backend/src/server.js:1)
- [backend/src/routes/flights.js](C:/Users/Dell/Projects/travel-rescue-luxury/backend/src/routes/flights.js:1)
- [backend/src/services/supabaseAdmin.js](C:/Users/Dell/Projects/travel-rescue-luxury/backend/src/services/supabaseAdmin.js:1)

### Admin Surfaces To Extend

- [src/pages/Admin.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/pages/Admin.tsx:1)
- [src/pages/AdminRescues.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/pages/AdminRescues.tsx:1)

## Data Inputs

The engine should combine these signal families:

### 1. Flight status signals

- flight number
- carrier
- departure airport
- arrival airport
- scheduled departure
- estimated departure
- actual departure
- scheduled arrival
- estimated arrival
- actual arrival
- gate
- terminal
- status raw text
- delay minutes
- aircraft type if available

Primary source for MVP:

- current live flight status route in [backend/src/routes/flights.js](C:/Users/Dell/Projects/travel-rescue-luxury/backend/src/routes/flights.js:1)

### 2. Airport / FAA context

- airport departure delay program
- airport arrival delay program
- ground stop
- GDP / ATC congestion context
- airport-wide pattern indicators

This can start as a backend enrichment job or provider adapter, even if the first version uses a smaller subset.

### 3. Weather context

- severe weather indicator
- deicing conditions
- airport weather severity bucket

### 4. Inbound-aircraft dependency

- known inbound flight number if available
- inbound actual arrival vs scheduled arrival
- turnaround buffer

### 5. Traveler-reported signals

Collected from the UI:

- `captain_said`
- `gate_agent_said`
- `boarded`
- `pushback_started`
- `returned_to_gate`
- `maintenance_mentioned`
- `weather_mentioned`
- `crew_mentioned`
- `paperwork_mentioned`

These signals are high-value because they often arrive before structured feeds update.

## Schema Spec

The following tables are specific to the delay insight engine and should be added on top of the broader MVP schema.

### `flight_monitor_events`

Purpose:

- canonical event stream for monitored flights

Columns:

- `id uuid primary key`
- `created_at timestamptz not null default now()`
- `flight_key text not null`
- `trip_id uuid null`
- `booking_id uuid null`
- `source text not null`
- `event_type text not null`
- `observed_at timestamptz not null`
- `payload jsonb not null default '{}'::jsonb`

Indexes:

- `(flight_key, observed_at desc)`
- `(trip_id, observed_at desc)`
- `(booking_id, observed_at desc)`

### `delay_signal_snapshots`

Purpose:

- normalized input snapshot used by the inference engine

Columns:

- `id uuid primary key`
- `created_at timestamptz not null default now()`
- `flight_key text not null`
- `snapshot_at timestamptz not null`
- `delay_minutes integer null`
- `faa_status text null`
- `weather_status text null`
- `inbound_status text null`
- `traveler_signal_count integer not null default 0`
- `signals jsonb not null default '{}'::jsonb`

Indexes:

- `(flight_key, snapshot_at desc)`

### `user_delay_reports`

Purpose:

- traveler-entered delay observations

Columns:

- `id uuid primary key`
- `created_at timestamptz not null default now()`
- `trip_id uuid null`
- `booking_id uuid null`
- `flight_key text not null`
- `traveler_email text null`
- `traveler_user_id uuid null`
- `report_type text not null`
- `free_text text null`
- `structured_flags jsonb not null default '{}'::jsonb`
- `reported_at timestamptz not null`

Indexes:

- `(flight_key, reported_at desc)`
- `(traveler_user_id, reported_at desc)`
- `(booking_id, reported_at desc)`

### `delay_inference_results`

Purpose:

- current and historical inference output

Columns:

- `id uuid primary key`
- `created_at timestamptz not null default now()`
- `flight_key text not null`
- `trip_id uuid null`
- `booking_id uuid null`
- `computed_at timestamptz not null`
- `cause_bucket text not null`
- `cause_confidence numeric(5,4) not null`
- `eta_min_minutes integer null`
- `eta_max_minutes integer null`
- `projected_departure_at timestamptz null`
- `projected_arrival_at timestamptz null`
- `recommended_action text not null`
- `top_signals jsonb not null default '[]'::jsonb`
- `model_version text not null default 'rules_v1'`

Indexes:

- `(flight_key, computed_at desc)`
- `(trip_id, computed_at desc)`
- `(booking_id, computed_at desc)`

### `connection_risk_scores`

Purpose:

- trip-level connection risk over time

Columns:

- `id uuid primary key`
- `created_at timestamptz not null default now()`
- `trip_id uuid not null`
- `connection_key text not null`
- `computed_at timestamptz not null`
- `miss_probability numeric(5,4) not null`
- `minimum_connection_minutes integer null`
- `projected_slack_minutes integer null`
- `risk_band text not null`
- `recommended_action text not null`
- `inputs jsonb not null default '{}'::jsonb`

Indexes:

- `(trip_id, computed_at desc)`
- `(connection_key, computed_at desc)`

## Relationship Notes

- `flight_key` should be stable and deterministic, for example `AA2487|2026-04-29|DFW|LGA`
- `trip_id` should be used whenever a traveler has a persisted trip
- `booking_id` should be populated once the rescue workflow enters a paid state

## Inference Engine Logic

Start with deterministic scoring, not machine learning.

### Rule Inputs

Positive signals for `maintenance`:

- traveler reports maintenance
- boarded and still at gate past departure
- repeated short delay increments
- return to gate
- no strong FAA / weather constraint

Positive signals for `faa_atc`:

- airport or NAS constraint active
- multiple same-airport delay patterns
- no airline-specific technical signal

Positive signals for `weather`:

- airport weather severity high
- deicing or thunderstorm indicator
- broader field disruption

Positive signals for `late_inbound`:

- inbound aircraft is late
- turnaround buffer is below threshold
- local airport otherwise normal

Positive signals for `crew_ops`:

- traveler mentions crew or paperwork
- repeated slips near departure
- no weather or FAA constraint

Positive signals for `ground_ops`:

- gate, baggage, fueling, or ramp keywords
- short rolling delays near gate

### Output Rules

- keep the highest scoring bucket
- compute confidence from separation between top scores
- always return an ETA range, not a single minute
- if the signal set is weak, return `unknown` with low confidence

## ETA Policy

Version 1 ETA buckets:

- `0-15`
- `15-30`
- `30-60`
- `60-120`
- `120+`

The engine should store numeric min/max minutes, but the UI should display friendly ranges.

## Connection Risk Policy

Recommended risk bands:

- `safe`: miss probability under `0.20`
- `tight`: `0.20` to `<0.50`
- `high_risk`: `0.50` to `<0.75`
- `rescue_now`: `0.75+`

Recommended actions:

- `monitor`
- `prepare_backup`
- `show_recovery_options`
- `start_rescue_checkout`

## Backend API Spec

The backend should own delay inference. The frontend should not compute this client-side.

### `GET /api/flights/delay-insight`

Purpose:

- compute or retrieve current delay insight for one flight

Query params:

- `flight`
- optional `date`
- optional `tripId`

Response:

- live flight status
- cause bucket
- confidence
- ETA range
- projected departure / arrival
- top signals
- connection-risk payload if trip context is available

### `POST /api/delay-reports`

Purpose:

- accept traveler-entered observations

Body:

- `flightKey`
- optional `tripId`
- optional `bookingId`
- `reportType`
- `freeText`
- `structuredFlags`
- `reportedAt`

Response:

- `{ ok: true, reportId, recomputed: true }`

### `POST /api/flights/recompute-delay-insight`

Purpose:

- force recomputation after a new signal arrives

Body:

- `flightKey`
- optional `tripId`

Response:

- latest delay inference result

### `GET /api/trips/:tripId/connection-risk`

Purpose:

- fetch the latest trip-level connection-risk state

Response:

- current delay insight
- miss probability
- action threshold status
- last recompute timestamp

## Frontend Spec

### 1. Extend `LiveFlight`

Add an optional delay insight payload alongside current status in [src/components/rescue/FlightSearch.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/components/rescue/FlightSearch.tsx:1).

Suggested shape:

- `delayInsight.causeBucket`
- `delayInsight.confidence`
- `delayInsight.etaMinMinutes`
- `delayInsight.etaMaxMinutes`
- `delayInsight.topSignals`
- `delayInsight.connectionRisk`

### 2. New `DelayInsightCard`

Add a new rescue component:

- `src/components/rescue/DelayInsightCard.tsx`

Contents:

- likely cause badge
- confidence badge
- delay ETA range
- three supporting signals
- "what this means for your connection" section

### 3. New `DelaySignalPrompt`

Add a traveler input component:

- `src/components/rescue/DelaySignalPrompt.tsx`

Inputs:

- captain said
- gate agent said
- boarded yes/no
- returned to gate yes/no
- quick-tap cause mentions

This should post to `POST /api/delay-reports`.

### 4. Extend `RescuePlan`

[src/components/rescue/RescuePlan.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/components/rescue/RescuePlan.tsx:1) should consume delay insight and show:

- `Safe`
- `Tight`
- `High risk`
- `Rescue now`

This is the primary place where explanation turns into action.

### 5. Extend `TravelerContext`

[src/contexts/TravelerContext.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/contexts/TravelerContext.tsx:1) should eventually stop being just local profile data and carry:

- active monitored flight key
- latest delay insight summary
- traveler-submitted reports pending sync

For MVP, pending local sync is acceptable if the backend is unavailable, but the source of truth should move server-side.

## Admin Spec

### Extend `Admin.tsx`

Add a delay-operations section showing:

- top active delayed flights
- current cause bucket
- confidence trend
- flights currently in `high_risk` or `rescue_now`

### Extend `AdminRescues.tsx`

Add context to rescue tasks:

- latest inferred cause
- latest ETA band
- latest top signals
- whether the traveler submitted additional reports

## Rollout Plan

### Phase 1

- add schema
- add backend endpoints
- add rule-based inference
- add traveler delay reports
- add delay insight card

### Phase 2

- add richer airport / weather enrichment
- add trip-level connection-risk persistence
- add admin trend views

### Phase 3

- add better historical calibration
- add provider enrichments for inbound aircraft and airport-wide disruption patterns

## MVP Acceptance Criteria

This feature is MVP-ready when:

- a flight lookup can return a cause bucket and ETA range
- the traveler can submit a new delay report and trigger recomputation
- the UI can explain the delay in plain English
- the engine can escalate connection risk into a rescue recommendation
- the inference output is stored and visible to admin operations

## Out Of Scope For MVP

- exact maintenance issue text from airline maintenance control
- direct airline dispatch integrations
- automated rebooking execution
- mobile-native offline sync beyond basic queued traveler input
