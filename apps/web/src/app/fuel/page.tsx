'use client';

import { useEffect, useRef, useState } from 'react';
import Shell from '@/components/Shell';
import { api, getToken, API_URL } from '@/lib/api';

interface Txn {
  id: number; reg_number: string | null; card_number: string | null;
  station_name: string; litres: number; amount: number; currency: string;
  txn_at: string; status: string; flag_reason: string | null; distance_m: number | null;
}

export default function Fuel() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setTxns(await api<Txn[]>('/api/fuel/transactions').catch(() => []));
  }
  useEffect(() => { refresh(); }, []);

  async function upload(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_URL}/api/fuel/import`, {
      method: 'POST',
      headers: { authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    const data = await res.json();
    setMsg(res.ok ? `Imported ${data.imported} transactions — fraud check complete` : (data.error ?? 'Import failed'));
    refresh();
  }

  const suspicious = txns.filter((t) => t.status === 'suspicious').length;

  return (
    <Shell title="Fuel Transactions & Theft Detection">
      <div className="card mb-4 flex items-center justify-between p-4">
        <div className="text-sm text-slate-400">
          Upload a fuel-card CSV export. Each swipe is checked against the vehicle's GPS position
          at that timestamp — purchases more than 100 m away are flagged.
        </div>
        <div className="flex items-center gap-3">
          {suspicious > 0 && (
            <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
              {suspicious} suspicious
            </span>
          )}
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold hover:bg-sky-500">
            Upload fuel CSV
          </button>
        </div>
      </div>
      {msg && <p className="mb-3 text-sm text-emerald-400">{msg}</p>}

      {/* mobile: card list */}
      <div className="md:hidden space-y-3">
        {txns.map((t) => (
          <div key={t.id} className={`card p-4 ${t.status === 'suspicious' ? 'border-red-500/40' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                t.status === 'suspicious' ? 'bg-red-600' : 'bg-emerald-700'}`}>
                {t.status === 'suspicious' ? 'SUSPICIOUS' : 'OK'}
              </span>
              <span className="font-mono text-xs">{t.reg_number ?? '—'} <span className="text-slate-500">{t.card_number}</span></span>
            </div>
            <div className="mt-2 text-sm">{t.station_name}</div>
            <div className="mt-1 text-xs text-slate-400">
              {t.litres} L · {t.currency} {t.amount} · {new Date(t.txn_at).toLocaleString()}
            </div>
            {t.flag_reason && <div className="mt-2 text-xs text-red-300">{t.flag_reason}</div>}
          </div>
        ))}
        {txns.length === 0 && (
          <p className="card p-6 text-center text-sm text-slate-500">
            No transactions yet — upload <code>scripts/sample-fuel.csv</code>
          </p>
        )}
      </div>

      {/* desktop: table */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full">
          <thead><tr>
            <th>Status</th><th>Vehicle / Card</th><th>Station</th><th>Litres</th><th>Amount</th><th>Swipe time</th><th>Flag reason</th>
          </tr></thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className={t.status === 'suspicious' ? 'bg-red-500/5' : ''}>
                <td>
                  <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                    t.status === 'suspicious' ? 'bg-red-600' : 'bg-emerald-700'}`}>
                    {t.status === 'suspicious' ? 'SUSPICIOUS' : 'OK'}
                  </span>
                </td>
                <td>
                  <span className="font-mono text-xs">{t.reg_number ?? '—'}</span>
                  <span className="ml-2 text-[11px] text-slate-500">{t.card_number}</span>
                </td>
                <td>{t.station_name}</td>
                <td>{t.litres} L</td>
                <td>{t.currency} {t.amount}</td>
                <td className="text-xs text-slate-400">{new Date(t.txn_at).toLocaleString()}</td>
                <td className="text-xs text-red-300">{t.flag_reason ?? ''}</td>
              </tr>
            ))}
            {txns.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">
                No transactions yet — upload <code>scripts/sample-fuel.csv</code>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
