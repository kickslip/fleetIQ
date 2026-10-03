'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import type { Document, User, Vehicle } from '@fleet/shared';

const DOC_TYPES = ['license_disc', 'roadworthy', 'insurance', 'driver_license', 'prdp'];

export default function Documents() {
  const [docs, setDocs] = useState<(Document & { days_left: number })[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [form, setForm] = useState({ entity_type: 'vehicle', entity_id: '', doc_type: 'license_disc', expiry_date: '', notes: '' });
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setDocs(await api<any[]>('/api/documents').catch(() => []));
  }
  useEffect(() => {
    refresh();
    api<Vehicle[]>('/api/vehicles').then(setVehicles).catch(() => {});
    api<User[]>('/api/drivers').then(setDrivers).catch(() => {});
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await api('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ ...form, entity_id: Number(form.entity_id) }),
    });
    setShowForm(false);
    refresh();
  }

  const badge = (d: number) =>
    d < 0 ? 'bg-red-600' : d < 30 ? 'bg-amber-600' : 'bg-emerald-700';

  return (
    <Shell title="Documents & Compliance">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Licence discs, roadworthy certificates, insurance, driver licences &amp; PrDPs
        </p>
        <button onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold hover:bg-sky-500">
          + Add document
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
          <select value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value, entity_id: '' })}>
            <option value="vehicle">Vehicle</option>
            <option value="driver">Driver</option>
          </select>
          <select required value={form.entity_id} onChange={(e) => setForm({ ...form, entity_id: e.target.value })}>
            <option value="">Select…</option>
            {form.entity_type === 'vehicle'
              ? vehicles.map((v) => <option key={v.id} value={v.id}>{v.reg_number}</option>)
              : drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <input type="date" required value={form.expiry_date}
            onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          <button className="rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold hover:bg-emerald-500">Add</button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th>Status</th><th>Entity</th><th>Type</th><th>Document</th><th>Expiry</th><th>Days left</th><th></th>
          </tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td><span className={`h-2.5 w-2.5 inline-block rounded-full ${badge(d.days_left)}`} /></td>
                <td>{d.entity_name}</td>
                <td className="text-xs capitalize text-slate-400">{d.entity_type}</td>
                <td className="capitalize">{d.doc_type.replace(/_/g, ' ')}</td>
                <td className="text-xs">{d.expiry_date}</td>
                <td>
                  <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${badge(d.days_left)}`}>
                    {d.days_left < 0 ? `${-d.days_left}d overdue` : `${d.days_left}d`}
                  </span>
                </td>
                <td>
                  <button onClick={async () => { await api(`/api/documents/${d.id}`, { method: 'DELETE' }); refresh(); }}
                    className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
