import type { Tone } from '../../domain/labels';
import React, { useState, useEffect } from 'react';
import { Plus, Download, AlertTriangle, Undo2, Pencil, ArrowUpDown, ArrowUp, ArrowDown, Clock, CheckCircle2, Wallet, Users, CalendarDays, CalendarCheck } from 'lucide-react';
import { useStore } from '../../store/store';
import { Badge, Btn, Card, Money, PageHeader, SearchBox, Select, Table, Tabs, Td, ExportBtn, exportCsv, cx, useAnimatedClose, StatusChip, ActivityLog, type StatusHint, Tr, TableEmpty, PanelTopBar, SummaryCard, AttachmentChip, usePaged, Stepper, stepWindow } from '../../ui/kit';
import { fpkActivity } from '../../domain/activity';
import { ProjectLinkCard } from '../project/projectUi';
import { Link, navigate } from '../../router';
import { FPK_STATUS, FPK_TYPE, SPK_STATUS } from '../../domain/labels';
import { fpkCoverage, fpkHeadcount, latest } from '../../domain/selectors';
import { diffDays, fmtDate, TODAY } from '../../domain/time';
import { settingNum } from '../../domain/settings';
import type { Division, Fpk, Task, Spk, Setting, Holiday, Client, User, Site } from '../../domain/types';

// Tab daftar FPK mengikuti alur dokumen
const ACTIVE: Fpk['status'][] = ['cek_divisi', 'cek_margin', 'menunggu_bod', 'dikembalikan'];
const APPROVED: Fpk['status'][] = ['disetujui', 'berjalan', 'tertutup_sebagian', 'selesai'];
const ARCHIVED: Fpk['status'][] = ['ditolak', 'batal'];

const RESULT_TEXT: Record<string, string> = { cocok: 'Disetujui', ada_perubahan: 'Ada perubahan', perlu_survei: 'Perlu survei', selesai: 'Selesai', kembalikan: 'Dikembalikan', tidak_layak: 'Tidak layak' };

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

/** Alur dokumen FPK: berhenti di Disetujui. Setelah itu pekerjaan berlanjut di Project. */
export const FPK_STEPS: { key: string; label: string }[] = [
  { key: 'draf', label: 'Draf' },
  { key: 'cek_divisi', label: 'Cek divisi' },
  { key: 'cek_margin', label: 'Cek margin' },
  { key: 'menunggu_bod', label: 'Menunggu BOD' },
  { key: 'disetujui', label: 'Disetujui' },
];

/** Props stepper FPK. Dikembalikan = di tahap cek divisi dengan tanda kuning; selesai = semua langkah tuntas. */
export const fpkStepProps = (f: Fpk) => {
  const returned = f.status === 'dikembalikan';
  const idx = FPK_STEPS.findIndex(x => x.key === f.status);
  const approved = ['disetujui', 'berjalan', 'tertutup_sebagian', 'selesai'].includes(f.status);
  return {
    steps: FPK_STEPS.map(x => (returned && x.key === 'cek_divisi' ? 'Dikembalikan' : x.label)),
    current: approved ? FPK_STEPS.length : returned ? 1 : Math.max(0, idx),
    warn: returned,
  };
};

/**
 * Cek divisi per versi: chip + "nama · tanggal" (atau batas), catatan pemeriksa bila ada.
 * `withNotes` menampilkan catatan/alasan; margin Finance hanya untuk yang berhak (BOD/Finance).
 */
