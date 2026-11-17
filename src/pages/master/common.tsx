import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useStore } from '../../store/store';
import { Badge, Card, Table, Td, Tr, CellMain, CellCode, TableEmpty, Money, cx, Tabs } from '../../ui/kit';
import { Link } from '../../router';
import { FPK_STATUS, SPK_STATUS } from '../../domain/labels';
import { activeByPosition, effectiveSpks, latest, quotaByPosition, spkHeadcount } from '../../domain/selectors';
import { fmtDate } from '../../domain/time';
import type { Fpk, Spk } from '../../domain/types';

export const ActiveBadge: React.FC<{ active: boolean }> = ({ active }) =>
  active ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Nonaktif</Badge>;

/** Security aktif per jabatan vs kuota SPK yang berlaku (PRD People in Act, layar 1). */
export const QuotaTable: React.FC<{ areaId: string; siteId?: string }> = ({ areaId, siteId }) => {
  const { state, lookups } = useStore();
  const siteIds = new Set(state.sites.filter(s => (siteId ? s.id === siteId : s.areaId === areaId)).map(s => s.id));
  const quota = quotaByPosition(state.spks, siteIds);
  const actual = activeByPosition(state.personnel, areaId, siteId);
  const posIds = [...new Set([...quota.keys(), ...actual.keys()])];
  const totalQ = [...quota.values()].reduce((a, b) => a + b, 0);
  const totalA = [...actual.values()].reduce((a, b) => a + b, 0);
  const diff = (a: number, q: number) => {
    const d = a - q;
    if (d === 0) return <Badge tone="green">Pas</Badge>;
    return d < 0 ? <Badge tone="red">Kurang {-d}</Badge> : <Badge tone="amber">Lebih {d}</Badge>;
  };
  return (
    <Card
      title={siteId ? 'Security aktif vs kuota SPK di site ini' : 'Security aktif vs total kuota SPK aktif di area'}
      pad={false}
    >
      <Table head={['Jabatan', 'Security aktif', 'Kuota SPK aktif', 'Selisih']}>
        {posIds.map(pid => (
          <Tr key={pid}>
            <Td><CellMain>{lookups.position.get(pid)?.name}</CellMain></Td>
            <Td className="tabular-nums">{actual.get(pid) ?? 0}</Td>
            <Td className="tabular-nums">{quota.get(pid) ?? 0}</Td>
            <Td>{diff(actual.get(pid) ?? 0, quota.get(pid) ?? 0)}</Td>
          </Tr>
        ))}
        <Tr className="bg-slate-50 font-semibold">
          <Td>Total</Td>
          <Td className="tabular-nums">{totalA}</Td>
          <Td className="tabular-nums">{totalQ}</Td>
          <Td>{diff(totalA, totalQ)}</Td>
        </Tr>
      </Table>
      <p className="text-[13px] text-slate-500 px-4 py-3 border-t border-slate-100">
        {siteId
          ? 'Hanya menghitung security yang site-nya diisi. HR saat ini mencatat personel per area, jadi angka per site bisa kurang lengkap.'
          : 'Batasan yang diketahui: kuota dihitung per area, jadi kekurangan di satu site bisa tertutup kelebihan di site lain pada area yang sama. Kelebihan biasanya berarti ada site yang masih jalan tanpa SPK.'}
      </p>
    </Card>
  );
};

