import React, { useState, useEffect } from 'react';
import { Plus, Download, X, ExternalLink, MapPin, Paperclip, AlertTriangle, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useStore } from '../../store/store';
import { Badge, Btn, Card, Money, PageHeader, SearchBox, Select, Table, Tabs, Td, exportCsv, cx, AttachmentChip } from '../../ui/kit';
import { Link, navigate } from '../../router';
import { SPK_STATUS, SPK_TYPE, FPK_TYPE } from '../../domain/labels';
import { effectiveSpks, spkHeadcount } from '../../domain/selectors';
import { fmtDate, diffDays, TODAY } from '../../domain/time';
import { settingNum } from '../../domain/settings';
import type { Spk, Task, Setting, Holiday, Client, User, Site, Fpk } from '../../domain/types';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const fmtShortDate = (iso?: string) => {
  if (!iso) return '–';
  const clean = iso.slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length < 3) return '–';
  const [, m, d] = parts;
  return `${d} ${MONTHS_SHORT[m - 1]}`;
};

const fmtDueText = (dueIso?: string, today = TODAY) => {
  if (!dueIso) return 'hari ini';
  const diff = diffDays(today, dueIso);
  if (diff === 0) return 'hari ini';
  if (diff === 1) return 'besok';
  if (diff < 0) return `lewat (${Math.abs(diff)} hari)`;
  return fmtShortDate(dueIso);
};

interface SpkStatusDisplay {
  label: string;
  line2: string;
  dotClass: string;
  isRed: boolean;
  isMyTurn: boolean;
  reviewTooltip: string;
  targetDate: string;
}

const getSpkStatusDisplay = (
  s: Spk,
  state: { tasks: Task[]; settings: Setting[]; holidays: Holiday[]; clients: Client[] },
  lookups: { client: { get: (id: string) => Client | undefined }; site: { get: (id: string) => Site | undefined }; user: { get: (id: string) => User | undefined }; fpk: { get: (id: string) => Fpk | undefined } },
  me: User,
  mine: Set<string>,
  effective: Set<string>,
  memoStart: number,
  today = TODAY
): SpkStatusDisplay => {
  const client = lookups.client.get(s.clientId);
  const isOwner = client ? (client.accountOwnerId === me.id || client.coOwnerIds?.includes(me.id) || s.inputBy === me.id) : s.inputBy === me.id;

  // Open tasks for this SPK
  const openTasks = state.tasks.filter(t => t.refId === s.id && t.status === 'terbuka');
  const earliestTask = [...openTasks].sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  const earliestDueAt = earliestTask?.dueAt;

  // Determine if it's "Giliran Anda" for logged in user:
  const isMyTurn = mine.has(s.id) ||
    (s.status === 'diinput' && me.roles.includes('Finance')) ||
    (s.status === 'perlu_revisi' && isOwner);

  // Days left in contract
  const left = diffDays(today, s.periodEnd);
  const isEndingSoon = s.status === 'aktif' && effective.has(s.id) && left <= memoStart;

  // Determine Red conditions:
  // 1. Lewat batas task
  const isOverdue = openTasks.some(t => diffDays(t.dueAt, today) > 0);
  // 2. Invoice ditahan
  const isHeld = Boolean(s.invoiceHeld);

  const isRed = isOverdue || isHeld;

  // Review / details tooltip
  let reviewTooltip = '';
  if (s.status === 'diinput') {
    reviewTooltip = `Menunggu verifikasi oleh Finance (diinput ${fmtDate(s.inputAt)} oleh ${lookups.user.get(s.inputBy)?.name ?? 'User'})`;
  } else if (s.status === 'perlu_revisi') {
    reviewTooltip = `Perlu revisi: ${s.revisionReason || 'Ada data tidak sesuai'} (diverifikasi ${fmtDate(s.verifiedAt)} oleh ${lookups.user.get(s.verifiedBy ?? '')?.name ?? 'Finance'})`;
  } else if (s.status === 'aktif') {
    reviewTooltip = `SPK aktif (diverifikasi ${fmtDate(s.verifiedAt)} oleh ${lookups.user.get(s.verifiedBy ?? '')?.name ?? 'Finance'})`;
  } else {
    reviewTooltip = `SPK berakhir pada ${fmtDate(s.periodEnd)}`;
  }

  // Compute Label & Line 2 (baris 2 hanya bila menambah informasi)
  let label = SPK_STATUS[s.status].label;
  let line2 = '';
  const targetDate = earliestDueAt ?? (s.status === 'aktif' ? s.periodEnd : s.periodStart);

  switch (s.status) {
    case 'diinput': {
      label = 'Menunggu verifikasi';
      const dueStr = fmtDueText(earliestDueAt, today);
      line2 = `Finance · ${dueStr}`;
      break;
    }

    case 'perlu_revisi': {
      label = 'Perlu revisi';
      const rawReason = s.revisionReason || 'Data belum sesuai';
      const shortReason = rawReason.length > 30 ? `${rawReason.slice(0, 30)}…` : rawReason;
      line2 = shortReason;
      break;
    }

    case 'aktif': {
      label = 'Aktif';
      if (s.invoiceHeld) {
        line2 = 'Invoice ditahan';
      } else if (isEndingSoon) {
        line2 = left > 0 ? `Habis ${left} hari lagi` : 'Berakhir hari ini';
      } else {
        line2 = '';
      }
      break;
    }

    case 'berakhir': {
      label = 'Berakhir';
      line2 = '';
      break;
    }
  }

  // Determine Dot Color (only 4 + red):
  let dotClass = 'bg-slate-400';
  if (isRed) {
    dotClass = 'bg-rose-500';
  } else if (isMyTurn) {
    dotClass = 'bg-amber-400 ring-1 ring-amber-600/60';
  } else if (s.status === 'diinput') {
    dotClass = 'bg-blue-600';
  } else if (s.status === 'aktif') {
    dotClass = isEndingSoon ? 'bg-amber-400 ring-1 ring-amber-600/60' : 'bg-emerald-500';
  } else {
    dotClass = 'bg-slate-400';
  }

  return {
    label,
    line2,
    dotClass,
    isRed,
    isMyTurn,
    reviewTooltip,
    targetDate,
  };
};

