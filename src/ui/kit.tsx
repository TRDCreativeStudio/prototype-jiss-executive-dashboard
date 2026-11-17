import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Lock, Search, X, Paperclip, Download, AlertTriangle, ExternalLink, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import type { Tone } from '../domain/labels';
import { fmtDate, fmtRp } from '../domain/time';
import { useStore } from '../store/store';
import { navigate, Link } from '../router';
import type { Perm } from '../domain/rbac';
import type { Attachment } from '../domain/types';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const TONES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-100 text-amber-950 border-amber-300 font-semibold',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  violet: 'bg-amber-100 text-amber-950 border-amber-300',
  teal: 'bg-amber-50 text-amber-900 border-amber-200',
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string }> = ({ tone = 'slate', children, className }) => (
  <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap', TONES[tone], className)}>
    {children}
  </span>
);

export const PageHeader: React.FC<{ title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: string }> = ({ title, subtitle, actions, back }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
    <div className="min-w-0">
      {back && (
        <button onClick={() => navigate(back)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </button>
      )}
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <div className="text-sm text-slate-500 mt-1">{subtitle}</div>}
    </div>
    {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
  </div>
);

export const Card: React.FC<{ title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }> = ({ title, actions, children, className, pad = true }) => (
  <section className={cx('bg-white border border-slate-200 rounded-xl shadow-xs', className)}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {actions}
      </div>
    )}
    <div className={pad ? 'p-4' : ''}>{children}</div>
  </section>
);

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold border-amber-400 hover:border-amber-300 shadow-xs active:bg-amber-500',
  secondary: 'bg-white hover:bg-amber-50/40 text-slate-800 border-slate-300 hover:border-amber-400 font-medium transition-colors',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
  warning: 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold border-amber-400',
  ghost: 'bg-transparent hover:bg-amber-50/80 text-slate-700 hover:text-amber-950 border-transparent',
};

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; icon?: React.ReactNode }> = ({ variant = 'primary', size = 'md', icon, className, children, ...rest }) => (
  <button
    {...rest}
    className={cx(
      'inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
      // HP: tombol lebih besar supaya mudah disentuh (min. ~40px)
      size === 'sm' ? 'px-3 py-2 text-sm sm:px-2.5 sm:py-1.5 sm:text-xs' : 'px-4 py-2.5 text-[15px] sm:px-3.5 sm:py-2 sm:text-sm',
      BTN[variant],
      className,
    )}
  >
    {icon}
    {children}
  </button>
);

/** Nilai uang: tampil hanya untuk peran yang berhak (Finance, BOD/wakil, Marketing pemegang klien). */
export const Money: React.FC<{ value?: number; clientId?: string; className?: string }> = ({ value, clientId, className }) => {
  const { access } = useStore();
  if (!access.money(clientId)) {
    return (
      <span className={cx('inline-flex items-center gap-1 text-xs text-slate-400 font-medium', className)} title="Field terbatas: hanya Finance, BOD, dan Marketing pemegang klien">
        <Lock className="w-3 h-3" /> Terbatas
      </span>
    );
  }
  return <span className={cx('tabular-nums', className)}>{value === undefined ? '–' : fmtRp(value)}</span>;
};

export const AttachmentChip: React.FC<{ a: Attachment; clientId?: string; entity?: string; entityId?: string }> = ({ a, clientId, entity = 'lampiran', entityId = a.id }) => {
  const { access, actions } = useStore();
  const allowed = access.attachment(a, clientId);
  const open = () => {
    if (!allowed) return;
    if (a.priced) actions.openAttachment(a.fileName, entity, entityId);
    toast(`Pratinjau ${a.fileName} (simulasi)${a.priced ? ' · akses dicatat di audit log' : ''}`);
  };
  return (
    <button
      type="button"
      onClick={open}
      disabled={!allowed}
      title={allowed ? 'Buka lampiran' : 'Lampiran berisi harga: hanya Marketing pemegang klien, Finance, BOD (dan Pengadaan untuk BOQ)'}
      className={cx('inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs text-left max-w-full', allowed ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-amber-50 hover:border-amber-300' : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed')}
    >
      {allowed ? <Paperclip className="w-3 h-3 shrink-0" /> : <Lock className="w-3 h-3 shrink-0" />}
      <span className="font-medium shrink-0">{a.kind}:</span>
      <span className="truncate">{allowed ? a.fileName : 'berisi harga, tidak bisa dibuka'}</span>
    </button>
  );
};

