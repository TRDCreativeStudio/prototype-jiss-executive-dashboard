// Komponen tampilan bersama halaman detail Project dan quick view Project (supaya konsisten).
import React from 'react';
import { Copy } from 'lucide-react';
import { cx } from '../../ui/kit';
import { useStore } from '../../store/store';
import { projectStatus, canRunAction, type ProjectStatus } from '../../domain/project';
import { Btn, StatusChip } from '../../ui/kit';
import { navigate } from '../../router';
import { fmtDate, diffDays, TODAY } from '../../domain/time';
import { AlertTriangle, ArrowRight, Clock, FolderKanban } from 'lucide-react';

/** Link teks netral: abu-abu gelap, garis bawah saat hover (oranye khusus tombol). */
export const LINK = 'text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:underline underline-offset-2';

/** Kartu ringkasan dipakai bersama; definisinya di ui/kit. */
export { SummaryCard } from '../../ui/kit';

export const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5">
    <h3 className="text-sm font-semibold text-slate-900 mb-3.5">{title}</h3>
    <div className="space-y-2.5">{children}</div>
  </div>
);

export const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start gap-3 text-sm">
    <span className="w-[96px] sm:w-[120px] shrink-0 text-[13px] text-slate-500 pt-px">{label}</span>
    <div className="min-w-0 flex-1 text-slate-800 leading-relaxed">{children}</div>
  </div>
);

export const CopyBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0">
    <Copy className="w-3.5 h-3.5" />
  </button>
);


// ---------------- Tahap project (dipakai daftar, detail, side modal, dan kartu "Project →" di dokumen) ----------------

export const useProjectStatus = (siteId?: string): ProjectStatus | null => {
  const { state, lookups } = useStore();
  const site = siteId ? lookups.site.get(siteId) : undefined;
  return site ? projectStatus(site, state) : null;
};

const BANNER_TONE = {
  red: 'bg-rose-50 border-rose-200 text-rose-900',
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  green: 'bg-emerald-50 border-emerald-200 text-emerald-900',
} as const;

/** "batas 16 Nov (4 hari lagi)" */
export const dueText = (due?: string) => {
  if (!due) return '';
  const d = diffDays(TODAY, due);
  return `batas ${fmtDate(due)} (${d < 0 ? `lewat ${-d} hari` : d === 0 ? 'hari ini' : `${d} hari lagi`})`;
};

/** Banner project: hanya muncul bila ada tindakan atau masalah. Tombol hanya untuk yang berhak. */
export const ProjectBanner: React.FC<{ ps: ProjectStatus }> = ({ ps }) => {
  const { me, lookups } = useStore();
  if (!ps.banner) return null;
  const client = lookups.client.get(ps.site.clientId);
  const run = canRunAction(ps.action, me, client);
  return (
    <div className={cx('rounded-xl border px-4 py-3', BANNER_TONE[ps.banner.tone])}>
      <div className="flex items-start gap-2.5">
        {ps.banner.tone === 'blue' ? <Clock className="w-4 h-4 mt-0.5 shrink-0 opacity-80" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 opacity-80" />}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{ps.banner.title}</div>
          {ps.banner.body && <div className="text-[13px] mt-0.5 opacity-90">{ps.banner.body}</div>}
          {ps.banner.held && ps.gap && ps.gap.held > 0 && <HeldLine ps={ps} />}
        </div>
        {run && ps.action?.to && <Btn size="sm" onClick={() => navigate(ps.action!.to!)}>{ps.action.label}</Btn>}
      </div>
    </div>
  );
};

const HeldLine: React.FC<{ ps: ProjectStatus }> = ({ ps }) => {
  const { access } = useStore();
  if (!ps.gap) return null;
  return <div className="text-[13px] mt-0.5 opacity-90">Nilai tertahan {access.money(ps.site.clientId) ? <b>Rp {Math.round(ps.gap.held).toLocaleString('id-ID')}</b> : 'terbatas'}.</div>;
};

/** Sel "Perlu tindakan": tombol untuk yang berhak, selain itu teks siapa yang ditunggu. */
export const ProjectActionCell: React.FC<{ ps: ProjectStatus }> = ({ ps }) => {
  const { me, lookups } = useStore();
  const a = ps.action;
  if (!a) return <span className="text-sm text-slate-400">–</span>;
  const run = canRunAction(a, me, lookups.client.get(ps.site.clientId));
  const late = a.due ? diffDays(a.due, TODAY) > 0 : false;
  const left = a.due ? diffDays(TODAY, a.due) : 0;
  // Batas ringkas: "4 hari lagi" / "lewat 3 hari"; tanggal lengkap di tooltip
  const dueShort = a.due ? (left < 0 ? `lewat ${-left} hari` : left === 0 ? 'hari ini' : left === 1 ? 'besok' : `${left} hari lagi`) : '';
  // Bukan pemilik klien: tampilkan tindakannya saja; siapa yang mengerjakan ada di tooltip
  const ownerName = lookups.user.get(lookups.client.get(ps.site.clientId)?.accountOwnerId ?? '')?.name;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {run
        ? <Btn size="sm" variant="secondary" onClick={() => navigate(a.to!)}>{a.label}</Btn>
        : <span className="text-sm text-slate-600" title={a.ownerOnly && ownerName ? `Dikerjakan ${ownerName} (account owner)` : undefined}>{a.label}</span>}
      {a.due && <span className={cx('text-[13px] whitespace-nowrap', late ? 'text-rose-600 font-medium' : 'text-slate-500')} title={`Batas ${fmtDate(a.due)}`}>· {dueShort}</span>}
    </span>
  );
};

export const ProjectChip: React.FC<{ ps: ProjectStatus }> = ({ ps }) => (
  <StatusChip tone={ps.chip.tone} label={ps.chip.label} hint={ps.chip.hint ? { kind: 'info', text: ps.chip.hint } : null} />
);

/** Kartu "Project →" di halaman/side modal dokumen: konteks pekerjaan tanpa mengulang isinya. */
export const ProjectLinkCard: React.FC<{ siteId: string; className?: string }> = ({ siteId, className }) => {
  const ps = useProjectStatus(siteId);
  if (!ps) return null;
  return (
    <button type="button" onClick={() => navigate(`/project/${siteId}`)}
      className={cx('w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 hover:bg-slate-50 transition-colors', className)}>
      <FolderKanban className="w-4 h-4 text-slate-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-slate-500">Project</div>
        <div className="text-sm font-medium text-slate-900 truncate">{ps.site.name}</div>
      </div>
      <ProjectChip ps={ps} />
      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
    </button>
  );
};
