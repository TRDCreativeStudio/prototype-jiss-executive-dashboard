import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { useStore } from '../../store/store';
import { Card, HintIcon, Money, PageHeader, Select, StatusChip, Table, Td, ExportBtn, cx, exportCsv, type StatusHint, Tr, TableEmpty, CellMain } from '../../ui/kit';
import { withoutSpkList, lapsedSpkList, unbilledGaps, latest } from '../../domain/selectors';
import { SPK_STATUS, type Tone } from '../../domain/labels';
import { fmtDate, fmtRp } from '../../domain/time';
import { settingNum } from '../../domain/settings';
import type { Site, Spk } from '../../domain/types';
import { ProjectSidePanel } from '../project/ProjectSidePanel';

/** Satu baris: kontrak baru yang belum ber-SPK, atau SPK lama yang sudah berakhir tapi site masih dijaga. */
interface Row {
  key: string;
  clientId: string;
  site?: Site;
  from: string;
  days: number;
  held: number;
  pendingSpk?: Spk;
  partial: boolean;
  lapsedSpk?: Spk;
  late: boolean;
}

export const WithoutSpkPage: React.FC = () => {
  const { state, lookups, access } = useStore();
  const [area, setArea] = useState('');
  const [client, setClient] = useState('');
  const [marketing, setMarketing] = useState('');
  const [lateOnly, setLateOnly] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const escalateAt = settingNum(state.settings, 'spk.without_spk_escalate_days', 30);
  const reminders = (state.settings.find(s => s.key === 'spk.chase_reminder_days')?.value ?? '7, 14, 21').split(',').map(x => parseInt(x, 10));
  const firstReminder = reminders[0] ?? 7;

  const ownerOf = (clientId: string) => lookups.client.get(clientId)?.accountOwnerId ?? '';

  const allRows: Row[] = [
    ...withoutSpkList(state.fpks, state.spks, state.sites).map(x => ({
      key: x.fpk.id,
      clientId: latest(x.fpk).clientId,
      site: x.site,
      from: x.from,
      days: x.days,
      held: x.held,
      pendingSpk: x.pendingSpk,
      partial: x.fpk.status === 'tertutup_sebagian',
      late: x.days >= escalateAt,
    })),
    // SPK sudah berakhir, site masih dijaga: langsung eskalasi BOD (lewat 1 hari kerja)
    ...lapsedSpkList(state.spks, state.sites).map(x => ({
      key: x.spk.id,
      clientId: x.spk.clientId,
      site: x.site,
      from: x.from,
      days: x.days,
      held: x.held,
      pendingSpk: x.pendingSpk,
      partial: false,
      lapsedSpk: x.spk,
      late: x.days > 1,
    })),
  ].filter(x => x.site && access.area(x.site.areaId));

  const filtered = allRows.filter(x =>
    (!area || x.site?.areaId === area) &&
    (!client || x.clientId === client) &&
    (!marketing || ownerOf(x.clientId) === marketing));
  // Paling lama di atas
  const rows = filtered.filter(x => !lateOnly || x.late).sort((a, b) => b.days - a.days);

  // Ringkasan (mengikuti filter area/klien/marketing)
  const lateCount = filtered.filter(x => x.late).length;
  const seeAllMoney = filtered.every(x => access.money(x.clientId));
  const totalHeld = filtered.reduce((n, x) => n + x.held, 0);
  const gaps = unbilledGaps(state.fpks, state.spks).filter(g => {
    const site = lookups.site.get(g.spk.siteId);
    return site && access.area(site.areaId) &&
      (!area || site.areaId === area) && (!client || g.spk.clientId === client) && (!marketing || ownerOf(g.spk.clientId) === marketing);
  });
  const unbilled = gaps.filter(g => g.final).reduce((n, g) => n + g.value, 0);
  const unbilledPotential = gaps.filter(g => !g.final).reduce((n, g) => n + g.value, 0);
  const seeGapMoney = gaps.every(g => access.money(g.spk.clientId));

  const marketingUsers = state.users.filter(u => u.active && u.roles.includes('Marketing'));

  const daysChip = (x: Row): { tone: Tone; label: string; hint: StatusHint } => {
    const tone: Tone = x.late ? 'red' : x.days >= firstReminder ? 'amber' : 'slate';
    const next = reminders.find(r => r >= x.days);
    const hintText = x.lapsedSpk
      ? `Sejak ${fmtDate(x.from)} (SPK lama berakhir) · eskalasi BOD`
      : `Sejak ${fmtDate(x.from)} · ${x.late ? 'sudah eskalasi BOD' : next ? `pengingat berikutnya hari ke-${next}` : `eskalasi BOD di hari ke-${escalateAt}`}`;
    return { tone, label: `${x.days} hari${x.late ? ' · eskalasi BOD' : ''}`, hint: { kind: 'info', text: hintText } };
  };

  const statusChip = (x: Row) => {
    if (x.pendingSpk) {
      const st = SPK_STATUS[x.pendingSpk.status];
      const hint: StatusHint | null = x.partial
        ? { kind: 'info', text: `${x.pendingSpk.number} · sebagian kuota sudah tertutup SPK aktif` }
        : { kind: 'info', text: x.pendingSpk.number };
      return <StatusChip tone={st.tone} label={st.label} hint={hint} />;
    }
    if (x.lapsedSpk) {
      return <StatusChip tone="red" label="Belum ada perpanjangan" hint={{ kind: 'info', text: `${x.lapsedSpk.number} berakhir ${fmtDate(x.lapsedSpk.periodEnd)}` }} />;
    }
    return <StatusChip tone="red" label="Belum ada SPK" hint={x.partial ? { kind: 'info', text: 'Sebagian kuota sudah tertutup SPK aktif' } : null} />;
  };

  const StatCard: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; info?: string; tone?: 'red'; active?: boolean; onClick?: () => void }> =
    ({ label, value, hint, info, tone, active, onClick }) => {
      const Tag = onClick ? 'button' : 'div';
      return (
        <Tag
          {...(onClick ? { type: 'button' as const, onClick } : {})}
          className={cx(
            'rounded-xl border p-4 bg-white text-left transition-colors',
            onClick && 'hover:border-slate-400 cursor-pointer',
            active ? 'border-slate-900 ring-1 ring-slate-900' : tone === 'red' ? 'border-rose-200' : 'border-slate-200',
          )}
        >
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            {label}
            {info && <HintIcon icon={Info} text={info} className="text-slate-400" />}
          </div>
          <div className={cx('text-2xl font-bold mt-1 tabular-nums', tone === 'red' ? 'text-rose-600' : 'text-slate-900')}>{value}</div>
          {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
        </Tag>
      );
    };

  return (
    <div>
      <PageHeader
        title="Daftar jalan tanpa SPK"
        subtitle="Site yang sudah dijaga tapi belum ada SPK aktif."
        actions={<ExportBtn onClick={() => exportCsv('jalan-tanpa-spk.csv', [
          ['Klien', 'Site', 'Area', 'Marketing', 'Sejak', 'Hari', 'Nilai tertahan', 'Status SPK'],
          ...rows.map(x => [
            lookups.client.get(x.clientId)?.name ?? '',
            x.site?.name ?? '',
            lookups.area.get(x.site?.areaId ?? '')?.name ?? '',
            lookups.user.get(ownerOf(x.clientId))?.name ?? '',
            fmtDate(x.from),
            x.days,
            access.money(x.clientId) ? Math.round(x.held) : '—',
            x.pendingSpk ? SPK_STATUS[x.pendingSpk.status].label : x.lapsedSpk ? 'Belum ada perpanjangan' : 'Belum ada SPK',
          ]),
        ])} />}
      />

      {/* Kartu ringkasan: dua kartu pertama berfungsi sebagai filter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Site tanpa SPK" value={filtered.length} active={!lateOnly} onClick={() => setLateOnly(false)} />
        <StatCard label={`Lewat ${escalateAt} hari`} value={lateCount} tone={lateCount ? 'red' : undefined} hint="Sudah eskalasi ke BOD" active={lateOnly} onClick={() => setLateOnly(v => !v)} />
        <StatCard
          label="Nilai tertahan"
          value={seeAllMoney ? fmtRp(totalHeld) : <Money value={0} />}
          info="Nilai per bulan ÷ jumlah hari kalender bulan itu × jumlah hari, dihitung per bulan."
        />
        <StatCard
          label="Tidak tertagih"
          value={seeGapMoney ? fmtRp(unbilled) : <Money value={0} />}
          info="Hari dijaga sebelum periode SPK dimulai. Hari-hari ini tidak tercakup SPK sehingga tidak bisa ditagih."
          hint={seeGapMoney && unbilledPotential > 0 ? `+ ${fmtRp(unbilledPotential)} dari SPK yang belum aktif` : undefined}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Select value={area} onChange={e => setArea(e.target.value)} className="sm:w-48" aria-label="Filter area">
          <option value="">Area</option>
          {state.areas.filter(a => access.area(a.id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select value={client} onChange={e => setClient(e.target.value)} className="sm:w-60" aria-label="Filter klien">
          <option value="">Klien</option>
          {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={marketing} onChange={e => setMarketing(e.target.value)} className="sm:w-48" aria-label="Filter marketing">
          <option value="">Marketing</option>
          {marketingUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
      </div>

      <Card pad={false}>
        <Table head={['Klien', 'Site', 'Marketing', 'Hari tanpa SPK', 'Nilai tertahan', 'Status SPK']}>
          {rows.map(x => {
            const dc = daysChip(x);
            return (
              <Tr key={x.key} selected={selectedSiteId === x.site?.id} onClick={() => x.site && setSelectedSiteId(x.site.id)}>
                <Td><CellMain>{lookups.client.get(x.clientId)?.name}</CellMain></Td>
                <Td>
                  <div className="text-sm text-slate-800">{x.site?.name}</div>
                  <div className="text-[13px] text-slate-500 mt-0.5">{lookups.area.get(x.site?.areaId ?? '')?.name}</div>
                </Td>
                <Td className="text-sm text-slate-800">{lookups.user.get(ownerOf(x.clientId))?.name ?? '–'}</Td>
                <Td className="whitespace-nowrap"><StatusChip tone={dc.tone} label={dc.label} hint={dc.hint} /></Td>
                <Td className="whitespace-nowrap"><Money value={x.held} clientId={x.clientId} className="font-semibold" /></Td>
                <Td className="whitespace-nowrap">{statusChip(x)}</Td>
              </Tr>
            );
          })}
        </Table>
        {rows.length === 0 && <TableEmpty>Tidak ada site yang jalan tanpa SPK.</TableEmpty>}
      </Card>

      {selectedSiteId && <ProjectSidePanel siteId={selectedSiteId} onClose={() => setSelectedSiteId(null)} />}
    </div>
  );
};
