import { db } from './db.js';
import { broadcast } from './ws.js';
import type { Alert } from '@fleet/shared';

export function createAlert(
  a: Pick<Alert, 'type' | 'severity' | 'title'> &
    Partial<Pick<Alert, 'body' | 'vehicle_id' | 'job_id'>>
): Alert {
  const res = db
    .prepare(
      `INSERT INTO alerts (type, severity, title, body, vehicle_id, job_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(a.type, a.severity, a.title, a.body ?? null, a.vehicle_id ?? null, a.job_id ?? null);
  const alert = db
    .prepare('SELECT * FROM alerts WHERE id = ?')
    .get(res.lastInsertRowid as number) as unknown as Alert;
  broadcast({ type: 'alert', alert });
  return alert;
}
