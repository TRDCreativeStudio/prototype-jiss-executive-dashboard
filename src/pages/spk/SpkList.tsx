import type { Tone } from '../../domain/labels';
import React, { useState, useEffect } from 'react';
import { Plus, Download, X, ExternalLink, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Lock, Info, Clock, Undo2, CalendarDays, Mail, CheckCircle2, Wallet, Users, Hourglass } from 'lucide-react';
import { useStore } from '../../store/store';
import { Badge, Btn, Card, Money, PageHeader, SearchBox, Select, Table, Tabs, Td, exportCsv, cx, AttachmentChip, useAnimatedClose, StatusChip, HintIcon, toast, ActivityLog, type StatusHint, Tr, TableEmpty, PanelTopBar, SummaryCard, usePaged, Stepper } from '../../ui/kit';
import { spkActivity } from '../../domain/activity';
import { ProjectLinkCard } from '../project/projectUi';
import { Link, navigate } from '../../router';
import { SPK_STATUS, SPK_TYPE, FPK_TYPE, MEMO_STATUS } from '../../domain/labels';
import { effectiveSpks, spkHeadcount, latest } from '../../domain/selectors';
import { fmtDate, diffDays, addDays, TODAY } from '../../domain/time';
import { settingNum } from '../../domain/settings';
import type { Spk, Task, Setting, Holiday, Client, User, Site, Fpk, Memo } from '../../domain/types';

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
  tone: Tone;
  hint: StatusHint | null;
  isRed: boolean;
  isMyTurn: boolean;
  reviewTooltip: string;
  targetDate: string;
}

const getSpkStatusDisplay = (
  s: Spk,
  state: { tasks: Task[]; settings: Setting[]; holidays: Holiday[]; clients: Client[]; memos?: Memo[] },
  lookups: { client: { get: (id: string) => Client | undefined }; site: { get: (id: string) => Site | undefined }; user: { get: (id: string) => User | undefined }; fpk: { get: (id: string) => Fpk | undefined } },
  me: User,
  mine: Set<string>,
  effective: Set<string>,
  memoStart: number,
  today = TODAY,
  memoSendBy = 60
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

  // Label chip + ikon info (tooltip). Tidak ada baris kedua di tabel.
  let label = SPK_STATUS[s.status].label;
  let line2 = '';
  let hint: StatusHint | null = null;
  const targetDate = earliestDueAt ?? (s.status === 'aktif' ? s.periodEnd : s.periodStart);
  const daysLate = earliestDueAt ? diffDays(earliestDueAt, today) : 0;

  switch (s.status) {
    case 'diinput': {
      label = 'Menunggu verifikasi';
      line2 = `Finance · ${fmtDueText(earliestDueAt, today)}`;
      hint = daysLate > 0
        ? { kind: 'danger', text: `Lewat ${daysLate} hari · Finance belum verifikasi` }
        : { kind: 'info', text: `Menunggu verifikasi Finance · batas ${fmtDueText(earliestDueAt, today)}` };
      break;
    }

    case 'perlu_revisi': {
      label = 'Perlu revisi';
      const rawReason = s.revisionReason || 'Data belum sesuai';
      line2 = rawReason.length > 30 ? `${rawReason.slice(0, 30)}…` : rawReason;
      hint = { kind: isRed ? 'danger' : 'warn', text: `${rawReason}${s.invoiceHeld ? ' · invoice ditahan' : ''}` };
      break;
    }

    case 'aktif': {
      label = 'Aktif';
      if (s.invoiceHeld) {
        line2 = 'Invoice ditahan';
        hint = { kind: 'danger', text: 'Invoice ditahan' };
      } else if (isEndingSoon) {
        line2 = left > 0 ? `Habis ${left} hari lagi` : 'Berakhir hari ini';
        const hasMemo = (state.memos ?? []).some(m => m.spkId === s.id);
        const pastSend = left <= memoSendBy;
        hint = {
          kind: !hasMemo && pastSend ? 'danger' : 'warn',
          text: `${line2}${hasMemo ? ' · memo sudah dibuat' : ' · memo belum dibuat'}`,
        };
      }
      break;
    }

    case 'berakhir':
      label = 'Berakhir';
      break;
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

  // Warna chip mengikuti status saja; peringatan (hampir habis, lewat batas) tampil di baris kedua
  const tone: Tone =
    s.status === 'diinput' ? 'blue'
    : s.status === 'perlu_revisi' ? 'amber'
    : s.status === 'aktif' ? 'green'
    : 'slate';

  return {
    label,
    line2,
    dotClass,
    tone,
    hint,
    isRed,
    isMyTurn,
    reviewTooltip,
    targetDate,
  };
};

/** Side Panel (Drawer) 40% untuk quick preview SPK sebelum masuk ke detail page */
/** Props stepper SPK: diinput → verifikasi Finance → aktif → berakhir. */
export const spkStepProps = (s: Spk) => ({
  steps: ['Diinput', s.status === 'perlu_revisi' ? 'Perlu revisi' : 'Verifikasi Finance', 'Aktif', 'Berakhir'],
  current: s.status === 'diinput' || s.status === 'perlu_revisi' ? 1 : s.status === 'aktif' ? 2 : 4,
  warn: s.status === 'perlu_revisi',
});

/** Bagian di dalam side modal: judul 14px, dipisah garis tipis (tanpa kotak). Sama dengan side modal FPK. */
const PanelSection: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <section className="pt-5 border-t border-slate-100">
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {right && <span className="text-[13px] text-slate-500">{right}</span>}
    </div>
    {children}
  </section>
);

