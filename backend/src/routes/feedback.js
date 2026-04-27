import { Router } from 'express';
import { supabaseAdmin } from '../services/supabaseAdmin.js';

const router = Router();

router.post('/concierge-interest', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'supabase_not_configured' });
  }

  const {
    vote,
    email = null,
    notes = null,
    page = 'pricing',
  } = req.body || {};

  if (vote !== 'yes' && vote !== 'no') {
    return res.status(400).json({ error: 'invalid_vote' });
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : null;
  const normalizedNotes = typeof notes === 'string' ? notes.trim() : null;
  const normalizedPage = typeof page === 'string' && page.trim() ? page.trim() : 'pricing';

  if (normalizedEmail && !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  try {
    const payload = {
      vote,
      email: normalizedEmail,
      notes: normalizedNotes || null,
      page: normalizedPage,
      source: 'web',
      user_agent: req.get('user-agent') || null,
      origin: req.get('origin') || null,
      referer: req.get('referer') || null,
    };

    const { error } = await supabaseAdmin.from('concierge_interest').insert(payload);
    if (error) throw error;

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[feedback/concierge-interest]', err);
    res.status(500).json({ error: err.message || 'feedback_insert_failed' });
  }
});

export default router;
