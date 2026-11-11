import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FolderKanban, 
  MapPin, 
  ScrollText, 
  Clock, 
  ChevronRight, 
  Search,
  FileText,
  X,
  CheckCircle2,
  Building2,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { SPK, Project, Site } from '../../types';
import { SiteDetailDrawer } from './SiteDetailDrawer';

export const ProjectsView: React.FC = () => {
  const { projects, sites, spks, clients, personnel, areas, setSelectedProjectId, setActiveView } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'without-spk' | 'expiring'>('all');
  const [previewSpk, setPreviewSpk] = useState<SPK | null>(null);
  const [selectedSiteModal, setSelectedSiteModal] = useState<{ site: Site; project: Project } | null>(null);
  
  // Section 7: Support ?klien=KODE filter from query URL
  const [clientFilterCode, setClientFilterCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('klien') || '';
    }
    return '';
  });

  React.useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      setClientFilterCode(params.get('klien') || '');
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const matchedClientFilter = clients.find(c => 
    c.code.toLowerCase() === clientFilterCode.toLowerCase() ||
    c.id.toLowerCase() === clientFilterCode.toLowerCase()
  );

  const clearClientFilter = () => {
    setClientFilterCode('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('klien');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }
  };
  
  // Edge Case: Multi-location accordion toggle for projects with > 2 locations
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});

  const toggleExpand = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedLocations(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Format compact Rupiah: "Rp 420 juta"
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

  // Format date readable: "1 Sep 2026"
  const formatReadableDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    return `${day} ${monthNames[month]} ${year}`;
  };

  // Clean project title: remove "PT ... —" and "Aktif ·"
  const getCleanProjectTitle = (p: Project) => {
    let name = p.name;
    if (name.includes('—')) {
      name = name.split('—')[1].trim();
    } else if (name.startsWith(p.clientName)) {
      name = name.replace(p.clientName, '').replace(/^[-–—\s]+/, '').trim();
    }
    return name.replace(/^Aktif\s*·\s*/i, '').trim() || 'Pengamanan Fasilitas Lapangan';
  };

  // Project Issue Badge Helper for Edge Cases (Section 7: Bekasi: SPK belum terverifikasi)
  const getProjectIssueBadge = (p: Project, linkedSPKs: SPK[], linkedSites: Site[]) => {
    if (p.isJalanTanpaSPK) {
      const uncontractedSite = linkedSites.find(s => s.name.toLowerCase().includes('bekasi') || s.name.toLowerCase().includes('cikarang')) || linkedSites[0];
      const locName = uncontractedSite?.name.includes('Bekasi') ? 'Bekasi' : uncontractedSite?.name.includes('Cikarang') ? 'Cikarang' : 'Pos';
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
          🔴 {locName}: SPK belum terverifikasi · {p.daysOperatingWithoutSPK} hari
        </span>
      );
    }

    const expiringSpk = linkedSPKs.find(s => s.isExpiringSoon || (s.daysToExpiration && s.daysToExpiration <= 60));
    if (expiringSpk && expiringSpk.daysToExpiration) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Berakhir dalam {expiringSpk.daysToExpiration} hari
        </span>
      );
    }

    if (p.status === 'Mobilizing') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg">
          🟡 Tahap Persiapan
        </span>
      );
    }

    return null;
  };

  // Filter projects with sorting: issue projects first
  const filteredProjects = [...projects]
    .sort((a, b) => {
      const aIssue = a.isJalanTanpaSPK || spks.some(s => a.spkIds.includes(s.id) && (s.isExpiringSoon || s.verificationStatus === 'Pending Verification'));
      const bIssue = b.isJalanTanpaSPK || spks.some(s => b.spkIds.includes(s.id) && (s.isExpiringSoon || s.verificationStatus === 'Pending Verification'));
      if (aIssue && !bIssue) return -1;
      if (!aIssue && bIssue) return 1;
      return 0;
    })
    .filter((p) => {
      const linkedSites = sites.filter(s => p.siteIds.includes(s.id));
      const linkedSPKs = spks.filter(s => p.spkIds.includes(s.id));

      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        linkedSites.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const isExpiring = linkedSPKs.some(s => s.isExpiringSoon || (s.daysToExpiration && s.daysToExpiration <= 60));

      if (matchedClientFilter && p.clientId !== matchedClientFilter.id) return false;
      if (!matchesSearch) return false;
      if (statusFilter === 'without-spk') return p.isJalanTanpaSPK;
      if (statusFilter === 'expiring') return isExpiring;
      return true;
    });

  const withoutSpkCount = projects.filter(p => p.isJalanTanpaSPK).length;
  const expiringCount = projects.filter(p => {
    const linkedSPKs = spks.filter(s => p.spkIds.includes(s.id));
    return linkedSPKs.some(s => s.isExpiringSoon || (s.daysToExpiration && s.daysToExpiration <= 60));
  }).length;

  const handleOpenProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveView('project-detail', id);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* 1. Header (P11: Satu nama "Daftar Proyek", P12: Subjudul ringkas) */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Daftar Proyek
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Daftar proyek pengamanan yang sedang berjalan beserta lokasi jaga dan kontraknya.
        </p>
      </div>

      {/* 2. Controls: Filter Bar & Search Input with Clear Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({projects.length})
          </button>
          <button
            onClick={() => setStatusFilter('without-spk')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'without-spk'
                ? 'bg-white text-rose-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tanpa SPK ({withoutSpkCount})
          </button>
          <button
            onClick={() => setStatusFilter('expiring')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'expiring'
                ? 'bg-white text-amber-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Akan Berakhir ({expiringCount})
          </button>
        </div>

        {/* Search Input with Clear (X) Button */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari proyek, klien, atau lokasi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            aria-label="Cari daftar proyek"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Hapus kata kunci pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chip: Section 7 ?klien=KODE */}
      {matchedClientFilter && (
        <div className="flex items-center gap-2 px-1">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-xs font-semibold">
            <span>Klien: <strong>{matchedClientFilter.name}</strong></span>
            <button
              onClick={clearClientFilter}
              className="p-0.5 hover:bg-indigo-100 rounded text-indigo-600 hover:text-indigo-900 transition-colors"
              aria-label="Hapus filter klien"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Result Count Indicator */}
      {(searchTerm || statusFilter !== 'all') && (
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <span>
            Menampilkan <strong className="text-slate-900 font-bold">{filteredProjects.length}</strong> dari {projects.length} proyek
          </span>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* 3. Empty Search / Filter State (Edge Case) */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">Tidak ditemukan proyek yang cocok</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ada proyek yang sesuai dengan kriteria filter atau kata kunci &ldquo;{searchTerm}&rdquo;.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors inline-block"
          >
            Tampilkan Semua Proyek
          </button>
        </div>
      ) : (
        /* 4. Projects Cards Grid */
        <div className="space-y-4">
          {filteredProjects.map((proj) => {
            const linkedSites = sites.filter(s => proj.siteIds.includes(s.id));
            const linkedSPKs = spks.filter(s => proj.spkIds.includes(s.id));

            // Calculate total contract value for top of card (P7)
            const totalContractValue = linkedSPKs.reduce((acc, s) => acc + s.contractValueRp, 0);

            // Find start and end date for formatted period (P14)
            const startDate = proj.targetStartDate;
            const endDate = proj.projectEndDate || (linkedSPKs.length > 0 ? linkedSPKs[linkedSPKs.length - 1].contractEnd : '');
            const periodText = `Periode Kontrak: ${formatReadableDate(startDate)} – ${formatReadableDate(endDate)}`;

            const issueBadge = getProjectIssueBadge(proj, linkedSPKs, linkedSites);

            // Edge Case: If a project has > 2 locations (e.g. BSM has 4), collapse by default to maintain compact height
            const isExpanded = !!expandedLocations[proj.id];
            const hasManyLocations = linkedSites.length > 2;
            const visibleSites = hasManyLocations && !isExpanded ? linkedSites.slice(0, 2) : linkedSites;

            return (
              <div
                key={proj.id}
                onClick={() => handleOpenProject(proj.id)}
                className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group"
              >
                {/* Header Kartu: Klien, Kode, Judul, Nilai Kontrak, Badge Masalah */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {proj.projectCode}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {proj.clientName}
                      </span>
                      {totalContractValue > 0 && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                            Nilai Kontrak: {formatCompactRupiah(totalContractValue)}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {getCleanProjectTitle(proj)}
                    </h3>

                    <div className="text-xs text-slate-500 font-medium">
                      {periodText}
                    </div>
                  </div>

                  {/* Badge Masalah Spesifik di Kanan Atas */}
                  {issueBadge && (
                    <div className="flex items-center gap-2 shrink-0">
                      {issueBadge}
                    </div>
                  )}
                </div>

                {/* 1 Tabel Terpadu per Lokasi */}
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/40">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600">
                        <th className="px-4 py-2.5">Lokasi Jaga</th>
                        <th className="px-4 py-2.5">Petugas</th>
                        <th className="px-4 py-2.5">Kontrak (SPK)</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 bg-white">
                      {visibleSites.map((site) => {
                        const siteSpk = linkedSPKs.find(s => s.siteIds.includes(site.id)) || linkedSPKs[0];
                        const isUncontractedSite = proj.isJalanTanpaSPK && (site.name.toLowerCase().includes('bekasi') || site.name.toLowerCase().includes('cikarang'));

                        const cleanSpkNum = siteSpk?.spkNumber.replace(/-DRAFT$/i, '');
                        const isDraft = siteSpk?.spkNumber.includes('DRAFT') || siteSpk?.verificationStatus === 'Pending Verification';

                        return (
                          <tr 
                            key={site.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSiteModal({ site, project: proj });
                            }}
                            className="hover:bg-indigo-50/70 transition-colors cursor-pointer group/row"
                            title="Klik untuk melihat detail lengkap lokasi jaga ini"
                          >
                            {/* Lokasi */}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-between gap-1">
                                <div>
                                  <span className="font-bold text-slate-900 block text-xs group-hover/row:text-indigo-600 transition-colors">
                                    {site.name}
                                  </span>
                                  <span className="text-[11px] text-slate-500 block">
                                    {site.areaName}
                                  </span>
                                </div>
                                <span className="text-[10px] text-indigo-600 font-semibold opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                  Rincian ›
                                </span>
                              </div>
                            </td>

                            {/* Petugas: Angka lugas */}
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-800 text-xs">
                                {site.assignedPersonnel} petugas
                              </span>
                              {!site.startGuardConfirmed && (
                                <span className="block text-[10px] font-semibold text-amber-700 mt-0.5">
                                  Tahap Persiapan
                                </span>
                              )}
                            </td>

                            {/* Kontrak (SPK) */}
                            <td className="px-4 py-3">
                              {siteSpk ? (
                                <div className="space-y-0.5">
                                  {siteSpk.verificationStatus === 'Verified' ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewSpk(siteSpk);
                                      }}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline inline-flex items-center gap-1 text-left"
                                      title="Klik untuk membuka pratinjau berkas SPK"
                                    >
                                      📄 {siteSpk.spkDocumentName}
                                    </button>
                                  ) : (
                                    <div className="text-xs text-slate-800 font-medium flex items-center gap-1.5">
                                      <span className="font-mono font-semibold">{cleanSpkNum}</span>
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded">
                                        Draf
                                      </span>
                                    </div>
                                  )}
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    {formatCompactRupiah(siteSpk.contractValueRp)} · Berakhir: {formatReadableDate(siteSpk.contractEnd)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Belum ada dokumen</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 text-right">
                              {isUncontractedSite ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                  Belum terverifikasi · {proj.daysOperatingWithoutSPK} hari
                                </span>
                              ) : siteSpk?.verificationStatus === 'Verified' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Terverifikasi
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                  Menunggu Verifikasi
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Edge Case Toggle: Accordion button when a project has > 2 locations */}
                  {hasManyLocations && (
                    <div className="p-2 bg-slate-50 border-t border-slate-200/80 text-center">
                      <button
                        onClick={(e) => toggleExpand(proj.id, e)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-white transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <span>Sembunyikan lokasi</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>+ {linkedSites.length - 2} lokasi lainnya</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Bar Bawah */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="text-xs text-slate-600">
                    Total: <strong className="text-slate-900 font-bold">{proj.totalAssignedPersonnel} petugas</strong> di {linkedSites.length} lokasi jaga
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof window !== 'undefined') {
                          window.history.pushState(null, '', `/kontrak?q=${encodeURIComponent(proj.projectCode)}`);
                        }
                        setActiveView('kontrak');
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                      title="Lihat dokumen SPK untuk proyek ini"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Lihat SPK</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProject(proj.id);
                      }}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 group-hover:border-slate-400"
                    >
                      <span>Lihat Detail</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-App Document Preview Modal */}
      {previewSpk && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spk-preview-title"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="spk-preview-title" className="font-bold text-slate-900 text-base">
                    Pratinjau Berkas Kontrak Resmi (SPK)
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {previewSpk.spkDocumentName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewSpk(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                aria-label="Tutup pratinjau dokumen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 uppercase text-[10px] font-semibold block">Nomor Kontrak</span>
                  <strong className="text-slate-900 font-mono text-xs">{previewSpk.spkNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500 uppercase text-[10px] font-semibold block">Klien Mitra</span>
                  <strong className="text-slate-900 text-xs">{previewSpk.clientName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 uppercase text-[10px] font-semibold block">Nilai Kontrak Tahunan</span>
                  <strong className="text-slate-900 text-xs">{formatCompactRupiah(previewSpk.contractValueRp)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 uppercase text-[10px] font-semibold block">Kuota Petugas</span>
                  <strong className="text-slate-900 text-xs">{previewSpk.personnelQuota} Petugas</strong>
                </div>
                <div>
                  <span className="text-slate-500 uppercase text-[10px] font-semibold block">Periode Kontrak</span>
                  <strong className="text-slate-900 text-xs">{formatReadableDate(previewSpk.contractStart)} s/d {formatReadableDate(previewSpk.contractEnd)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 uppercase text-[10px] font-semibold block">Status Verifikasi</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi Keuangan
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-slate-600 text-[11px] italic">
                {previewSpk.verificationNotes || 'Dokumen telah diverifikasi dan dicocokkan dengan FPK rujukan.'}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPreviewSpk(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side Modal Sheet: Detail Lokasi Jaga (Security, Dokumen, Operasional) */}
      {selectedSiteModal && (
        <SiteDetailDrawer
          site={selectedSiteModal.site}
          project={selectedSiteModal.project}
          linkedSPKs={spks.filter(s => selectedSiteModal.project.spkIds.includes(s.id))}
          areas={areas}
          allPersonnel={personnel}
          onClose={() => setSelectedSiteModal(null)}
          onPreviewSpk={(spk) => setPreviewSpk(spk)}
        />
      )}

    </div>
  );
};
