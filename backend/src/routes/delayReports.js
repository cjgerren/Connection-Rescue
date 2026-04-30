import { Router } from 'express';
import { createUserDelayReport, getDelayInsight, parseFlightKey } from '../services/delayInsightService.js';

const router = Router();

router.post('/delay-reports', async (req, res) => {
  const {
    flightKey,
    flightNumber,
    tripId,
    bookingId,
    travelerEmail,
    travelerUserId,
    reportType,
    freeText,
    structuredFlags,
    reportedAt,
    connectionDepartureAt,
    minimumConnectionMinutes,
    connectionKey,
  } = req.body || {};

  if (!flightKey || typeof flightKey !== 'string') {
    return res.status(400).json({ error: 'flightKey is required' });
  }
  if (!reportType || typeof reportType !== 'string') {
    return res.status(400).json({ error: 'reportType is required' });
  }
  if (structuredFlags != null && (typeof structuredFlags !== 'object' || Array.isArray(structuredFlags))) {
    return res.status(400).json({ error: 'structuredFlags must be an object when provided' });
  }

  const parsedKey = parseFlightKey(flightKey);
  if (!parsedKey) {
    return res.status(400).json({ error: 'flightKey must look like AA2487|2026-04-29|DFW|LGA' });
  }

  try {
    const row = await createUserDelayReport({
      flightKey: parsedKey.flightKey,
      tripId,
      bookingId,
      travelerEmail,
      travelerUserId,
      reportType,
      freeText,
      structuredFlags,
      reportedAt,
    });

    const insight = await getDelayInsight({
      flightNumber: flightNumber || parsedKey.flightNumber,
      fallbackDate: parsedKey.date,
      tripId,
      bookingId,
      connectionContext: {
        connectionDepartureAt,
        minimumConnectionMinutes,
        connectionKey,
      },
    });

    return res.json({
      ok: true,
      reportId: row.id,
      recomputed: true,
      delayInsight: insight,
    });
  } catch (err) {
    console.error('[delay-reports]', err);
    return res
      .status(err.statusCode || 500)
      .json({ error: err.error || 'delay_report_failed', message: err.message });
  }
});

export default router;
