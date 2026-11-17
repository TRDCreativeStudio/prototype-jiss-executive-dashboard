import React, { useState } from 'react';
import { MapPin, Wallet, Ban, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Card, SummaryCard, Money, PageHeader, Select, StatusChip, Table, Td, ExportBtn, exportCsv, type StatusHint, Tr, TableEmpty, CellMain, usePaged } from '../../ui/kit';
import { navigate } from '../../router';
import { has } from '../../domain/rbac';
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

type SortCol = 'days' | 'held';

/** Isi tab "Tanpa SPK" di halaman Project (layar Daftar jalan tanpa SPK di PRD). */
export const WithoutSpkView: React.FC = () => {
  const { state, lookups, access, me } = useStore();
  const isMarketing = has(me, 'Marketing');
  const [area, setArea] = useState('');
  const [client, setClient] = useState('');
  const [marketing, setMarketing] = useState('');
  const [owner, setOwner] = useState<'mine' | 'all'>(isMarketing ? 'mine' : 'all');
  const [tab, setTab] = useState<'semua' | 'lewat'>('semua');
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'days', dir: 'desc' });
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const escalateAt = settingNum(state.settings, 'spk.without_spk_escalate_days', 30);
  const reminders = (state.settings.find(s => s.key === 'spk.chase_reminder_days')?.value ?? '7, 14, 21').split(',').map(x => parseInt(x, 10));
  const firstReminder = reminders[0] ?? 7;

  const ownerOf = (clientId: string) => lookups.client.get(clientId)?.accountOwnerId ?? '';
  const isMine = (clientId: string) => { const c = lookups.client.get(clientId); return !!c && (c.accountOwnerId === me.id || c.coOwnerIds.includes(me.id)); };

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
    (isMarketing ? owner === 'all' || isMine(x.clientId) : !marketing || ownerOf(x.clientId) === marketing));
  const lateCount = filtered.filter(x => x.late).length;
  const rows = filtered
    .filter(x => tab === 'semua' || x.late)
    .sort((a, b) => {
      const r = sort.col === 'days' ? a.days - b.days : a.held - b.held;
      return sort.dir === 'asc' ? r : -r;
    });
  const { pageRows, pager } = usePaged(rows);

  // Ringkasan (mengikuti filter area/klien/marketing)
  const seeAllMoney = filtered.every(x => access.money(x.clientId));
  const totalHeld = filtered.reduce((n, x) => n + x.held, 0);
  const gaps = unbilledGaps(state.fpks, state.spks).filter(g => {
    const site = lookups.site.get(g.spk.siteId);
    return site && access.area(site.areaId) &&
      (!area || site.areaId === area) && (!client || g.spk.clientId === client) &&
      (isMarketing ? owner === 'all' || isMine(g.spk.clientId) : !marketing || ownerOf(g.spk.clientId) === marketing);
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

  // Aksi langsung dari daftar (hanya pemilik klien)
  const action = (x: Row): { label: string; to: string } | null => {
    if (!isMarketing || !access.can('spk.input') || !isMine(x.clientId)) return null;
    if (x.pendingSpk?.status === 'perlu_revisi') return { label: 'Revisi SPK', to: `/spk/${x.pendingSpk.id}/revisi` };
    if (x.pendingSpk) return null; // menunggu verifikasi Finance
    if (x.lapsedSpk) return { label: 'Input SPK perpanjangan', to: `/spk/input?induk=${x.lapsedSpk.id}` };
    return { label: 'Input SPK', to: `/spk/input?fpk=${x.key}` };
  };

  const sortHeader = (label: string, col: SortCol) => {
    const on = sort.col === col;
    return (
      <button type="button" onClick={() => setSort(s => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }))}
        className="group inline-flex items-center gap-1 font-semibold uppercase tracking-wide hover:text-slate-800 cursor-pointer select-none">
        <span>{label}</span>
        {on ? (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3 text-slate-700" /> : <ArrowDown className="w-3 h-3 text-slate-700" />)
          : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </button>
    );
  };

  const head = ['Proyek', 'Klien', ...(isMarketing ? [] : ['Marketing']), sortHeader('Hari tanpa SPK', 'days'), sortHeader('Nilai tertahan', 'held'), 'Status SPK', ''];
  const widths = isMarketing ? ['20%', '22%', '16%', '15%', '14%', '13%'] : ['17%', '19%', '12%', '15%', '13%', '13%', '11%'];

  return (
    <div>

      {/* Kartu ringkasan: info saja (filter ada di tab) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
        <SummaryCard icon={MapPin} label="Proyek tanpa SPK" value={filtered.length} chevron={false}
          sub={lateCount ? `${lateCount} lebih ${escalateAt} hari, sudah eskalasi BOD` : undefined} />
        <SummaryCard
          icon={Wallet}
          label="Nilai tertahan"
          value={seeAllMoney ? fmtRp(totalHeld) : <Money value={0} />}
          info="Nilai per bulan ÷ jumlah hari kalender bulan itu × jumlah hari, dihitung per bulan."
        />
        <SummaryCard
          icon={Ban}
          label="Tidak tertagih"
          value={seeGapMoney ? fmtRp(unbilled) : <Money value={0} />}
          info="Hari dijaga sebelum periode SPK dimulai. Hari-hari ini tidak tercakup SPK sehingga tidak bisa ditagih. Potensi = bila SPK yang sedang dicek aktif dengan periode seperti sekarang."
          sub={seeGapMoney && unbilledPotential > 0 ? `Potensi ${fmtRp(unbilledPotential)} bila SPK yang sedang dicek aktif` : undefined}
        />
      </div>


      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Select value={tab} onChange={e => setTab(e.target.value as 'semua' | 'lewat')} className="sm:w-48" aria-label="Filter lama tanpa SPK">
          <option value="semua">Semua ({filtered.length})</option>
          <option value="lewat">Lebih {escalateAt} hari ({lateCount})</option>
        </Select>
        <Select value={area} onChange={e => setArea(e.target.value)} className="sm:w-48" aria-label="Filter area">
          <option value="">Area</option>
          {state.areas.filter(a => access.area(a.id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select value={client} onChange={e => setClient(e.target.value)} className="sm:w-60" aria-label="Filter klien">
          <option value="">Klien</option>
          {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        {isMarketing ? (
          <Select value={owner} onChange={e => setOwner(e.target.value as 'mine' | 'all')} className="sm:w-48" aria-label="Filter pemilik klien">
            <option value="mine">Klien saya</option>
            <option value="all">Semua klien</option>
          </Select>
        ) : (
          <Select value={marketing} onChange={e => setMarketing(e.target.value)} className="sm:w-48" aria-label="Filter marketing">
            <option value="">Marketing</option>
            {marketingUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        )}
        <div className="sm:ml-auto"><ExportBtn onClick={() => exportCsv('jalan-tanpa-spk.csv', [
          ['Proyek', 'Klien', 'Area', 'Marketing', 'Sejak', 'Hari', 'Nilai tertahan', 'Status SPK'],
          ...rows.map(x => [
            x.site?.name ?? '',
            lookups.client.get(x.clientId)?.name ?? '',
            lookups.area.get(x.site?.areaId ?? '')?.name ?? '',
            lookups.user.get(ownerOf(x.clientId))?.name ?? '',
            fmtDate(x.from),
            x.days,
            access.money(x.clientId) ? Math.round(x.held) : '—',
            x.pendingSpk ? SPK_STATUS[x.pendingSpk.status].label : x.lapsedSpk ? 'Belum ada perpanjangan' : 'Belum ada SPK',
          ]),
        ])} /></div>
      </div>

      <Card pad={false}>
        <Table head={head} widths={widths} minWidth="920px">
          {pageRows.map(x => {
            const dc = daysChip(x);
            const act = action(x);
            return (
              <Tr key={x.key} selected={selectedSiteId === x.site?.id} onClick={() => x.site && setSelectedSiteId(x.site.id)}>
                <Td><CellMain>{x.site?.name}</CellMain></Td>
                <Td className="text-sm text-slate-800">{lookups.client.get(x.clientId)?.name}</Td>
                {!isMarketing && <Td className="text-sm text-slate-800">{lookups.user.get(ownerOf(x.clientId))?.name ?? '–'}</Td>}
                <Td className="whitespace-nowrap"><StatusChip tone={dc.tone} label={dc.label} hint={dc.hint} /></Td>
                <Td className="whitespace-nowrap"><Money value={x.held} clientId={x.clientId} className="font-semibold" /></Td>
                <Td className="whitespace-nowrap">{statusChip(x)}</Td>
                <Td className="text-right whitespace-nowrap">
                  {act && <Btn size="sm" variant="secondary" onClick={e => { e.stopPropagation(); navigate(act.to); }}>{act.label}</Btn>}
                </Td>
              </Tr>
            );
          })}
        </Table>
        {rows.length === 0 && <TableEmpty>{tab === 'lewat' ? `Tidak ada proyek yang lebih dari ${escalateAt} hari.` : 'Tidak ada proyek yang jalan tanpa SPK.'}</TableEmpty>}
        {pager}
      </Card>

      {selectedSiteId && <ProjectSidePanel siteId={selectedSiteId} onClose={() => setSelectedSiteId(null)} />}
    </div>
  );
};

/** Halaman khusus "Jalan tanpa SPK" (layar PRD), di bawah Project di sidebar. */
export const WithoutSpkPage: React.FC = () => (
  <div>
    <PageHeader
      title="Jalan tanpa SPK"
      subtitle="Proyek yang sudah dijaga tapi belum tercakup SPK aktif, dihitung sejak mulai jaga atau sejak SPK lama berakhir."
    />
    <WithoutSpkView />
  </div>
);