export const FpkMiniTable: React.FC<{ fpks: Fpk[]; title?: string }> = ({ fpks, title = 'FPK berjalan' }) => {
  const { lookups } = useStore();
  return (
    <Card title={`${title} (${fpks.length})`} pad={false}>
      <Table head={['No. FPK', 'Klien', 'Site', 'Status', 'Mulai', 'Nilai/bulan']}>
        {fpks.map(f => {
          const v = latest(f);
          return (
            <Tr key={f.id} to={`/fpk/${f.id}`}>
              <Td><CellCode>{f.number}</CellCode></Td>
              <Td><CellMain>{lookups.client.get(v.clientId)?.name}</CellMain></Td>
              <Td>{lookups.site.get(v.siteId)?.name}</Td>
              <Td><Badge tone={FPK_STATUS[f.status].tone}>{FPK_STATUS[f.status].label}</Badge></Td>
              <Td className="whitespace-nowrap">{fmtDate(f.startedAt ?? v.plannedStart)}</Td>
              <Td className="whitespace-nowrap"><Money value={v.monthlyValue} clientId={v.clientId} /></Td>
            </Tr>
          );
        })}
      </Table>
      {fpks.length === 0 && <TableEmpty>Tidak ada FPK.</TableEmpty>}
    </Card>
  );
};

export const SpkMiniTable: React.FC<{ spks: Spk[]; title?: string }> = ({ spks, title = 'SPK' }) => {
  const { lookups } = useStore();
  return (
    <Card title={`${title} (${spks.length})`} pad={false}>
      <Table head={['No. SPK', 'Klien', 'Site', 'Status', 'Periode', 'Personel', 'Nilai/bulan']}>
        {spks.map(s => (
          <Tr key={s.id} to={`/spk/${s.id}`}>
            <Td><CellCode>{s.number}</CellCode></Td>
            <Td><CellMain>{lookups.client.get(s.clientId)?.name}</CellMain></Td>
            <Td>{lookups.site.get(s.siteId)?.name}</Td>
            <Td><Badge tone={SPK_STATUS[s.status].tone}>{SPK_STATUS[s.status].label}</Badge></Td>
            <Td className="whitespace-nowrap">{fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}</Td>
            <Td className="tabular-nums">{spkHeadcount(s)}</Td>
            <Td className="whitespace-nowrap"><Money value={s.monthlyValue} clientId={s.clientId} /></Td>
          </Tr>
        ))}
      </Table>
      {spks.length === 0 && <TableEmpty>Tidak ada SPK.</TableEmpty>}
    </Card>
  );
};

export const RUNNING_FPK: Fpk['status'][] = ['cek_divisi', 'cek_margin', 'menunggu_bod', 'disetujui', 'berjalan', 'tertutup_sebagian', 'dikembalikan'];

export const runningIn = (state: { fpks: Fpk[]; spks: Spk[] }, siteIds: Set<string>) => {
  const fpks = state.fpks.filter(f => RUNNING_FPK.includes(f.status) && siteIds.has(latest(f).siteId));
  const effective = new Set(effectiveSpks(state.spks).map(s => s.id));
  const spks = state.spks.filter(s => siteIds.has(s.siteId) && (effective.has(s.id) || s.status === 'diinput' || s.status === 'perlu_revisi'));
  return { fpks, spks };
};

export const muted = (active: boolean) => cx(!active && 'opacity-60');

/** Tab Aktif / Nonaktif untuk daftar master data (pengganti kolom Status). */
export function useActiveTabs<T extends { active: boolean }>(rows: T[]) {
  const [tab, setTab] = useState<'aktif' | 'nonaktif'>('aktif');
  const active = rows.filter(r => r.active);
  const inactive = rows.filter(r => !r.active);
  const tabs = (
    <Tabs value={tab} onChange={k => setTab(k as 'aktif' | 'nonaktif')} tabs={[
      { key: 'aktif', label: `Aktif (${active.length})` },
      { key: 'nonaktif', label: `Nonaktif (${inactive.length})` },
    ]} />
  );
  return { tab, tabs, rows: tab === 'aktif' ? active : inactive };
}

/** Tombol ubah ringkas di ujung baris (ikon saja). */
export const EditIconBtn: React.FC<{ onClick: () => void; label?: string }> = ({ onClick, label = 'Ubah' }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label}
    className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100">
    <Pencil className="w-4 h-4" />
  </button>
);
