import React, { useState, useEffect } from 'react';
import { Plus, Download, AlertTriangle, X, ExternalLink, MapPin, Paperclip, Undo2, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useStore } from '../../store/store';
import { Badge, Btn, Card, Money, PageHeader, SearchBox, Select, Table, Tabs, Td, ExportBtn, exportCsv, cx } from '../../ui/kit';
import { Link, navigate } from '../../router';
import { FPK_STATUS, FPK_TYPE } from '../../domain/labels';
import { fpkCoverage, fpkHeadcount, latest } from '../../domain/selectors';
import { diffDays, fmtDate, TODAY } from '../../domain/time';
import { settingNum } from '../../domain/settings';
import type { Division, Fpk, Task, Spk, Setting, Holiday, Client, User, Site } from '../../domain/types';

const ACTIVE: Fpk['status'][] = ['cek_divisi', 'cek_margin', 'menunggu_bod', 'dikembalikan', 'disetujui', 'berjalan', 'tertutup_sebagian'];
const ARCHIVED: Fpk['status'][] = ['selesai', 'ditolak', 'batal'];

const RESULT_TEXT: Record<string, string> = { cocok: 'Disetujui', ada_perubahan: 'Ada perubahan', selesai: 'Selesai', kembalikan: 'Dikembalikan', tidak_layak: 'Tidak layak' };

