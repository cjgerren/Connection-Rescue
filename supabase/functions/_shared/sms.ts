function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function optionalEnv(name: string) {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : null;
}

function toE164(input: string) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (raw.startsWith('+')) {
    const plusDigits = `+${raw.slice(1).replace(/\D+/g, '')}`;
    return plusDigits.length > 1 ? plusDigits : '';
  }
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export type SmsSendResult =
  | { ok: true; sid: string }
  | { ok: false; error: string };

export function smsEnvStatus() {
  const hasAccountSid = !!optionalEnv('TWILIO_ACCOUNT_SID');
  const hasAuthToken = !!optionalEnv('TWILIO_AUTH_TOKEN');
  const hasFromNumber = !!optionalEnv('TWILIO_FROM_NUMBER');
  const hasMessagingServiceSid = !!optionalEnv('TWILIO_MESSAGING_SERVICE_SID');
  return {
    configured: hasAccountSid && hasAuthToken && (hasFromNumber || hasMessagingServiceSid),
    hasAccountSid,
    hasAuthToken,
    hasFromNumber,
    hasMessagingServiceSid,
  };
}

export async function sendSmsTwilio(args: {
  to: string;
  body: string;
  statusCallback?: string | null;
}): Promise<SmsSendResult> {
  const accountSid = requiredEnv('TWILIO_ACCOUNT_SID');
  const authToken = requiredEnv('TWILIO_AUTH_TOKEN');
  const fromNumber = optionalEnv('TWILIO_FROM_NUMBER');
  const messagingServiceSid = optionalEnv('TWILIO_MESSAGING_SERVICE_SID');
  if (!fromNumber && !messagingServiceSid) {
    throw new Error('Missing required env: TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID');
  }

  const to = toE164(args.to);
  if (!to) return { ok: false, error: 'invalid_to_number' };

  const bodyText = String(args.body || '').trim();
  if (!bodyText) return { ok: false, error: 'empty_sms_body' };

  const form = new URLSearchParams();
  form.set('To', to);
  form.set('Body', bodyText);
  if (messagingServiceSid) form.set('MessagingServiceSid', messagingServiceSid);
  else if (fromNumber) form.set('From', fromNumber);
  if (args.statusCallback) form.set('StatusCallback', args.statusCallback);

  const auth = btoa(`${accountSid}:${authToken}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const responseText = await res.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : null;
  } catch {
    payload = { raw: responseText };
  }

  if (!res.ok) {
    const message =
      typeof payload?.message === 'string' ? payload.message
        : typeof payload?.error_message === 'string' ? payload.error_message
          : `twilio_${res.status}`;
    return { ok: false, error: message };
  }

  const sid = String(payload?.sid || '').trim();
  if (!sid) return { ok: false, error: 'twilio_missing_sid' };
  return { ok: true, sid };
}

