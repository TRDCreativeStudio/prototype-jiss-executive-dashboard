import React, { useState, useEffect } from 'react';
import {
  Building2, MapPin, User, Mail, Phone, FileText, FileCheck2, Shield,
  Clock, DollarSign, Paperclip, ChevronRight, CheckCircle2, AlertCircle,
  ExternalLink, Calendar, Users, Layers, Plus, Copy, ArrowRight
} from 'lucide-react';
import { useStore } from '../../store/store';
import { ActivityLog, AttachmentChip, Badge, Btn, Card, DL, Money, PageHeader, Table, Td, cx, toast, Tr, CellMain, CellSub, CellCode, TableEmpty, Tabs, StatusChip, Stepper } from '../../ui/kit';
import { projectActivity } from '../../domain/activity';
import { Link, navigate } from '../../router';
import { NotFound } from '../Misc';
import { FPK_STATUS, SPK_STATUS, PERSONNEL_STATUS, MEMO_STATUS } from '../../domain/labels';
import { currentPlacement, fpkCoverage, fpkHeadcount, latest, spkHeadcount } from '../../domain/selectors';
import { diffDays, fmtDate, fmtDateTime, TODAY } from '../../domain/time';
import { settingNum } from '../../domain/settings';
import { getFpkStatusDisplay } from '../fpk/FpkList';
import { LINK, SummaryCard, InfoCard, InfoRow, CopyBtn, ProjectBanner, ProjectChip } from './projectUi';
import { projectStatus, canRunAction } from '../../domain/project';
import type { Division, Fpk, Spk, Attachment } from '../../domain/types';
import { ProjectDocDrawer, type ActiveDoc } from './ProjectDocDrawer';

