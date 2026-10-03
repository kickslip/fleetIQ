'use client';

import { useEffect, useRef, useState } from 'react';
import { WS_URL, getToken } from './api';
import type { Alert, Job, Vehicle, WsEvent } from '@fleet/shared';

interface FleetState {
  vehicles: Map<number, Vehicle>;
  alerts: Alert[];
  lastJob: Job | null;
  connected: boolean;
}

export function useFleet() {
  const [state, setState] = useState<FleetState>({
    vehicles: new Map(),
    alerts: [],
    lastJob: null,
    connected: false,
  });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let dead = false;
    let retry: NodeJS.Timeout;

    function connect() {
      const token = getToken();
      if (!token) return;
      const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      ws.onopen = () => setState((s) => ({ ...s, connected: true }));
      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
        if (!dead) retry = setTimeout(connect, 2000);
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        setState((s) => {
          if (msg.type === 'snapshot') {
            return { ...s, vehicles: new Map(msg.vehicles.map((v: Vehicle) => [v.id, v])) };
          }
          if (msg.type === 'position') {
            const vehicles = new Map(s.vehicles);
            vehicles.set(msg.vehicle.id, msg.vehicle);
            return { ...s, vehicles };
          }
          if (msg.type === 'alert') {
            return { ...s, alerts: [msg.alert, ...s.alerts].slice(0, 50) };
          }
          if (msg.type === 'job') {
            return { ...s, lastJob: msg.job };
          }
          return s;
        });
      };
    }
    connect();
    return () => {
      dead = true;
      clearTimeout(retry);
      wsRef.current?.close();
    };
  }, []);

  return state;
}