export const CheckChips: React.FC<{ f: Fpk; labeled?: boolean }> = ({ f, labeled }) => {
  const v = latest(f);
  const divs: Division[] = ['Operasional', 'Recruitment', 'Pengadaan', 'Finance'];
  if (f.status === 'draf') return <span className="text-xs text-slate-400">Belum dikirim</span>;
  if (labeled) {
    return (
      <ul className="space-y-1.5">
        {divs.map(d => {
          const r = [...f.reviews].reverse().find(x => x.versionNo === v.no && x.division === d);
          const pending = f.pendingDivisions.includes(d) || (d === 'Finance' && f.status === 'cek_margin');
          const [dot, txt] = r?.result === 'kembalikan' ? ['bg-amber-400', 'Dikembalikan'] : r?.result === 'tidak_layak' ? ['bg-rose-500', 'Tidak layak'] : r ? ['bg-emerald-500', RESULT_TEXT[r.result] ?? 'Selesai'] : pending ? ['bg-blue-400', 'Sedang dicek'] : ['bg-slate-300', 'Belum'];
          return (
            <li key={d} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${dot}`} />{d === 'Finance' ? 'Finance (margin)' : d}</span>
              <span className="text-slate-600">{txt}</span>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <div className="flex gap-1">
      {divs.map(d => {
        const r = [...f.reviews].reverse().find(x => x.versionNo === v.no && x.division === d);
        const pending = f.pendingDivisions.includes(d) || (d === 'Finance' && f.status === 'cek_margin');
        const tone = r?.result === 'kembalikan' ? 'bg-amber-400' : r?.result === 'tidak_layak' ? 'bg-rose-500' : r ? 'bg-emerald-500' : pending ? 'bg-blue-400 animate-pulse' : 'bg-slate-200';
        return <span key={d} title={`${d}: ${r ? r.result.replace('_', ' ') : pending ? 'sedang dicek' : 'belum'}`} className={`w-5 h-1.5 rounded-full ${tone}`} />;
      })}
    </div>
  );
};

/** Side Panel (Drawer) 40% untuk quick preview FPK sebelum masuk ke detail page */
export const FpkSidePanel: React.FC<{ fpkId: string; onClose: () => void }> = ({ fpkId, onClose }) => {
  const { state, lookups, access, me } = useStore();
  const f = lookups.fpk.get(fpkId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!f) return null;
  const v = latest(f);
  const client = lookups.client.get(v.clientId);
  const site = lookups.site.get(v.siteId);
  const area = site?.areaId ? lookups.area.get(site.areaId) : undefined;
  const isOwner = !!client && (client.accountOwnerId === me.id || client.coOwnerIds.includes(me.id));
  const totalPeople = v.lines.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop without blur */}
      <div
        className="fixed inset-0 bg-slate-900/20 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full">
        {/* Panel 40% (Mobile/Tablet fallback to full/max-w-lg) */}
        <div className="w-screen sm:w-[520px] lg:w-[40vw] xl:w-[40vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-10">
          
          {/* Header Panel */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white sticky top-0 z-10">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">{f.number}</h2>
                <Badge tone={FPK_STATUS[f.status].tone}>{FPK_STATUS[f.status].label}</Badge>
                {f.versions.length > 1 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    v{v.no}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {FPK_TYPE[f.type]} · dibuat {lookups.user.get(f.createdBy)?.name ?? 'User'}, {fmtDate(f.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate(`/fpk/${f.id}`)}
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
            {/* Alert if returned or not feasible */}
            {f.returned && f.status === 'dikembalikan' && (
              <div className="flex items-start gap-2.5 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
                <Undo2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Dikembalikan oleh {f.returned.fromDivision}:</span>{' '}
                  {f.returned.reason}
                </div>
              </div>
            )}
            {f.notFeasible && (
              <div className="flex items-start gap-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Tidak layak ({f.notFeasible.division}):</span>{' '}
                  {f.notFeasible.reason}
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
                  <span>{site?.name ?? '– Belum ada site –'}</span>
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
                Nilai &amp; Jadwal Kontrak
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Nilai / Bulan</span>
                  <div className="font-semibold text-slate-900 text-sm">
                    <Money value={v.monthlyValue} clientId={v.clientId} />
                  </div>
                  <span className="text-[11px] text-slate-400">sebelum PPN</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Mulai Jaga</span>
                  <div className="font-semibold text-slate-800 text-sm">
                    {fmtDate(f.startedAt ?? v.plannedStart)}
                  </div>
                  {f.startedAt && <span className="text-[11px] text-emerald-600 font-medium">sudah mulai</span>}
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Periode Kontrak</span>
                  <div className="font-medium text-slate-800">
                    {v.periodStart && v.periodEnd ? `${fmtDate(v.periodStart)} – ${fmtDate(v.periodEnd)}` : '–'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Total Durasi</span>
                  <div className="font-medium text-slate-800">
                    {v.periodStart && v.periodEnd && diffDays(v.periodStart, v.periodEnd) > 0
                      ? `${Math.round(diffDays(v.periodStart, v.periodEnd) / 30.417)} bulan (${diffDays(v.periodStart, v.periodEnd)} hari)`
                      : '–'}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Cek Divisi */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Verifikasi 4 Divisi
                </span>
                <CheckChips f={f} />
              </div>
              <CheckChips f={f} labeled={true} />
            </div>

            {/* Section 4: Formasi Personel */}
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
                {v.lines.map((l, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {lookups.position.get(l.positionId)?.name ?? '– Jabatan –'}
                      </div>
                      {l.notes && <div className="text-[11px] text-slate-500 mt-0.5">{l.notes}</div>}
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

            {/* Section 5: Lampiran */}
            {v.attachments && v.attachments.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Lampiran ({v.attachments.length})
                </div>
                <div className="space-y-1.5">
                  {v.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 truncate">{att.fileName}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 shrink-0">
                        {att.kind}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Panel */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
            <div>
              {f.status === 'draf' && isOwner && (
                <Btn
                  size="sm"
                  variant="secondary"
                  icon={<Pencil className="w-3.5 h-3.5" />}
                  onClick={() => navigate(`/fpk/${f.id}/ubah`)}
                >
                  Ubah draf
                </Btn>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="secondary" onClick={onClose}>
                Tutup
              </Btn>
              <Btn
                size="sm"
                variant="primary"
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={() => navigate(`/fpk/${f.id}`)}
              >
                Buka Halaman Penuh
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

interface FpkStatusDisplay {
  label: string;
  line2: string;
  dotClass: string;
  isRed: boolean;
  isMyTurn: boolean;
  reviewTooltip: string;
  targetDate: string;
}

const getFpkStatusDisplay = (
  f: Fpk,
  state: { tasks: Task[]; spks: Spk[]; settings: Setting[]; holidays: Holiday[]; clients: Client[] },
  lookups: { client: { get: (id: string) => Client | undefined }; site: { get: (id: string) => Site | undefined }; user: { get: (id: string) => User | undefined } },
  me: User,
  mine: Set<string>,
  minMargin: number,
  today = TODAY
): FpkStatusDisplay => {
  const v = latest(f);
  const client = lookups.client.get(v.clientId);
  const isOwner = client ? (client.accountOwnerId === me.id || client.coOwnerIds?.includes(me.id) || f.createdBy === me.id) : f.createdBy === me.id;

  // Open tasks for this FPK
  const openTasks = state.tasks.filter(t => t.refId === f.id && t.status === 'terbuka');
  const earliestTask = [...openTasks].sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  const earliestDueAt = earliestTask?.dueAt;

  // SPK Coverage
  const cov = fpkCoverage(f, state.spks);

  // Determine if it's "Giliran Anda" for logged in user:
  const isMyTurn = mine.has(f.id) ||
    (f.status === 'dikembalikan' && isOwner) ||
    (f.status === 'berjalan' && isOwner && cov.done === 0) ||
    (f.status === 'cek_margin' && me.roles.includes('Finance')) ||
    (f.status === 'menunggu_bod' && me.roles.includes('BOD'));

  // Determine Red conditions:
  // 1. Lewat batas (overdue task)
  const isOverdue = openTasks.some(t => diffDays(t.dueAt, today) > 0);
  // 2. Ditandai tidak layak
  const isUnfit = Boolean(f.notFeasible);
  // 3. Margin < minimum (pada tahap evaluasi margin / BOD)
  const isLowMargin = f.status === 'menunggu_bod' && Boolean(v.estMarginPct !== undefined && v.estMarginPct < minMargin);
  // 4. Berjalan tanpa SPK melewati perkiraan SPK terbit (hanya bila benar-benar 0 SPK dan kejar_spk overdue)
  const kejarTask = state.tasks.find(t => t.refId === f.id && t.kind === 'kejar_spk');
  const daysRunning = f.startedAt ? diffDays(f.startedAt, today) + 1 : 0;
  const isSpkOverdue = f.status === 'berjalan' && cov.done === 0 && Boolean(
    (kejarTask && diffDays(kejarTask.dueAt, today) > 0)
  );

  const isRed = isOverdue || isUnfit || isLowMargin || isSpkOverdue;

  // Review Tooltip
  const divs: Division[] = ['Operasional', 'Recruitment', 'Pengadaan', 'Finance'];
  const reviewTooltip = f.status === 'draf'
    ? 'Draf belum dikirim'
    : divs.map(d => {
        const shortName = d === 'Operasional' ? 'Ops' : d === 'Finance' ? 'Finance' : d;
        const r = [...f.reviews].reverse().find(x => x.versionNo === v.no && x.division === d);
        if (r) {
          if (r.result === 'kembalikan') return `${shortName} ↩ dikembalikan (${fmtShortDate(r.at)})`;
          if (r.result === 'tidak_layak') return `${shortName} ⚠ tidak layak (${fmtShortDate(r.at)})`;
          return `${shortName} ✓ ${fmtShortDate(r.at)}`;
        }
        const pending = f.pendingDivisions.includes(d) || (d === 'Finance' && f.status === 'cek_margin');
        if (pending) return `${shortName} belum`;
        return `${shortName} –`;
      }).join(' · ');

  // Compute Label & Line 2 (baris 2 hanya bila menambah informasi)
  let label = FPK_STATUS[f.status].label;
  let line2 = '';
  const targetDate = earliestDueAt ?? f.startedAt ?? v.plannedStart ?? f.createdAt;

  switch (f.status) {
    case 'draf':
      label = 'Draf';
      line2 = '';
      break;

    case 'cek_divisi': {
      label = 'Cek divisi';
      const pendingNames = f.pendingDivisions.map(d => (d === 'Operasional' ? 'Ops' : d)).join(', ') || 'Divisi';
      const dueStr = fmtDueText(earliestDueAt, today);
      line2 = `${pendingNames} · ${dueStr}`;
      break;
    }

    case 'cek_margin': {
      label = 'Cek margin';
      const dueStr = fmtDueText(earliestDueAt, today);
      line2 = `Finance · ${dueStr}`;
      break;
    }

    case 'menunggu_bod': {
      label = 'Menunggu BOD';
      if (isUnfit) {
        line2 = 'Tidak layak';
      } else if (isLowMargin) {
        line2 = `Margin ${v.estMarginPct ?? 0}%`;
      } else {
        line2 = '';
      }
      break;
    }

    case 'dikembalikan': {
      label = 'Dikembalikan';
      const retDiv = f.returned?.fromDivision === 'Operasional' ? 'Ops' : (f.returned?.fromDivision ?? 'Divisi');
      const rawReason = f.returned?.reason ?? 'Perlu perbaikan';
      const shortReason = rawReason.length > 30 ? `${rawReason.slice(0, 30)}…` : rawReason;
      line2 = `${retDiv}: ${shortReason}`;
      break;
    }

    case 'disetujui': {
      label = 'Disetujui';
      line2 = '';
      break;
    }

    case 'berjalan':
    case 'tertutup_sebagian': {
      label = 'Berjalan';
      if (cov.done === 0) {
        line2 = `Tanpa SPK · ${daysRunning} hari`;
      } else {
        line2 = `SPK ${cov.done}/${cov.total}`;
      }
      break;
    }

    case 'selesai':
      label = 'Selesai';
      line2 = '';
      break;

    case 'ditolak': {
      label = 'Ditolak';
      const note = f.bodDecision?.note || f.cancelled?.reason || 'Ditolak';
      line2 = note.length > 30 ? `${note.slice(0, 30)}…` : note;
      break;
    }

    case 'batal': {
      label = 'Batal';
      const note = f.cancelled?.reason || 'Dibatalkan';
      line2 = note.length > 30 ? `${note.slice(0, 30)}…` : note;
      break;
    }
  }

  // Determine Dot Color (only 4 + red):
  let dotClass = 'bg-slate-400';
  if (isRed) {
    dotClass = 'bg-rose-500';
  } else if (isMyTurn) {
    dotClass = 'bg-amber-400 ring-1 ring-amber-600/60';
  } else if (f.status === 'cek_divisi' || f.status === 'cek_margin' || f.status === 'menunggu_bod') {
    dotClass = 'bg-blue-600';
  } else if (f.status === 'dikembalikan') {
    dotClass = 'bg-amber-400 ring-1 ring-amber-600/60';
  } else if (f.status === 'disetujui' || f.status === 'berjalan' || f.status === 'tertutup_sebagian') {
    dotClass = 'bg-emerald-500';
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

type SortCol = 'default' | 'fpk' | 'status' | 'start' | 'headcount' | 'value';

export const FpkListPage: React.FC = () => {
  const { state, lookups, access, myTasks, me } = useStore();
  const [tab, setTab] = useState<'aktif' | 'draft' | 'archived'>('aktif');
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [selectedFpkId, setSelectedFpkId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const minMargin = settingNum(state.settings, 'margin.minimum_pct', 10);
  const mine = new Set(myTasks.filter(x => x.task.refType === 'fpk').map(x => x.task.refId));
  const visible = state.fpks.filter(f => {
    const s = lookups.site.get(latest(f).siteId);
    if (!s) return f.status === 'draf';
    return access.area(s.areaId);
  });
  const draftCount = visible.filter(f => f.status === 'draf').length;

  const filteredFpks = visible
    .filter(f => {
      if (tab === 'draft') return f.status === 'draf';
      if (tab === 'archived') return ARCHIVED.includes(f.status);
      return ACTIVE.includes(f.status);
    })
    .filter(f => !area || lookups.site.get(latest(f).siteId)?.areaId === area)
    .filter(f => `${f.number} ${lookups.client.get(latest(f).clientId)?.name} ${lookups.site.get(latest(f).siteId)?.name}`.toLowerCase().includes(q.toLowerCase()));

  const preparedRows = filteredFpks.map(f => ({
    f,
    statusDisplay: getFpkStatusDisplay(f, state, lookups, me, mine, minMargin),
  }));

  const sortedRows = [...preparedRows].sort((a, b) => {
    if (sortCol === 'fpk') {
      const nameA = lookups.client.get(latest(a.f).clientId)?.name ?? '';
      const nameB = lookups.client.get(latest(b.f).clientId)?.name ?? '';
      const res = nameA.localeCompare(nameB);
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'status') {
      const res = a.statusDisplay.label.localeCompare(b.statusDisplay.label);
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'start') {
      const dateA = a.f.startedAt ?? latest(a.f).plannedStart ?? '';
      const dateB = b.f.startedAt ?? latest(b.f).plannedStart ?? '';
      const res = dateA.localeCompare(dateB);
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'headcount') {
      const res = fpkHeadcount(a.f) - fpkHeadcount(b.f);
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'value') {
      const res = latest(a.f).monthlyValue - latest(b.f).monthlyValue;
      return sortDir === 'asc' ? res : -res;
    }

    // Default sorting (tab Aktif):
    // 1. Baris "Giliran Anda"
    if (a.statusDisplay.isMyTurn !== b.statusDisplay.isMyTurn) {
      return a.statusDisplay.isMyTurn ? -1 : 1;
    }
    // 2. Baris merah (bermasalah)
    if (a.statusDisplay.isRed !== b.statusDisplay.isRed) {
      return a.statusDisplay.isRed ? -1 : 1;
    }
    // 3. Sisanya, urut batas terdekat
    if (a.statusDisplay.targetDate && b.statusDisplay.targetDate) {
      return a.statusDisplay.targetDate.localeCompare(b.statusDisplay.targetDate);
    }
    return b.f.createdAt.localeCompare(a.f.createdAt);
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
        title="FPK"
        actions={<>
          <Btn
            size="sm"
            variant="secondary"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => exportCsv('fpk.csv', [
              ['Klien', 'Site', 'Area', 'Nomor', 'Jenis', 'Status', 'Keterangan', 'Mulai', 'Orang', 'Nilai/Bulan'],
              ...sortedRows.map(({ f, statusDisplay }) => {
                const v = latest(f);
                return [
                  lookups.client.get(v.clientId)?.name ?? '',
                  lookups.site.get(v.siteId)?.name ?? '',
                  lookups.site.get(v.siteId)?.areaId ? (lookups.area.get(lookups.site.get(v.siteId)!.areaId)?.name ?? '') : '',
                  f.number,
                  FPK_TYPE[f.type],
                  statusDisplay.label,
                  statusDisplay.line2,
                  fmtDate(f.startedAt ?? v.plannedStart),
                  fpkHeadcount(f),
                  access.money(v.clientId) ? v.monthlyValue : '—',
                ];
              }),
            ])}
          >
            Ekspor
          </Btn>
          {access.can('fpk.create') && <Btn size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => navigate('/fpk/baru')}>Buat FPK</Btn>}
        </>}
      />
      <Tabs value={tab} onChange={k => setTab(k as 'aktif' | 'draft' | 'archived')} tabs={[
        { key: 'aktif', label: 'Aktif' },
        { key: 'draft', label: `Draf (${draftCount})` },
        { key: 'archived', label: 'Arsip' },
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
          renderSortHeader('FPK', 'fpk'),
          renderSortHeader('Status', 'status'),
          renderSortHeader('Mulai', 'start'),
          renderSortHeader('Orang', 'headcount'),
          renderSortHeader('Nilai/bln', 'value'),
        ]}>
          {sortedRows.map(({ f, statusDisplay }) => {
            const v = latest(f);
            const isSelected = selectedFpkId === f.id;
            const clientName = lookups.client.get(v.clientId)?.name ?? '– Belum dipilih –';
            const siteObj = lookups.site.get(v.siteId);
            const siteName = siteObj?.name ?? '–';
            const areaName = siteObj?.areaId ? (lookups.area.get(siteObj.areaId)?.name ?? '') : '';
            const shortNumber = f.number.slice(-4);
            const typeLabel = f.type === 'perubahan' ? 'Perubahan' : f.type === 'perpanjangan' ? 'Perpanjangan' : '';
            const versionLabel = f.versions.length > 1 ? `v${v.no}` : '';
            const canSeeMoney = access.money(v.clientId);

            return (
              <tr
                key={f.id}
                onClick={() => setSelectedFpkId(f.id)}
                className={cx(
                  'cursor-pointer transition-colors',
                  isSelected ? 'bg-indigo-50/80 hover:bg-indigo-100/60' : 'hover:bg-slate-50/80'
                )}
              >
                {/* 1. FPK (Klien di baris 1; Site · Area · Nomor di baris 2; garis kuning di kiri jika Giliran Anda) */}
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
                    <span title={f.number} className="font-mono text-slate-600 hover:text-indigo-600 cursor-help">
                      {shortNumber}
                    </span>
                    {typeLabel && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-amber-700 font-medium">{typeLabel}</span>
                      </>
                    )}
                    {versionLabel && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-600 font-medium">{versionLabel}</span>
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

                {/* 3. Mulai (tanggal saja) */}
                <Td className="whitespace-nowrap text-sm font-medium text-slate-800">
                  {fmtDate(f.startedAt ?? v.plannedStart)}
                </Td>

                {/* 4. Orang (angka saja) */}
                <Td className="tabular-nums text-sm font-medium text-slate-800">
                  {fpkHeadcount(f)}
                </Td>

                {/* 5. Nilai/bln (angka; "—" bila tidak berhak melihat) */}
                <Td className="whitespace-nowrap text-sm font-medium text-slate-800">
                  {canSeeMoney ? (
                    <Money value={v.monthlyValue} clientId={v.clientId} />
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
        {sortedRows.length === 0 && <p className="text-sm text-slate-500 p-4">Tidak ada FPK.</p>}
      </Card>

      {/* Side Panel 40% Quick Preview */}
      {selectedFpkId && (
        <FpkSidePanel fpkId={selectedFpkId} onClose={() => setSelectedFpkId(null)} />
      )}
    </div>
  );
};
