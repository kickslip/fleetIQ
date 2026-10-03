// Email alert channel — free-tier friendly (Gmail app password or Brevo free SMTP).
// No-ops silently when SMTP isn't configured, so the demo runs with zero setup.
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Alert } from '@fleet/shared';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL_FROM, ALERT_EMAIL_TO } = process.env;

let transporter: Transporter | null = null;
export const emailEnabled = Boolean(SMTP_HOST && ALERT_EMAIL_TO);

if (emailEnabled) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  console.log(`Email alerts enabled → ${ALERT_EMAIL_TO}`);
}

// Only severities worth interrupting a fleet manager's inbox for.
const EMAIL_SEVERITIES = new Set(['critical']);

export async function maybeEmailAlert(alert: Alert) {
  if (!transporter || !EMAIL_SEVERITIES.has(alert.severity)) return;
  try {
    await transporter.sendMail({
      from: ALERT_EMAIL_FROM ?? '"FleetIQ Alerts" <alerts@fleetiq.local>',
      to: ALERT_EMAIL_TO,
      subject: `[FleetIQ] ${alert.title}`,
      text: `${alert.title}\n\n${alert.body ?? ''}\n\n${alert.created_at}\n— FleetIQ`,
      html: `
        <div style="font-family:system-ui;background:#0b1220;color:#e2e8f0;padding:24px;border-radius:12px">
          <div style="color:#38bdf8;font-size:12px;letter-spacing:2px">FLEETIQ ALERT</div>
          <h2 style="margin:8px 0">${alert.title}</h2>
          <p style="color:#94a3b8">${alert.body ?? ''}</p>
          <p style="color:#475569;font-size:12px">${alert.created_at}</p>
        </div>`,
    });
  } catch (err) {
    console.error('Email alert failed:', (err as Error).message);
  }
}
