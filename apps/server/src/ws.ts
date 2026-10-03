import type { WebSocket } from 'ws';
import { verifyToken } from './auth.js';
import { listVehicles } from './ingest.js';
import type { WsEvent } from '@fleet/shared';

const clients = new Map<WebSocket, number>(); // socket → orgId

export async function addClient(ws: WebSocket, token: string | undefined): Promise<boolean> {
  const user = token ? await verifyToken(token) : null;
  if (!user) {
    ws.close(4401, 'Unauthorized');
    return false;
  }
  clients.set(ws, user.orgId);
  ws.on('close', () => clients.delete(ws));
  ws.send(
    JSON.stringify({ type: 'snapshot', vehicles: listVehicles(user.orgId) })
  );
  return true;
}

export function broadcast(event: WsEvent, orgId: number) {
  const msg = JSON.stringify(event);
  for (const [ws, org] of clients) {
    if (org === orgId && ws.readyState === ws.OPEN) ws.send(msg);
  }
}
