import { db } from './db.js';
import { broadcast } from './ws.js';
import { maybeEmailAlert } from './notify.js';
import type { Alert } from '@fleet/shared';

export function createAlert(
  a: Pick<Alert, 'type' | 'severity' | 'title'> &
    Partial<Pick<Alert, 'body' | 'vehicle_id' | 'job_id'>> & { org_id: number }
): Alert {
  const res = db
    .prepare(
      `INSERT INTO alerts (org_id, type, severity, title, body, vehicle_id, job_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(a.org_id, a.type, a.severity, a.title, a.body ?? null, a.vehicle_id ?? null, a.job_id ?? null);
  const alert = db
    .prepare('SELECT * FROM alerts WHERE id = ?')
    .get(res.lastInsertRowid as number) as unknown as Alert;
  broadcast({ type: 'alert', alert }, a.org_id);
  void maybeEmailAlert(alert);
  return alert;
}