export const ProjectDetailPage: React.FC<{ id: string }> = ({ id }) => {
  const { state, lookups, access, me, myTasks } = useStore();
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

  // Tutup dengan animasi geser keluar dulu, baru lepas dokumennya
  const [docClosing, setDocClosing] = useState(false);
  const requestCloseDoc = () => {
    if (docClosing) return;
    setDocClosing(true);
    window.setTimeout(() => {
      closeDoc();
      setDocClosing(false);
    }, 220);
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
  // Nilai & periode dari SPK yang sudah aktif; SPK yang masih dicek belum jadi acuan
  const refSpk = activeSpk?.status === 'aktif' ? activeSpk : undefined;
  const monthlyValue = refSpk ? refSpk.monthlyValue : (activeFpkVer?.monthlyValue ?? 0);
  const periodStart = refSpk ? refSpk.periodStart : (activeFpkVer?.periodStart ?? '');
  const periodEnd = refSpk ? refSpk.periodEnd : (activeFpkVer?.periodEnd ?? '');
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



  // FPK yang sudah disetujui/berjalan dan belum punya SPK yang sedang diproses → Marketing boleh input SPK
  const spkReadyFpk = projectFpks.find(f =>
    ['disetujui', 'berjalan', 'tertutup_sebagian'].includes(f.status) &&
    !state.spks.some(sp => sp.fpkId === f.id && (sp.status === 'diinput' || sp.status === 'perlu_revisi'))
  );
  const canInputSpk = Boolean(spkReadyFpk && access.can('spk.input'));
  const inputSpkHref = spkReadyFpk ? `/spk/input?project=${site.id}&fpk=${spkReadyFpk.id}` : '';

  // Chip status FPK sama dengan daftar FPK
  const minMargin = settingNum(state.settings, 'margin.minimum_pct', 10);
  const myFpkTasks = new Set(myTasks.filter(x => x.task.refType === 'fpk').map(x => x.task.refId));
  const fpkChip = activeFpk ? getFpkStatusDisplay(activeFpk, state, lookups, me, myFpkTasks, minMargin) : null;
  const ps = projectStatus(site, state);
  // "berakhir n bulan/hari lagi"
  const daysLeft = periodEnd ? diffDays(TODAY, periodEnd) : 0;
  const endsIn = daysLeft < 0 ? 'sudah berakhir' : daysLeft <= 60 ? `berakhir ${daysLeft} hari lagi` : `berakhir ${Math.round(daysLeft / 30.4)} bulan lagi`;

  return (
    <div className="space-y-6">
      {/* Header: tanpa badge status (semua project aktif); area bisa diklik */}
      <PageHeader
        back="/project"
        title={site.name}
        subtitle={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[13px] text-slate-500">
            <span className="font-mono">PRJ-{site.code}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-700">{client?.name}</span>
            <span aria-hidden="true">·</span>
            <Link to={`/area/${site.areaId}`} className="hover:text-slate-800 hover:underline underline-offset-2">{area?.name}</Link>
            {ps && <span className="ml-1"><ProjectChip ps={ps} /></span>}
          </div>
        }
        actions={ps && !ps.banner && canRunAction(ps.action, me, client) && ps.action?.to
          ? <Btn size="sm" onClick={() => navigate(ps.action!.to!)}>{ps.action.label}</Btn> : undefined}
      />

      {/* Tahap project (bukan status dokumen) */}
      {ps && <Stepper steps={ps.steps} current={ps.stage} warn={ps.warn} />}
      {ps && <ProjectBanner ps={ps} />}

      {/* Kartu ringkasan: satu skala (label 12px, nilai 18px, keterangan 13px) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <SummaryCard icon={DollarSign} label="Nilai kontrak / bulan"
          value={monthlyValue > 0 ? <Money value={monthlyValue} clientId={site.clientId} /> : '–'}
          sub={durationMonths > 0 ? <>Est. {durationMonths} bln: <Money value={totalValue} clientId={site.clientId} /></> : 'Sebelum PPN'}
        />
        <SummaryCard icon={Calendar} label="Periode"
          value={periodStart ? `${fmtDate(periodStart)} – ${fmtDate(periodEnd)}` : '–'}
          valueClass="text-base sm:text-lg"
          sub={durationDays > 0 ? `${durationDays} hari · ${endsIn}` : undefined}
        />
        <SummaryCard icon={FileText} label="Status FPK"
          active={activeDoc?.type === 'fpk' && !!activeFpk && activeDoc.id === activeFpk.id}
          onClick={activeFpk ? () => {
            if (activeDoc?.type === 'fpk' && activeDoc.id === activeFpk.id) requestCloseDoc();
            else openDoc({ type: 'fpk', id: activeFpk.id });
          } : undefined}
          value={fpkChip ? <StatusChip tone={fpkChip.tone} label={fpkChip.label} hint={fpkChip.hint} /> : <Badge tone="slate">Belum ada FPK</Badge>}
          sub={activeFpk ? <span className="font-mono text-slate-700">{activeFpk.number}</span> : undefined}
        />
        <SummaryCard icon={FileCheck2} label="Status SPK"
          active={activeDoc?.type === 'spk' && !!activeSpk && activeDoc.id === activeSpk.id}
          onClick={activeSpk ? () => {
            if (activeDoc?.type === 'spk' && activeDoc.id === activeSpk.id) requestCloseDoc();
            else openDoc({ type: 'spk', id: activeSpk.id });
          } : undefined}
          value={activeSpk
            ? <Badge tone={SPK_STATUS[activeSpk.status].tone}>{SPK_STATUS[activeSpk.status].label}</Badge>
            : <Badge tone="slate">Belum ada SPK</Badge>}
          sub={activeSpk ? <span className="font-mono text-slate-700">{activeSpk.number}</span> : undefined}
        />
      </div>

      {/* Tab standar (sama dengan halaman lain) */}
      <Tabs
        value={activeTab}
        onChange={k => setActiveTab(k as typeof activeTab)}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'keamanan', label: 'Personel Keamanan' },
          { key: 'kontrak', label: `Dokumen Kontrak (${projectFpks.length + projectSpks.length})` },
          { key: 'lampiran', label: `Lampiran (${attachments.length})` },
          { key: 'log', label: 'Log Activity' },
        ]}
      />

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
            {/* Kartu kiri: Lokasi & tim JISS (kode site & area dihapus: sudah ada di header) */}
            <InfoCard title="Lokasi & tim JISS">
              <InfoRow label="Alamat">
                {/* Alamat bisa diklik (tab baru ke peta); petunjuk "Buka peta" muncul saat hover */}
                <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="group text-slate-800 hover:text-slate-950 hover:underline underline-offset-2" title="Buka di peta">
                  {site.address}
                  <span className="ml-2 whitespace-nowrap text-[13px] font-medium text-slate-500 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100 transition-opacity">Buka peta ↗</span>
                </a>
              </InfoRow>
              {site.note && site.note.trim() && site.note !== '–' && <InfoRow label="Catatan">{site.note}</InfoRow>}
              <hr className="border-slate-100" />
              <InfoRow label="Bertugas">
                {activePersonnelCount} personel
                {kurang > 0 && <span className="text-rose-600 font-medium"> · kurang {kurang}</span>}
                <button type="button" onClick={() => setActiveTab('keamanan')} aria-label="Lihat semua personel" title="Lihat semua personel" className="ml-1.5 inline-flex align-middle p-0.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100"><ArrowRight className="w-4 h-4" /></button>
              </InfoRow>
              <InfoRow label="Danru">
                {danrus.length > 0
                  ? danrus.map(d => <div key={d.id}>{d.name}{(d as any).shift ? <span className="text-slate-500"> · {(d as any).shift}</span> : ''}</div>)
                  : <span className="text-slate-400">Belum ada</span>}
              </InfoRow>
              <InfoRow label="PIC area">{aa?.name ?? '–'}</InfoRow>
              <InfoRow label="Account owner">{accountOwner?.name ?? '–'}</InfoRow>
            </InfoCard>

            {/* Kartu kanan: Klien */}
            <InfoCard title="Klien">
              <InfoRow label="PIC klien">
                {picFormatted ?? (
                  <>
                    <span className="text-slate-400">Belum ada kontak PIC</span>
                    {access.can('master.edit') && <Link to={`/klien/${site.clientId}`} className={cx(LINK, 'ml-2')}>Tambahkan</Link>}
                  </>
                )}
              </InfoRow>
              <InfoRow label="Telepon">
                <span className="inline-flex items-center gap-1.5">
                  {client?.picPhone || '–'}
                  {client?.picPhone && <CopyBtn label="Salin nomor telepon" onClick={() => copyText(client.picPhone!, 'Nomor telepon')} />}
                </span>
              </InfoRow>
              <InfoRow label="Email">
                <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
                  <span className="truncate">{client?.picEmail || '–'}</span>
                  {client?.picEmail && <CopyBtn label="Salin email" onClick={() => copyText(client.picEmail!, 'Email')} />}
                </span>
              </InfoRow>
              <InfoRow label="Termin bayar">{client?.termDays ? `${client.termDays} hari` : '30 hari'}</InfoRow>
            </InfoCard>
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
                  <Tr key={pid}>
                    <Td className="w-10 text-slate-400 font-mono">{idx + 1}</Td>
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
                  </Tr>
                );
              })}
              {allPositions.length === 0 && (
                <Tr>
                  <td colSpan={5} className="text-center py-6 text-sm text-slate-400">
                    Belum ada formasi yang ditentukan untuk project ini.
                  </td>
                </Tr>
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
                <Tr key={p.id} to={`/security/${p.id}`}>
                  <Td className="w-10 text-slate-400 font-mono">{idx + 1}</Td>
                  <Td className="font-mono text-slate-500">{p.employeeNo}</Td>
                  <Td>
                    <CellMain>
                      {p.name}
                    </CellMain>
                  </Td>
                  <Td className="text-slate-700 font-medium">{lookups.position.get(p.positionId)?.name}</Td>
                  <Td className="text-center font-mono">{p.uniformSize}</Td>
                  <Td className="text-center font-mono">{p.shoeSize}</Td>
                  <Td>
                    <Badge tone={PERSONNEL_STATUS[p.status].tone}>
                      {PERSONNEL_STATUS[p.status].label}
                    </Badge>
                  </Td>
                </Tr>
              ))}
              {sortedPersonnel.length === 0 && (
                <Tr>
                  <td colSpan={7} className="text-center py-8 text-sm text-slate-400">
                    Belum ada personel security yang ditugaskan di lokasi ini.
                  </td>
                </Tr>
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
            pad={false}
          >
            <Table head={['Nomor FPK', 'Status', 'Mulai Jaga', 'Orang', 'Nilai/Bln']}>
              {projectFpks.map(f => {
                const cur = latest(f);
                const isSelected = activeDoc?.type === 'fpk' && activeDoc.id === f.id;
                return (
                  <Tr
                    key={f.id}
                    selected={isSelected}
                    onClick={() => {
                      if (isSelected) requestCloseDoc();
                      else openDoc({ type: 'fpk', id: f.id });
                    }}
                  >
                    <Td>
                      <CellCode>{f.number}</CellCode>
                      <CellSub className="capitalize">{f.type} · v{cur.no}</CellSub>
                    </Td>
                    <Td>
                      <Badge tone={FPK_STATUS[f.status].tone}>
                        {FPK_STATUS[f.status].label}
                      </Badge>
                    </Td>
                    <Td className="whitespace-nowrap">{fmtDate(cur.periodStart)}</Td>
                    <Td className="tabular-nums">{fpkHeadcount(f)}</Td>
                    <Td className="whitespace-nowrap">
                      <Money value={cur.monthlyValue} clientId={cur.clientId} />
                    </Td>
                  </Tr>
                );
              })}
              {projectFpks.length === 0 && (
                <Tr>
                  <td colSpan={5} className="text-center py-6 text-sm text-slate-400">
                    Belum ada dokumen FPK untuk project ini.
                  </td>
                </Tr>
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
                {canInputSpk && (
                  <Btn
                    size="sm"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={() => navigate(inputSpkHref)}
                  >
                    Input SPK
                  </Btn>
                )}
              </div>
            }
            pad={false}
          >
            <Table head={['Nomor SPK', 'Status', 'Periode', 'Orang', 'Nilai/Bln']}>
              {projectSpks.map(s => {
                const isSelected = activeDoc?.type === 'spk' && activeDoc.id === s.id;
                return (
                  <Tr
                    key={s.id}
                    selected={isSelected}
                    onClick={() => {
                      if (isSelected) requestCloseDoc();
                      else openDoc({ type: 'spk', id: s.id });
                    }}
                  >
                    <Td>
                      <CellCode>{s.number}</CellCode>
                    </Td>
                    <Td>
                      <Badge tone={SPK_STATUS[s.status].tone}>
                        {SPK_STATUS[s.status].label}
                      </Badge>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}
                    </Td>
                    <Td className="tabular-nums">{spkHeadcount(s)}</Td>
                    <Td className="whitespace-nowrap">
                      <Money value={s.monthlyValue} clientId={s.clientId} />
                    </Td>
                  </Tr>
                );
              })}
              {projectSpks.length === 0 && (
                <Tr>
                  <td colSpan={5} className="text-center py-8 text-sm text-slate-500">
                    <p className="mb-2.5">Belum ada dokumen SPK untuk project ini.</p>
                    {canInputSpk && (
                      <Btn
                        size="sm"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => navigate(inputSpkHref)}
                      >
                        Input SPK Sekarang
                      </Btn>
                    )}
                  </td>
                </Tr>
              )}
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 4: Lampiran */}
      {/* Linimasa di bawah daftar dokumen kontrak */}
      {activeTab === 'kontrak' && <ContractTimeline siteId={site.id} onOpen={openDoc} />}

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
          <div className="p-5">
            <ActivityLog
              items={projectActivity(site, projectFpks, state.spks, state.audit, access.money(site.clientId))}
              onOpenDoc={doc => openDoc(doc)}
              empty="Belum ada aktivitas di project ini."
            />
          </div>
        </Card>
      )}

      {/* Backdrop: klik di luar drawer menutupnya (sama seperti panel di daftar FPK/SPK) */}
      {activeDoc && (
        <div
          className="drawer-backdrop fixed inset-0 z-40 bg-slate-900/20"
          data-closing={docClosing}
          onClick={requestCloseDoc}
          aria-hidden="true"
        />
      )}

      {/* Document Drawer (FPK / SPK) */}
      {activeDoc && (
        <ProjectDocDrawer
          activeDoc={activeDoc}
          closing={docClosing}
          onClose={requestCloseDoc}
          onNavigateDoc={handleNavigateDoc}
          onBackDoc={docHistory.length > 0 ? handleBackDoc : undefined}
          prevDocTitle={prevDocTitle}
          onPrevNext={handlePrevNext}
        />
      )}
    </div>
  );
};

