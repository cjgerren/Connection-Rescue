import { Router } from 'express';
import { getDelayInsight } from '../services/delayInsightService.js';
import { fetchLiveFlightStatus } from '../services/flightStatusService.js';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const flight = req.query.flight || req.query.flightNumber;
    const data = await fetchLiveFlightStatus(flight);
    res.json(data);
  } catch (err) {
    console.error('[flights/status]', err);
    res
      .status(err.statusCode || 502)
      .json({ error: err.error || 'upstream_error', message: err.message });
  }
});

router.get('/delay-insight', async (req, res) => {
  const flightNumber = req.query.flight || req.query.flightNumber;
  if (!flightNumber) {
    return res.status(400).json({ error: 'Provide ?flight=AA2487' });
  }

  try {
    const result = await getDelayInsight({
      flightNumber,
      fallbackDate: req.query.date,
      tripId: req.query.tripId || null,
      bookingId: req.query.bookingId || null,
      connectionContext: {
        connectionDepartureAt: req.query.connectionDepartureAt || null,
        minimumConnectionMinutes: req.query.minimumConnectionMinutes || null,
        connectionKey: req.query.connectionKey || null,
      },
    });

    res.json(result);
  } catch (err) {
    console.error('[flights/delay-insight]', err);
    res
      .status(err.statusCode || 502)
      .json({ error: err.error || 'delay_insight_failed', message: err.message });
  }
});

export default router;
