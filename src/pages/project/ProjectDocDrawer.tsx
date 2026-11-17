import React, { useEffect, useState } from 'react';
import {
  X, ArrowLeft, ExternalLink, FileText, FileCheck2, Paperclip,
  AlertTriangle, CheckCircle2, Clock, ChevronRight, Calendar,
  DollarSign, Users, MapPin, Undo2, Shield
} from 'lucide-react';
import { useStore } from '../../store/store';
import { ActivityLog, AttachmentChip, Badge, Btn, Money, cx, PanelTopBar } from '../../ui/kit';
import { fpkActivity, spkActivity } from '../../domain/activity';
import { navigate, Link } from '../../router';
import { FPK_STATUS, FPK_TYPE, SPK_STATUS, SPK_TYPE } from '../../domain/labels';
import { fpkCoverage, fpkHeadcount, latest, spkHeadcount } from '../../domain/selectors';
import { diffDays, fmtDate, fmtDateTime, TODAY } from '../../domain/time';
import { has, isDeputy } from '../../domain/rbac';
import type { Division, Fpk, Spk, FpkVersion } from '../../domain/types';

export interface ActiveDoc {
  type: 'fpk' | 'spk';
  id: string;
}

interface ProjectDocDrawerProps {
  activeDoc: ActiveDoc;
  /** true saat animasi geser keluar sedang berjalan */
  closing?: boolean;
  onClose: () => void;
  onNavigateDoc: (doc: ActiveDoc) => void;
  onBackDoc?: () => void;
  prevDocTitle?: string;
  onPrevNext?: (direction: 'prev' | 'next') => void;
}