export const DivisionChecks: React.FC<{ f: Fpk; versionNo?: number; withNotes?: boolean; showMargin?: boolean }> = ({ f, versionNo, withNotes, showMargin }) => {
  const { state, lookups } = useStore();
  const vNo = versionNo ?? latest(f).no;
  const v = f.versions.find(x => x.no === vNo) ?? latest(f);
  const isLatest = vNo === latest(f).no;
  const openTasks = state.tasks.filter(t => t.refId === f.id && t.status === 'terbuka');
  const userName = (id?: string) => (id ? lookups.user.get(id)?.name : undefined) ?? '–';
  const divs: Division[] = ['Operasional', 'Recruitment', 'Pengadaan', 'Finance'];
  const row = (d: Division) => {
    const r = [...f.reviews].reverse().find(x => x.versionNo === vNo && x.division === d);
    if (f.status === 'draf' && isLatest) return { tone: 'slate' as Tone, label: 'Belum dikirim', meta: '', note: undefined as string | undefined };
    if (r) {
      const tone: Tone = r.result === 'kembalikan' ? 'amber' : r.result === 'tidak_layak' ? 'red' : r.result === 'ada_perubahan' || r.result === 'perlu_survei' ? 'amber' : 'green';
      const extra = d === 'Finance' && showMargin && v.estMarginPct !== undefined ? ` · margin ${v.estMarginPct.toLocaleString('id-ID')}%` : '';
      return { tone, label: RESULT_TEXT[r.result] ?? 'Selesai', meta: `${userName(r.actorId)} · ${fmtDate(r.at)}${extra}`,
        note: [r.note, r.readyDate ? `Siap ${fmtDate(r.readyDate)}` : ''].filter(Boolean).join(' · ') || undefined };
    }
    if (!isLatest) return { tone: 'slate' as Tone, label: '–', meta: '', note: undefined };
    const pending = f.pendingDivisions.includes(d) || (d === 'Finance' && f.status === 'cek_margin');
    if (pending) {
      const t = openTasks.find(x => x.division === d || x.assigneeRole === d);
      return { tone: 'blue' as Tone, label: 'Menunggu', meta: t ? `batas ${fmtDate(t.dueAt)}` : '', note: undefined };
    }
    if (d === 'Finance' && ['cek_divisi', 'dikembalikan'].includes(f.status)) return { tone: 'slate' as Tone, label: 'Belum', meta: 'setelah 3 divisi selesai', note: undefined };
    return { tone: 'slate' as Tone, label: 'Belum', meta: '', note: undefined };
  };
  return (
    <ul className="divide-y divide-slate-100">
      {divs.map(d => {
        const r = row(d);
        return (
          <li key={d} className="py-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-slate-800">{DIV_LABEL[d]}</span>
              <Badge tone={r.tone}>{r.label}</Badge>
              <span className="flex-1 text-right text-[13px] text-slate-500 truncate">{r.meta}</span>
            </div>
            {withNotes && r.note && <p className="text-[13px] text-slate-600 mt-1">{r.note}</p>}
          </li>
        );
      })}
      {f.bodDecision && isLatest && (
        <li className="py-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-36 shrink-0 text-slate-800">BOD</span>
            <Badge tone={f.bodDecision.decision === 'setujui' ? 'green' : f.bodDecision.decision === 'tolak' ? 'red' : 'amber'}>
              {f.bodDecision.decision === 'setujui' ? 'Disetujui' : f.bodDecision.decision === 'tolak' ? 'Ditolak' : f.bodDecision.decision}
            </Badge>
            <span className="flex-1 text-right text-[13px] text-slate-500 truncate">
              {userName(f.bodDecision.by)}{f.bodDecision.onBehalfOf ? ' (atas nama BOD)' : ''} · {fmtDate(f.bodDecision.at)}
            </span>
          </div>
          {withNotes && f.bodDecision.note && <p className="text-[13px] text-slate-600 mt-1">{f.bodDecision.note}</p>}
        </li>
      )}
    </ul>
  );
};

/** Bagian di dalam side modal: judul 14px, dipisah garis tipis (tanpa kotak). */
const PanelSection: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <section className="pt-5 border-t border-slate-100">
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {right && <span className="text-[13px] text-slate-500">{right}</span>}
    </div>
    {children}
  </section>
);