/** Side Panel (Drawer) 40% untuk quick preview SPK sebelum masuk ke detail page */
export const SpkSidePanel: React.FC<{ spkId: string; onClose: () => void }> = ({ spkId, onClose }) => {
  const { state, lookups, access, me } = useStore();
  const s = lookups.spk.get(spkId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!s) return null;
  const client = lookups.client.get(s.clientId);
  const site = lookups.site.get(s.siteId);
  const area = site?.areaId ? lookups.area.get(site.areaId) : undefined;
  const fpk = s.fpkId ? lookups.fpk.get(s.fpkId) : undefined;
  const isOwner = !!client && (client.accountOwnerId === me.id || client.coOwnerIds.includes(me.id));
  const totalPeople = spkHeadcount(s);
  const daysLeft = diffDays(TODAY, s.periodEnd);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop without blur */}
      <div
        className="fixed inset-0 bg-slate-900/20 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full">
        {/* Panel 40% */}
        <div className="w-screen sm:w-[520px] lg:w-[40vw] xl:w-[40vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-10">
          
          {/* Header Panel */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white sticky top-0 z-10">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">{s.number}</h2>
                <Badge tone={SPK_STATUS[s.status].tone}>{SPK_STATUS[s.status].label}</Badge>
                {s.type !== 'baru' && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {SPK_TYPE[s.type]}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Diinput oleh {lookups.user.get(s.inputBy)?.name ?? 'User'}, {fmtDate(s.inputAt)}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate(`/spk/${s.id}`)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
                title="Buka halaman penuh"
              >
                <span>Buka detail</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Tutup panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Alert if invoice held or revision needed */}
            {s.invoiceHeld && (
              <div className="flex items-start gap-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Invoice ditahan:</span>{' '}
                  {s.revisionReason || 'SPK perlu disesuaikan dengan data FPK sebelum invoice dapat diterbitkan.'}
                </div>
              </div>
            )}
            {s.status === 'perlu_revisi' && !s.invoiceHeld && s.revisionReason && (
              <div className="flex items-start gap-2.5 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Catatan revisi Finance:</span> {s.revisionReason}
                </div>
              </div>
            )}

            {/* Section 1: Klien & Site Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Klien &amp; Lokasi
              </div>
              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 text-sm">
                  {client?.name ?? '– Belum dipilih –'}
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{site?.name ?? '–'}</span>
                  {area && <span className="text-slate-400">· Area {area.name}</span>}
                </div>
                {client?.accountOwnerId && (
                  <div className="text-xs text-slate-500 pt-0.5">
                    Account owner: {lookups.user.get(client.accountOwnerId)?.name ?? '–'}
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Nilai & Jadwal Grid */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Nilai &amp; Periode Kontrak
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Nilai / Bulan</span>
                  <div className="font-semibold text-slate-900 text-sm">
                    {access.money(s.clientId) ? (
                      <Money value={s.monthlyValue} clientId={s.clientId} />
                    ) : (
                      <span className="text-slate-400 select-none" title="Hanya untuk account owner">—</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">sebelum PPN</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Sisa Waktu</span>
                  <div className="font-semibold text-slate-800 text-sm">
                    {s.status === 'aktif' ? (
                      daysLeft > 0 ? `${daysLeft} hari lagi` : 'Berakhir hari ini'
                    ) : (
                      s.status === 'berakhir' ? 'Telah berakhir' : 'Belum aktif'
                    )}
                  </div>
                  {s.status === 'aktif' && daysLeft <= 75 && (
                    <span className="text-[11px] text-amber-600 font-medium">perlu persiapan memo</span>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block mb-0.5">Periode Kontrak</span>
                  <div className="font-medium text-slate-800">
                    {fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Formasi Personel */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Formasi Personel
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Total {totalPeople} orang
                </span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {s.lines.map((l, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {lookups.position.get(l.positionId)?.name ?? '– Jabatan –'}
                      </div>
                      {l.fpkLineId && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Terkait FPK line {l.fpkLineId}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900">{l.qty}</span>
                      <span className="text-slate-500 ml-1">orang</span>
                      <span className="inline-block ml-2 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[11px]">
                        {l.shift}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Dokumen & FPK Terkait */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Dokumen Pendukung
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="font-semibold text-slate-800">FPK Induk:</span>{' '}
                      {fpk ? (
                        <Link to={`/fpk/${fpk.id}`} className="text-indigo-700 hover:underline font-medium">
                          {fpk.number}
                        </Link>
                      ) : (
                        <span className="text-slate-500">Tanpa FPK (data awal)</span>
                      )}
                    </div>
                  </div>
                </div>

                {s.pdf && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700 truncate">{s.pdf.fileName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 shrink-0">
                      PDF SPK
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Panel */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2">
            <Btn size="sm" variant="secondary" onClick={onClose}>
              Tutup
            </Btn>
            <Btn
              size="sm"
              variant="primary"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={() => navigate(`/spk/${s.id}`)}
            >
              Buka Halaman Penuh
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

type SortCol = 'default' | 'spk' | 'status' | 'period' | 'headcount' | 'value';

export const SpkListPage: React.FC = () => {
  const { state, lookups, access, myTasks, me } = useStore();
  const [tab, setTab] = useState<'aktif' | 'diinput' | 'perlu_revisi' | 'berakhir' | 'semua'>('aktif');
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [selectedSpkId, setSelectedSpkId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const memoStart = settingNum(state.settings, 'memo.start_days_before_end', 75);
  const effective = new Set(effectiveSpks(state.spks).map(s => s.id));
  const mine = new Set(myTasks.filter(x => x.task.refType === 'spk').map(x => x.task.refId));
  const visible = state.spks.filter(s => access.area(lookups.site.get(s.siteId)?.areaId ?? ''));

  const count = (st: string) => visible.filter(s => s.status === st).length;

  const filteredSpks = visible
    .filter(s => tab === 'semua' || s.status === tab)
    .filter(s => !area || lookups.site.get(s.siteId)?.areaId === area)
    .filter(s => `${s.number} ${lookups.client.get(s.clientId)?.name} ${lookups.site.get(s.siteId)?.name}`.toLowerCase().includes(q.toLowerCase()));

  const preparedRows = filteredSpks.map(s => ({
    s,
    statusDisplay: getSpkStatusDisplay(s, state, lookups, me, mine, effective, memoStart),
  }));

  const sortedRows = [...preparedRows].sort((a, b) => {
    if (sortCol === 'spk') {
      const nameA = lookups.client.get(a.s.clientId)?.name ?? '';
      const nameB = lookups.client.get(b.s.clientId)?.name ?? '';
      const res = nameA.localeCompare(nameB);
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'status') {
      const res = a.statusDisplay.label.localeCompare(b.statusDisplay.label);
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'period') {
      const res = a.s.periodStart.localeCompare(b.s.periodStart);
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'headcount') {
      const res = spkHeadcount(a.s) - spkHeadcount(b.s);
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'value') {
      const res = a.s.monthlyValue - b.s.monthlyValue;
      return sortDir === 'asc' ? res : -res;
    }

    // Default sorting (prioritaskan Giliran Anda & Masalah):
    // 1. Baris "Giliran Anda"
    if (a.statusDisplay.isMyTurn !== b.statusDisplay.isMyTurn) {
      return a.statusDisplay.isMyTurn ? -1 : 1;
    }
    // 2. Baris merah (bermasalah / invoice ditahan)
    if (a.statusDisplay.isRed !== b.statusDisplay.isRed) {
      return a.statusDisplay.isRed ? -1 : 1;
    }
    // 3. Sisanya, urut batas terdekat / tanggal mulai
    if (a.statusDisplay.targetDate && b.statusDisplay.targetDate) {
      return a.statusDisplay.targetDate.localeCompare(b.statusDisplay.targetDate);
    }
    return b.s.inputAt.localeCompare(a.s.inputAt);
  });

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortCol('default');
        setSortDir('asc');
      }
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const renderSortHeader = (label: string, col: SortCol) => (
    <button
      type="button"
      onClick={() => handleSort(col)}
      className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide hover:text-slate-800 transition-colors group text-left cursor-pointer select-none"
    >
      <span>{label}</span>
      <span className="text-slate-400 group-hover:text-slate-600">
        {sortCol === col ? (
          sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </span>
    </button>
  );

  return (
    <div>
      <PageHeader
        title="SPK"
        actions={<>
          <Btn
            size="sm"
            variant="secondary"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => exportCsv('spk.csv', [
              ['Klien', 'Site', 'Area', 'Nomor SPK', 'Jenis', 'Status', 'Keterangan', 'Mulai', 'Selesai', 'Orang', 'Nilai/Bulan'],
              ...sortedRows.map(({ s, statusDisplay }) => {
                const siteObj = lookups.site.get(s.siteId);
                return [
                  lookups.client.get(s.clientId)?.name ?? '',
                  siteObj?.name ?? '',
                  siteObj?.areaId ? (lookups.area.get(siteObj.areaId)?.name ?? '') : '',
                  s.number,
                  SPK_TYPE[s.type],
                  statusDisplay.label,
                  statusDisplay.line2,
                  fmtDate(s.periodStart),
                  fmtDate(s.periodEnd),
                  spkHeadcount(s),
                  access.money(s.clientId) ? s.monthlyValue : '—',
                ];
              }),
            ])}
          >
            Ekspor
          </Btn>
          {access.can('spk.input') && (
            <Btn size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => navigate('/spk/input')}>
              Input SPK
            </Btn>
          )}
        </>}
      />
      <Tabs value={tab} onChange={k => setTab(k as any)} tabs={[
        { key: 'aktif', label: `Aktif (${count('aktif')})` },
        { key: 'diinput', label: `Verifikasi (${count('diinput')})` },
        { key: 'perlu_revisi', label: `Perlu revisi (${count('perlu_revisi')})` },
        { key: 'berakhir', label: 'Berakhir' },
        { key: 'semua', label: 'Semua' },
      ]} />
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <SearchBox value={q} onChange={setQ} placeholder="Cari" />
        <Select value={area} onChange={e => setArea(e.target.value)} className="sm:w-48">
          <option value="">Semua area</option>
          {state.areas.filter(a => access.area(a.id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </div>
      <Card pad={false}>
        <Table head={[
          renderSortHeader('SPK', 'spk'),
          renderSortHeader('Status', 'status'),
          renderSortHeader('Periode', 'period'),
          renderSortHeader('Orang', 'headcount'),
          renderSortHeader('Nilai/bln', 'value'),
        ]}>
          {sortedRows.map(({ s, statusDisplay }) => {
            const isSelected = selectedSpkId === s.id;
            const clientName = lookups.client.get(s.clientId)?.name ?? '– Belum dipilih –';
            const siteObj = lookups.site.get(s.siteId);
            const siteName = siteObj?.name ?? '–';
            const areaName = siteObj?.areaId ? (lookups.area.get(siteObj.areaId)?.name ?? '') : '';
            const shortNumber = s.number.split('/').pop() || s.number.slice(-3);
            const fpkObj = s.fpkId ? lookups.fpk.get(s.fpkId) : null;
            const fpkShortNumber = fpkObj ? `FPK ${fpkObj.number.slice(-4)}` : s.isInitialData ? 'Data awal' : '';
            const typeLabel = s.type !== 'baru' ? SPK_TYPE[s.type] : '';
            const canSeeMoney = access.money(s.clientId);

            return (
              <tr
                key={s.id}
                onClick={() => setSelectedSpkId(s.id)}
                className={cx(
                  'cursor-pointer transition-colors',
                  isSelected ? 'bg-indigo-50/80 hover:bg-indigo-100/60' : 'hover:bg-slate-50/80'
                )}
              >
                {/* 1. SPK (Klien di baris 1; Site · Area · Nomor SPK · FPK induk di baris 2; garis kuning di kiri jika Giliran Anda) */}
                <Td className={cx(
                  'transition-all',
                  statusDisplay.isMyTurn
                    ? 'border-l-[3px] border-amber-400 pl-3'
                    : 'border-l-[3px] border-transparent pl-3'
                )}>
                  <div className="font-medium text-slate-900 text-sm leading-snug">
                    {clientName}
                  </div>
                  <div className="text-[13px] text-slate-500 leading-snug mt-0.5 flex items-center gap-1 flex-wrap">
                    <span>{siteName}</span>
                    {areaName && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{areaName}</span>
                      </>
                    )}
                    <span className="text-slate-300">·</span>
                    <span title={s.number} className="font-mono text-slate-600 hover:text-indigo-600 cursor-help">
                      {shortNumber}
                    </span>
                    {fpkShortNumber && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-indigo-600 font-medium">{fpkShortNumber}</span>
                      </>
                    )}
                    {typeLabel && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-amber-700 font-medium">{typeLabel}</span>
                      </>
                    )}
                  </div>
                </Td>

                {/* 2. Status (titik + label, baris 2 hanya bila menambah informasi) */}
                <Td className="min-w-[180px] max-w-[280px]">
                  <div className="flex flex-col gap-0.5">
                    {/* Baris 1: titik 8px + label status */}
                    <div
                      className="flex items-center gap-2 cursor-help"
                      title={statusDisplay.reviewTooltip}
                    >
                      <span
                        aria-hidden="true"
                        className={cx('w-2 h-2 rounded-full shrink-0', statusDisplay.dotClass)}
                      />
                      <span className="text-sm font-medium text-slate-800 leading-snug">
                        {statusDisplay.label}
                      </span>
                    </div>

                    {/* Baris 2: hanya bila ada informasi */}
                    {statusDisplay.line2 ? (
                      <div
                        className={cx(
                          'text-[13px] leading-snug break-words whitespace-normal',
                          statusDisplay.isRed ? 'text-rose-600 font-semibold' : 'text-slate-500'
                        )}
                      >
                        {statusDisplay.line2}
                      </div>
                    ) : null}
                  </div>
                </Td>

                {/* 3. Periode (tanggal mulai – tanggal selesai) */}
                <Td className="whitespace-nowrap text-sm font-medium text-slate-800">
                  {fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}
                </Td>

                {/* 4. Orang (angka saja) */}
                <Td className="tabular-nums text-sm font-medium text-slate-800">
                  {spkHeadcount(s)}
                </Td>

                {/* 5. Nilai/bln (angka; "—" bila tidak berhak melihat) */}
                <Td className="whitespace-nowrap text-sm font-medium text-slate-800">
                  {canSeeMoney ? (
                    <Money value={s.monthlyValue} clientId={s.clientId} />
                  ) : (
                    <span className="text-slate-400 cursor-help select-none font-normal" title="Hanya untuk account owner">
                      —
                    </span>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
        {sortedRows.length === 0 && <p className="text-sm text-slate-500 p-4">Tidak ada SPK.</p>}
      </Card>

      {/* Side Panel 40% Quick Preview */}
      {selectedSpkId && (
        <SpkSidePanel spkId={selectedSpkId} onClose={() => setSelectedSpkId(null)} />
      )}
    </div>
  );
};