/**
 * Linimasa kontrak: project dilihat dari sisi waktu.
 * Setiap periode = SPK (dengan FPK asal dan memo perpanjangannya); celah tanpa SPK ditandai.
 */
const ContractTimeline: React.FC<{ siteId: string; onOpen: (d: ActiveDoc) => void }> = ({ siteId, onOpen }) => {
  const { state, lookups } = useStore();
  const site = lookups.site.get(siteId)!;
  const ps = projectStatus(site, state);
  const spks = state.spks.filter(x => x.siteId === siteId && x.type !== 'addendum').sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const fpksNoSpk = state.fpks.filter(f => latest(f).siteId === siteId && !['batal', 'ditolak'].includes(f.status) && !spks.some(x => x.fpkId === f.id));
  type Item = { key: string; date: string; title: React.ReactNode; meta?: React.ReactNode; tone: 'green' | 'amber' | 'red' | 'slate' | 'blue' };
  const items: Item[] = [];
  fpksNoSpk.forEach(f => items.push({
    key: f.id, date: f.startedAt ?? latest(f).plannedStart, tone: f.startedAt ? 'amber' : 'slate',
    title: <>FPK <button type="button" className="font-mono hover:underline" onClick={() => onOpen({ type: 'fpk', id: f.id })}>{f.number}</button> · {FPK_STATUS[f.status].label}</>,
    meta: `${fmtDate(latest(f).periodStart)} – ${fmtDate(latest(f).periodEnd)}${f.startedAt ? ` · mulai jaga ${fmtDate(f.startedAt)}` : ` · rencana mulai ${fmtDate(latest(f).plannedStart)}`}`,
  }));
  spks.forEach(x => {
    const f = x.fpkId ? lookups.fpk.get(x.fpkId) : undefined;
    const memos = state.memos.filter(m => m.spkId === x.id);
    items.push({
      key: x.id, date: x.periodStart, tone: x.status === 'aktif' ? 'green' : x.status === 'perlu_revisi' ? 'amber' : x.status === 'berakhir' ? 'slate' : 'blue',
      title: <>SPK <button type="button" className="font-mono hover:underline" onClick={() => onOpen({ type: 'spk', id: x.id })}>{x.number}</button> · {SPK_STATUS[x.status].label}</>,
      meta: <>
        {fmtDate(x.periodStart)} – {fmtDate(x.periodEnd)}
        {f && <> · dari <button type="button" className="font-mono hover:underline" onClick={() => onOpen({ type: 'fpk', id: f.id })}>{f.number}</button></>}
        {x.isInitialData && ' · data awal'}
        {memos.map(m => <span key={m.id}> · memo <Link to={`/memo/${m.id}`} className="font-mono hover:underline">{m.number ?? 'draf'}</Link> ({MEMO_STATUS[m.status].label.toLowerCase()})</span>)}
      </>,
    });
  });
  if (ps.gap) items.push({ key: 'gap', date: ps.gap.from, tone: 'red', title: <>Jalan tanpa SPK · {ps.gap.days} hari</>, meta: `sejak ${fmtDate(ps.gap.from)}${ps.gap.lapsed ? ' (SPK lama berakhir)' : ''}` });
  items.sort((a, b) => a.date.localeCompare(b.date));
  const DOT = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500', slate: 'bg-slate-300', blue: 'bg-blue-500' };
  return (
    <Card title="Linimasa kontrak">
      {items.length === 0 ? <p className="text-sm text-slate-500">Belum ada dokumen.</p> : (
        <ol className="relative border-l border-slate-200 ml-1.5 space-y-4">
          {items.map(it => (
            <li key={it.key} className="pl-5 relative">
              <span className={cx('absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white', DOT[it.tone])} />
              <div className="text-sm text-slate-900">{it.title}</div>
              {it.meta && <div className="text-[13px] text-slate-500 mt-0.5">{it.meta}</div>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
};