export const ProjectDocDrawer: React.FC<ProjectDocDrawerProps> = ({
  activeDoc,
  closing = false,
  onClose,
  onNavigateDoc,
  onBackDoc,
  prevDocTitle,
  onPrevNext,
}) => {
  const { state, lookups, access, me } = useStore();
  const [selectedVerNo, setSelectedVerNo] = useState<number | null>(null);

  // Keyboard navigation: Escape to close, Up/Down to navigate
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onPrevNext?.('prev');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onPrevNext?.('next');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onPrevNext]);

  // Reset selected version when active doc changes
  useEffect(() => {
    setSelectedVerNo(null);
  }, [activeDoc.id]);

  if (activeDoc.type === 'fpk') {
    const f = lookups.fpk.get(activeDoc.id);
    if (!f) return null;

    const curVer = latest(f);
    const v: FpkVersion = f.versions.find(x => x.no === (selectedVerNo ?? curVer.no)) ?? curVer;
    const isOldVer = v.no !== curVer.no;
    const client = lookups.client.get(v.clientId);
    const site = lookups.site.get(v.siteId);
    const isOwner = !!client && (client.accountOwnerId === me.id || client.coOwnerIds.includes(me.id));
    const totalPeople = v.lines.reduce((n, l) => n + l.qty, 0);
    const relatedSpks = state.spks.filter(s => s.fpkId === f.id);
    const cov = fpkCoverage(f, state.spks);
    const bodLike = has(me, 'BOD') || isDeputy(me, state.delegations);

    // Status dot color
    const dotColor =
      f.status === 'dikembalikan'
        ? 'bg-amber-500'
        : f.status === 'cek_divisi' || f.status === 'cek_margin' || f.status === 'menunggu_bod'
        ? 'bg-blue-600'
        : f.status === 'disetujui' || f.status === 'berjalan' || f.status === 'tertutup_sebagian'
        ? 'bg-emerald-500'
        : f.status === 'ditolak' || f.status === 'batal'
        ? 'bg-rose-600'
        : 'bg-slate-400';

    return (
      <div className="drawer-panel fixed inset-y-0 right-0 z-40 w-full md:w-[560px] bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full" data-closing={closing}>
        {/* Header Drawer */}
        <div className="px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 space-y-2">
          {/* Top Bar: Back history (if navigated from another doc) + Close */}
          <PanelTopBar
            onClose={onClose}
            fullHref={`/fpk/${f.id}`}
            left={prevDocTitle && onBackDoc ? (
              <button type="button" onClick={onBackDoc} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="truncate max-w-[180px]">{prevDocTitle}</span>
              </button>
            ) : undefined}
          />

          {/* Doc Title & Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base font-bold text-slate-900">{f.number}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                  {FPK_TYPE[f.type]}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-medium">
                  v{v.no}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Dibuat oleh {lookups.user.get(f.createdBy)?.name ?? 'Marketing'}, {fmtDate(f.createdAt)}
              </p>
            </div>

            {/* Status (Dot + Text) */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50/80 shrink-0">
              <span className={cx('w-2 h-2 rounded-full', dotColor)} />
              <span className="text-xs font-semibold text-slate-800">
                {FPK_STATUS[f.status].label}
              </span>
            </div>
          </div>
        </div>

        {/* Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Status Action Box (Single Primary Action by Role) */}
          {f.status === 'dikembalikan' && (isOwner || access.can('fpk.create')) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="text-xs text-amber-900">
                <span className="font-semibold block">FPK dikembalikan:</span>
                <span>{f.returned?.reason ?? 'Perlu perbaikan data penawaran FPK.'}</span>
              </div>
              <Btn size="sm" onClick={() => navigate(`/fpk/${f.id}/ubah`)} className="shrink-0">
                Perbaiki FPK
              </Btn>
            </div>
          )}

          {(f.status === 'berjalan' || f.status === 'disetujui' || f.status === 'tertutup_sebagian' || f.status === 'cek_margin') && access.can('spk.input') && cov.total > cov.done && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="text-xs text-emerald-900">
                <span className="font-semibold block">SPK belum lengkap:</span>
                <span>Tersisa {cov.total - cov.done} personel belum memiliki SPK.</span>
              </div>
              <Btn size="sm" onClick={() => navigate(`/spk/input?project=${v.siteId}&fpk=${f.id}`)} className="shrink-0">
                Input SPK
              </Btn>
            </div>
          )}

          {f.status === 'menunggu_bod' && bodLike && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="text-xs text-purple-900">
                <span className="font-semibold block">Menunggu keputusan BOD:</span>
                <span>Tinjau margin dan hasil verifikasi divisi.</span>
              </div>
              <Btn size="sm" onClick={() => navigate(`/fpk/${f.id}`)} className="shrink-0">
                Putuskan FPK
              </Btn>
            </div>
          )}

          {/* 2. Formasi Personel */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
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
                      {lookups.position.get(l.positionId)?.name ?? '–'}
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

          {/* 3. Nilai & Jadwal Grid */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Nilai &amp; Jadwal Kontrak
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Nilai / Bulan</span>
                <div className="font-semibold text-slate-900 text-sm">
                  {access.money(v.clientId) ? (
                    <Money value={v.monthlyValue} clientId={v.clientId} />
                  ) : (
                    <span className="text-slate-400" title="Hanya untuk account owner">—</span>
                  )}
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
              <div className="col-span-2">
                <span className="text-slate-500 block mb-0.5">Periode Kontrak</span>
                <div className="font-medium text-slate-800">
                  {v.periodStart && v.periodEnd ? `${fmtDate(v.periodStart)} – ${fmtDate(v.periodEnd)}` : '–'}
                </div>
              </div>
            </div>
          </div>

          {/* 4. SPK Terkait */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                SPK Terkait ({relatedSpks.length})
              </span>
              <span className="text-xs text-slate-500">
                Terpenuhi: <strong>{cov.done}/{cov.total}</strong> personel
              </span>
            </div>
            {relatedSpks.length > 0 ? (
              <div className="space-y-2">
                {relatedSpks.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onNavigateDoc({ type: 'spk', id: s.id })}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-indigo-700 group-hover:underline">
                        {s.number}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {spkHeadcount(s)} personel · {fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge tone={SPK_STATUS[s.status].tone}>{SPK_STATUS[s.status].label}</Badge>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada SPK terbit untuk FPK ini.</p>
            )}
          </div>

          {/* 5. Lampiran */}
          {v.attachments && v.attachments.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Lampiran ({v.attachments.length})
              </span>
              <div className="space-y-2">
                {v.attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <AttachmentChip a={att} clientId={v.clientId} />
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {fmtDate(att.uploadedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Log aktivitas FPK */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Log aktivitas
            </span>
            <ActivityLog items={fpkActivity(f, state.spks, state.audit, access.money(v.clientId))} />
              {/* Versi sebelumnya */}
              {f.versions.length > 1 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 block mb-1">Riwayat Versi FPK:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {f.versions.map(ver => (
                      <button
                        key={ver.no}
                        type="button"
                        onClick={() => setSelectedVerNo(ver.no)}
                        className={cx(
                          'px-2 py-0.5 text-xs rounded border font-mono',
                          v.no === ver.no
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        v{ver.no} {ver.no === curVer.no ? '(terbaru)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>

      </div>
    );
  }

  // Active Doc is SPK
  if (activeDoc.type === 'spk') {
    const s = lookups.spk.get(activeDoc.id);
    if (!s) return null;

    const client = lookups.client.get(s.clientId);
    const site = lookups.site.get(s.siteId);
    const fpk = s.fpkId ? lookups.fpk.get(s.fpkId) : undefined;
    const fpkVer = fpk ? latest(fpk) : undefined;
    const totalPeople = spkHeadcount(s);
    const daysLeft = diffDays(TODAY, s.periodEnd);

    // Status dot color
    const dotColor =
      s.status === 'aktif'
        ? 'bg-emerald-500'
        : s.status === 'diinput'
        ? 'bg-blue-600'
        : s.status === 'perlu_revisi'
        ? 'bg-amber-500'
        : 'bg-slate-400';

    return (
      <div className="drawer-panel fixed inset-y-0 right-0 z-40 w-full md:w-[560px] bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full" data-closing={closing}>
        {/* Header Drawer */}
        <div className="px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 space-y-2">
          {/* Top Bar: Back history + Close */}
          <PanelTopBar
            onClose={onClose}
            fullHref={`/spk/${s.id}`}
            left={prevDocTitle && onBackDoc ? (
              <button type="button" onClick={onBackDoc} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="truncate max-w-[180px]">{prevDocTitle}</span>
              </button>
            ) : undefined}
          />

          {/* Doc Title & Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base font-bold text-slate-900">{s.number}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                  {SPK_TYPE[s.type]}
                </span>
                {s.isInitialData && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    data awal
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Diinput oleh {lookups.user.get(s.inputBy)?.name ?? 'User'}, {fmtDate(s.inputAt)}
              </p>
            </div>

            {/* Status (Dot + Text) */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50/80 shrink-0">
              <span className={cx('w-2 h-2 rounded-full', dotColor)} />
              <span className="text-xs font-semibold text-slate-800">
                {SPK_STATUS[s.status].label}
              </span>
            </div>
          </div>
        </div>

        {/* Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Status Action Box */}
          {s.status === 'perlu_revisi' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
              <div className="text-xs text-amber-900">
                <span className="font-semibold block">Catatan revisi Finance:</span>
                <span>{s.revisionReason || 'SPK perlu disesuaikan dengan data FPK sebelum invoice diterbitkan.'}</span>
              </div>
              <Btn size="sm" onClick={() => navigate(`/spk/${s.id}/revisi`)}>
                Unggah SPK Revisi
              </Btn>
            </div>
          )}

          {s.status === 'diinput' && has(me, 'Finance') && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="text-xs text-blue-900">
                <span className="font-semibold block">Menunggu verifikasi Finance:</span>
                <span>Periksa kecocokan data SPK dengan FPK induk.</span>
              </div>
              <Btn size="sm" onClick={() => navigate(`/spk/${s.id}`)} className="shrink-0">
                Verifikasi SPK
              </Btn>
            </div>
          )}

          {/* 2. Formasi + Selisih terhadap FPK Induk */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Formasi Personel SPK
              </span>
              <span className="text-xs font-semibold text-slate-700">
                Total {totalPeople} orang
              </span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {s.lines.map((sl, idx) => {
                // Find matching quantity in FPK
                const fpkLine = fpkVer?.lines.find(fl => fl.positionId === sl.positionId);
                const fpkQty = fpkLine ? fpkLine.qty : 0;
                const diff = sl.qty - fpkQty;

                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {lookups.position.get(sl.positionId)?.name ?? '–'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Shift: {sl.shift}
                        {fpk && (
                          <span className={cx(
                            'ml-2 font-medium',
                            diff === 0 ? 'text-emerald-600' : diff < 0 ? 'text-amber-600' : 'text-blue-600'
                          )}>
                            ({diff === 0 ? 'Sesuai FPK' : `${diff > 0 ? '+' : ''}${diff} dari FPK`})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900">{sl.qty}</span>
                      <span className="text-slate-500 ml-1">orang</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Nilai & Periode Grid */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
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

          {/* 4. FPK Induk */}
          {fpk && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                FPK Induk
              </span>
              <button
                type="button"
                onClick={() => onNavigateDoc({ type: 'fpk', id: fpk.id })}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors flex items-center justify-between gap-3 group"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-indigo-700 group-hover:underline">
                    {fpk.number}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {FPK_TYPE[fpk.type]} · Mulai jaga {fmtDate(fpk.startedAt ?? fpkVer?.plannedStart)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={FPK_STATUS[fpk.status].tone}>{FPK_STATUS[fpk.status].label}</Badge>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </button>
            </div>
          )}

          {/* 5. Lampiran PDF SPK */}
          {s.pdf && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Dokumen SPK
              </span>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <AttachmentChip a={s.pdf} clientId={s.clientId} />
                <span className="text-[11px] text-slate-400 shrink-0">
                  {fmtDate(s.pdf.uploadedAt)}
                </span>
              </div>
            </div>
          )}

          {/* 6. Log aktivitas SPK */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Log aktivitas
            </span>
            <ActivityLog items={spkActivity(s).sort((a, b) => b.at.localeCompare(a.at))} />
          </div>
        </div>

      </div>
    );
  }

  return null;
};
