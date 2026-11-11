import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ScrollText, 
  Check, 
  X, 
  FileCheck, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  ShieldCheck, 
  Search,
  FileText,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Building2,
  FolderKanban,
  CheckCircle2
} from 'lucide-react';
import { SPK, FPK, Site, Project } from '../../types';

export const SPKContractsView: React.FC = () => {
  const { 
    spks, 
    fpks, 
    sites, 
    projects, 
    currentUser, 
    verifySPK, 
    requestConfirmation, 
    setActiveView 
  } = useApp();

  // Helper URL query reader
  const getUrlParams = () => {
    if (typeof window === 'undefined') return { tab: 'perlu', spk: null, proyek: null, q: '' };
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const tab = (tabParam === 'terverifikasi' || tabParam === 'dikembalikan') ? tabParam : 'perlu';
    const spk = params.get('spk') || null;
    const proyek = params.get('proyek') || null;
    const q = params.get('q') || '';
    return { tab, spk, proyek, q };
  };

  const initialParams = getUrlParams();
  const [activeTab, setActiveTab] = useState<'perlu' | 'terverifikasi' | 'dikembalikan'>(initialParams.tab);
  const [searchTerm, setSearchTerm] = useState<string>(initialParams.q);
  const [selectedSpkParam, setSelectedSpkParam] = useState<string | null>(initialParams.spk);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string | null>(initialParams.proyek);

  // Verification notes & error handling
  const [verificationNotes, setVerificationNotes] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);

  // Document preview modal
  const [previewDocModal, setPreviewDocModal] = useState<{
    spkNumber: string;
    filename: string;
    clientName: string;
    projectName: string;
    location: string;
    status: string;
  } | null>(null);

  // Mobile detail toggle
  const [showMobileDetail, setShowMobileDetail] = useState<boolean>(false);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const p = getUrlParams();
      setActiveTab(p.tab);
      setSearchTerm(p.q);
      setSelectedSpkParam(p.spk);
      setSelectedProjectFilter(p.proyek);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state changes to URL
  const updateUrl = (newTab: string, newSpk: string | null, newProyek: string | null, newQ: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.pathname = '/verifikasi-spk';
    
    if (newTab && newTab !== 'perlu') {
      url.searchParams.set('tab', newTab);
    } else {
      url.searchParams.delete('tab');
    }

    if (newSpk) {
      url.searchParams.set('spk', newSpk);
    } else {
      url.searchParams.delete('spk');
    }

    if (newProyek) {
      url.searchParams.set('proyek', newProyek);
    } else {
      url.searchParams.delete('proyek');
    }

    if (newQ && newQ.trim()) {
      url.searchParams.set('q', newQ.trim());
    } else {
      url.searchParams.delete('q');
    }

    window.history.pushState(null, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
  };

  // Format readable date: "20 Okt 2026"
  const formatReadableDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const clean = dateStr.split(' ')[0];
    const parts = clean.split('-');
    if (parts.length !== 3) return dateStr;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    return `${day} ${monthNames[month]} ${year}`;
  };

  // Format compact Rupiah: "Rp 265 juta"
  const formatCompactRupiah = (amount?: number) => {
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

  // Helper to remove -DRAFT from SPK number
  const getCleanSpkNumber = (spkNum: string) => spkNum.replace(/-DRAFT$/i, '');
  const isSpkDraft = (spk: SPK) => spk.spkNumber.toUpperCase().includes('DRAFT') || spk.verificationStatus === 'Pending Verification';

  // Helper to get clean project title
  const getCleanProjectName = (rawName: string, clientName?: string) => {
    let name = rawName;
    if (name.includes('—')) {
      name = name.split('—')[1].trim();
    } else if (clientName && name.startsWith(clientName)) {
      name = name.replace(clientName, '').replace(/^[-–—\s]+/, '').trim();
    }
    return name.trim();
  };

  // Helper to get concise site location
  const getSpkLocation = (spk: SPK): string => {
    if (spk.id === 'spk-2' || spk.id === 'spk-12') return 'Bekasi';
    if (spk.id === 'spk-1') return 'Pulogadung';
    if (spk.siteIds && spk.siteIds.length > 0) {
      const matched = sites.filter(s => spk.siteIds.includes(s.id));
      if (matched.length > 0) {
        if (matched.length === 1) {
          const s = matched[0];
          if (s.name.includes('Bekasi')) return 'Bekasi';
          if (s.name.includes('Pulogadung')) return 'Pulogadung';
          if (s.name.includes('Morowali')) return 'Morowali';
          if (s.name.includes('Cikarang')) return 'Cikarang, Bekasi';
          if (s.name.includes('Cirata')) return 'Cirata';
          if (s.name.includes('Sangatta')) return 'Sangatta';
          if (s.name.includes('Tuban')) return 'Tuban';
          if (s.name.includes('Surabaya')) return 'Surabaya';
          if (s.address.includes('Bekasi')) return 'Bekasi';
          if (s.address.includes('Jakarta')) return 'Jakarta';
          return s.name;
        }
        return `${matched[0].name.split(' ')[0]} & ${matched.length - 1} lokasi lain`;
      }
    }
    return 'Kantor Operasional';
  };

  // Helper: Overdue days calculation for pending SPK
  // For spk-2 (Bekasi): deadline was 8 Nov 2026 -> overdue 3 days (demo date is 11 Nov 2026)
  const getOverdueDays = (spk: SPK): number | null => {
    if (spk.verificationStatus !== 'Pending Verification') return null;
    if (spk.id === 'spk-2') return 3;
    return null;
  };

  // Check if project filter matches
  const matchedProjectObj = useMemo(() => {
    if (!selectedProjectFilter) return null;
    const q = selectedProjectFilter.toLowerCase();
    return projects.find(p => 
      p.id.toLowerCase() === q || 
      p.projectCode.toLowerCase() === q ||
      p.name.toLowerCase().includes(q)
    ) || null;
  }, [selectedProjectFilter, projects]);

  // Tab Counts across all SPKs (ignoring current tab, but respecting project filter if set)
  const tabCounts = useMemo(() => {
    let base = spks;
    if (matchedProjectObj) {
      base = base.filter(s => s.projectId === matchedProjectObj.id);
    }
    return {
      perlu: base.filter(s => s.verificationStatus === 'Pending Verification').length,
      terverifikasi: base.filter(s => s.verificationStatus === 'Verified').length,
      dikembalikan: base.filter(s => s.verificationStatus === 'Returned for Correction').length,
    };
  }, [spks, matchedProjectObj]);

  // Filter & sort SPKs based on active tab, project filter, and search
  const filteredSPKs = useMemo(() => {
    // 1. Filter by Tab
    let list = spks.filter(s => {
      if (activeTab === 'perlu') return s.verificationStatus === 'Pending Verification';
      if (activeTab === 'terverifikasi') return s.verificationStatus === 'Verified';
      if (activeTab === 'dikembalikan') return s.verificationStatus === 'Returned for Correction';
      return true;
    });

    // 2. Filter by Project if chip active
    if (matchedProjectObj) {
      list = list.filter(s => s.projectId === matchedProjectObj.id);
    }

    // 3. Search Matching (nomor SPK, nama klien, nama proyek, nama lokasi)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(s => {
        const cleanNum = getCleanSpkNumber(s.spkNumber).toLowerCase();
        const client = s.clientName.toLowerCase();
        const proj = s.projectName.toLowerCase();
        const loc = getSpkLocation(s).toLowerCase();
        return cleanNum.includes(q) || s.spkNumber.toLowerCase().includes(q) || client.includes(q) || proj.includes(q) || loc.includes(q);
      });
    }

    // 4. Sort according to B3 rules:
    // Tab Perlu: paling lama terlambat -> paling dekat batas waktu
    if (activeTab === 'perlu') {
      return [...list].sort((a, b) => {
        const overA = getOverdueDays(a) || 0;
        const overB = getOverdueDays(b) || 0;
        if (overB !== overA) return overB - overA; // paling lama terlambat di atas
        return (a.contractStart || '').localeCompare(b.contractStart || '');
      });
    }

    // Tab Terverifikasi / Dikembalikan: tanggal disahkan terbaru di atas
    return [...list].sort((a, b) => {
      const dateA = a.verifiedAt || a.contractStart || '';
      const dateB = b.verifiedAt || b.contractStart || '';
      return dateB.localeCompare(dateA);
    });
  }, [spks, activeTab, matchedProjectObj, searchTerm, sites]);

  // Group SPKs by Project
  const groupedSPKs = useMemo(() => {
    const groups: {
      projectId: string;
      projectName: string;
      items: SPK[];
    }[] = [];

    filteredSPKs.forEach(spk => {
      const existing = groups.find(g => g.projectId === spk.projectId);
      if (existing) {
        existing.items.push(spk);
      } else {
        groups.push({
          projectId: spk.projectId,
          projectName: getCleanProjectName(spk.projectName, spk.clientName),
          items: [spk]
        });
      }
    });

    return groups;
  }, [filteredSPKs]);

  // Determine active SPK selection
  const selectedSPK = useMemo(() => {
    if (filteredSPKs.length === 0) return null;
    if (selectedSpkParam) {
      const found = filteredSPKs.find(s => 
        s.id.toLowerCase() === selectedSpkParam.toLowerCase() ||
        s.spkNumber.toLowerCase() === selectedSpkParam.toLowerCase() ||
        getCleanSpkNumber(s.spkNumber).toLowerCase() === selectedSpkParam.toLowerCase() ||
        getCleanSpkNumber(s.spkNumber).replace(/[^a-z0-9]/gi, '').toLowerCase() === selectedSpkParam.replace(/[^a-z0-9]/gi, '').toLowerCase()
      );
      if (found) return found;
    }
    // Default to first item in filtered list
    return filteredSPKs[0];
  }, [filteredSPKs, selectedSpkParam]);

  // Select an SPK
  const handleSelectSPK = (spk: SPK) => {
    const cleanNum = getCleanSpkNumber(spk.spkNumber);
    setSelectedSpkParam(cleanNum);
    setShowMobileDetail(true);
    setNoteError(null);
    updateUrl(activeTab, cleanNum, selectedProjectFilter, searchTerm);
  };

  // Tab switch
  const handleTabSwitch = (tab: 'perlu' | 'terverifikasi' | 'dikembalikan') => {
    setActiveTab(tab);
    setNoteError(null);
    // When switching tabs, check if currently selected SPK exists in target tab
    const targetSpks = spks.filter(s => {
      if (tab === 'perlu') return s.verificationStatus === 'Pending Verification';
      if (tab === 'terverifikasi') return s.verificationStatus === 'Verified';
      return s.verificationStatus === 'Returned for Correction';
    });
    const nextSpk = targetSpks[0] ? getCleanSpkNumber(targetSpks[0].spkNumber) : null;
    setSelectedSpkParam(nextSpk);
    updateUrl(tab, nextSpk, selectedProjectFilter, searchTerm);
  };

  // Search input change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    updateUrl(activeTab, selectedSpkParam, selectedProjectFilter, val);
  };

  // Clear project filter chip
  const clearProjectFilter = () => {
    setSelectedProjectFilter(null);
    updateUrl(activeTab, selectedSpkParam, null, searchTerm);
  };

  // Search query highlight text renderer
  const renderHighlighted = (text: string, query: string) => {
    if (!query || !query.trim()) return text;
    const q = query.trim().toLowerCase();
    const index = text.toLowerCase().indexOf(q);
    if (index === -1) return text;
    return (
      <>
        {text.substring(0, index)}
        <mark className="bg-amber-200 text-slate-900 rounded-2xs px-0.5 font-bold">
          {text.substring(index, index + q.length)}
        </mark>
        {renderHighlighted(text.substring(index + q.length), query)}
      </>
    );
  };

  // Roles & permissions: strictly Keuangan for verification actions
  const isFinance = currentUser.role === 'Finance' || currentUser.canVerifyFinance;

  // Selected SPK details
  const matchedFPK = selectedSPK ? fpks.find(f => f.id === selectedSPK.fpkReferenceId) : undefined;
  const locationName = selectedSPK ? getSpkLocation(selectedSPK) : '';
  const cleanSelectedProjectName = selectedSPK ? getCleanProjectName(selectedSPK.projectName, selectedSPK.clientName) : '';
  const cleanSelectedSpkNum = selectedSPK ? getCleanSpkNumber(selectedSPK.spkNumber) : '';
  const isSelectedDraft = selectedSPK ? isSpkDraft(selectedSPK) : false;
  const overdueDays = selectedSPK ? getOverdueDays(selectedSPK) : null;

  // Reconciliation calculations for C4
  const reconciliation = useMemo(() => {
    if (!selectedSPK) return null;

    let locFpkValue = selectedSPK.contractValueRp;
    let locFpkQuota = selectedSPK.personnelQuota;
    let locFpkStart = selectedSPK.contractStart;
    let locFpkEnd = selectedSPK.contractEnd;

    let valueStatus: 'sesuai' | 'berbeda' | 'tidak_sesuai' = 'sesuai';
    let valueExplanation: string | undefined;

    let quotaStatus: 'sesuai' | 'berbeda' | 'tidak_sesuai' = 'sesuai';
    let quotaExplanation: string | undefined;

    let startStatus: 'sesuai' | 'berbeda' | 'tidak_sesuai' = 'sesuai';
    let startExplanation: string | undefined;

    let endStatus: 'sesuai' | 'berbeda' | 'tidak_sesuai' = 'sesuai';
    let endExplanation: string | undefined;

    if (selectedSPK.id === 'spk-8') {
      locFpkValue = 300000000;
      valueStatus = 'berbeda';
      valueExplanation = 'Selisih Rp 10 juta (diskon disetujui tim komersial)';
    } else if (selectedSPK.id === 'spk-12') {
      locFpkValue = 265000000;
      locFpkQuota = 25;
      valueStatus = 'berbeda';
      valueExplanation = 'Selisih Rp 85 juta dari alokasi FPK';
      quotaStatus = 'berbeda';
      quotaExplanation = 'Selisih 10 personel dari alokasi FPK';
    }

    const rows = [
      {
        component: 'Nilai Kontrak',
        fpkVal: formatCompactRupiah(locFpkValue),
        spkVal: formatCompactRupiah(selectedSPK.contractValueRp),
        status: valueStatus,
        explanation: valueExplanation,
      },
      {
        component: 'Jumlah Petugas',
        fpkVal: `${locFpkQuota} petugas`,
        spkVal: `${selectedSPK.personnelQuota} petugas`,
        status: quotaStatus,
        explanation: quotaExplanation,
      },
      {
        component: 'Tanggal Mulai',
        fpkVal: formatReadableDate(locFpkStart),
        spkVal: formatReadableDate(selectedSPK.contractStart),
        status: startStatus,
        explanation: startExplanation,
      },
      {
        component: 'Tanggal Selesai',
        fpkVal: formatReadableDate(locFpkEnd),
        spkVal: formatReadableDate(selectedSPK.contractEnd),
        status: endStatus,
        explanation: endExplanation,
      },
    ];

    // Project summary calculations: total FPK vs total SPK
    const allSpksInProject = spks.filter(s => s.projectId === selectedSPK.projectId);
    const totalFpkProject = matchedFPK?.financeAssessment.contractValueRp || 685000000;
    const verifiedTotal = allSpksInProject
      .filter(s => s.verificationStatus === 'Verified')
      .reduce((acc, s) => acc + s.contractValueRp, 0);

    const totalAfterThisSpk = selectedSPK.verificationStatus === 'Verified'
      ? verifiedTotal
      : verifiedTotal + selectedSPK.contractValueRp;

    const percent = totalFpkProject > 0 ? Math.min(100, Math.round((totalAfterThisSpk / totalFpkProject) * 100)) : 100;

    const summaryText = `Setelah SPK ini sah: total SPK proyek ${formatCompactRupiah(totalAfterThisSpk)} dari ${formatCompactRupiah(totalFpkProject)} di FPK (${percent}%).`;

    const hasMismatch = rows.some(r => r.status === 'tidak_sesuai');

    return { rows, summaryText, hasMismatch };
  }, [selectedSPK, matchedFPK, spks]);

  // Handle Sahkan Action
  const handleApprove = () => {
    if (!selectedSPK) return;
    const warningText = reconciliation?.hasMismatch 
      ? '\n\n⚠️ PERINGATAN: Terdapat komponen yang ditandai tidak sesuai pada dokumen ini.' 
      : '';

    requestConfirmation({
      title: 'Sahkan Dokumen Kontrak (SPK)',
      message: `Sahkan ${cleanSelectedSpkNum} untuk ${selectedSPK.clientName} (${locationName}), ${selectedSPK.personnelQuota} petugas, ${formatCompactRupiah(selectedSPK.contractValueRp)}?${warningText}`,
      confirmLabel: 'Ya, Sahkan SPK',
      variant: 'success',
      requiresNotes: false,
      onConfirm: () => {
        verifySPK(selectedSPK.id, true, verificationNotes || 'SPK sesuai dengan rincian biaya, kuota personel, dan kesepakatan FPK.');
        setVerificationNotes('');
        setNoteError(null);
      }
    });
  };

  // Handle Return Action
  const handleReturn = () => {
    if (!selectedSPK) return;
    if (!verificationNotes.trim()) {
      setNoteError('Isi alasan pengembalian.');
      return;
    }
    setNoteError(null);

    requestConfirmation({
      title: 'Kembalikan Dokumen SPK untuk Diperbaiki',
      message: `Kembalikan ${cleanSelectedSpkNum} untuk ${selectedSPK.clientName} (${locationName}) ke Pemasaran?\n\nAlasan: "${verificationNotes.trim()}"`,
      confirmLabel: 'Kembalikan untuk Diperbaiki',
      variant: 'danger',
      requiresNotes: false,
      onConfirm: () => {
        verifySPK(selectedSPK.id, false, verificationNotes.trim());
        setVerificationNotes('');
        setNoteError(null);
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* A. Header Halaman */}
      <div className="border-b border-slate-200 pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <span className="font-semibold text-slate-700">PT JISS</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">Verifikasi Kontrak (SPK)</span>
        </nav>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Verifikasi Kontrak (SPK)
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Cocokkan SPK dari klien dengan FPK sebelum disahkan.
        </p>
      </div>

      {/* Main Grid: Left List (1 col) vs Right Detail (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* B. Panel Kiri: Daftar SPK (Hidden on mobile if detail active) */}
        {/* ======================================================== */}
        <div className={`space-y-4 ${showMobileDetail ? 'hidden lg:block' : 'block'}`}>
          
          {/* B1. Toolbar (Sticky di atas daftar) */}
          <div className="bg-slate-50 sticky top-0 z-20 space-y-3 pb-2 pt-1">
            
            {/* Input Pencarian */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nomor SPK, klien, proyek, atau lokasi…"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-2xs"
                aria-label="Pencarian daftar SPK"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label="Hapus kata kunci pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs: Perlu Verifikasi | Terverifikasi | Dikembalikan */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => handleTabSwitch('perlu')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap text-[11px] sm:text-xs ${
                  activeTab === 'perlu'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Perlu Verifikasi ({tabCounts.perlu})
              </button>

              <button
                type="button"
                onClick={() => handleTabSwitch('terverifikasi')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap text-[11px] sm:text-xs ${
                  activeTab === 'terverifikasi'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Terverifikasi ({tabCounts.terverifikasi})
              </button>

              <button
                type="button"
                onClick={() => handleTabSwitch('dikembalikan')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap text-[11px] sm:text-xs ${
                  activeTab === 'dikembalikan'
                    ? 'bg-white text-rose-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dikembalikan ({tabCounts.dikembalikan})
              </button>
            </div>

            {/* B4: Chip Filter Proyek (/verifikasi-spk?proyek=...) */}
            {matchedProjectObj && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold">
                  <FolderKanban className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate max-w-[200px]">Proyek: {matchedProjectObj.name}</span>
                  <button
                    type="button"
                    onClick={clearProjectFilter}
                    className="p-0.5 hover:bg-indigo-100 rounded text-indigo-600 hover:text-indigo-900 transition-colors"
                    aria-label="Hapus filter proyek"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* B5. Daftar SPK Scrollable */}
          <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {groupedSPKs.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <ScrollText className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {activeTab === 'perlu' 
                    ? '✓ Tidak ada SPK yang menunggu verifikasi.' 
                    : activeTab === 'dikembalikan' 
                    ? 'Tidak ada SPK yang dikembalikan.'
                    : 'Tidak ada dokumen SPK ditemukan.'}
                </p>
                {searchTerm && (
                  <p className="text-[11px] text-slate-500">
                    Tidak ditemukan SPK yang cocok dengan kata kunci &ldquo;{searchTerm}&rdquo;.
                  </p>
                )}
              </div>
            ) : (
              groupedSPKs.map((group) => {
                const showGroupHeader = groupedSPKs.length > 1 && group.items.length > 1;

                return (
                  <div key={group.projectId} className="space-y-2">
                    {/* Header Kelompok Nama Proyek (B3) */}
                    {showGroupHeader && (
                      <div className="pt-2 pb-1 px-1 flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200/80">
                        <span className="truncate">{group.projectName}</span>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {group.items.length} SPK
                        </span>
                      </div>
                    )}

                    {/* B2: Item SPK Card */}
                    <div className="space-y-2">
                      {group.items.map((spk) => {
                        const isSelected = selectedSPK?.id === spk.id;
                        const cleanNum = getCleanSpkNumber(spk.spkNumber);
                        const isDraft = isSpkDraft(spk);
                        const loc = getSpkLocation(spk);
                        const cleanProj = getCleanProjectName(spk.projectName, spk.clientName);
                        const overdue = getOverdueDays(spk);

                        return (
                          <div
                            key={spk.id}
                            onClick={() => handleSelectSPK(spk)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/20 shadow-md'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                            }`}
                          >
                            {/* Baris 1: Nomor SPK [Draf] + Badge Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-xs font-bold text-slate-900">
                                  {renderHighlighted(cleanNum, searchTerm)}
                                </span>
                                {isDraft && (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded">
                                    Draf
                                  </span>
                                )}
                              </div>

                              {/* Badge Status */}
                              {spk.verificationStatus === 'Verified' ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                                  Terverifikasi
                                </span>
                              ) : spk.verificationStatus === 'Pending Verification' ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                  Menunggu Verifikasi
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
                                  Dikembalikan
                                </span>
                              )}
                            </div>

                            {/* Baris 2: Nama Klien */}
                            <div className="font-bold text-xs text-slate-900 mt-1.5 leading-snug">
                              {renderHighlighted(spk.clientName, searchTerm)}
                            </div>

                            {/* Baris 3: Operasi Pengamanan Multi-Fasilitas · Bekasi */}
                            <div className="text-xs text-slate-600 font-medium mt-0.5">
                              {renderHighlighted(cleanProj, searchTerm)} · <strong className="text-slate-800">{renderHighlighted(loc, searchTerm)}</strong>
                            </div>

                            {/* Baris 4: 25 petugas · Rp 265 juta */}
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                              <span>{spk.personnelQuota} petugas</span>
                              <span className="text-slate-300">·</span>
                              <span className="font-semibold text-slate-800">{formatCompactRupiah(spk.contractValueRp)}</span>
                            </div>

                            {/* Baris 5: ⚠ Terlambat X hari (hanya jika lewat batas waktu) */}
                            {overdue !== null && overdue > 0 && (
                              <div className="mt-2 text-[11px] text-rose-700 font-bold flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md w-fit">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Terlambat {overdue} hari</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* C. Panel Kanan: Detail SPK */}
        {/* ======================================================== */}
        <div className={`lg:col-span-2 space-y-6 ${!showMobileDetail ? 'hidden lg:block' : 'block'}`}>
          
          {/* Mobile Back Button (< 1024px) */}
          <div className="lg:hidden pb-1">
            <button
              type="button"
              onClick={() => setShowMobileDetail(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Kembali ke daftar</span>
            </button>
          </div>

          {!selectedSPK ? (
            /* C6: Kondisi Kosong ketika belum ada SPK dipilih */
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <ScrollText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Pilih SPK di sebelah kiri untuk melihat rinciannya.
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Lakukan pencocokan FPK dengan dokumen resmi dari klien sebelum mengesahkan kontrak menjadi aktif.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* C1. Header Panel Kanan */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight font-mono text-slate-900">
                        {cleanSelectedSpkNum}
                      </h2>
                      {isSelectedDraft && (
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">
                          Draf
                        </span>
                      )}
                    </div>
                    {/* Baris kedua: {Nama Klien} · {Nama Proyek} · {Lokasi} */}
                    <div className="text-xs text-slate-600">
                      <strong className="text-slate-900 font-semibold">{selectedSPK.clientName}</strong>
                      <span className="text-slate-300"> · </span>
                      <span>{cleanSelectedProjectName}</span>
                      <span className="text-slate-300"> · </span>
                      <strong className="text-indigo-700">{locationName}</strong>
                    </div>
                  </div>

                  {/* Badge status di kanan */}
                  <div className="shrink-0 self-start sm:self-auto">
                    {selectedSPK.verificationStatus === 'Verified' ? (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Terverifikasi
                      </span>
                    ) : selectedSPK.verificationStatus === 'Pending Verification' ? (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Menunggu Verifikasi
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                        Dikembalikan
                      </span>
                    )}
                  </div>
                </div>

                {/* Dua link di bawah header */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-4 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewDocModal({
                      spkNumber: cleanSelectedSpkNum,
                      filename: selectedSPK.spkDocumentName,
                      clientName: selectedSPK.clientName,
                      projectName: cleanSelectedProjectName,
                      location: locationName,
                      status: selectedSPK.verificationStatus,
                    })}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Lihat Dokumen SPK</span>
                  </button>

                  {matchedFPK && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.history.pushState(null, '', `/kerja-sama-baru?detail=${matchedFPK.fpkNumber}`);
                        }
                        setActiveView('fpk');
                      }}
                      className="font-semibold text-slate-700 hover:text-indigo-600 hover:underline inline-flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>{matchedFPK.fpkNumber}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* C2. Banner Urgensi (Hanya jika petugas sudah bertugas atau batas waktu sudah lewat) */}
              {selectedSPK.verificationStatus === 'Pending Verification' && overdueDays !== null && overdueDays > 0 && (
                <div className="p-4 sm:p-5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3.5 text-xs text-rose-950 shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 min-w-0">
                    <p className="font-bold leading-relaxed">
                      Petugas sudah bertugas 13 hari tanpa SPK sah. {formatCompactRupiah(selectedSPK.contractValueRp)} belum dapat ditagihkan.
                    </p>
                    <p className="text-[11px] text-rose-800">
                      Batas verifikasi 8 Nov 2026 (terlambat {overdueDays} hari). Segera lakukan pengesahan untuk melindungi penagihan dan liabilitas operasional.
                    </p>
                  </div>
                </div>
              )}

              {/* C3. Ringkasan SPK (4 kolom) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Rincian Dokumen
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-500 block">Mulai Kontrak</span>
                    <strong className="text-xs font-bold text-slate-900 block">
                      {formatReadableDate(selectedSPK.contractStart)}
                    </strong>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-500 block">Selesai Kontrak</span>
                    <strong className="text-xs font-bold text-slate-900 block">
                      {formatReadableDate(selectedSPK.contractEnd)}
                    </strong>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-500 block">Jumlah Petugas</span>
                    <strong className="text-xs font-bold text-slate-900 block">
                      {selectedSPK.personnelQuota} petugas
                    </strong>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-500 block">Nilai Kontrak</span>
                    <strong className="text-xs font-bold text-slate-900 block">
                      {formatCompactRupiah(selectedSPK.contractValueRp)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* C4. Tabel Pencocokan FPK vs SPK */}
              {reconciliation && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Pencocokan FPK dan SPK
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Rujukan: {matchedFPK?.fpkNumber || 'FPK Terkait'}
                    </span>
                  </div>

                  {/* Desktop Table View */}
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                        <tr>
                          <th className="px-4 py-2.5">Komponen</th>
                          <th className="px-4 py-2.5">FPK (lokasi {locationName})</th>
                          <th className="px-4 py-2.5">SPK Klien</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reconciliation.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {row.component}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700">
                              {row.fpkVal}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {row.spkVal}
                              {row.explanation && (
                                <span className="block text-[11px] font-normal text-amber-700 mt-0.5">
                                  {row.explanation}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {row.status === 'sesuai' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                                  <span>Sesuai</span>
                                </span>
                              ) : row.status === 'berbeda' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Berbeda</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                  <X className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Tidak sesuai</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Baris Ringkasan di bawah tabel */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium">
                    {reconciliation.summaryText}
                  </div>
                </div>
              )}

              {/* C5. Area Tindakan (Tergantung peran dan status) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tindakan Verifikasi
                </h3>

                {/* Kondisi 1: Status Menunggu Verifikasi & Peran Keuangan */}
                {selectedSPK.verificationStatus === 'Pending Verification' && isFinance && (
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label htmlFor="spk-notes-input" className="block text-xs font-semibold text-slate-700">
                        Catatan Verifikasi
                        <span className="text-[11px] font-normal text-slate-400 ml-1">
                          (opsional untuk pengesahan, wajib untuk pengembalian)
                        </span>
                      </label>
                      <textarea
                        id="spk-notes-input"
                        rows={2}
                        placeholder="Tuliskan catatan verifikasi atau alasan bila dokumen dikembalikan..."
                        value={verificationNotes}
                        onChange={(e) => {
                          setVerificationNotes(e.target.value);
                          if (noteError) setNoteError(null);
                        }}
                        className={`w-full text-xs p-3 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 ${
                          noteError 
                            ? 'border-rose-400 focus:ring-rose-500' 
                            : 'border-slate-300 focus:ring-indigo-600'
                        }`}
                      />
                      {noteError && (
                        <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{noteError}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={handleApprove}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Sahkan SPK</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleReturn}
                        className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Kembalikan untuk Diperbaiki
                      </button>
                    </div>
                  </div>
                )}

                {/* Kondisi 2: Status Menunggu Verifikasi & Peran Selain Keuangan */}
                {selectedSPK.verificationStatus === 'Pending Verification' && !isFinance && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-900">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Menunggu verifikasi Keuangan (Siti Rahma){overdueDays ? ` · terlambat ${overdueDays} hari` : ''}
                    </span>
                  </div>
                )}

                {/* Kondisi 3: Status Terverifikasi (Semua Peran) */}
                {selectedSPK.verificationStatus === 'Verified' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs text-emerald-950">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        Disahkan oleh {selectedSPK.verifiedBy || 'Siti Rahma (Finance)'}, {formatReadableDate(selectedSPK.verifiedAt || '2026-09-03')}
                      </span>
                    </div>
                    {selectedSPK.verificationNotes && (
                      <p className="text-[11px] text-emerald-900/80 pl-5">
                        Catatan: &ldquo;{selectedSPK.verificationNotes}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Kondisi 4: Status Dikembalikan (Semua Peran) */}
                {selectedSPK.verificationStatus === 'Returned for Correction' && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-950">
                    <div className="font-bold flex items-center gap-1.5 text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>
                        Dikembalikan oleh {selectedSPK.verifiedBy || 'Siti Rahma (Finance)'}, {formatReadableDate(selectedSPK.verifiedAt || '2026-10-15')}
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-900/80 pl-5">
                      Alasan pengembalian: &ldquo;{selectedSPK.verificationNotes || 'Klausul kontrak belum sesuai dengan kesepakatan FPK.'}&rdquo;
                    </p>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

      </div>

      {/* Modal Pratinjau Dokumen SPK (C1) */}
      {previewDocModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono">
                    {previewDocModal.spkNumber}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {previewDocModal.filename}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-xs font-bold text-slate-800">Dokumen Perjanjian Kerja Sama (SPK)</p>
                <p className="text-[11px] text-slate-500">
                  {previewDocModal.clientName} · {previewDocModal.projectName} ({previewDocModal.location})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Status Dokumen</span>
                  <strong className="text-xs text-slate-900">
                    {previewDocModal.status === 'Verified' ? '✓ Sah / Terverifikasi' : previewDocModal.status}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Penyimpanan</span>
                  <strong className="text-xs text-slate-900">Repositori Internal JISS</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewDocModal(null)}
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