const DIV_LABEL: Record<Division, string> = { Operasional: 'Operasional', Recruitment: 'Recruitment', Pengadaan: 'Pengadaan', Finance: 'Finance (margin)' };
const NEXT_TONE = {
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  green: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  red: 'bg-rose-50 border-rose-200 text-rose-900',
  slate: 'bg-slate-50 border-slate-200 text-slate-800',
} as const;

/** Side modal FPK: identitas di header, langkah berikutnya, ringkasan, cek divisi, formasi, SPK, lampiran, log. */
export const FpkSidePanel: React.FC<{ fpkId: string; onClose: () => void }> = ({ fpkId, onClose }) => {
  const { closing, close } = useAnimatedClose(onClose);
  const { state, lookups, access, me, myTasks } = useStore();
  const f = lookups.fpk.get(fpkId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (!f) return null;
  const v = latest(f);
  const client = lookups.client.get(v.clientId);
  const site = lookups.site.get(v.siteId);
  const area = site?.areaId ? lookups.area.get(site.areaId) : undefined;
  const isOwner = !!client && (client.accountOwnerId === me.id || client.coOwnerIds.includes(me.id));
  const totalPeople = v.lines.reduce((n, l) => n + l.qty, 0);
  const shiftCount = new Set(v.lines.map(l => l.shift)).size;
  const days = v.periodStart && v.periodEnd ? diffDays(v.periodStart, v.periodEnd) + 1 : 0;

  // Chip status sama dengan daftar FPK
  const minMargin = settingNum(state.settings, 'margin.minimum_pct', 10);
  const mine = new Set(myTasks.filter(x => x.task.refType === 'fpk').map(x => x.task.refId));
  const st = getFpkStatusDisplay(f, state, lookups, me, mine, minMargin);

  // Data pendukung
  const relatedSpks = state.spks.filter(x => x.fpkId === f.id);
  const pendingSpk = relatedSpks.find(x => x.status === 'diinput' || x.status === 'perlu_revisi');
  const cov = fpkCoverage(f, state.spks);
  const openTasks = state.tasks.filter(t => t.refId === f.id && t.status === 'terbuka').sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const due = openTasks[0]?.dueAt;
  const dueText = due ? `batas ${fmtDate(due)}` : '';
  const userName = (id?: string) => (id ? lookups.user.get(id)?.name : undefined) ?? '–';
  const canInputSpk = access.can('spk.input') && isOwner && !pendingSpk;
  const runningDays = f.startedAt ? diffDays(f.startedAt, TODAY) + 1 : 0;

  // ① Langkah berikutnya (berubah sesuai status)
  const lastReturn = [...f.reviews].reverse().find(r => r.result === 'kembalikan');
  const next: { tone: keyof typeof NEXT_TONE; icon: React.ReactNode; title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode } | null = (() => {
    switch (f.status) {
      case 'draf':
        return { tone: 'slate', icon: <Pencil className="w-4 h-4" />, title: 'Draf belum dikirim ke cek divisi', action: isOwner ? <Btn size="sm" variant="secondary" onClick={() => navigate(`/fpk/${f.id}/ubah`)}>Lanjutkan draf</Btn> : undefined };
      case 'dikembalikan':
        return {
          tone: 'amber', icon: <Undo2 className="w-4 h-4" />,
          title: <>Dikembalikan oleh {f.returned?.fromDivision ?? 'divisi'}{lastReturn ? ` (${userName(lastReturn.actorId)}, ${fmtDate(lastReturn.at)})` : ''}</>,
          body: f.returned?.reason ? <>“{f.returned.reason}”</> : undefined,
          action: isOwner ? <Btn size="sm" onClick={() => navigate(`/fpk/${f.id}/ubah`)}>Perbaiki → versi {v.no + 1}</Btn> : undefined,
        };
      // Status menunggu cukup ditunjukkan stepper. Setelah disetujui, pekerjaan berlanjut di Project.
      case 'ditolak':
        return { tone: 'red', icon: <AlertTriangle className="w-4 h-4" />, title: 'Ditolak BOD', body: f.bodDecision?.note };
      case 'batal':
        return { tone: 'red', icon: <AlertTriangle className="w-4 h-4" />, title: 'Dibatalkan', body: f.cancelled?.reason };
      default:
        return null;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label={`FPK ${f.number}`}>
      <div className="drawer-backdrop fixed inset-0 bg-slate-900/20" data-closing={closing} onClick={close} />

      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="drawer-panel w-screen sm:w-[520px] lg:w-[40vw] xl:w-[40vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-10" data-closing={closing}>

          {/* Header: ✕ kiri, buka halaman penuh kanan; identitas = klien & site */}
          <div className="px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 space-y-2">
            <PanelTopBar onClose={close} fullHref={`/fpk/${f.id}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-slate-900 font-mono">{f.number}</h2>
                <StatusChip tone={st.tone} label={st.label} hint={st.hint} />
              </div>
              <p className="text-sm text-slate-800 mt-1">
                {client?.name ?? '– Belum ada klien –'}
                <span className="text-slate-300 mx-1.5">·</span>
                {site?.name ?? '– Belum ada site –'}
                {area && <span className="text-slate-500"><span className="text-slate-300 mx-1.5">·</span>{area.name}</span>}
              </p>
              <p className="text-[13px] text-slate-500 mt-0.5">
                {FPK_TYPE[f.type]} · v{v.no} · dibuat {userName(f.createdBy)}, {fmtDate(f.createdAt)}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Alur: 1 langkah sebelumnya, saat ini, 2 berikutnya */}
            {!['ditolak', 'batal'].includes(f.status) && (() => { const sp = fpkStepProps(f); return <Stepper {...stepWindow(sp.steps, sp.current)} warn={sp.warn} compact />; })()}

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
            {APPROVED.includes(f.status) && <ProjectLinkCard siteId={v.siteId} />}

            {/* ② Ringkasan */}
            <div className="grid grid-cols-2 gap-2">
              <SummaryCard icon={Wallet} label="Nilai / bulan" value={<Money value={v.monthlyValue} clientId={v.clientId} />} valueClass="text-base" sub="sebelum PPN" />
              <SummaryCard icon={Users} label="Personel" value={`${totalPeople} orang`} valueClass="text-base" sub={`${shiftCount} shift`} />
              <SummaryCard icon={CalendarDays} label="Periode kontrak" value={v.periodStart && v.periodEnd ? `${fmtDate(v.periodStart)} – ${fmtDate(v.periodEnd)}` : '–'} valueClass="text-base" sub={days > 0 ? `${days} hari` : undefined} />
              <SummaryCard icon={CalendarCheck} label={f.startedAt ? 'Mulai jaga' : 'Rencana mulai'} value={fmtDate(f.startedAt ?? v.plannedStart)} valueClass="text-base" sub={f.startedAt ? `sudah berjalan ${runningDays} hari` : undefined} />
            </div>

            {/* ③ Cek divisi */}
            <PanelSection title="Cek divisi" right={f.versions.length > 1 ? `versi ${v.no}` : undefined}>
              <DivisionChecks f={f} />
            </PanelSection>

            {/* ④ Formasi personel */}
            <PanelSection title="Formasi personel" right={`${totalPeople} orang`}>
              <ul className="divide-y divide-slate-100">
                {v.lines.map((l, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="text-slate-800">{lookups.position.get(l.positionId)?.name ?? '– Jabatan –'}</div>
                      {l.notes && <div className="text-[13px] text-slate-500 mt-0.5">{l.notes}</div>}
                    </div>
                    <span className="shrink-0 text-slate-700 tabular-nums">{l.qty} orang <span className="text-slate-400">·</span> {l.shift}</span>
                  </li>
                ))}
              </ul>
            </PanelSection>

            {/* ⑤ SPK terkait (hanya bila ada) */}
            {relatedSpks.length > 0 && (
              <PanelSection title="SPK terkait" right={`${cov.done} dari ${cov.total} personel tercakup`}>
                <ul className="divide-y divide-slate-100">
                  {relatedSpks.map(x => (
                    <li key={x.id}>
                      <button type="button" onClick={() => navigate(`/spk/${x.id}`)} className="w-full flex items-center justify-between gap-3 py-2 text-sm text-left hover:bg-slate-50 rounded">
                        <span className="font-mono text-slate-800">{x.number}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-[13px] text-slate-500">{x.lines.reduce((n, l) => n + l.qty, 0)} orang</span>
                          <Badge tone={SPK_STATUS[x.status].tone}>{SPK_STATUS[x.status].label}</Badge>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </PanelSection>
            )}

            {/* ⑥ Lampiran */}
            {v.attachments.length > 0 && (
              <PanelSection title="Lampiran" right={`${v.attachments.length} file`}>
                <div className="space-y-1.5">
                  {v.attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between gap-2">
                      <AttachmentChip a={att} clientId={v.clientId} />
                      <span className="text-[13px] text-slate-500 shrink-0">{att.kind}</span>
                    </div>
                  ))}
                </div>
              </PanelSection>
            )}

            {/* ⑦ Log aktivitas (paling bawah) */}
            <PanelSection title="Log aktivitas">
              <ActivityLog items={fpkActivity(f, state.spks, state.audit, access.money(v.clientId))} />
            </PanelSection>
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
  tone: Tone;
  hint: StatusHint | null;
  isRed: boolean;
  isMyTurn: boolean;
  reviewTooltip: string;
  targetDate: string;
}

export const getFpkStatusDisplay = (
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

  // Label chip + ikon info (tooltip). Tidak ada baris kedua di tabel.
  let label = FPK_STATUS[f.status].label;
  let line2 = '';
  let hint: StatusHint | null = null;
  const targetDate = earliestDueAt ?? f.startedAt ?? v.plannedStart ?? f.createdAt;
  const daysLate = earliestDueAt ? diffDays(earliestDueAt, today) : 0;
  const dueText = (who: string) => daysLate > 0
    ? { kind: 'danger' as const, text: `Lewat ${daysLate} hari · ${who} belum cek` }
    : { kind: 'info' as const, text: `Menunggu ${who} · batas ${fmtDueText(earliestDueAt, today)}` };

  switch (f.status) {
    case 'draf':
      label = 'Draf';
      break;

    case 'cek_divisi': {
      label = 'Cek divisi';
      const pendingNames = f.pendingDivisions.map(d => (d === 'Operasional' ? 'Ops' : d)).join(', ') || 'divisi';
      line2 = `${pendingNames} · ${fmtDueText(earliestDueAt, today)}`;
      hint = dueText(pendingNames);
      break;
    }

    case 'cek_margin': {
      label = 'Cek margin';
      line2 = `Finance · ${fmtDueText(earliestDueAt, today)}`;
      hint = dueText('Finance');
      break;
    }

    case 'menunggu_bod': {
      label = 'Menunggu BOD';
      // Peringatan kelayakan/margin hanya relevan untuk yang memutuskan (BOD) dan Finance.
      // Marketing cukup tahu FPK sedang di BOD.
      const decider = me.roles.includes('BOD') || me.roles.includes('Finance');
      if (!decider) {
        // tanpa ikon
      } else if (isUnfit) {
        line2 = 'Tidak layak';
        hint = { kind: 'danger', text: 'Ditandai tidak layak oleh Finance' };
      } else if (isLowMargin) {
        line2 = `Margin ${v.estMarginPct ?? 0}%`;
        hint = { kind: 'danger', text: `Margin ${v.estMarginPct ?? 0}%, di bawah minimum ${minMargin}%` };
      } else if (daysLate > 0) {
        hint = { kind: 'danger', text: `Lewat ${daysLate} hari · BOD belum memutuskan` };
      }
      break;
    }

    case 'dikembalikan': {
      label = 'Dikembalikan';
      const retDiv = f.returned?.fromDivision === 'Operasional' ? 'Ops' : (f.returned?.fromDivision ?? 'Divisi');
      const rawReason = f.returned?.reason ?? 'Perlu perbaikan';
      line2 = `${retDiv}: ${rawReason.length > 30 ? `${rawReason.slice(0, 30)}…` : rawReason}`;
      hint = { kind: 'info', text: `${retDiv}: ${rawReason}` };
      break;
    }

    case 'disetujui':
      label = 'Disetujui';
      break;

    // Setelah disetujui, FPK sebagai dokumen sudah selesai. Kondisi pekerjaan (jalan tanpa SPK,
    // SPK sebagian, dst.) ditampilkan di Project; di sini cukup keterangan di tooltip.
    case 'berjalan':
    case 'tertutup_sebagian': {
      label = 'Disetujui';
      line2 = cov.done === 0 ? `Project: tanpa SPK · ${daysRunning} hari` : `Project: SPK ${cov.done}/${cov.total}`;
      hint = { kind: 'info', text: cov.done === 0 ? `Project berjalan tanpa SPK · ${daysRunning} hari` : `Project berjalan · SPK menutup ${cov.done} dari ${cov.total} personel` };
      break;
    }

    case 'selesai':
      label = 'Disetujui';
      hint = { kind: 'info', text: 'Project berjalan · seluruh personel tercakup SPK' };
      break;

    case 'ditolak': {
      label = 'Ditolak';
      const note = f.bodDecision?.note || f.cancelled?.reason || 'Ditolak';
      line2 = note.length > 30 ? `${note.slice(0, 30)}…` : note;
      hint = { kind: 'info', text: note };
      break;
    }

    case 'batal': {
      label = 'Batal';
      const note = f.cancelled?.reason || 'Dibatalkan';
      line2 = note.length > 30 ? `${note.slice(0, 30)}…` : note;
      hint = { kind: 'info', text: note };
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

  // Warna chip mengikuti status saja; peringatan (lewat batas, tidak layak) tampil merah di baris kedua
  const tone: Tone =
    ['cek_divisi', 'cek_margin', 'menunggu_bod'].includes(f.status) ? 'blue'
    : f.status === 'dikembalikan' ? 'amber'
    : ['disetujui', 'berjalan', 'tertutup_sebagian', 'selesai'].includes(f.status) ? 'green'
    : ['ditolak', 'batal'].includes(f.status) ? 'red'
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

type SortCol = 'default' | 'nomor' | 'fpk' | 'site' | 'status' | 'start' | 'headcount' | 'value';

export const FpkListPage: React.FC = () => {
  const { state, lookups, access, myTasks, me } = useStore();
  const [tab, setTab] = useState<'semua' | 'aktif' | 'draft' | 'approved' | 'archived'>('semua');
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
  const activeCount = visible.filter(f => ACTIVE.includes(f.status)).length;
  const approvedCount = visible.filter(f => APPROVED.includes(f.status)).length;

  const filteredFpks = visible
    .filter(f => {
      if (tab === 'draft') return f.status === 'draf';
      if (tab === 'semua') return true;
      if (tab === 'archived') return ARCHIVED.includes(f.status);
      if (tab === 'approved') return APPROVED.includes(f.status);
      return ACTIVE.includes(f.status);
    })
    .filter(f => !area || lookups.site.get(latest(f).siteId)?.areaId === area)
    .filter(f => `${f.number} ${lookups.client.get(latest(f).clientId)?.name} ${lookups.site.get(latest(f).siteId)?.name}`.toLowerCase().includes(q.toLowerCase()));

  const preparedRows = filteredFpks.map(f => ({
    f,
    statusDisplay: getFpkStatusDisplay(f, state, lookups, me, mine, minMargin),
  }));

  const sortedRows = [...preparedRows].sort((a, b) => {
    if (sortCol === 'nomor') {
      const res = a.f.number.localeCompare(b.f.number);
      return sortDir === 'asc' ? res : -res;
    }
    if (sortCol === 'site') {
      const res = (lookups.site.get(latest(a.f).siteId)?.name ?? '').localeCompare(lookups.site.get(latest(b.f).siteId)?.name ?? '');
      return sortDir === 'asc' ? res : -res;
    }
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

  const { pageRows: pageRowsFpk, pager: pagerFpk } = usePaged(sortedRows);
  return (
    <div>
      <PageHeader
        title="FPK"
        subtitle="Perintah kerja internal yang dicek divisi terkait dan disetujui BOD, supaya persiapan bisa jalan sebelum SPK terbit."
        actions={<>
          <Btn
            size="sm"
            variant="secondary"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => exportCsv('fpk.csv', [
              ['No. FPK', 'Klien', 'Site', 'Area', 'Jenis', 'Status', 'Keterangan', 'Mulai', 'Orang', 'Nilai/Bulan'],
              ...sortedRows.map(({ f, statusDisplay }) => {
                const v = latest(f);
                return [
                  f.number,
                  lookups.client.get(v.clientId)?.name ?? '',
                  lookups.site.get(v.siteId)?.name ?? '',
                  lookups.site.get(v.siteId)?.areaId ? (lookups.area.get(lookups.site.get(v.siteId)!.areaId)?.name ?? '') : '',
                  FPK_TYPE[f.type],
                  statusDisplay.label,
                  statusDisplay.hint?.text ?? '',
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
      <Tabs value={tab} onChange={k => setTab(k as 'semua' | 'aktif' | 'draft' | 'approved' | 'archived')} tabs={[
        { key: 'semua', label: `Semua (${visible.length})` },
        { key: 'aktif', label: `Pengajuan (${activeCount})` },
        { key: 'draft', label: `Draf (${draftCount})` },
        { key: 'approved', label: `Disetujui (${approvedCount})` },
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
          renderSortHeader('No. FPK', 'nomor'),
          renderSortHeader('Klien', 'fpk'),
          renderSortHeader('Site', 'site'),
          renderSortHeader('Status', 'status'),
          renderSortHeader('Mulai', 'start'),
          renderSortHeader('Orang', 'headcount'),
          renderSortHeader('Nilai/bln', 'value'),
        ]}>
          {pageRowsFpk.map(({ f, statusDisplay }) => {
            const v = latest(f);
            const isSelected = selectedFpkId === f.id;
            const clientName = lookups.client.get(v.clientId)?.name ?? '– Belum dipilih –';
            const siteObj = lookups.site.get(v.siteId);
            const siteName = siteObj?.name ?? '–';
            const areaName = siteObj?.areaId ? (lookups.area.get(siteObj.areaId)?.name ?? '') : '';
            const typeLabel = f.type === 'perubahan' ? 'Perubahan' : f.type === 'perpanjangan' ? 'Perpanjangan' : '';
            const versionLabel = f.versions.length > 1 ? `v${v.no}` : '';
            const canSeeMoney = access.money(v.clientId);

            return (
              <Tr key={f.id} selected={isSelected} onClick={() => setSelectedFpkId(f.id)}>
                {/* 1. No. FPK */}
                <Td className="whitespace-nowrap">
                  <span className="font-mono text-sm font-medium text-slate-900">{f.number}</span>
                  {versionLabel && <span className="ml-1.5 text-[13px] text-slate-500 font-medium">{versionLabel}</span>}
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

                {/* 4. Status: chip + ikon tooltip, tanpa baris kedua */}
                <Td className="whitespace-nowrap">
                  <StatusChip tone={statusDisplay.tone} label={statusDisplay.label} hint={statusDisplay.hint} />
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
              </Tr>
            );
          })}
        </Table>
        {sortedRows.length === 0 && <TableEmpty>Tidak ada FPK.</TableEmpty>}
        {pagerFpk}
      </Card>

      {/* Side Panel 40% Quick Preview */}
      {selectedFpkId && (
        <FpkSidePanel fpkId={selectedFpkId} onClose={() => setSelectedFpkId(null)} />
      )}
    </div>
  );
};
