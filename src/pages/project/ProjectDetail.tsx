import React, { useState, useEffect } from 'react';
import {
  Building2, MapPin, User, Mail, Phone, FileText, FileCheck2, Shield,
  Clock, DollarSign, Paperclip, ChevronRight, CheckCircle2, AlertCircle,
  ExternalLink, Calendar, Users, Layers, Plus
} from 'lucide-react';
import { useStore } from '../../store/store';
import { AttachmentChip, Badge, Btn, Card, DL, Money, PageHeader, Table, Td, cx, toast } from '../../ui/kit';
import { Link, navigate } from '../../router';
import { NotFound } from '../Misc';
import { FPK_STATUS, SPK_STATUS, PERSONNEL_STATUS } from '../../domain/labels';
import { currentPlacement, fpkCoverage, fpkHeadcount, latest, spkHeadcount } from '../../domain/selectors';
import { diffDays, fmtDate, fmtDateTime } from '../../domain/time';
import type { Division, Fpk, Spk, Attachment } from '../../domain/types';
import { ProjectDocDrawer, type ActiveDoc } from './ProjectDocDrawer';

export const ProjectDetailPage: React.FC<{ id: string }> = ({ id }) => {
  const { state, lookups, access } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'keamanan' | 'kontrak' | 'lampiran' | 'log'>('overview');

  // Project site
  const site = lookups.site.get(id);
  if (!site || !access.area(site.areaId)) return <NotFound what="Project" />;

  const client = lookups.client.get(site.clientId);
  const area = lookups.area.get(site.areaId);
  const aa = lookups.user.get(area?.picUserId ?? '');
  const accountOwner = lookups.user.get(client?.accountOwnerId ?? '');

  // Related FPKs & SPKs
  const projectFpks = state.fpks.filter(f => latest(f).siteId === site.id);
  const projectSpks = state.spks.filter(s => s.siteId === site.id);

  // Drawer Document State
  const [activeDoc, setActiveDoc] = useState<ActiveDoc | null>(null);
  const [docHistory, setDocHistory] = useState<ActiveDoc[]>([]);

  // List of all documents in this project for keyboard ArrowUp/ArrowDown navigation
  const allProjectDocs: ActiveDoc[] = [
    ...projectFpks.map(f => ({ type: 'fpk' as const, id: f.id })),
    ...projectSpks.map(s => ({ type: 'spk' as const, id: s.id })),
  ];

  // Helper to sync doc param in URL
  const updateDocParam = (docNumber: string | null) => {
    const url = new URL(window.location.href);
    if (docNumber) {
      url.searchParams.set('doc', docNumber.replace(/\//g, '-'));
    } else {
      url.searchParams.delete('doc');
    }
    window.history.replaceState(null, '', url.pathname + url.search);
  };

  const openDoc = (doc: ActiveDoc) => {
    const num = doc.type === 'fpk'
      ? lookups.fpk.get(doc.id)?.number
      : lookups.spk.get(doc.id)?.number;
    if (num) updateDocParam(num);
    setActiveDoc(doc);
  };

  const closeDoc = () => {
    updateDocParam(null);
    setActiveDoc(null);
    setDocHistory([]);
  };

  const handleNavigateDoc = (target: ActiveDoc) => {
    if (activeDoc) {
      setDocHistory(h => [...h, activeDoc]);
    }
    openDoc(target);
  };

  const handleBackDoc = () => {
    if (docHistory.length === 0) return;
    const prev = docHistory[docHistory.length - 1];
    setDocHistory(h => h.slice(0, -1));
    const num = prev.type === 'fpk' ? lookups.fpk.get(prev.id)?.number : lookups.spk.get(prev.id)?.number;
    if (num) updateDocParam(num);
    setActiveDoc(prev);
  };

  const handlePrevNext = (direction: 'prev' | 'next') => {
    if (!activeDoc || allProjectDocs.length <= 1) return;
    const idx = allProjectDocs.findIndex(d => d.type === activeDoc.type && d.id === activeDoc.id);
    if (idx === -1) return;
    const nextIdx = direction === 'prev'
      ? (idx > 0 ? idx - 1 : allProjectDocs.length - 1)
      : (idx < allProjectDocs.length - 1 ? idx + 1 : 0);
    openDoc(allProjectDocs[nextIdx]);
  };

  // Sync on initial mount from ?doc=...
  useEffect(() => {
    const url = new URL(window.location.href);
    const docParam = url.searchParams.get('doc');
    if (docParam) {
      const cleanParam = docParam.replace(/-/g, '/');
      const matchedFpk = projectFpks.find(f => f.number === cleanParam || f.number.replace(/\//g, '-') === docParam || f.id === docParam);
      const matchedSpk = projectSpks.find(s => s.number === cleanParam || s.number.replace(/\//g, '-') === docParam || s.id === docParam);
      if (matchedFpk) setActiveDoc({ type: 'fpk', id: matchedFpk.id });
      else if (matchedSpk) setActiveDoc({ type: 'spk', id: matchedSpk.id });
    }
  }, []);

  const prevDoc = docHistory.length > 0 ? docHistory[docHistory.length - 1] : null;
  const prevDocTitle = prevDoc
    ? (prevDoc.type === 'fpk' ? lookups.fpk.get(prevDoc.id)?.number : lookups.spk.get(prevDoc.id)?.number)
    : undefined;

  // Active / primary contract info
  const activeSpk = projectSpks.find(s => s.status === 'aktif') ?? projectSpks[0];
  const activeFpk = projectFpks.find(f => f.status !== 'batal' && f.status !== 'ditolak') ?? projectFpks[0];
  const activeFpkVer = activeFpk ? latest(activeFpk) : null;

  // Nilai Project
  const monthlyValue = activeSpk ? activeSpk.monthlyValue : (activeFpkVer?.monthlyValue ?? 0);
  const periodStart = activeSpk ? activeSpk.periodStart : (activeFpkVer?.periodStart ?? '');
  const periodEnd = activeSpk ? activeSpk.periodEnd : (activeFpkVer?.periodEnd ?? '');
  const durationDays = periodStart && periodEnd ? Math.max(0, diffDays(periodStart, periodEnd) + 1) : 0;
  const durationMonths = durationDays > 0 ? Math.round(durationDays / 30.4) : 0;
  const totalValue = monthlyValue * (durationMonths || 1);

  // Security personnel assigned to this site
  const sitePersonnel = state.personnel.filter(p => {
    const pl = currentPlacement(p);
    return pl && pl.areaId === site.areaId && pl.siteId === site.id;
  });

  // Area personnel (if none strictly locked to siteId)
  const areaPersonnelFallback = sitePersonnel.length === 0
    ? state.personnel.filter(p => {
        const pl = currentPlacement(p);
        return pl && pl.areaId === site.areaId && p.status === 'aktif';
      }).slice(0, 8)
    : [];

  const displayPersonnel = sitePersonnel.length > 0 ? sitePersonnel : areaPersonnelFallback;

  // Formation quota vs actual
  const quotaMap = new Map<string, number>();
  if (activeSpk) {
    activeSpk.lines.forEach(l => quotaMap.set(l.positionId, (quotaMap.get(l.positionId) ?? 0) + l.qty));
  } else if (activeFpkVer) {
    activeFpkVer.lines.forEach(l => quotaMap.set(l.positionId, (quotaMap.get(l.positionId) ?? 0) + l.qty));
  }

  const actualMap = new Map<string, number>();
  displayPersonnel.forEach(p => {
    actualMap.set(p.positionId, (actualMap.get(p.positionId) ?? 0) + 1);
  });

  const isDanru = (posId: string) => {
    const code = (lookups.position.get(posId)?.code ?? '').toUpperCase();
    const name = (lookups.position.get(posId)?.name ?? '').toLowerCase();
    return code === 'DANRU' || code === 'CHIEF' || name.includes('danru') || name.includes('komandan') || name.includes('chief');
  };

  const allPositions = [...new Set([...quotaMap.keys(), ...actualMap.keys()])].sort((a, b) => {
    const aDanru = isDanru(a) ? 0 : 1;
    const bDanru = isDanru(b) ? 0 : 1;
    if (aDanru !== bDanru) return aDanru - bDanru;
    const aName = lookups.position.get(a)?.name ?? a;
    const bName = lookups.position.get(b)?.name ?? b;
    return aName.localeCompare(bName);
  });

  const sortedPersonnel = [...displayPersonnel].sort((a, b) => {
    const aDanru = isDanru(a.positionId) ? 0 : 1;
    const bDanru = isDanru(b.positionId) ? 0 : 1;
    if (aDanru !== bDanru) return aDanru - bDanru;
    return a.employeeNo.localeCompare(b.employeeNo);
  });

  const totalQuota = [...quotaMap.values()].reduce((a, b) => a + b, 0);

  // Attachments collection from FPK and SPK
  const attachments: { att: Attachment; source: string; sourceLink: string }[] = [];
  projectFpks.forEach(f => {
    f.versions.forEach(v => {
      v.attachments?.forEach(a => {
        if (!attachments.some(x => x.att.id === a.id)) {
          attachments.push({ att: a, source: `FPK ${f.number} (v${v.no})`, sourceLink: `/fpk/${f.id}` });
        }
      });
    });
  });
  projectSpks.forEach(s => {
    if (s.pdf && !attachments.some(x => x.att.id === s.pdf.id)) {
      attachments.push({ att: s.pdf, source: `SPK ${s.number}`, sourceLink: `/spk/${s.id}` });
    }
  });

  // Audit and activity log for this project
  const fpkIds = new Set(projectFpks.map(f => f.id));
  const spkIds = new Set(projectSpks.map(s => s.id));
  const auditLogs = state.audit.filter(a =>
    a.entityId === site.id ||
    a.entityId === site.clientId ||
    fpkIds.has(a.entityId) ||
    spkIds.has(a.entityId) ||
    a.action.toLowerCase().includes(site.name.toLowerCase()) ||
    a.action.toLowerCase().includes(site.code.toLowerCase())
  );

  const primaryFpk = activeFpk ?? projectFpks[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        back="/project"
        title={site.name}
        subtitle={
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-500">
            <span className="font-mono font-bold text-slate-950 bg-amber-400 px-2 py-0.5 rounded text-xs border border-amber-500/20 shadow-xs">
              PRJ-{site.code}
            </span>
            <span>·</span>
            <span className="font-medium text-slate-700">{client?.name}</span>
            <span>·</span>
            <span>{area?.name}</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {!activeSpk && projectFpks.length > 0 && access.can('spk.input') && primaryFpk && (
              <Btn
                icon={<Plus className="w-4 h-4" />}
                onClick={() => navigate(`/spk/input?project=${site.id}&fpk=${primaryFpk.id}`)}
              >
                Input SPK
              </Btn>
            )}
            <Badge tone={site.active ? 'green' : 'slate'} className="text-xs px-2.5 py-1">
              Project {site.active ? 'Aktif' : 'Nonaktif'}
            </Badge>
          </div>
        }
      />

      {/* Top Cards: Nilai Project & Status Dokumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Nilai Kontrak / Bulan */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Nilai Kontrak / Bulan</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {monthlyValue > 0 ? (
              <Money value={monthlyValue} clientId={site.clientId} />
            ) : (
              <span className="text-slate-400 font-normal text-base">–</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {durationMonths > 0 ? `Est. total ${durationMonths} bln: ` : 'Sebelum PPN'}
            {durationMonths > 0 && <Money value={totalValue} clientId={site.clientId} className="font-semibold text-slate-700" />}
          </div>
        </div>

        {/* Card 2: Periode Kontrak */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Periode Project</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {periodStart ? `${fmtDate(periodStart)}` : '–'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            s/d {periodEnd ? fmtDate(periodEnd) : '–'} {durationDays > 0 ? `(${durationDays} hari)` : ''}
          </div>
        </div>

        {/* Card 3: Status Dokumen FPK */}
        <div
          onClick={() => {
            if (activeFpk) {
              if (activeDoc?.type === 'fpk' && activeDoc.id === activeFpk.id) closeDoc();
              else openDoc({ type: 'fpk', id: activeFpk.id });
            }
          }}
          className={cx(
            'bg-white border rounded-xl p-4 shadow-xs transition-colors',
            activeFpk ? 'cursor-pointer hover:border-indigo-300 hover:bg-slate-50/50' : '',
            activeDoc?.type === 'fpk' && activeFpk && activeDoc.id === activeFpk.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Status FPK</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1">
            {activeFpk ? (
              <div className="space-y-1">
                <Badge tone={FPK_STATUS[activeFpk.status].tone}>
                  {FPK_STATUS[activeFpk.status].label}
                </Badge>
                <div className="text-[11px] text-indigo-600 font-mono font-medium">
                  {activeFpk.number}
                </div>
              </div>
            ) : (
              <Badge tone="slate">Belum ada FPK</Badge>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {projectFpks.length} dokumen FPK terdaftar · Klik untuk lihat
          </div>
        </div>

        {/* Card 4: Status Dokumen SPK */}
        <div
          onClick={() => {
            if (activeSpk) {
              if (activeDoc?.type === 'spk' && activeDoc.id === activeSpk.id) closeDoc();
              else openDoc({ type: 'spk', id: activeSpk.id });
            }
          }}
          className={cx(
            'bg-white border rounded-xl p-4 shadow-xs transition-colors',
            activeSpk ? 'cursor-pointer hover:border-teal-300 hover:bg-slate-50/50' : '',
            activeDoc?.type === 'spk' && activeSpk && activeDoc.id === activeSpk.id ? 'border-teal-600 ring-2 ring-teal-100' : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Status SPK</span>
            <FileCheck2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1">
            {activeSpk ? (
              <div className="space-y-1">
                <Badge tone={SPK_STATUS[activeSpk.status].tone}>
                  {SPK_STATUS[activeSpk.status].label}
                </Badge>
                <div className="text-[11px] text-indigo-600 font-mono font-medium">
                  {activeSpk.number}
                </div>
              </div>
            ) : projectFpks.length > 0 ? (
              <div className="flex items-center justify-between gap-2">
                <Badge tone="amber">Jalan tanpa SPK</Badge>
                {access.can('spk.input') && primaryFpk && (
                  <Btn
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/spk/input?project=${site.id}&fpk=${primaryFpk.id}`);
                    }}
                  >
                    Input SPK
                  </Btn>
                )}
              </div>
            ) : (
              <Badge tone="slate">Belum ada SPK</Badge>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {projectSpks.length} dokumen SPK terdaftar · {activeSpk ? 'Klik untuk lihat' : (projectFpks.length > 0 && access.can('spk.input') ? 'Klik tombol untuk input' : '–')}
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-sm">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'keamanan', label: 'Personel Keamanan' },
          { key: 'kontrak', label: `Dokumen Kontrak (${projectFpks.length + projectSpks.length})` },
          { key: 'lampiran', label: `Lampiran (${attachments.length})` },
          { key: 'log', label: 'Log Activity' },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key as any)}
            className={cx(
              'pb-3 font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === t.key
                ? 'border-amber-400 text-slate-950 font-bold border-b-2'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Overview (Lokasi & tim JISS, Klien) */}
      {activeTab === 'overview' && (() => {
        const activePersonnelCount = displayPersonnel.filter(p => p.status === 'aktif').length;
        const fpkNeeded = activeFpkVer?.lines.reduce((acc, l) => acc + l.qty, 0) ?? 0;
        const kurang = fpkNeeded > activePersonnelCount ? fpkNeeded - activePersonnelCount : 0;
        const danrus = displayPersonnel.filter(p => isDanru(p.positionId) && p.status === 'aktif');

        const mapUrl = (site as any).lat && (site as any).lng
          ? `https://www.google.com/maps?q=${(site as any).lat},${(site as any).lng}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`;

        const rawPic = client?.picContact?.trim();
        const picFormatted = rawPic ? rawPic.replace(/\s*\(([^)]+)\)/, ' · $1') : null;

        const copyText = (val: string, label: string) => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(val);
          }
          toast(`${label} disalin`);
        };

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kartu kiri: Lokasi & tim JISS */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-3.5">
                Lokasi & tim JISS
              </h3>
              <div className="space-y-[10px]">
                {/* 1. Alamat */}
                <div className="flex items-start text-sm">
                  <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">Alamat</span>
                  <div className="min-w-0 flex-1 text-slate-800 leading-relaxed">
                    <span>{site.address}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-800 hover:underline font-medium text-xs whitespace-nowrap"
                    >
                      Buka di peta ↗
                    </a>
                  </div>
                </div>

                {/* 2. Area */}
                <div className="flex items-start text-sm">
                  <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">Area</span>
                  <div className="min-w-0 flex-1 text-slate-800">
                    <Link to={`/area/${site.areaId}`} className="text-indigo-600 hover:underline font-medium">
                      {area?.name ?? '–'}
                    </Link>
                  </div>
                </div>

                {/* 3. Kode site */}
                <div className="flex items-start text-sm">
                  <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">Kode site</span>
                  <div className="min-w-0 flex-1 text-slate-800 font-mono text-xs">
                    {site.code}
                  </div>
                </div>

                {/* 4. Catatan (hanya tampil bila terisi) */}
                {site.note && site.note.trim() && site.note !== '–' && (
                  <div className="flex items-start text-sm">
                    <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">Catatan</span>
                    <div className="min-w-0 flex-1 text-slate-700">
                      {site.note}
                    </div>
                  </div>
                )}

                {/* 5. Garis pemisah tipis */}
                <hr className="border-t border-slate-100 my-2.5" />

                {/* 6. Bertugas */}
                <div className="flex items-start text-sm">
                  <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">Bertugas</span>
                  <div className="min-w-0 flex-1 text-slate-800 flex items-center flex-wrap gap-x-1.5">
                    <span>{activePersonnelCount} personel</span>
                    {kurang > 0 && (
                      <span className="text-rose-600 font-medium">· kurang {kurang}</span>
                    )}
                    <span className="text-slate-400">·</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('keamanan')}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium text-xs inline-flex items-center"
                    >
                      Lihat semua →
                    </button>
                  </div>
                </div>

                {/* 7. Danru */}
                <div className="flex items-start text-sm">
                  <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">Danru</span>
                  <div className="min-w-0 flex-1 text-slate-800">
                    {danrus.length > 0 ? (
                      <div className="space-y-1">
                        {danrus.map(d => (
                          <div key={d.id} className="text-sm text-slate-800">
                            {d.name}
                            {(d as any).shift ? <span className="text-slate-500 font-normal"> · {(d as any).shift}</span> : ''}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">Belum ada</span>
                    )}
                  </div>
                </div>

                {/* 8. PIC area */}
                <div className="flex items-start text-sm">
                  <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">PIC area</span>
                  <div className="min-w-0 flex-1 text-slate-800 font-medium">
                    {aa?.name ?? '–'}
                  </div>
                </div>

                {/* 9. Account owner */}
                <div className="flex items-start text-sm">
                  <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">Account owner</span>
                  <div className="min-w-0 flex-1 text-slate-800 font-medium">
                    {accountOwner?.name ?? '–'}
                  </div>
                </div>
              </div>
            </div>

            {/* Kartu kanan: Klien */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-3.5">
                Klien
              </h3>
              <div className="space-y-[10px]">
                {/* 1. PIC klien */}
                <div className="flex items-start text-sm">
                  <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">PIC klien</span>
                  <div className="min-w-0 flex-1 text-slate-800">
                    {picFormatted ? (
                      <span className="font-medium text-slate-900">{picFormatted}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Belum ada kontak PIC</span>
                        {access.can('master.edit') && (
                          <Link to={`/klien/${site.clientId}`} className="text-indigo-600 hover:underline text-xs font-medium">
                            Tambahkan
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Telepon */}
                <div className="flex items-start text-sm">
                  <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">Telepon</span>
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                    <span className="text-slate-800 font-mono text-xs">
                      {client?.picPhone || '–'}
                    </span>
                    {client?.picPhone && (
                      <button
                        type="button"
                        onClick={() => copyText(client.picPhone!, 'Nomor telepon')}
                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-0.5 rounded font-medium transition-colors"
                      >
                        Salin
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Email */}
                <div className="flex items-start text-sm">
                  <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">Email</span>
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                    <span className="text-slate-800 font-mono text-xs truncate">
                      {client?.picEmail || '–'}
                    </span>
                    {client?.picEmail && (
                      <button
                        type="button"
                        onClick={() => copyText(client.picEmail!, 'Email')}
                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-0.5 rounded font-medium transition-colors shrink-0"
                      >
                        Salin
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Termin bayar */}
                <div className="flex items-start text-sm">
                  <span className="w-[120px] shrink-0 text-[13px] text-slate-500 pt-0.5">Termin bayar</span>
                  <div className="min-w-0 flex-1 text-slate-800 font-medium">
                    {client?.termDays ? `${client.termDays} hari` : '30 hari'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: Personel Keamanan */}
      {activeTab === 'keamanan' && (
        <div className="space-y-4">
          <Card
            title={
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Formasi Keamanan & Personel yang Menjaga</span>
              </div>
            }
            actions={
              <div className="text-xs text-slate-500">
                Total Formasi: <strong className="text-slate-800">{totalQuota} personel</strong>
              </div>
            }
            pad={false}
          >
            {/* Table Kuota Formasi */}
            <Table head={['No', 'Jabatan', 'Kebutuhan Kuota (SPK/FPK)', 'Personel Aktif', 'Status Formasi']}>
              {allPositions.map((pid, idx) => {
                const q = quotaMap.get(pid) ?? 0;
                const a = actualMap.get(pid) ?? 0;
                const diff = a - q;
                return (
                  <tr key={pid}>
                    <Td className="w-10 text-slate-400 font-mono text-xs">{idx + 1}</Td>
                    <Td className="font-medium text-slate-800">
                      {lookups.position.get(pid)?.name ?? pid}
                    </Td>
                    <Td className="tabular-nums font-semibold">{q} orang</Td>
                    <Td className="tabular-nums">{a} orang</Td>
                    <Td>
                      {diff === 0 ? (
                        <Badge tone="green">Lengkap</Badge>
                      ) : diff < 0 ? (
                        <Badge tone="red">Kurang {-diff}</Badge>
                      ) : (
                        <Badge tone="amber">Lebih {diff}</Badge>
                      )}
                    </Td>
                  </tr>
                );
              })}
              {allPositions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-sm text-slate-400">
                    Belum ada formasi yang ditentukan untuk project ini.
                  </td>
                </tr>
              )}
            </Table>
          </Card>

          {/* Daftar Personel Security */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <div>
                  <span>Daftar Personel Security ({sortedPersonnel.length} personel)</span>
                  {sitePersonnel.length === 0 && sortedPersonnel.length > 0 && (
                    <div className="text-xs font-normal text-slate-500 mt-0.5">
                      Personel yang aktif di area ini (belum dipetakan ke nomor site spesifik).
                    </div>
                  )}
                </div>
              </div>
            }
            pad={false}
          >
            <Table head={['No', 'No. Pegawai', 'Nama Personel', 'Jabatan', 'Seragam', 'Sepatu', 'Status']}>
              {sortedPersonnel.map((p, idx) => (
                <tr key={p.id}>
                  <Td className="w-10 text-slate-400 font-mono text-xs">{idx + 1}</Td>
                  <Td className="font-mono text-xs text-slate-500">{p.employeeNo}</Td>
                  <Td>
                    <Link to={`/security/${p.id}`} className="font-medium text-indigo-700 hover:underline">
                      {p.name}
                    </Link>
                  </Td>
                  <Td className="text-slate-700 font-medium">{lookups.position.get(p.positionId)?.name}</Td>
                  <Td className="text-center font-mono text-xs">{p.uniformSize}</Td>
                  <Td className="text-center font-mono text-xs">{p.shoeSize}</Td>
                  <Td>
                    <Badge tone={PERSONNEL_STATUS[p.status].tone}>
                      {PERSONNEL_STATUS[p.status].label}
                    </Badge>
                  </Td>
                </tr>
              ))}
              {sortedPersonnel.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-sm text-slate-400">
                    Belum ada personel security yang ditugaskan di lokasi ini.
                  </td>
                </tr>
              )}
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 3: Dokumen FPK dan SPK */}
      {activeTab === 'kontrak' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dokumen FPK */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Dokumen FPK ({projectFpks.length})</span>
              </div>
            }
            actions={<span className="text-[11px] text-slate-400">Klik baris untuk drawer preview</span>}
            pad={false}
          >
            <Table head={['Nomor FPK', 'Status', 'Mulai Jaga', 'Orang', 'Nilai/Bln']}>
              {projectFpks.map(f => {
                const cur = latest(f);
                const isSelected = activeDoc?.type === 'fpk' && activeDoc.id === f.id;
                return (
                  <tr
                    key={f.id}
                    onClick={() => {
                      if (isSelected) closeDoc();
                      else openDoc({ type: 'fpk', id: f.id });
                    }}
                    className={cx(
                      'cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-indigo-50/90 border-l-4 border-l-indigo-600 font-medium'
                        : 'hover:bg-slate-50/80'
                    )}
                  >
                    <Td>
                      <span className="font-mono font-semibold text-indigo-700 hover:underline">
                        {f.number}
                      </span>
                      <div className="text-[11px] text-slate-400 capitalize">{f.type} · v{cur.no}</div>
                    </Td>
                    <Td>
                      <Badge tone={FPK_STATUS[f.status].tone}>
                        {FPK_STATUS[f.status].label}
                      </Badge>
                    </Td>
                    <Td className="text-xs whitespace-nowrap">{fmtDate(cur.periodStart)}</Td>
                    <Td className="text-center tabular-nums">{fpkHeadcount(f)}</Td>
                    <Td className="whitespace-nowrap">
                      <Money value={cur.monthlyValue} clientId={cur.clientId} />
                    </Td>
                  </tr>
                );
              })}
              {projectFpks.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-sm text-slate-400">
                    Belum ada dokumen FPK untuk project ini.
                  </td>
                </tr>
              )}
            </Table>
          </Card>

          {/* Dokumen SPK */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-teal-600" />
                <span>Dokumen SPK ({projectSpks.length})</span>
              </div>
            }
            actions={
              <div className="flex items-center gap-2">
                {projectSpks.length === 0 && projectFpks.length > 0 && access.can('spk.input') && primaryFpk && (
                  <Btn
                    size="sm"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={() => navigate(`/spk/input?project=${site.id}&fpk=${primaryFpk.id}`)}
                  >
                    Input SPK
                  </Btn>
                )}
                <span className="text-[11px] text-slate-400">Klik baris untuk drawer preview</span>
              </div>
            }
            pad={false}
          >
            <Table head={['Nomor SPK', 'Status', 'Periode', 'Orang', 'Nilai/Bln']}>
              {projectSpks.map(s => {
                const isSelected = activeDoc?.type === 'spk' && activeDoc.id === s.id;
                return (
                  <tr
                    key={s.id}
                    onClick={() => {
                      if (isSelected) closeDoc();
                      else openDoc({ type: 'spk', id: s.id });
                    }}
                    className={cx(
                      'cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-teal-50/90 border-l-4 border-l-teal-600 font-medium'
                        : 'hover:bg-slate-50/80'
                    )}
                  >
                    <Td>
                      <span className="font-mono font-semibold text-indigo-700 hover:underline">
                        {s.number}
                      </span>
                      {s.isInitialData && <span className="block text-[10px] text-slate-400">data awal</span>}
                    </Td>
                    <Td>
                      <Badge tone={SPK_STATUS[s.status].tone}>
                        {SPK_STATUS[s.status].label}
                      </Badge>
                    </Td>
                    <Td className="text-xs whitespace-nowrap">
                      {fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}
                    </Td>
                    <Td className="text-center tabular-nums">{spkHeadcount(s)}</Td>
                    <Td className="whitespace-nowrap">
                      <Money value={s.monthlyValue} clientId={s.clientId} />
                    </Td>
                  </tr>
                );
              })}
              {projectSpks.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-sm text-slate-500">
                    <p className="mb-2.5">Belum ada dokumen SPK untuk project ini.</p>
                    {projectFpks.length > 0 && access.can('spk.input') && primaryFpk && (
                      <Btn
                        size="sm"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/spk/input?project=${site.id}&fpk=${primaryFpk.id}`)}
                      >
                        Input SPK Sekarang
                      </Btn>
                    )}
                  </td>
                </tr>
              )}
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 4: Lampiran */}
      {activeTab === 'lampiran' && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-slate-600" />
              <span>Dokumen Lampiran ({attachments.length})</span>
            </div>
          }
        >
          {attachments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {attachments.map(({ att, source, sourceLink }) => (
                <div key={att.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">{att.kind}</span>
                    <Link to={sourceLink} className="text-[11px] text-indigo-600 hover:underline">
                      {source}
                    </Link>
                  </div>
                  <AttachmentChip a={att} clientId={site.clientId} />
                  <div className="text-[11px] text-slate-400">
                    Oleh {lookups.user.get(att.uploadedBy)?.name ?? att.uploadedBy} · {fmtDate(att.uploadedAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-slate-400">
              Belum ada file lampiran yang diunggah untuk project ini.
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: Log Activity */}
      {activeTab === 'log' && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>Log Activity & Riwayat Proyek</span>
            </div>
          }
          pad={false}
        >
          <Table head={['Aktivitas', 'Waktu', 'Pengguna', 'Keterangan']}>
            {auditLogs.map(a => (
              <tr key={a.id}>
                <Td className="text-sm font-medium text-slate-900">
                  {a.action}
                  <div className="text-[11px] text-slate-400 font-mono capitalize">
                    {a.entity} ({a.entityId})
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(a.at)}</Td>
                <Td className="text-xs">
                  <span className="font-medium text-slate-800">
                    {lookups.user.get(a.actorId)?.name ?? (a.actorId === 'sistem' ? 'Sistem' : a.actorId)}
                  </span>
                  {a.onBehalfOfId && (
                    <div className="text-slate-400 text-[11px]">
                      an. {lookups.user.get(a.onBehalfOfId)?.name}
                    </div>
                  )}
                </Td>
                <Td className="text-xs text-slate-600">
                  {a.after ? (
                    <div>
                      {a.before && <span className="line-through text-slate-400 mr-1.5">{a.before}</span>}
                      <span className="text-slate-800 font-medium">{a.after}</span>
                    </div>
                  ) : (
                    '–'
                  )}
                </Td>
              </tr>
            ))}
            {auditLogs.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-sm text-slate-400">
                  Belum ada log aktivitas tercatat untuk project ini.
                </td>
              </tr>
            )}
          </Table>
        </Card>
      )}

      {/* Document Drawer (FPK / SPK) */}
      {activeDoc && (
        <ProjectDocDrawer
          activeDoc={activeDoc}
          onClose={closeDoc}
          onNavigateDoc={handleNavigateDoc}
          onBackDoc={docHistory.length > 0 ? handleBackDoc : undefined}
          prevDocTitle={prevDocTitle}
          onPrevNext={handlePrevNext}
        />
      )}
    </div>
  );
};