const NEXT_TONE = {
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  green: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  red: 'bg-rose-50 border-rose-200 text-rose-900',
  slate: 'bg-slate-50 border-slate-200 text-slate-800',
} as const;

/** Side modal SPK: identitas di header, langkah berikutnya, ringkasan, formasi, dokumen, log. */
export const SpkSidePanel: React.FC<{ spkId: string; onClose: () => void }> = ({ spkId, onClose }) => {
  const { closing, close } = useAnimatedClose(onClose);
  const { state, lookups, access, me, myTasks } = useStore();
  const s = lookups.spk.get(spkId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (!s) return null;
  const client = lookups.client.get(s.clientId);
  const site = lookups.site.get(s.siteId);
  const area = site?.areaId ? lookups.area.get(site.areaId) : undefined;
  const fpk = s.fpkId ? lookups.fpk.get(s.fpkId) : undefined;
  const parent = s.parentSpkId ? lookups.spk.get(s.parentSpkId) : undefined;
  const isOwner = !!client && (client.accountOwnerId === me.id || client.coOwnerIds.includes(me.id));
  const totalPeople = spkHeadcount(s);
  const shiftCount = new Set(s.lines.map(l => l.shift)).size;
  const days = diffDays(s.periodStart, s.periodEnd) + 1;
  const daysLeft = diffDays(TODAY, s.periodEnd);
  const notStarted = s.status === 'aktif' && s.periodStart > TODAY;
  const userName = (id?: string) => (id ? lookups.user.get(id)?.name : undefined) ?? '–';

  // Chip status sama dengan daftar SPK
  const memoStart = settingNum(state.settings, 'memo.start_days_before_end', 75);
  const memoSendBy = settingNum(state.settings, 'memo.send_deadline_days_before_end', 60);
  const effective = new Set(effectiveSpks(state.spks).map(x => x.id));
  const mine = new Set(myTasks.filter(x => x.task.refType === 'spk').map(x => x.task.refId));
  const st = getSpkStatusDisplay(s, state, lookups, me, mine, effective, memoStart, TODAY, memoSendBy);

  const openTasks = state.tasks.filter(t => t.refId === s.id && t.status === 'terbuka').sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const due = openTasks[0]?.dueAt;
  const memo = [...state.memos].reverse().find(m => m.spkId === s.id);
  const canInput = access.can('spk.input') && isOwner;

  // ① Langkah berikutnya (berubah sesuai status)
  const next: { tone: keyof typeof NEXT_TONE; icon: React.ReactNode; title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode } | null = (() => {
    switch (s.status) {
      case 'perlu_revisi':
        return {
          tone: 'amber', icon: <Undo2 className="w-4 h-4" />,
          title: <>Perlu revisi{s.verifiedBy ? ` · dicek ${userName(s.verifiedBy)}${s.verifiedAt ? `, ${fmtDate(s.verifiedAt)}` : ''}` : ''}</>,
          body: <>{s.revisionReason ? <>“{s.revisionReason}”</> : null}{s.invoiceHeld && <div className="mt-0.5">Invoice ditahan sampai revisi masuk.</div>}</>,
          action: canInput ? <Btn size="sm" onClick={() => navigate(`/spk/${s.id}/revisi`)}>Revisi SPK</Btn> : undefined,
        };
      // Status lain cukup dari stepper; masa perpanjangan & jalan tanpa SPK ada di Project.
      default:
        return null;
    }
  })();

  // Sisa waktu (kartu ringkasan ke-4)
  const remain = s.status === 'berakhir' ? { value: 'Berakhir', sub: fmtDate(s.periodEnd) }
    : notStarted ? { value: `${diffDays(TODAY, s.periodStart)} hari lagi`, sub: `mulai ${fmtDate(s.periodStart)}` }
    : { value: daysLeft > 0 ? `${daysLeft} hari` : 'Hari ini', sub: `berakhir ${fmtDate(s.periodEnd)}` };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label={`SPK ${s.number}`}>
      <div className="drawer-backdrop fixed inset-0 bg-slate-900/20" data-closing={closing} onClick={close} />

      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="drawer-panel w-screen sm:w-[520px] lg:w-[40vw] xl:w-[40vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-10" data-closing={closing}>

          {/* Header: ✕ kiri, buka halaman penuh kanan; identitas = klien & site */}
          <div className="px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 space-y-2">
            <PanelTopBar onClose={close} fullHref={`/spk/${s.id}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-slate-900 font-mono">{s.number}</h2>
                <StatusChip tone={st.tone} label={st.label} hint={st.hint} />
              </div>
              <p className="text-sm text-slate-800 mt-1">
                {client?.name ?? '– Belum ada klien –'}
                <span className="text-slate-300 mx-1.5">·</span>
                {site?.name ?? '– Belum ada site –'}
                {area && <span className="text-slate-500"><span className="text-slate-300 mx-1.5">·</span>{area.name}</span>}
              </p>
              <p className="text-[13px] text-slate-500 mt-0.5">
                {s.type !== 'baru' && <>{SPK_TYPE[s.type]} · </>}diinput {userName(s.inputBy)}, {fmtDate(s.inputAt)}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Alur SPK */}
            <Stepper {...spkStepProps(s)} compact />

            {/* ① Langkah berikutnya */}
            {next && (
              <div className={cx('rounded-xl border px-4 py-3', NEXT_TONE[next.tone])}>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 opacity-80">{next.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{next.title}</div>
                    {next.body && <div className="text-[13px] mt-0.5 opacity-90">{next.body}</div>}
                  </div>
                  {next.action && <div className="shrink-0">{next.action}</div>}
                </div>
              </div>
            )}

            <ProjectLinkCard siteId={s.siteId} />

            {/* ② Ringkasan */}
            <div className="grid grid-cols-2 gap-2">
              <SummaryCard icon={Wallet} label="Nilai / bulan" value={<Money value={s.monthlyValue} clientId={s.clientId} />} valueClass="text-base" sub="sebelum PPN" />
              <SummaryCard icon={Users} label="Personel" value={`${totalPeople} orang`} valueClass="text-base" sub={`${shiftCount} shift`} />
              <SummaryCard icon={CalendarDays} label="Periode kontrak" value={`${fmtDate(s.periodStart)} – ${fmtDate(s.periodEnd)}`} valueClass="text-base" sub={`${days} hari`} />
              <SummaryCard icon={Hourglass} label="Sisa waktu" value={remain.value} valueClass="text-base" sub={remain.sub} />
            </div>

            {/* ③ Formasi personel */}
            <PanelSection title="Formasi personel" right={`${totalPeople} orang`}>
              <ul className="divide-y divide-slate-100">
                {s.lines.map((l, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 text-slate-800">{lookups.position.get(l.positionId)?.name ?? '– Jabatan –'}</span>
                    <span className="shrink-0 text-slate-700 tabular-nums">{l.qty} orang <span className="text-slate-400">·</span> {l.shift}</span>
                  </li>
                ))}
              </ul>
            </PanelSection>

            {/* ④ Dokumen */}
            <PanelSection title="Dokumen">
              <ul className="divide-y divide-slate-100">
                <li className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-slate-500">FPK induk</span>
                  {fpk
                    ? <button type="button" onClick={() => navigate(`/fpk/${fpk.id}`)} className="font-mono text-slate-800 hover:underline">{fpk.number}</button>
                    : <span className="text-slate-500">Tanpa FPK</span>}
                </li>
                {parent && (
                  <li className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-slate-500">SPK sebelumnya</span>
                    <button type="button" onClick={() => navigate(`/spk/${parent.id}`)} className="font-mono text-slate-800 hover:underline">{parent.number}</button>
                  </li>
                )}
              </ul>
              {s.pdf && (
                <div className="mt-2"><AttachmentChip a={s.pdf} clientId={s.clientId} /></div>
              )}
            </PanelSection>

            {/* ⑤ Log aktivitas (paling bawah) */}
            <PanelSection title="Log aktivitas">
              <ActivityLog items={spkActivity(s).sort((x, y) => y.at.localeCompare(x.at))} />
            </PanelSection>
          </div>
        </div>
      </div>
    </div>
  );
};

type SortCol = 'default' | 'nomor' | 'spk' | 'site' | 'end' | 'headcount' | 'value';

export const SpkListPage: React.FC = () => {
  const { state, lookups, access, myTasks, me, actions } = useStore();
  const [tab, setTab] = useState<'semua' | 'draft'>(new URLSearchParams(window.location.search).get('tab') === 'draft' ? 'draft' : 'semua');
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  // Marketing default melihat klien yang dipegangnya saja
  const [owner, setOwner] = useState<'mine' | 'all'>(me.roles.includes('Marketing') ? 'mine' : 'all');
  const [selectedSpkId, setSelectedSpkId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const memoStart = settingNum(state.settings, 'memo.start_days_before_end', 75);
  const memoSendBy = settingNum(state.settings, 'memo.send_deadline_days_before_end', 60);
  const effective = new Set(effectiveSpks(state.spks).map(s => s.id));
  const mine = new Set(myTasks.filter(x => x.task.refType === 'spk').map(x => x.task.refId));
  const isMyClient = (clientId: string) => {
    const c = lookups.client.get(clientId);
    return !!c && (c.accountOwnerId === me.id || c.coOwnerIds.includes(me.id));
  };
  // Tab Aktif: SPK yang masih berjalan (belum berakhir)
  const visible = state.spks
    .filter(s => s.status !== 'berakhir')
    .filter(s => access.area(lookups.site.get(s.siteId)?.areaId ?? ''))
    .filter(s => owner === 'all' || isMyClient(s.clientId));

  const myDrafts = state.spkDrafts.filter(x => x.createdBy === me.id);

  const filteredSpks = visible
    .filter(s => !area || lookups.site.get(s.siteId)?.areaId === area)
    .filter(s => `${s.number} ${lookups.client.get(s.clientId)?.name} ${lookups.site.get(s.siteId)?.name}`.toLowerCase().includes(q.toLowerCase()));

  const preparedRows = filteredSpks.map(s => ({
    s,
    statusDisplay: getSpkStatusDisplay(s, state, lookups, me, mine, effective, memoStart, TODAY, memoSendBy),
  }));

  const sortedRows = [...preparedRows].sort((a, b) => {
    if (sortCol === 'nomor') {
      const res = a.s.number.localeCompare(b.s.number);
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'site') {
      const res = (lookups.site.get(a.s.siteId)?.name ?? '').localeCompare(lookups.site.get(b.s.siteId)?.name ?? '');
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'spk') {
      const nameA = lookups.client.get(a.s.clientId)?.name ?? '';
      const nameB = lookups.client.get(b.s.clientId)?.name ?? '';
      const res = nameA.localeCompare(nameB);
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'end') {
      const res = a.s.periodEnd.localeCompare(b.s.periodEnd);
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

    // Default: seperti buku telepon, urut nama klien lalu site
    const byClient = (lookups.client.get(a.s.clientId)?.name ?? '').localeCompare(lookups.client.get(b.s.clientId)?.name ?? '');
    if (byClient !== 0) return byClient;
    return (lookups.site.get(a.s.siteId)?.name ?? '').localeCompare(lookups.site.get(b.s.siteId)?.name ?? '');
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

  const { pageRows: pageRowsSpk, pager: pagerSpk } = usePaged(sortedRows);
  const { pageRows: pageRowsDraft, pager: pagerDraft } = usePaged(myDrafts);
  return (
    <div>
      <PageHeader
        title="SPK"
        subtitle="Kontrak resmi dari klien (termasuk PKS) yang dicek terhadap FPK dan menjadi dasar penagihan."
        actions={<>
          <Btn
            size="sm"
            variant="secondary"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => exportCsv('spk.csv', [
              ['No. SPK', 'Klien', 'Site', 'Area', 'Jenis', 'Status', 'Keterangan', 'Mulai', 'Selesai', 'Personel', 'Nilai/Bulan'],
              ...sortedRows.map(({ s, statusDisplay }) => {
                const siteObj = lookups.site.get(s.siteId);
                return [
                  s.number,
                  lookups.client.get(s.clientId)?.name ?? '',
                  siteObj?.name ?? '',
                  siteObj?.areaId ? (lookups.area.get(siteObj.areaId)?.name ?? '') : '',
                  SPK_TYPE[s.type],
                  statusDisplay.label,
                  statusDisplay.hint?.text ?? '',
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
      <Tabs value={tab} onChange={k => setTab(k as 'semua' | 'draft')} tabs={[
        { key: 'semua', label: `Aktif (${visible.length})` },
        { key: 'draft', label: `Draft (${myDrafts.length})` },
      ]} />
      {tab === 'semua' ? (
      <>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <SearchBox value={q} onChange={setQ} placeholder="Cari" />
        <Select value={area} onChange={e => setArea(e.target.value)} className="sm:w-48">
          <option value="">Semua area</option>
          {state.areas.filter(a => access.area(a.id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select value={owner} onChange={e => setOwner(e.target.value as 'mine' | 'all')} className="sm:w-44" aria-label="Filter pemilik klien">
          <option value="mine">Klien saya</option>
          <option value="all">Semua klien</option>
        </Select>
      </div>
      <Card pad={false}>
        <Table head={[
          renderSortHeader('No. SPK', 'nomor'),
          renderSortHeader('Klien', 'spk'),
          renderSortHeader('Site', 'site'),
          renderSortHeader('Berlaku sampai', 'end'),
          'Status',
          renderSortHeader('Personel', 'headcount'),
          renderSortHeader('Nilai/bulan', 'value'),
        ]}>
          {pageRowsSpk.map(({ s, statusDisplay }) => {
            const isSelected = selectedSpkId === s.id;
            const clientName = lookups.client.get(s.clientId)?.name ?? '– Belum dipilih –';
            const siteObj = lookups.site.get(s.siteId);
            const siteName = siteObj?.name ?? '–';
            const areaName = siteObj?.areaId ? (lookups.area.get(siteObj.areaId)?.name ?? '') : '';
            const typeLabel = s.type !== 'baru' ? SPK_TYPE[s.type] : '';
            const canSeeMoney = access.money(s.clientId);
            const notStarted = s.status === 'aktif' && s.periodStart > TODAY;

            return (
              <Tr key={s.id} selected={isSelected} onClick={() => setSelectedSpkId(s.id)}>
                {/* 1. No. SPK (jenis di bawahnya bila bukan baru) */}
                <Td className="whitespace-nowrap">
                  <div className="font-mono text-sm font-medium text-slate-900">{s.number}</div>
                  {typeLabel && <div className="text-[13px] text-amber-700 font-medium mt-0.5">{typeLabel}</div>}
                </Td>

                {/* 2. Klien */}
                <Td>
                  <div className="font-medium text-slate-900 text-sm leading-snug">{clientName}</div>
                </Td>

                {/* 3. Site */}
                <Td>
                  <div className="text-sm text-slate-800 leading-snug">{siteName}</div>
                </Td>

                {/* 4. Berlaku sampai */}
                <Td className="whitespace-nowrap">
                  <span className="text-sm font-medium text-slate-800">{fmtDate(s.periodEnd)}</span>
                </Td>

                {/* Status: chip selalu tampil; tooltip di chip */}
                <Td className="whitespace-nowrap">
                  <StatusChip tone={statusDisplay.tone} label={statusDisplay.label}
                    hint={statusDisplay.hint ?? (notStarted ? { kind: 'info', text: `Berlaku mulai ${fmtDate(s.periodStart)}` } : null)} />
                </Td>

                {/* 5. Personel */}
                <Td className="tabular-nums text-sm font-medium text-slate-800">
                  {spkHeadcount(s)}
                </Td>

                {/* Nilai/bulan (gembok + tooltip bila tidak berhak melihat) */}
                <Td className="whitespace-nowrap text-sm font-medium text-slate-800">
                  {canSeeMoney ? (
                    <Money value={s.monthlyValue} clientId={s.clientId} />
                  ) : (
                    <HintIcon icon={Lock} text="Nilai hanya untuk account owner, Finance, dan BOD" className="text-slate-400" />
                  )}
                </Td>
              </Tr>
            );
          })}
        </Table>
        {sortedRows.length === 0 && <TableEmpty>Tidak ada SPK.</TableEmpty>}
        {pagerSpk}
      </Card>

      </>
      ) : (
        <Card pad={false}>
          <Table head={['No. SPK', 'Klien', 'Site', 'Terakhir disimpan', '']}>
            {pageRowsDraft.map(dr => {
              const fpkDr = dr.input.fpkId ? lookups.fpk.get(dr.input.fpkId) : undefined;
              const clientName = fpkDr ? lookups.client.get(latest(fpkDr).clientId)?.name : undefined;
              const continueDraft = () => navigate(`/spk/input?draft=${dr.id}`);
              return (
                <Tr key={dr.id} onClick={continueDraft}>
                  <Td>
                    {dr.input.number
                      ? <span className="font-mono text-sm text-slate-900">{dr.input.number}</span>
                      : <span className="text-sm text-slate-400">Belum diisi</span>}
                  </Td>
                  <Td><div className="font-medium text-slate-900 text-sm">{clientName ?? '–'}</div></Td>
                  <Td><div className="text-sm text-slate-800">{lookups.site.get(dr.input.siteId)?.name ?? '–'}</div></Td>
                  <Td className="whitespace-nowrap text-sm text-slate-600">{fmtDate(dr.updatedAt)}</Td>
                  <Td className="whitespace-nowrap text-right">
                    <div className="inline-flex gap-1.5">
                      <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); if (window.confirm('Hapus draft SPK ini?')) { actions.deleteSpkDraft(dr.id); toast('Draft dihapus'); } }}>Hapus</Btn>
                      <Btn size="sm" onClick={e => { e.stopPropagation(); continueDraft(); }}>Lanjutkan</Btn>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Table>
          {myDrafts.length === 0 && <TableEmpty>Tidak ada draft SPK.</TableEmpty>}
          {pagerDraft}
        </Card>
      )}

      {/* Side Panel 40% Quick Preview */}
      {selectedSpkId && (
        <SpkSidePanel spkId={selectedSpkId} onClose={() => setSelectedSpkId(null)} />
      )}
    </div>
  );
};