export const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string }> = ({ label, required, hint, children, className }) => (
  <label className={cx('block', className)}>
    <span className="block text-sm sm:text-xs font-semibold text-slate-700 mb-1.5 sm:mb-1">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    {children}
    {hint && <span className="block text-[13px] sm:text-[11px] text-slate-500 mt-1">{hint}</span>}
  </label>
);

// HP: teks 16px (juga mencegah zoom otomatis di iOS) dan tinggi lebih lega
export const inputCls = 'w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-300 focus:border-amber-500 disabled:bg-slate-50 disabled:text-slate-500 transition-colors shadow-xs';

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />;
/** Input tanggal bawaan browser (formatnya ikut bahasa browser) + tanggal tertulis di bawahnya supaya tidak salah baca hari/bulan. */
export const DateInput = (p: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) => (
  <div className="min-w-0">
    <input
      {...p}
      type="date"
      onClick={e => { try { e.currentTarget.showPicker(); } catch { /* fallback */ } p.onClick?.(e); }}
      className={cx(inputCls, 'cursor-pointer', p.className)}
    />
    {typeof p.value === 'string' && p.value && <div className="text-xs text-slate-600 mt-1">{fmtDate(p.value)}</div>}
  </div>
);
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx(inputCls, 'select-chevron cursor-pointer pr-9 hover:border-slate-400', p.className)} />
);
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={cx(inputCls, p.className)} />;

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <div className="relative w-full sm:w-72">
    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? 'Cari…'} className={cx(inputCls, 'pl-9')} />
  </div>
);

