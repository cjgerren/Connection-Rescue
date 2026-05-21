import { corsHeaders, jsonResponse } from './admin.ts';

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export type EmailSendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export function emailEnvStatus() {
  const hasKey = !!Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESCUE_EMAIL_FROM') || '';
  return { configured: hasKey && !!from, hasKey, from };
}

export async function sendEmailResend(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  tags?: { name: string; value: string }[];
}): Promise<EmailSendResult> {
  const key = requiredEnv('RESEND_API_KEY');
  const from = requiredEnv('RESCUE_EMAIL_FROM');
  const replyTo = (args.replyTo || Deno.env.get('RESCUE_EMAIL_REPLY_TO') || '').trim() || null;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(args.tags?.length ? { tags: args.tags } : {}),
    }),
  });

  const bodyText = await res.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : null;
  } catch {
    payload = { raw: bodyText };
  }

  if (!res.ok) {
    const message = typeof payload?.message === 'string' ? payload.message : null;
    const error = typeof payload?.error === 'string' ? payload.error : null;
    return { ok: false, error: message || error || `resend_${res.status}` };
  }
  const id = String(payload?.id || '').trim();
  if (!id) return { ok: false, error: 'resend_no_id' };
  return { ok: true, id };
}

type RescueOptionTemplate = {
  flight_num?: string;
  note?: string;
  name?: string;
  total_with_taxes?: number;
};

export function optionsEmailTemplate(args: {
  taskType: string;
  travelerEmail: string;
  options: RescueOptionTemplate[];
  flightNum?: string | null;
  flightDate?: string | null;
}) {
  const title = 'Your ConnectionRescue options';
  const flightLine = args.flightNum ? `Flight: ${args.flightNum}${args.flightDate ? ` (${args.flightDate})` : ''}` : null;
  const lines = [
    `Here are your current rescue options (${args.taskType}).`,
    ...(flightLine ? [flightLine] : []),
    '',
    ...args.options.map((o, idx) => {
      const n = idx + 1;
      if (o?.flight_num) return `${n}. ${o.flight_num} — ${o.note || 'Option'}`;
      if (o?.name) return `${n}. ${o.name} — ${o.total_with_taxes != null ? `$${o.total_with_taxes}` : ''}`.trim();
      return `${n}. Option`;
    }),
    '',
    'If you want us to proceed with one of these options, reply with the number (1, 2, or 3) and any notes.',
  ];

  const text = lines.join('\n');

  const safe = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.45">
      <h2 style="margin:0 0 8px 0">${safe(title)}</h2>
      <p style="margin:0 0 10px 0;color:#334155">Here are your current rescue options (${safe(args.taskType)}).</p>
      ${flightLine ? `<p style="margin:0 0 12px 0;color:#64748b"><strong>${safe(flightLine)}</strong></p>` : ''}
      <ol style="padding-left:18px;margin:0 0 14px 0">
        ${args.options.map((o, idx) => {
          const label = o?.flight_num
            ? `${o.flight_num} — ${o.note || 'Option'}`
            : o?.name
              ? `${o.name}${o.total_with_taxes != null ? ` — $${o.total_with_taxes}` : ''}`
              : 'Option';
          return `<li style="margin:6px 0"><span>${safe(label)}</span></li>`;
        }).join('')}
      </ol>
      <p style="margin:0;color:#0f172a">
        Reply with <strong>1</strong>, <strong>2</strong>, or <strong>3</strong> to proceed, plus any notes.
      </p>
      <p style="margin:10px 0 0 0;color:#64748b;font-size:12px">
        ConnectionRescue provides best-effort guidance and coordination. Availability can change quickly.
      </p>
    </div>
  `.trim();

  return { subject: title, text, html };
}

export { corsHeaders, jsonResponse };
