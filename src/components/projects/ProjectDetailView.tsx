import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  MapPin, 
  FileText, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Mail, 
  Phone, 
  Copy, 
  Check, 
  X, 
  AlertCircle,
  ExternalLink,
  AlertTriangle,
  History,
  Send,
  UserCheck
} from 'lucide-react';
import { SPK } from '../../types';

export const ProjectDetailView: React.FC = () => {
  const { 
    selectedProject, 
    sites, 
    spks, 
    fpks, 
    clients, 
    areas, 
    externalMemos,
    setActiveView 
  } = useApp();

  const [previewSpkDoc, setPreviewSpkDoc] = useState<SPK | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const project = selectedProject;
  const linkedSites = sites.filter(s => project.siteIds.includes(s.id));
  const linkedSPKs = spks.filter(s => project.spkIds.includes(s.id));
  const matchedFPK = fpks.find(f => f.id === project.fpkId);
  const client = clients.find(c => c.id === project.clientId);
  const matchedMemo = externalMemos.find(m => m.projectId === project.id);

  // Copy helper
  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Format readable date: "15 Des 2025"
  const formatReadableDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split(' ')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    return `${day} ${monthNames[month]} ${year}`;
  };

  // Format compact Rupiah: "Rp 780 juta"
  const formatCompactRupiah = (amount: number) => {
    if (!amount) return 'Rp 0';
    if (amount >= 1_000_000_000) {
      const val = amount / 1_000_000_000;
      return `Rp ${val.toLocaleString('id-ID', { maximumFractionDigits: 1 })} miliar`;
    }
    if (amount >= 1_000_000) {
      const val = amount / 1_000_000;
      return `Rp ${val.toLocaleString('id-ID', { maximumFractionDigits: 1 })} juta`;
    }
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  // Clean project title: strips client name prefix
  const getCleanProjectTitle = (proj: { name: string; clientName: string }) => {
    let name = proj.name;
    if (name.includes('—')) {
      name = name.split('—')[1].trim();
    } else if (name.startsWith(proj.clientName)) {
      name = name.replace(proj.clientName, '').replace(/^[-–—\s]+/, '').trim();
    }
    return name.replace(/^Aktif\s*·\s*/i, '').trim() || 'Pengamanan Fasilitas Lapangan';
  };

  const projectTitle = getCleanProjectTitle(project);

  // Client initials for logo
  const clientInitials = client?.code || client?.name.split(' ').map(w => w[0]).filter(c => c && c.match(/[A-Za-z]/)).slice(0, 3).join('') || 'PT';

  // Total contract value calculation
  const totalContractValue = linkedSPKs.reduce((acc, s) => acc + s.contractValueRp, 0);

  // Expiring SPK info
  const expiringSPK = linkedSPKs.find(s => s.isExpiringSoon || (s.daysToExpiration && s.daysToExpiration <= 75));
  const endDateStr = project.projectEndDate || (linkedSPKs.length > 0 ? linkedSPKs[linkedSPKs.length - 1].contractEnd : '2026-12-31');
  const startDateStr = project.targetStartDate || (linkedSPKs.length > 0 ? linkedSPKs[0].contractStart : '2025-12-15');

  // Status pill: Berjalan / Persiapan / Berakhir
  const statusPill = useMemo(() => {
    if (project.status === 'Mobilizing') {
      return (
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          Persiapan
        </span>
      );
    }
    if (project.status === 'Active') {
      return (
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Berjalan
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
        Berakhir
      </span>
    );
  }, [project.status]);

  // One-line summary under title
  const summaryLine = useMemo(() => {
    let contractStatusText = `Berakhir ${formatReadableDate(endDateStr)}`;
    if (project.isJalanTanpaSPK) {
      contractStatusText = `SPK draf belum diverifikasi (${project.daysOperatingWithoutSPK || 13} hari)`;
    } else if (expiringSPK?.daysToExpiration) {
      contractStatusText = `Kontrak berakhir ${formatReadableDate(endDateStr)} (${expiringSPK.daysToExpiration} hari lagi)`;
    }

    return (
      <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
        <button
          type="button"
          onClick={() => {
            if (client) {
              if (typeof window !== 'undefined') {
                window.history.pushState(null, '', `/klien?detail=${client.code}`);
              }
              setActiveView('clients');
            }
          }}
          className="font-bold text-slate-900 hover:text-indigo-600 hover:underline transition-colors"
          title={`Lihat direktori klien ${project.clientName}`}
        >
          {project.clientName}
        </button>
        <span className="text-slate-300">·</span>
        <span className="font-semibold text-slate-800">
          {formatCompactRupiah(totalContractValue)}
        </span>
        <span className="text-slate-300">·</span>
        <span className={project.isJalanTanpaSPK ? 'text-rose-700 font-semibold' : (expiringSPK ? 'text-amber-800 font-semibold' : 'text-slate-600 font-medium')}>
          {contractStatusText}
        </span>
      </div>
    );
  }, [client, project, totalContractValue, endDateStr, expiringSPK, setActiveView]);

  // Section 3: Status Banner (Only if there's an issue!)
  const issueBanner = useMemo(() => {
    if (project.isJalanTanpaSPK) {
      const uncontractedSite = linkedSites.find(s => s.name.toLowerCase().includes('bekasi') || s.name.toLowerCase().includes('cikarang')) || linkedSites[0];
      const locName = uncontractedSite ? uncontractedSite.name : 'Pos Penjagaan Lapangan';
      const unverifiedRp = project.unverifiedContractValueRp || 265000000;

      return (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-950">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="font-medium leading-relaxed">
              Pos penjagaan <strong>{locName}</strong> telah bertugas selama <strong>{project.daysOperatingWithoutSPK || 13} hari</strong> tanpa SPK terverifikasi. Nilai tagihan <strong>{formatCompactRupiah(unverifiedRp)}</strong> belum memiliki perlindungan hukum penagihan dan liabilitas K3.
            </p>
          </div>
        </div>
      );
    }

    if (expiringSPK && expiringSPK.daysToExpiration) {
      return (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-950">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="font-medium leading-relaxed">
              Kontrak berakhir dalam <strong>{expiringSPK.daysToExpiration} hari</strong>. {matchedMemo ? `Penawaran perpanjangan telah dikirim pada ${formatReadableDate(matchedMemo.dispatchDate)} dan masih menunggu tanggapan resmi dari klien.` : 'Segera siapkan koordinasi penawaran perpanjangan (H-75) bersama tim komersial.'}
            </p>
          </div>
        </div>
      );
    }

    return null;
  }, [project, linkedSites, expiringSPK, matchedMemo]);

  // Stepper Stage Calculation
  const stepperStages = useMemo(() => {
    const fpkApprovedDate = matchedFPK?.bodDecision?.decidedAt ? formatReadableDate(matchedFPK.bodDecision.decidedAt) : '12 Nov 2025';
    const spkVerifiedDate = linkedSPKs[0]?.verifiedAt ? formatReadableDate(linkedSPKs[0].verifiedAt) : '14 Des 2025';
    const dutyStartDate = linkedSites[0]?.startGuardTimestamp ? formatReadableDate(linkedSites[0].startGuardTimestamp) : formatReadableDate(startDateStr);

    return [
      {
        id: 'fpk',
        title: 'FPK Disetujui',
        status: 'completed' as const,
        subtext: fpkApprovedDate,
      },
      {
        id: 'spk',
        title: 'SPK Diverifikasi',
        status: project.isJalanTanpaSPK ? ('error' as const) : ('completed' as const),
        subtext: project.isJalanTanpaSPK 
          ? `Menunggu verifikasi · ${project.daysOperatingWithoutSPK || 13} hari`
          : spkVerifiedDate,
      },
      {
        id: 'start',
        title: 'Mulai Bertugas',
        status: linkedSites.some(s => s.startGuardConfirmed) ? ('completed' as const) : ('current' as const),
        subtext: linkedSites.some(s => s.startGuardConfirmed) ? dutyStartDate : 'Tahap Persiapan',
      },
      {
        id: 'active',
        title: 'Berjalan',
        status: project.status === 'Active' ? ('current' as const) : ('upcoming' as const),
        subtext: project.status === 'Active' ? 'Operasional aktif' : 'Menunggu mulai',
      },
      {
        id: 'renewal',
        title: 'Perpanjangan',
        status: (expiringSPK || matchedMemo) ? ('in_progress' as const) : ('upcoming' as const),
        subtext: matchedMemo 
          ? `Memo terkirim ${formatReadableDate(matchedMemo.dispatchDate)}`
          : (expiringSPK ? `Sisa ${expiringSPK.daysToExpiration} hari` : 'H-75 sebelum selesai'),
      },
      {
        id: 'end',
        title: 'Berakhir',
        status: 'upcoming' as const,
        subtext: `Jatuh tempo ${formatReadableDate(endDateStr)}`,
      },
    ];
  }, [matchedFPK, linkedSPKs, linkedSites, startDateStr, project, expiringSPK, matchedMemo, endDateStr]);

  // Section 4: Penanggung Jawab Info
  const picPemasaran = matchedFPK?.createdBy || 'Dimas Wicaksono (Pemasaran)';
  const areaObj = areas.find(a => linkedSites.some(s => s.areaId === a.id));
  const pengawasWilayah = areaObj?.picAreaName || linkedSites[0]?.startGuardConfirmedBy?.split('(')[0].trim() || 'Hendra Setiawan (Operasional)';
  const narahubungNama = client?.contactPerson || 'Belum terdaftar';
  const narahubungEmail = client?.email || '';
  const narahubungTelepon = client?.phone || '';

  // Section 5: Activity Log Items (Who did what and when)
  const activityItems = useMemo(() => {
    const list = [];

    if (matchedMemo) {
      list.push({
        id: 'act-memo',
        title: 'Surat perpanjangan kontrak dikirim ke klien',
        description: `Memo resmi perpanjangan (${matchedMemo.stage}) dikirimkan. Menunggu konfirmasi kesepakatan klien.`,
        date: formatReadableDate(matchedMemo.dispatchDate),
        actor: 'Dimas Wicaksono (Pemasaran)',
        icon: <Send className="w-3.5 h-3.5 text-indigo-600" />,
        bgColor: 'bg-indigo-50 border-indigo-200',
      });
    }

    if (project.isJalanTanpaSPK) {
      list.push({
        id: 'act-alert-spk',
        title: 'Peringatan pos beroperasi tanpa SPK sah',
        description: `Sistem mencatat petugas telah bertugas di pos cabang selama ${project.daysOperatingWithoutSPK || 13} hari sebelum berkas SPK diverifikasi.`,
        date: '28 Okt 2026',
        actor: 'Sistem Pengawasan Internal',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
        bgColor: 'bg-rose-50 border-rose-200',
      });
    }

    if (linkedSPKs.length > 0 && linkedSPKs[0].verificationStatus === 'Verified') {
      list.push({
        id: 'act-spk',
        title: 'SPK diverifikasi oleh Divisi Keuangan',
        description: `Dokumen ${linkedSPKs[0].spkNumber} diverifikasi sah dengan pagu anggaran ${formatCompactRupiah(linkedSPKs[0].contractValueRp)}.`,
        date: linkedSPKs[0].verifiedAt ? formatReadableDate(linkedSPKs[0].verifiedAt) : '10 Des 2025',
        actor: linkedSPKs[0].verifiedBy || 'Siti Rahma (Keuangan)',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        bgColor: 'bg-emerald-50 border-emerald-200',
      });
    }

    if (linkedSites.some(s => s.startGuardConfirmed)) {
      list.push({
        id: 'act-guard',
        title: 'Konfirmasi penempatan & mulai tugas fisik',
        description: `${project.totalAssignedPersonnel} personel pengamanan ditempatkan dan aktif menjalankan apel serah terima tugas.`,
        date: linkedSites[0]?.startGuardTimestamp ? formatReadableDate(linkedSites[0].startGuardTimestamp) : '15 Des 2025',
        actor: pengawasWilayah,
        icon: <UserCheck className="w-3.5 h-3.5 text-teal-600" />,
        bgColor: 'bg-teal-50 border-teal-200',
      });
    }

    if (matchedFPK) {
      list.push({
        id: 'act-fpk',
        title: 'Persetujuan FPK oleh Dewan Direksi',
        description: `Pengajuan ${matchedFPK.fpkNumber} disetujui penuh oleh Direksi untuk pembentukan penugasan operasional proyek.`,
        date: matchedFPK.bodDecision?.decidedAt ? formatReadableDate(matchedFPK.bodDecision.decidedAt) : '30 Nov 2025',
        actor: matchedFPK.bodDecision?.decidedBy || 'Bambang Sutrisno (Direksi)',
        icon: <Building2 className="w-3.5 h-3.5 text-slate-700" />,
        bgColor: 'bg-slate-100 border-slate-200',
      });
    }

    return list;
  }, [matchedMemo, project, linkedSPKs, linkedSites, pengawasWilayah, matchedFPK]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* 1. Breadcrumb: PT JISS › Daftar Proyek › {Nama Proyek} */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">PT JISS</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <button
          onClick={() => setActiveView('projects')}
          className="hover:text-indigo-600 transition-colors font-medium hover:underline"
        >
          Daftar Proyek
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
          {projectTitle}
        </span>
      </nav>

      {/* 2. Header: Logo, Title, Status Pill, and One-Line Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-start gap-4">
          {/* Logo / Inisial Klien: Persegi membulat 56px dengan inisial netral */}
          <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-mono font-bold text-base shrink-0 shadow-2xs">
            {clientInitials}
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
                {projectTitle}
              </h1>
              {/* Status pill next to title */}
              {statusPill}
            </div>

            {/* One-line summary */}
            {summaryLine}
          </div>
        </div>
      </div>

      {/* 3. Progress Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="relative flex items-center justify-between">
            {/* Connecting line behind stepper items */}
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0"></div>

            {stepperStages.map((step, idx) => {
              const isError = step.status === 'error';
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current' || step.status === 'in_progress';

              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center text-center group w-28">
                  {/* Step Node Circle */}
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                    isError
                      ? 'bg-rose-50 border-rose-300 text-rose-700 ring-4 ring-rose-100 animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : isCurrent
                      ? 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-50 shadow-xs'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {isError ? (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    ) : isCompleted ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                    ) : (
                      <span className="text-[11px] font-semibold">{idx + 1}</span>
                    )}
                  </div>

                  {/* Step Title & Subtext */}
                  <div className="mt-2 space-y-0.5">
                    <span className={`text-xs block font-bold leading-tight ${
                      isError ? 'text-rose-700' : (isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-500')
                    }`}>
                      {step.title}
                    </span>
                    <span className={`text-[10px] block leading-tight font-medium ${
                      isError ? 'text-rose-600 font-bold' : (isCurrent ? 'text-indigo-600 font-semibold' : 'text-slate-400')
                    }`}>
                      {step.subtext}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout: Main Content on Left, Activity Timeline on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (2 Cols Span on Desktop) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Banner (Shown only if there's an issue) */}
          {issueBanner}

          {/* Section: Lokasi & Petugas */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Lokasi Jaga ({linkedSites.length})</span>
            </h2>

            <div className="divide-y divide-slate-100 text-xs">
              {linkedSites.map((site) => (
                <div 
                  key={site.id} 
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-1 last:pb-1"
                >
                  {/* Nama lokasi + alamat */}
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                        {site.siteCode}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {site.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {site.address}
                    </div>
                  </div>

                  {/* Jumlah petugas & status bertugas */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 self-start sm:self-center">
                    <div className="text-left sm:text-right">
                      <span className="font-bold text-slate-900 block text-xs">
                        {site.assignedPersonnel} petugas
                      </span>
                    </div>

                    <div className="text-left sm:text-right">
                      {site.startGuardConfirmed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Bertugas sejak {formatReadableDate(site.startGuardTimestamp || '2026-09-01')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          Tahap Persiapan
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Kontrak (SPK) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Kontrak (SPK)</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.history.pushState(null, '', `/kontrak?q=${encodeURIComponent(project.projectCode)}`);
                  }
                  setActiveView('kontrak');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
              >
                <span>Lihat SPK</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {linkedSPKs.length === 0 ? (
              <div className="py-6 text-center text-slate-500 space-y-1 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700">Belum ada dokumen SPK terdaftar untuk proyek ini</p>
                <p className="text-[11px] text-slate-400">Tim Pemasaran perlu mengunggah draf atau dokumen SPK resmi dari klien.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {linkedSPKs.map((spk) => {
                  const isDraft = spk.spkNumber.includes('DRAFT') || spk.verificationStatus === 'Pending Verification';
                  const cleanSpkNum = spk.spkNumber.replace(/-DRAFT$/i, '');

                  return (
                    <div 
                      key={spk.id} 
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-1 last:pb-1"
                    >
                      {/* Ikon file + nomor SPK + periode + nilai */}
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <button
                            onClick={() => setPreviewSpkDoc(spk)}
                            className="font-mono font-bold text-slate-900 hover:text-indigo-600 hover:underline transition-colors text-left text-xs sm:text-sm"
                            title="Klik untuk pratinjau dokumen SPK"
                          >
                            {cleanSpkNum}
                          </button>
                          {isDraft && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded">
                              Draf
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 font-medium">
                          {formatReadableDate(spk.contractStart)} – {formatReadableDate(spk.contractEnd)} · {formatCompactRupiah(spk.contractValueRp)}
                        </div>
                      </div>

                      {/* Status & tombol buka pratinjau */}
                      <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                        {spk.verificationStatus === 'Verified' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            Menunggu Verifikasi
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setPreviewSpkDoc(spk)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-200 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Buka Dokumen</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Penanggung Jawab */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight border-b border-slate-100 pb-3">
              Penanggung Jawab
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              {/* PIC Pemasaran */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  PIC Pemasaran
                </span>
                <strong className="text-sm font-bold text-slate-900 block truncate">
                  {picPemasaran}
                </strong>
                <span className="text-[11px] text-slate-500 block truncate">
                  Divisi Komersial
                </span>
              </div>

              {/* Pengawas Wilayah */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Pengawas Wilayah
                </span>
                <strong className="text-sm font-bold text-slate-900 block truncate">
                  {pengawasWilayah}
                </strong>
                <span className="text-[11px] text-slate-500 block truncate">
                  Divisi Operasional Lapangan
                </span>
              </div>

              {/* Narahubung Klien with ✉ and ☎ */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Narahubung Klien
                </span>
                <div>
                  <strong className="text-sm font-bold text-slate-900 block truncate">
                    {narahubungNama}
                  </strong>
                  {client?.contactRole && (
                    <span className="text-[11px] text-slate-500 block truncate">
                      {client.contactRole}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1 border-t border-slate-200/80">
                  {narahubungEmail && (
                    <div className="flex items-center gap-1">
                      <a
                        href={`mailto:${narahubungEmail}`}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-white transition-colors"
                        title={`Kirim email ke ${narahubungEmail}`}
                        aria-label={`Kirim email ke ${narahubungEmail}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(narahubungEmail, 'detail-email', e)}
                        className="p-0.5 text-slate-400 hover:text-slate-800 rounded transition-colors"
                        title="Salin email"
                      >
                        {copiedKey === 'detail-email' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}

                  {narahubungTelepon && (
                    <div className="flex items-center gap-1">
                      <a
                        href={`tel:${narahubungTelepon}`}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-white transition-colors"
                        title={`Hubungi ${narahubungTelepon}`}
                        aria-label={`Hubungi nomor ${narahubungTelepon}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(narahubungTelepon, 'detail-phone', e)}
                        className="p-0.5 text-slate-400 hover:text-slate-800 rounded transition-colors"
                        title="Salin nomor telepon"
                      >
                        {copiedKey === 'detail-phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Aktivitas Proyek (Project History / Timeline) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Aktivitas Proyek</span>
              </h2>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Riwayat Resmi
              </span>
            </div>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 pl-1 text-xs">
              {activityItems.map((act) => (
                <div key={act.id} className="relative flex items-start gap-3 pl-6">
                  {/* Circle marker */}
                  <div className={`absolute left-0 top-0.5 w-6 h-6 rounded-full border flex items-center justify-center shrink-0 z-10 ${act.bgColor}`}>
                    {act.icon}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="font-bold text-slate-900 block text-xs leading-snug">
                      {act.title}
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {act.description}
                    </p>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {act.date} · oleh <strong className="text-slate-600 font-semibold">{act.actor}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Dokumen SPK Pratinjau Modal */}
      {previewSpkDoc && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono">
                    {previewSpkDoc.spkNumber}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {previewSpkDoc.spkDocumentName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewSpkDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Klien</span>
                  <strong className="text-slate-900">{previewSpkDoc.clientName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status Verifikasi</span>
                  <span className={`inline-block font-bold ${
                    previewSpkDoc.verificationStatus === 'Verified' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {previewSpkDoc.verificationStatus === 'Verified' ? '✓ Terverifikasi Resmi' : 'Menunggu Verifikasi'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Masa Berlaku</span>
                  <span className="text-slate-800">
                    {formatReadableDate(previewSpkDoc.contractStart)} s/d {formatReadableDate(previewSpkDoc.contractEnd)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Nilai Kontrak</span>
                  <span className="font-bold text-slate-900">
                    {formatCompactRupiah(previewSpkDoc.contractValueRp)}
                  </span>
                </div>
              </div>

              {previewSpkDoc.verificationNotes && (
                <div className="pt-2 border-t border-slate-200 text-slate-600 text-[11px]">
                  <strong>Catatan Divisi Keuangan:</strong> {previewSpkDoc.verificationNotes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setPreviewSpkDoc(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
