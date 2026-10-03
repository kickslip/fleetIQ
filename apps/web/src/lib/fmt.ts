import type { Alert, JobStatus, VehicleStatus } from '@fleet/shared';

export const VEHICLE_COLORS: Record<VehicleStatus, string> = {
  active: '#34d399',
  idle: '#fbbf24',
  offline: '#64748b',
  maintenance: '#f87171',
};

export const JOB_COLORS: Record<JobStatus, string> = {
  pending: 'bg-slate-600',
  assigned: 'bg-sky-600',
  accepted: 'bg-indigo-600',
  en_route: 'bg-amber-600',
  arrived: 'bg-violet-600',
  completed: 'bg-emerald-600',
  cancelled: 'bg-red-600',
};

export const SEVERITY_COLORS: Record<Alert['severity'], string> = {
  info: 'text-sky-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
};

export function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
