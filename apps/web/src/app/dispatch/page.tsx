'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { useFleet } from '@/lib/ws';
import { JOB_COLORS } from '@/lib/fmt';
import type { Job, User } from '@fleet/shared';

type Driver = User & { vehicle_reg: string | null; vehicle_id: number | null };

const EMPTY = {
  title: '', pickup_address: '', pickup_lat: -26.2041, pickup_lng: 28.0473,
  dropoff_address: '', dropoff_lat: -26.1076, dropoff_lng: 28.0567,
};

export default function Dispatch() {
  const { lastJob } = useFleet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setJobs(await api<Job[]>('/api/jobs').catch(() => []));
  }
  useEffect(() => {
    refresh();
    api<Driver[]>('/api/drivers').then(setDrivers).catch(() => {});
  }, []);
  useEffect(() => { if (lastJob) refresh(); }, [lastJob]);

  async function createJob(e: React.FormEvent) {
    e.preventDefault();
    await api('/api/jobs', { method: 'POST', body: JSON.stringify(form) });
    setForm(EMPTY);
    setShowForm(false);
    refresh();
  }

  async function assign(jobId: number, driverId: string) {
    if (!driverId) return;
    await api(`/api/jobs/${jobId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ driver_id: Number(driverId) }),
    });
    refresh();
  }

  return (
    <Shell title="Dispatch & Jobs">
      <div className="mb-4 flex justify-between">
        <p className="text-sm text-slate-400">{jobs.length} jobs</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold hover:bg-sky-500"
        >
          + New job
        </button>
      </div>

      {showForm && (
        <form onSubmit={createJob} className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
          <input required placeholder="Job title" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} className="col-span-2" />
          <input required placeholder="Pickup address" value={form.pickup_address}
            onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} />
          <input required placeholder="Drop-off address" value={form.dropoff_address}
            onChange={(e) => setForm({ ...form, dropoff_address: e.target.value })} />
          {(['pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng'] as const).map((f) => (
            <input key={f} type="number" step="any" required placeholder={f.replace('_', ' ')}
              value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: Number(e.target.value) })} />
          ))}
          <button className="col-span-2 rounded-lg bg-emerald-600 py-2 text-sm font-semibold hover:bg-emerald-500 md:col-span-4">
            Create job
          </button>
        </form>
      )}

      {/* mobile: card list */}
      <div className="md:hidden space-y-3">
        {jobs.map((j) => (
          <div key={j.id} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-500">{j.ref}</span>
              <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${JOB_COLORS[j.status]}`}>
                {j.status.replace('_', ' ')}
              </span>
            </div>
            <div className="mt-2 text-sm font-medium">{j.title}</div>
            <div className="mt-1 text-xs text-slate-400">
              {j.pickup_address} <span className="text-slate-600">→</span> {j.dropoff_address}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              {j.driver_name ? (
                <span className="text-xs text-slate-300">{j.driver_name}</span>
              ) : (
                <select defaultValue="" onChange={(e) => assign(j.id, e.target.value)} className="text-xs">
                  <option value="" disabled>Assign…</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}{d.vehicle_reg ? ` (${d.vehicle_reg})` : ''}
                    </option>
                  ))}
                </select>
              )}
              <span className="text-xs">
                {j.pod_photo_path && (
                  <a href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}${j.pod_photo_path}`}
                    target="_blank" className="text-sky-400 underline">photo</a>
                )}
                {j.pod_signature_path && (
                  <a href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}${j.pod_signature_path}`}
                    target="_blank" className="ml-2 text-sky-400 underline">signature</a>
                )}
              </span>
            </div>
          </div>
        ))}
        {jobs.length === 0 && <p className="card p-6 text-center text-sm text-slate-500">No jobs yet.</p>}
      </div>

      {/* desktop: table */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full">
          <thead><tr>
            <th>Ref</th><th>Job</th><th>Pickup</th><th>Drop-off</th><th>Status</th><th>Driver</th><th>POD</th>
          </tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="font-mono text-xs">{j.ref}</td>
                <td>{j.title}</td>
                <td className="text-slate-400">{j.pickup_address}</td>
                <td className="text-slate-400">{j.dropoff_address}</td>
                <td>
                  <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${JOB_COLORS[j.status]}`}>
                    {j.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  {j.driver_name ?? (
                    <select defaultValue="" onChange={(e) => assign(j.id, e.target.value)}
                      className="text-xs">
                      <option value="" disabled>Assign…</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}{d.vehicle_reg ? ` (${d.vehicle_reg})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  {j.pod_photo_path && (
                    <a href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}${j.pod_photo_path}`}
                      target="_blank" className="text-xs text-sky-400 underline">photo</a>
                  )}
                  {j.pod_signature_path && (
                    <a href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}${j.pod_signature_path}`}
                      target="_blank" className="ml-2 text-xs text-sky-400 underline">signature</a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