export const Modal: React.FC<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }> = ({ open, title, onClose, children, footer, wide }) => {
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={cx('bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export const ErrorText: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
  children ? <p className="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{children}</p> : null;

export const Empty: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="text-center py-10 px-4">
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {children && <div className="text-xs text-slate-500 mt-1">{children}</div>}
  </div>
);

export const Tabs: React.FC<{ tabs: { key: string; label: React.ReactNode }[]; value: string; onChange: (k: string) => void }> = ({ tabs, value, onChange }) => (
  <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200 mb-4 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {tabs.map(t => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        className={cx('px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px rounded-t-md focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-300', value === t.key ? 'border-amber-500 text-amber-950' : 'border-transparent text-slate-500 hover:text-slate-800')}
      >
        {t.label}
      </button>
    ))}
  </div>
);

/*
 * STANDAR TABEL (dipakai di semua halaman)
 * - Header: huruf kapital 11px abu (Table).
 * - Baris yang punya detail: seluruh baris bisa diklik (Tr `to` / `onClick`), bukan link di dalam sel.
 *   Klik pada tombol/link/input di dalam baris tidak memicu klik baris.
 * - Teks utama 14px slate-900 medium; keterangan baris kedua 13px abu (CellSub).
 * - Nomor dokumen/kode: font mono 14px (CellCode). Tidak ada teks 11-12px di dalam sel.
 * - Status selalu chip (Badge / StatusChip).
 * - Kosong: TableEmpty (rata tengah, 14px abu).
 */

/** Tabel dengan scroll horizontal di dalam kartu (halaman tetap tidak scroll ke samping). */
/** `widths` (opsional): kunci lebar kolom supaya tabel tidak bergeser saat isi berubah (sort, pindah halaman). */
export const Table: React.FC<{ head: React.ReactNode[]; children: React.ReactNode; empty?: React.ReactNode; widths?: string[]; minWidth?: string }> = ({ head, children, empty, widths, minWidth }) => (
  <div className="overflow-x-auto">
    <table className={cx('w-full text-sm', widths && 'table-fixed')} style={widths && minWidth ? { minWidth } : undefined}>
      {widths && <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>}
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200 bg-slate-50/60">
          {head.map((h, i) => (
            <th key={i} className="px-4 py-2.5 font-semibold whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
    {empty}
  </div>
);
export const Td: React.FC<{ children?: React.ReactNode; className?: string; colSpan?: number }> = ({ children, className, colSpan }) => (
  <td colSpan={colSpan} className={cx('px-4 py-3 align-top text-sm', className)}>{children}</td>
);

/** Baris tabel standar. `to` = buka halaman, `onClick` = buka side modal. */
export const Tr: React.FC<{
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  selected?: boolean;
  tone?: 'red';
  muted?: boolean;
  className?: string;
}> = ({ children, to, onClick, selected, tone, muted, className }) => {
  const { access } = useStore();
  const perm = to ? DOC_PERM.find(([p]) => to.startsWith(p))?.[1] : undefined;
  const target = to && (!perm || access.can(perm)) ? to : undefined;
  const clickable = Boolean(onClick || target);
  return (
    <tr
      onClick={clickable ? e => {
        // Abaikan klik dari elemen interaktif di dalam baris (tombol, link, input, chip tooltip)
        if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label')) return;
        if (onClick) onClick(); else if (target) navigate(target);
      } : undefined}
      className={cx(
        'transition-colors',
        clickable && 'cursor-pointer',
        selected ? 'bg-indigo-50/80' : tone === 'red' ? 'bg-rose-50/50' : clickable && 'hover:bg-slate-50/80',
        muted && 'opacity-60',
        className,
      )}
    >
      {children}
    </tr>
  );
};

/** Teks utama sel (nama). */
export const CellMain: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="font-medium text-slate-900 leading-snug">{children}</div>;
/** Keterangan baris kedua di sel. */
export const CellSub: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => <div className={cx('text-[13px] text-slate-500 leading-snug mt-0.5', className)}>{children}</div>;
/** Kode / nomor dokumen. */
export const CellCode: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="font-mono text-sm text-slate-800 whitespace-nowrap">{children}</span>;
/** Keadaan kosong tabel. */
/**
 * Stepper alur dokumen: label di atas, garis + titik di bawah.
 * Selesai = titik terisi, saat ini = titik bercincin, berikutnya = abu-abu.
 * `current` ≥ jumlah langkah berarti semua langkah selesai. `warn` menandai langkah saat ini bermasalah (mis. perlu revisi).
 */
export const Stepper: React.FC<{ steps: string[]; current: number; warn?: boolean; className?: string; compact?: boolean }> = ({ steps, current, warn, className, compact }) => {
  const n = steps.length;
  const pos = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * 100);
  const fill = pos(Math.min(current, n - 1));
  const state = (i: number) => (i < current ? 'done' : i === current ? 'current' : 'next');
  const shown = Math.min(current, n - 1);
  // Banyak langkah butuh layar lebar supaya label tidak bertumpuk
  const wide = n > 5;
  return (
    <div className={className}>
      {/* HP: cukup langkah saat ini, supaya label tidak bertumpuk */}
      <div className={cx('text-sm mb-2', wide ? 'xl:hidden' : 'sm:hidden')}>
        <span className="text-slate-500">Langkah {shown + 1} dari {n}: </span>
        <span className={cx('font-semibold', warn ? 'text-amber-700' : 'text-slate-900')}>{steps[shown]}</span>
      </div>
      <div className={cx('relative hidden h-5 mb-2 mx-[7px]', wide ? 'xl:block' : 'sm:block')}>
        {steps.map((label, i) => {
          const st = state(i);
          return (
            <span key={i}
              className={cx('absolute top-0 whitespace-nowrap', compact ? 'text-xs' : 'text-[13px]',
                i === 0 ? 'left-0 -ml-[7px]' : i === n - 1 ? 'right-0 -mr-[7px]' : '-translate-x-1/2',
                st === 'current' ? (warn ? 'text-amber-700 font-semibold' : 'text-amber-700 font-semibold') : st === 'done' ? 'text-slate-900 font-medium' : 'text-slate-400')}
              style={i === 0 || i === n - 1 ? undefined : { left: `${pos(i)}%` }}>
              {label}
            </span>
          );
        })}
      </div>
      <div className="relative h-4 mx-[7px]" role="progressbar" aria-valuemin={1} aria-valuemax={n} aria-valuenow={shown + 1} aria-valuetext={steps[shown]}>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-slate-200" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-amber-500" style={{ width: `${fill}%` }} />
        {steps.map((_, i) => {
          const st = state(i);
          return (
            <span key={i} style={{ left: `${pos(i)}%` }}
              className={cx('absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center',
                st === 'done' ? 'bg-amber-500 border-amber-500' : st === 'current' ? (warn ? 'bg-amber-100 border-amber-500' : 'bg-slate-100 border-amber-500') : 'bg-slate-100 border-slate-300')}>
              {st === 'done' && <span className="w-1 h-1 rounded-full bg-white" />}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Potong stepper jadi beberapa langkah di sekitar langkah saat ini (default: 1 sebelumnya, saat ini, 2 berikutnya). */
export const stepWindow = (steps: string[], current: number, size = 4, before = 1) => {
  const n = steps.length;
  if (n <= size) return { steps, current };
  const at = Math.min(current, n - 1);
  const start = Math.max(0, Math.min(at - before, n - size));
  return { steps: steps.slice(start, start + size), current: current - start };
};

/** Nomor halaman ringkas: 1 … 4 5 6 … 12 */
const pageList = (cur: number, pages: number): (number | '…')[] => {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const from = Math.max(2, cur - 1), to = Math.min(pages - 1, cur + 1);
  if (from > 2) out.push('…');
  for (let i = from; i <= to; i++) out.push(i);
  if (to < pages - 1) out.push('…');
  out.push(pages);
  return out;
};

export const PAGE_SIZES = [10, 20, 30];

/** Footer tabel: pilih jumlah baris (10/20/30) dan pindah halaman. Tampil bila data lebih dari 10. */
export const Pagination: React.FC<{ total: number; page: number; size: number; onPage: (p: number) => void; onSize: (s: number) => void }> = ({ total, page, size, onPage, onSize }) => {
  if (total <= PAGE_SIZES[0]) return null;
  const pages = Math.max(1, Math.ceil(total / size));
  const from = (page - 1) * size + 1, to = Math.min(total, page * size);
  const navBtn = 'inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm text-slate-600">
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">Tampilkan</span>
        <select value={size} onChange={e => onSize(Number(e.target.value))} aria-label="Jumlah baris per halaman"
          className="select-chevron cursor-pointer border border-slate-300 rounded-md bg-white text-slate-800 text-sm pl-2.5 pr-8 py-1 hover:border-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-300">
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="tabular-nums">{from}–{to} dari {total}</span>
      </div>
      <div className="flex items-center gap-1">
        <button className={navBtn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Halaman sebelumnya"><ChevronLeft className="w-4 h-4" /></button>
        <div className="hidden sm:flex items-center gap-1">
          {pageList(page, pages).map((n, i) => n === '…'
            ? <span key={`e${i}`} className="w-8 text-center text-slate-400">…</span>
            : <button key={n} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined}
                className={cx('min-w-8 h-8 px-2 rounded-md tabular-nums', n === page ? 'bg-slate-900 text-white font-semibold' : 'hover:bg-slate-100 text-slate-700')}>{n}</button>)}
        </div>
        <span className="sm:hidden tabular-nums px-2">{page} / {pages}</span>
        <button className={navBtn} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Halaman berikutnya"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

/** Potong baris per halaman (default 10). Halaman kembali ke 1 saat jumlah data berubah (filter/pencarian). */
export function usePaged<T>(rows: T[], initialSize = PAGE_SIZES[0]) {
  const [size, setSize] = useState(initialSize);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [rows.length]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const cur = Math.min(page, pages);
  const pageRows = rows.slice((cur - 1) * size, cur * size);
  const pager = <Pagination total={rows.length} page={cur} size={size} onPage={setPage} onSize={n => { setSize(n); setPage(1); }} />;
  return { pageRows, pager };
}

export const TableEmpty: React.FC<{ children?: React.ReactNode }> = ({ children = 'Tidak ada data.' }) => (
  <p className="text-sm text-slate-500 text-center py-10">{children}</p>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Tone }> = ({ label, value, hint, tone }) => (
  <div className={cx('rounded-xl border p-4 bg-white', tone === 'red' ? 'border-rose-200' : tone === 'amber' ? 'border-amber-200' : 'border-slate-200')}>
    <div className="text-xs font-semibold text-slate-500">{label}</div>
    <div className={cx('text-2xl font-bold mt-1 tabular-nums', tone === 'red' ? 'text-rose-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-900')}>{value}</div>
    {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
  </div>
);

export const DL: React.FC<{ items: [React.ReactNode, React.ReactNode][] }> = ({ items }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
    {items.map(([k, v], i) => (
      <div key={i} className="min-w-0">
        <dt className="text-xs font-semibold text-slate-500">{k}</dt>
        <dd className="text-slate-800 mt-0.5 break-words">{v}</dd>
      </div>
    ))}
  </dl>
);

/** Ekspor sederhana ke CSV (bisa dibuka di Excel). */
export const exportCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const ExportBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Btn variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={onClick}>
    Ekspor Excel
  </Btn>
);

// ---------------- Sticky Action Bar ----------------
export interface StickyActionBarProps {
  /** Konten atau keterangan di sisi kiri (mis. label tahapan, ringkasan, atau instruksi). */
  children?: React.ReactNode;
  /** List button aksi yang selalu berada di sisi kanan dengan background putih dan outline di atas. */
  actions: React.ReactNode;
  className?: string;
}

/**
 * Aturan UI Action Bar:
 * - Muncul sticky/fixed di bagian bawah layar saat halaman membutuhkan tindakan pengguna (action required).
 * - Sisi kiri menampilkan konteks/status tindakan yang dibutuhkan.
 * - Sisi kanan menampilkan daftar tombol aksi (aligned right).
 * - Background putih (bg-white) dengan outline di atas (border-t border-slate-200) dan elevasi bayangan halus.
 * - Pada desktop, bar dimulai setelah sidebar (lg:left-64).
 */
export const StickyActionBar: React.FC<StickyActionBarProps> = ({ children, actions, className }) => {
  return (
    <div
      className={cx(
        'fixed bottom-0 left-0 lg:left-64 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]',
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 text-sm text-slate-600">
          {children}
        </div>
        <div className="flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 flex-wrap">
          {actions}
        </div>
      </div>
    </div>
  );
};

// ---------------- Toast ----------------
type ToastMsg = { id: number; text: string; tone: 'ok' | 'err' };
let pushToast: (t: Omit<ToastMsg, 'id'>) => void = () => {};
export const toast = (text: string, tone: 'ok' | 'err' = 'ok') => pushToast({ text, tone });

export const Toaster: React.FC = () => {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    pushToast = t => {
      const id = Date.now() + Math.random();
      setItems(x => [...x, { ...t, id }]);
      setTimeout(() => setItems(x => x.filter(y => y.id !== id)), 3500);
    };
  }, []);
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] space-y-2">
      {items.map(t => (
        <div key={t.id} className={cx('px-4 py-3 rounded-lg shadow-lg text-sm font-medium sm:max-w-sm', t.tone === 'ok' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white')}>
          {t.text}
        </div>
      ))}
    </div>
  );
};

/** Jalankan aksi store dan tampilkan toast; kembalikan true bila berhasil. */
export const runAction = (r: { ok: boolean; error?: string }, okText: string, setErr?: (e: string) => void) => {
  if (r.ok) {
    toast(okText);
    setErr?.('');
    return true;
  }
  if (setErr) setErr(r.error ?? 'Gagal'); else toast(r.error ?? 'Gagal', 'err');
  return false;
};

const DOC_PERM: [string, Perm][] = [['/fpk/', 'fpk.view'], ['/spk/', 'spk.view'], ['/memo/', 'memo.view'], ['/security/', 'security.view']];
/** Link ke dokumen yang hanya jadi link bila user boleh membukanya; selain itu teks biasa (tidak menyesatkan ke halaman 404). */
export const DocLink: React.FC<{ to: string; className?: string; children: React.ReactNode }> = ({ to, className, children }) => {
  const { access } = useStore();
  const perm = DOC_PERM.find(([p]) => to.startsWith(p))?.[1];
  if (perm && !access.can(perm)) return <span className={(className ?? '').replace(/text-indigo-\d+|hover:underline/g, '')}>{children}</span>;
  return <Link to={to} className={className}>{children}</Link>;
};

/** Tutup drawer dengan animasi: set `closing` dulu, panggil onClose setelah animasi keluar selesai. */
export const useAnimatedClose = (onClose: () => void, ms = 220) => {
  const [closing, setClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const started = useRef(false);
  const close = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setClosing(true);
    window.setTimeout(() => onCloseRef.current(), ms);
  }, [ms]);
  return { closing, close };
};

/** Info tambahan di samping chip status: warn = perlu perhatian, danger = lewat batas/berisiko, info = keterangan. */
export type StatusHint = { kind: 'warn' | 'danger' | 'info'; text: string };

const HINT_ICON_CLS: Record<StatusHint['kind'], string> = {
  warn: 'text-amber-500',
  danger: 'text-rose-600',
  info: 'text-slate-400',
};

/** Pembungkus yang menampilkan tooltip saat hover/fokus/tap. Posisi fixed supaya tidak terpotong tabel. */
export const HoverTip: React.FC<{ text: string; className?: string; children: React.ReactNode }> = ({ text, className, children }) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  };
  return (
    <>
      <button
        type="button"
        aria-label={text}
        className={cx('inline-flex items-center rounded focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-300 cursor-help', className)}
        onMouseEnter={e => show(e.currentTarget)}
        onMouseLeave={() => setPos(null)}
        onFocus={e => show(e.currentTarget)}
        onBlur={() => setPos(null)}
        onClick={e => { e.stopPropagation(); if (pos) setPos(null); else show(e.currentTarget); }}
      >
        {children}
      </button>
      {pos && (
        <span
          role="tooltip"
          className="fixed z-[70] -translate-x-1/2 -translate-y-full max-w-[260px] px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-xs leading-snug shadow-lg pointer-events-none whitespace-normal"
          style={{ left: pos.x, top: pos.y - 6 }}
        >
          {text}
        </span>
      )}
    </>
  );
};

/** Ikon kecil dengan tooltip (mis. gembok untuk nilai terbatas). */
export const HintIcon: React.FC<{ icon: React.ComponentType<{ className?: string }>; text: string; className?: string }> = ({ icon: Icon, text, className }) => (
  <HoverTip text={text} className={cx('p-0.5', className)}><Icon className="w-3.5 h-3.5" /></HoverTip>
);

/**
 * Chip status. Bila ada info tambahan, chip-nya sendiri yang menampilkan tooltip saat di-hover.
 * Ikon ⚠ hanya dipakai bila chip berwarna hijau (terlihat normal) padahal ada peringatan.
 */
export const StatusChip: React.FC<{ tone: Tone; label: string; hint?: StatusHint | null }> = ({ tone, label, hint }) => {
  if (!hint) return <Badge tone={tone}>{label}</Badge>;
  const flagged = tone === 'green' && hint.kind !== 'info';
  return (
    <HoverTip text={hint.text} className="gap-1.5">
      <Badge tone={tone}>{label}</Badge>
      {flagged && <AlertTriangle className={cx('w-3.5 h-3.5', HINT_ICON_CLS[hint.kind])} />}
    </HoverTip>
  );
};

const ACTIVITY_DOT: Record<string, string> = {
  slate: 'bg-slate-300', blue: 'bg-blue-500', green: 'bg-emerald-500', amber: 'bg-amber-400', red: 'bg-rose-500',
};

/** Timeline log aktivitas (terbaru di atas). onOpenDoc: bila diisi, label dokumen bisa diklik. */
export const ActivityLog: React.FC<{
  items: { key: string; at: string; actorId?: string; text: string; note?: string; tone: string; doc?: { type: 'fpk' | 'spk'; id: string; label: string } }[];
  onOpenDoc?: (doc: { type: 'fpk' | 'spk'; id: string }) => void;
  empty?: string;
}> = ({ items, onOpenDoc, empty = 'Belum ada aktivitas.' }) => {
  const { lookups } = useStore();
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ol className="relative">
      {items.map((it, i) => (
        <li key={it.key} className="relative pl-6 pb-4 last:pb-0">
          {i < items.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-slate-200" aria-hidden="true" />}
          <span className={cx('absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full ring-2 ring-white', ACTIVITY_DOT[it.tone] ?? ACTIVITY_DOT.slate)} aria-hidden="true" />
          <div className="text-sm text-slate-800 leading-snug">
            {it.doc && (
              onOpenDoc
                ? <button type="button" onClick={() => onOpenDoc(it.doc!)} className="font-mono text-xs text-indigo-700 hover:underline mr-1.5">{it.doc.label}</button>
                : <span className="font-mono text-xs text-slate-500 mr-1.5">{it.doc.label}</span>
            )}
            {it.text}
          </div>
          {it.note && <div className="text-[13px] text-slate-600 mt-0.5">“{it.note}”</div>}
          <div className="text-xs text-slate-400 mt-0.5">
            {fmtDate(it.at)}{it.at.length > 10 ? `, ${it.at.slice(11, 16)}` : ''}
            {it.actorId && lookups.user.get(it.actorId) ? ` · ${lookups.user.get(it.actorId)!.name}` : ''}
          </div>
        </li>
      ))}
    </ol>
  );
};

/** Baris atas side modal: tutup (✕) di kiri, aksi + "Buka halaman penuh" di kanan. */
export const PanelTopBar: React.FC<{ onClose: () => void; fullHref?: string; left?: React.ReactNode; right?: React.ReactNode }> = ({ onClose, fullHref, left, right }) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-1.5 min-w-0">
      <button
        type="button"
        onClick={onClose}
        className="-ml-1.5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Tutup panel"
        title="Tutup (Esc)"
      >
        <X className="w-5 h-5" />
      </button>
      {left}
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      {right}
      {fullHref && (
        <Btn size="sm" variant="secondary" icon={<ExternalLink className="w-3.5 h-3.5" />} onClick={() => navigate(fullHref)}>
          Buka halaman penuh
        </Btn>
      )}
    </div>
  </div>
);

/**
 * Kartu ringkasan standar (halaman Project, Jalan tanpa SPK, dst.):
 * pita abu-abu berisi ikon + label, nilai 16–18px semibold, keterangan 13px.
 */
export const SummaryCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  sub?: React.ReactNode;
  /** Penjelasan singkat; tampil sebagai ikon ⓘ dengan tooltip di pita. */
  info?: string;
  tone?: 'red';
  onClick?: () => void;
  active?: boolean;
  /** Tanda › di pita untuk kartu yang membuka sesuatu (default: tampil bila bisa diklik). */
  chevron?: boolean;
}> = ({ icon: Icon, label, value, valueClass, sub, info, tone, onClick, active, chevron = true }) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? e => { if (e.key === 'Enter') onClick(); } : undefined}
    className={cx(
      'bg-white border rounded-xl overflow-hidden transition-colors text-left',
      onClick && 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/40 group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-300',
      active ? 'border-slate-900 ring-1 ring-slate-900' : tone === 'red' ? 'border-rose-200' : 'border-slate-200',
    )}
  >
    <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
      <Icon className="w-3.5 h-3.5 text-slate-400" />
      <span className="truncate">{label}</span>
      {info && <HintIcon icon={Info} text={info} className="text-slate-400" />}
      <span className="flex-1" />
      {onClick && chevron && <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />}
    </div>
    <div className="px-3 sm:px-4 py-3">
      <div className={cx('font-semibold leading-snug break-words tabular-nums', tone === 'red' ? 'text-rose-600' : 'text-slate-900', valueClass ?? 'text-base sm:text-lg')}>{value}</div>
      {sub && <div className="text-[13px] text-slate-500 mt-1.5">{sub}</div>}
    </div>
  </div>
);
