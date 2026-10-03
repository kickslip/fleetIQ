import type { WebSocket } from 'ws';
import type { WsEvent } from '@fleet/shared';

const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket) {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
}

export function broadcast(event: WsEvent) {
  const msg = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}
