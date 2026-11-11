import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useContracts, SpkFormValues, SpkFormMode, FileMeta } from '../../context/ContractContext';
import {
  Kontrak, Tahap, Peran, JenisTanggapan, Dokumen, FilterTahap, BarisCocok,
  TAHAP_LABEL, HASIL_LABEL, TAHAP_PEMILIK, TAHAP_TINDAKAN, FILTER_TAHAP_LABEL, TAHAP_GROUP,
  TODAY, addDays, diffDays, fmtDate, fmtRp, isPemilik, isActionable, batasTahap, terlambatHari, sisaHariBerakhir, isMerah,
  cocokkan, userPeran,
} from './model';
import {
  ScrollText, Plus, Search, X, Check, AlertTriangle, AlertCircle, Clock,
  ChevronRight, ChevronDown, ChevronUp, FileText, ExternalLink, ShieldAlert,
  Send, RotateCcw, CheckCircle2, UserCheck, Calendar, ArrowLeft, ArrowRight,
  Info, Download, Upload, HelpCircle, FileCheck, Layers, Building2, MapPin
} from 'lucide-react';

export const ContractsView: React.FC = () => {
  const { currentUser, users, requestConfirmation, setActiveView } = useApp();
  const {
    kontrak, getKontrak, myActionCount, lokasiOptions,
    simpanSpk, sahkan, kembalikan, kirimMemoTelaah, setujuiTelaah, kembalikanMemo, setujuiMemo,
    tandaiTerkirim, catatTanggapan, putuskanEskalasi, perpanjangBatas, delegasikan,
    selesaikanDemobilisasi, kirimPengingat, unggahDokumen,
  } = useContracts();

  // ---------------------------------------------------------------------------
  // URL Query Sync
  // ---------------------------------------------------------------------------
  const getUrlParams = () => {
    if (typeof window === 'undefined') return { tab: 'tindakan', tahap: 'semua', pemilik: 'saya', q: '', spk: '' };
    const p = new URLSearchParams(window.location.search);
    const tabRaw = p.get('tab') || 'tindakan';
    const tab = (['tindakan', 'semua', 'riwayat'].includes(tabRaw) ? tabRaw : 'tindakan') as 'tindakan' | 'semua' | 'riwayat';
    const tahapRaw = p.get('tahap') || 'semua';
    const tahap = (['semua', 'belum_ada', 'verifikasi', 'perpanjangan', 'eskalasi'].includes(tahapRaw) ? tahapRaw : 'semua') as FilterTahap;
    
    // Default pemilik: BOD -> semua, peran lain -> saya
    const isBOD = currentUser.role === 'BOD' || currentUser.canApproveBOD;
    const pemilikRaw = p.get('pemilik') || (isBOD ? 'semua' : 'saya');
    const pemilik = (pemilikRaw === 'semua' ? 'semua' : 'saya') as 'saya' | 'semua';
    const q = p.get('q') || '';
    const spk = p.get('spk') || '';
    return { tab, tahap, pemilik, q, spk };
  };

  const initialParams = getUrlParams();
  const [activeTab, setActiveTab] = useState<'tindakan' | 'semua' | 'riwayat'>(initialParams.tab);
  const [filterTahap, setFilterTahap] = useState<FilterTahap>(initialParams.tahap);
  const [filterPemilik, setFilterPemilik] = useState<'saya' | 'semua'>(initialParams.pemilik);
  const [searchQuery, setSearchQuery] = useState(initialParams.q);
  const [selectedSpkId, setSelectedSpkId] = useState<string>(initialParams.spk);
  const [pageLimit, setPageLimit] = useState(25);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showSubSteps, setShowSubSteps] = useState(true);
  const [showTooltipInfo, setShowTooltipInfo] = useState(false);

  // Modals & Form Drawers
  const [formDrawer, setFormDrawer] = useState<{
    open: boolean;
    mode: SpkFormMode;
    targetId: string | null;
  }>({ open: false, mode: 'baru', targetId: null });

  const [docPreviewModal, setDocPreviewModal] = useState<{
    open: boolean;
    doc: Dokumen | null;
    kontrak: Kontrak | null;
  }>({ open: false, doc: null, kontrak: null });

  const [tanggapanModal, setTanggapanModal] = useState<boolean>(false);
  const [eskalasiModal, setEskalasiModal] = useState<'putuskan' | 'batas' | 'delegasi' | null>(null);
  const [memoModal, setMemoModal] = useState<boolean>(false);
  const [uploadModal, setUploadModal] = useState<boolean>(false);

  // Sync with browser popstate
  useEffect(() => {
    const handlePopState = () => {
      const p = getUrlParams();
      setActiveTab(p.tab);
      setFilterTahap(p.tahap);
      setFilterPemilik(p.pemilik);
      setSearchQuery(p.q);
      setSelectedSpkId(p.spk);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateUrl = (tab: string, tahap: string, pemilik: string, q: string, spk: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.pathname = '/kontrak';
    if (tab !== 'tindakan') url.searchParams.set('tab', tab); else url.searchParams.delete('tab');
    if (tahap !== 'semua') url.searchParams.set('tahap', tahap); else url.searchParams.delete('tahap');
    const isBOD = currentUser.role === 'BOD' || currentUser.canApproveBOD;
    const defaultPemilik = isBOD ? 'semua' : 'saya';
    if (pemilik !== defaultPemilik) url.searchParams.set('pemilik', pemilik); else url.searchParams.delete('pemilik');
    if (q.trim()) url.searchParams.set('q', q.trim()); else url.searchParams.delete('q');
    if (spk) url.searchParams.set('spk', spk); else url.searchParams.delete('spk');
    window.history.pushState(null, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
  };

  // ---------------------------------------------------------------------------
  // Filtering & Sorting
  // ---------------------------------------------------------------------------
  const filteredList = useMemo(() => {
    let res = [...kontrak];

    // 1. Tab filter
    if (activeTab === 'tindakan') {
      res = res.filter(k => isActionable(k));
    } else if (activeTab === 'riwayat') {
      res = res.filter(k => k.tahap === 'selesai');
    }

    // 2. Filter Tahap
    if (filterTahap !== 'semua') {
      const allowed = TAHAP_GROUP[filterTahap];
      res = res.filter(k => allowed.includes(k.tahap));
    }

    // 3. Filter Pemilik
    if (filterPemilik === 'saya' && activeTab !== 'riwayat') {
      res = res.filter(k => isPemilik(k, currentUser));
    }

    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      res = res.filter(k =>
        (k.spkNumber && k.spkNumber.toLowerCase().includes(q)) ||
        k.clientName.toLowerCase().includes(q) ||
        k.projectName.toLowerCase().includes(q) ||
        k.lokasi.toLowerCase().includes(q) ||
        k.lokasiDetail.toLowerCase().includes(q)
      );
    }

    // 5. Urutan
    if (activeTab === 'tindakan') {
      // eskalasi → terlambat (paling lama) → batas terdekat
      res.sort((a, b) => {
        const aEsk = isMerah(a) ? 1 : 0;
        const bEsk = isMerah(b) ? 1 : 0;
        if (bEsk !== aEsk) return bEsk - aEsk;

        const aTerlambat = terlambatHari(a);
        const bTerlambat = terlambatHari(b);
        if (bTerlambat !== aTerlambat) return bTerlambat - aTerlambat;

        const aBatas = batasTahap(a) || '9999-99-99';
        const bBatas = batasTahap(b) || '9999-99-99';
        return aBatas.localeCompare(bBatas);
      });
    } else if (activeTab === 'semua') {
      // Tanggal berakhir terdekat
      res.sort((a, b) => {
        const aEnd = a.berakhir || '9999-99-99';
        const bEnd = b.berakhir || '9999-99-99';
        return aEnd.localeCompare(bEnd);
      });
    } else {
      // Tab Riwayat: tanggal selesai terbaru
      res.sort((a, b) => {
        const aSel = a.selesaiPada || a.berakhir || '';
        const bSel = b.selesaiPada || b.berakhir || '';
        return bSel.localeCompare(aSel);
      });
    }

    return res;
  }, [kontrak, activeTab, filterTahap, filterPemilik, searchQuery, currentUser]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      tindakan: kontrak.filter(k => isActionable(k) && (filterPemilik === 'saya' ? isPemilik(k, currentUser) : true)).length,
      semua: kontrak.filter(k => k.tahap !== 'selesai').length,
      riwayat: kontrak.filter(k => k.tahap === 'selesai').length,
    };
  }, [kontrak, filterPemilik, currentUser]);

  // Grouped by project
  const groupedProjects = useMemo(() => {
    const map: Record<string, { projectCode: string; projectName: string; clientName: string; items: Kontrak[] }> = {};
    const visible = filteredList.slice(0, pageLimit);
    visible.forEach(k => {
      if (!map[k.projectId]) {
        map[k.projectId] = {
          projectCode: k.projectCode,
          projectName: k.projectName,
          clientName: k.clientName,
          items: [],
        };
      }
      map[k.projectId].items.push(k);
    });
    return Object.entries(map).map(([projectId, data]) => ({ projectId, ...data }));
  }, [filteredList, pageLimit]);

  // Selected SPK item
  const selectedKontrak = useMemo(() => {
    if (selectedSpkId) {
      const found = kontrak.find(k => k.id === selectedSpkId);
      if (found) return found;
    }
    return filteredList[0] || null;
  }, [kontrak, selectedSpkId, filteredList]);

  // Select an item
  const handleSelectKontrak = (k: Kontrak) => {
    setSelectedSpkId(k.id);
    setShowMobileDetail(true);
    updateUrl(activeTab, filterTahap, filterPemilik, searchQuery, k.id);
  };

  const handleNextSpk = () => {
    if (!selectedKontrak) return;
    const idx = filteredList.findIndex(k => k.id === selectedKontrak.id);
    if (idx >= 0 && idx < filteredList.length - 1) {
      handleSelectKontrak(filteredList[idx + 1]);
    }
  };

  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const isMarketing = userPeran(currentUser).includes('Pemasaran');
  const isFinance = userPeran(currentUser).includes('Keuangan');
  const isBOD = userPeran(currentUser).includes('BOD');
  const isOperasional = userPeran(currentUser).includes('Operasional');

  // Text highlighting
  const renderHighlighted = (text: string) => {
    if (!searchQuery.trim()) return text;
    const q = searchQuery.toLowerCase().trim();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-amber-200 text-slate-900 rounded-2xs px-0.5 font-bold">
          {text.slice(idx, idx + q.length)}
        </mark>
        {renderHighlighted(text.slice(idx + q.length))}
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleSahkan = (k: Kontrak) => {
    const matching = cocokkan(k) || [];
    const tidakSesuaiCount = matching.filter(r => r.status === 'tidak_sesuai').length;

    requestConfirmation({
      title: 'Sahkan Dokumen Kontrak (SPK)',
      message: `Sahkan ${k.spkNumber || 'SPK'} untuk ${k.clientName} (${k.lokasi}), ${k.kuota || 0} petugas, ${fmtRp(k.nilai)}?${
        tidakSesuaiCount > 0 ? `\n\n⚠️ PERHATIAN: Ada ${tidakSesuaiCount} data yang tidak sesuai dengan FPK.` : ''
      }`,
      confirmLabel: 'Ya, Sahkan SPK',
      variant: 'success',
      requiresNotes: tidakSesuaiCount > 0,
      notesLabel: tidakSesuaiCount > 0 ? 'Catatan Pengesahan (Wajib karena ada data tidak sesuai):' : 'Catatan Pengesahan (Opsional):',
      notesPlaceholder: 'Tuliskan catatan verifikasi...',
      onConfirm: (notes) => {
        const res = sahkan(k.id, notes || '');
        if (res.ok) handleNextSpk();
      },
    });
  };

  const handleKembalikan = (k: Kontrak) => {
    requestConfirmation({
      title: 'Kembalikan Dokumen SPK untuk Diperbaiki',
      message: `Kembalikan ${k.spkNumber || 'SPK'} untuk ${k.clientName} (${k.lokasi}) ke Tim Pemasaran?`,
      confirmLabel: 'Kembalikan SPK',
      variant: 'danger',
      requiresNotes: true,
      notesLabel: 'Alasan Pengembalian (Wajib diisi):',
      notesPlaceholder: 'Tuliskan rincian klausul atau data yang perlu diperbaiki...',
      onConfirm: (notes) => {
        if (!notes || !notes.trim()) return;
        const res = kembalikan(k.id, notes.trim());
        if (res.ok) handleNextSpk();
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* 3.1 Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">PT JISS</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-900">Kontrak (SPK)</span>
          </nav>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Kontrak (SPK)
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Kelola verifikasi dan masa berlaku SPK setiap lokasi.
          </p>
        </div>

        {/* Tombol + Input SPK (hanya peran Pemasaran) */}
        {isMarketing && (
          <button
            type="button"
            onClick={() => setFormDrawer({ open: true, mode: 'baru', targetId: null })}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Input SPK</span>
          </button>
        )}
      </div>

      {/* Main Grid: Left List (1 col) vs Right Detail (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* 3.2 Panel Kiri: Daftar SPK */}
        {/* ======================================================== */}
        <div className={`space-y-4 ${showMobileDetail ? 'hidden lg:block' : 'block'}`}>
          
          {/* Toolbar (Sticky) */}
          <div className="bg-slate-50 sticky top-0 z-20 space-y-3 pb-2 pt-1">
            
            {/* Input Pencarian */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari klien, proyek, lokasi, atau nomor SPK…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateUrl(activeTab, filterTahap, filterPemilik, e.target.value, selectedSpkId);
                }}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    updateUrl(activeTab, filterTahap, filterPemilik, '', selectedSpkId);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Main Tabs: Perlu Tindakan | Semua Kontrak | Riwayat */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('tindakan');
                  updateUrl('tindakan', filterTahap, filterPemilik, searchQuery, selectedSpkId);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap text-[11px] sm:text-xs ${
                  activeTab === 'tindakan'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Perlu Tindakan ({tabCounts.tindakan})
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('semua');
                  updateUrl('semua', filterTahap, filterPemilik, searchQuery, selectedSpkId);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap text-[11px] sm:text-xs ${
                  activeTab === 'semua'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Kontrak ({tabCounts.semua})
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('riwayat');
                  updateUrl('riwayat', filterTahap, filterPemilik, searchQuery, selectedSpkId);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap text-[11px] sm:text-xs ${
                  activeTab === 'riwayat'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Riwayat ({tabCounts.riwayat})
              </button>
            </div>

            {/* Filter Sub-bar: Tahap & Pemilik */}
            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap text-xs">
              {/* Filter Tahap Dropdown / Pills */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {(['semua', 'belum_ada', 'verifikasi', 'perpanjangan', 'eskalasi'] as FilterTahap[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setFilterTahap(t);
                      updateUrl(activeTab, t, filterPemilik, searchQuery, selectedSpkId);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      filterTahap === t
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {FILTER_TAHAP_LABEL[t]}
                  </button>
                ))}
              </div>

              {/* Filter Pemilik (Saya | Semua) */}
              {activeTab !== 'riwayat' && (
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] shrink-0 font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterPemilik('saya');
                      updateUrl(activeTab, filterTahap, 'saya', searchQuery, selectedSpkId);
                    }}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      filterPemilik === 'saya' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Saya
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterPemilik('semua');
                      updateUrl(activeTab, filterTahap, 'semua', searchQuery, selectedSpkId);
                    }}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      filterPemilik === 'semua' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Semua
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* List Content: Grouped per Project */}
          <div className="space-y-4 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
            {groupedProjects.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <ScrollText className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {searchQuery
                    ? `Tidak ada kontrak yang cocok dengan "${searchQuery}".`
                    : activeTab === 'tindakan'
                    ? '✓ Tidak ada kontrak yang menunggu tindakan Anda.'
                    : 'Tidak ada kontrak pada filter ini.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      updateUrl(activeTab, filterTahap, filterPemilik, '', selectedSpkId);
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Hapus pencarian
                  </button>
                )}
              </div>
            ) : (
              groupedProjects.map((group) => {
                const isCollapsed = collapsedProjects[group.projectId];

                return (
                  <div key={group.projectId} className="space-y-2">
                    {/* Collapsible Project Group Header */}
                    <div
                      onClick={() => toggleProjectCollapse(group.projectId)}
                      className="pt-2 pb-1.5 px-2 flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200/90 cursor-pointer hover:bg-slate-100/60 rounded transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{renderHighlighted(group.projectName)}</span>
                        <span className="text-[10px] text-slate-400 font-normal shrink-0">· {group.clientName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono bg-slate-200/80 px-1.5 py-0.2 rounded shrink-0">
                        {group.items.length}
                      </span>
                    </div>

                    {/* Group Items */}
                    {!isCollapsed && (
                      <div className="space-y-2">
                        {group.items.map((k) => {
                          const isSelected = selectedKontrak?.id === k.id;
                          const pemilik = TAHAP_PEMILIK[k.tahap] || '–';
                          const batas = batasTahap(k);
                          const overdue = terlambatHari(k);
                          const sisaHari = sisaHariBerakhir(k);
                          const merah = isMerah(k);

                          return (
                            <div
                              key={k.id}
                              onClick={() => handleSelectKontrak(k)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/20 shadow-md'
                                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                              } ${merah ? 'border-l-4 border-l-rose-500' : ''}`}
                            >
                              {/* Line 1: Bekasi · SPK/NSL/2026/104   [Status] */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <strong className="text-xs font-bold text-slate-900">
                                      {renderHighlighted(k.lokasi)}
                                    </strong>
                                    {k.spkNumber ? (
                                      <>
                                        <span className="text-slate-300">·</span>
                                        <span className="font-mono text-xs text-slate-700 font-semibold">
                                          {renderHighlighted(k.spkNumber)}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 rounded">
                                        Tanpa SPK
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                  k.tahap === 'selesai'
                                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                    : k.tahap === 'berlaku'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : merah
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200 font-bold'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  {TAHAP_LABEL[k.tahap]}
                                </span>
                              </div>

                              {/* Line 2: Pemilik & Batas */}
                              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-2 flex-wrap">
                                <span>
                                  Pemilik: <strong className="text-slate-700">{pemilik}</strong>
                                  {batas && ` · Batas ${fmtDate(batas)}`}
                                </span>

                                {k.tahap === 'berlaku' && sisaHari !== undefined && (
                                  <span className="text-slate-600 font-medium">
                                    Berakhir dalam {sisaHari} hari
                                  </span>
                                )}
                              </div>

                              {/* Line 3: Terlambat / Alert */}
                              {overdue > 0 && (
                                <div className="mt-1.5 text-[11px] text-rose-700 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                                  <span>⚠ Terlambat {overdue} hari</span>
                                </div>
                              )}

                              {k.bertugasTanpaSpkHari && k.tahap === 'belum_ada' && (
                                <div className="mt-1.5 text-[11px] text-amber-800 font-bold flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                  <span>Bertugas {k.bertugasTanpaSpkHari} hari tanpa SPK</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Pagination / Infinite Scroll Per 25 Items */}
            {filteredList.length > pageLimit && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setPageLimit(prev => prev + 25)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs"
                >
                  Muat 25 Kontrak Berikutnya ({filteredList.length - pageLimit} tersisa)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3.3 Panel Kanan: Detail SPK */}
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
              <span>← Kembali</span>
            </button>
          </div>

          {!selectedKontrak ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <ScrollText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Pilih kontrak di sebelah kiri untuk melihat rinciannya.
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Kelola tahapan siklus hidup SPK lokasi, verifikasi klausul, dan perpanjangan masa berlaku.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* 1. Header Detail */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight font-mono text-slate-900">
                        {selectedKontrak.spkNumber || `SPK Belum Terdaftar (${selectedKontrak.lokasi})`}
                      </h2>
                      {selectedKontrak.tahap === 'draf' && (
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">
                          Draf
                        </span>
                      )}
                      {selectedKontrak.dikembalikanCount > 1 && (
                        <span className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                          Dikembalikan {selectedKontrak.dikembalikanCount}x
                        </span>
                      )}
                    </div>
                    {/* Baris kedua: Klien · Proyek · Lokasi */}
                    <div className="text-xs text-slate-600">
                      <strong className="text-slate-900 font-semibold">{selectedKontrak.clientName}</strong>
                      <span className="text-slate-300"> · </span>
                      <span>{selectedKontrak.projectName}</span>
                      <span className="text-slate-300"> · </span>
                      <strong className="text-indigo-700">{selectedKontrak.lokasi}</strong>
                    </div>
                  </div>

                  {/* Badge Tahap */}
                  <div className="shrink-0">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      selectedKontrak.tahap === 'selesai'
                        ? 'bg-slate-100 text-slate-800 border border-slate-300'
                        : selectedKontrak.tahap === 'berlaku'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : isMerah(selectedKontrak)
                        ? 'bg-rose-50 text-rose-800 border border-rose-200 font-bold'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {TAHAP_LABEL[selectedKontrak.tahap]}
                    </span>
                  </div>
                </div>

                {/* Tautan Dokumen & FPK */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-4 flex-wrap text-xs">
                  {selectedKontrak.dokumen.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setDocPreviewModal({
                        open: true,
                        doc: selectedKontrak.dokumen[0],
                        kontrak: selectedKontrak,
                      })}
                      className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>📄 Lihat Dokumen ({selectedKontrak.dokumen[0].nama})</span>
                    </button>
                  ) : (
                    <span className="text-slate-400 italic">Belum ada file dokumen diunggah</span>
                  )}

                  {selectedKontrak.fpkNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.history.pushState(null, '', `/kerja-sama-baru?detail=${selectedKontrak.fpkNumber}`);
                        }
                        setActiveView('fpk');
                      }}
                      className="font-semibold text-slate-700 hover:text-indigo-600 hover:underline inline-flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>↗ {selectedKontrak.fpkNumber}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Stepper Siklus Hidup */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">Siklus Hidup Kontrak</span>
                    <button
                      type="button"
                      onClick={() => setShowTooltipInfo(!showTooltipInfo)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                      title="Aturan Waktu Siklus Hidup"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                    </button>
                  </div>

                  {/* Toggle sub-langkah perpanjangan */}
                  {['persiapan_perpanjangan', 'telaah_memo', 'persetujuan_memo', 'kirim_memo', 'menunggu_tanggapan', 'negosiasi', 'eskalasi', 'menunggu_spk_perpanjangan', 'demobilisasi'].includes(selectedKontrak.tahap) && (
                    <button
                      type="button"
                      onClick={() => setShowSubSteps(!showSubSteps)}
                      className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>{showSubSteps ? 'Sembunyikan' : 'Lihat'} alur memo</span>
                      {showSubSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* Tooltip info aturan H-75 / H-60 / H-30 (Brief bagian 8) */}
                {showTooltipInfo && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">Aturan Waktu Siklus Hidup (Hari Kalender):</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                      <li><strong>H-75:</strong> Otomatis masuk Persiapan Perpanjangan & tugas Pemasaran dibuat.</li>
                      <li><strong>H-60:</strong> Batas memo dikirim ke klien beserta bukti kirim.</li>
                      <li><strong>H-30:</strong> Batas tanggapan klien. Jika belum ada, otomatis masuk Eskalasi BOD.</li>
                      <li><strong>Verifikasi SPK:</strong> Batas 7 hari kalender sejak dikirim.</li>
                    </ul>
                  </div>
                )}

                {/* Main Stepper 5 Tahap: Input → Verifikasi → Berlaku → Perpanjangan → Selesai */}
                <div className="overflow-x-auto pt-1">
                  <div className="min-w-[560px] flex items-center justify-between relative">
                    <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
                    
                    {[
                      { key: 'input', label: 'Input', done: !['belum_ada'].includes(selectedKontrak.tahap), active: ['belum_ada', 'draf', 'dikembalikan'].includes(selectedKontrak.tahap) },
                      { key: 'verifikasi', label: 'Verifikasi', done: !['belum_ada', 'draf', 'menunggu_verifikasi', 'dikembalikan'].includes(selectedKontrak.tahap), active: selectedKontrak.tahap === 'menunggu_verifikasi' },
                      { key: 'berlaku', label: 'Berlaku', done: ['persiapan_perpanjangan', 'telaah_memo', 'persetujuan_memo', 'kirim_memo', 'menunggu_tanggapan', 'negosiasi', 'eskalasi', 'menunggu_spk_perpanjangan', 'demobilisasi', 'selesai'].includes(selectedKontrak.tahap), active: selectedKontrak.tahap === 'berlaku' },
                      { key: 'perpanjangan', label: 'Perpanjangan', done: selectedKontrak.tahap === 'selesai', active: ['persiapan_perpanjangan', 'telaah_memo', 'persetujuan_memo', 'kirim_memo', 'menunggu_tanggapan', 'negosiasi', 'eskalasi', 'menunggu_spk_perpanjangan', 'demobilisasi'].includes(selectedKontrak.tahap) },
                      { key: 'selesai', label: 'Selesai', done: selectedKontrak.tahap === 'selesai', active: selectedKontrak.tahap === 'selesai' },
                    ].map((step, idx) => (
                      <div key={step.key} className="relative z-10 flex flex-col items-center text-center w-24">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                          step.done && !step.active
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : step.active
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white border-slate-300 text-slate-400'
                        }`}>
                          {step.done && !step.active ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                        </div>
                        <span className={`text-[11px] font-bold mt-1.5 ${step.active ? 'text-slate-900' : 'text-slate-500'}`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-steps Perpanjangan (bila dibuka) */}
                {showSubSteps && ['persiapan_perpanjangan', 'telaah_memo', 'persetujuan_memo', 'kirim_memo', 'menunggu_tanggapan', 'negosiasi', 'eskalasi', 'menunggu_spk_perpanjangan', 'demobilisasi'].includes(selectedKontrak.tahap) && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Sub-alur Perpanjangan:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                      <div className={`p-2 rounded border ${selectedKontrak.memo.disusun ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <strong>1. H-75 Disusun</strong>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{selectedKontrak.memo.disusun ? fmtDate(selectedKontrak.memo.disusun.pada) : 'Belum'}</span>
                      </div>
                      <div className={`p-2 rounded border ${selectedKontrak.memo.ditelaah ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <strong>2. Ditelaah</strong>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{selectedKontrak.memo.ditelaah ? fmtDate(selectedKontrak.memo.ditelaah.pada) : 'Belum'}</span>
                      </div>
                      <div className={`p-2 rounded border ${selectedKontrak.memo.disetujui ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <strong>3. Disetujui BOD</strong>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{selectedKontrak.memo.disetujui ? fmtDate(selectedKontrak.memo.disetujui.pada) : 'Belum'}</span>
                      </div>
                      <div className={`p-2 rounded border ${selectedKontrak.memo.dikirim ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <strong>4. H-60 Dikirim</strong>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{selectedKontrak.memo.dikirim ? fmtDate(selectedKontrak.memo.dikirim.pada) : 'Belum'}</span>
                      </div>
                      <div className={`p-2 rounded border ${selectedKontrak.memo.tanggapan ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <strong>5. H-30 Tanggapan</strong>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{selectedKontrak.memo.tanggapan ? selectedKontrak.memo.tanggapan.jenis : 'Belum'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Kotak "Tindakan Berikutnya" */}
              <div className="bg-white rounded-xl border-2 border-indigo-200 shadow-2xs p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-indigo-600" />
                    <span>Tindakan Berikutnya</span>
                  </h3>
                  {terlambatHari(selectedKontrak) > 0 && (
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                      Terlambat {terlambatHari(selectedKontrak)} hari
                    </span>
                  )}
                </div>

                {/* Penjelasan Tugas & Konteks Risiko */}
                <div className="text-xs space-y-1.5">
                  <p className="text-slate-800 leading-relaxed font-medium">
                    Tindakan: <strong>{TAHAP_TINDAKAN[selectedKontrak.tahap]}</strong> · Pemilik:{' '}
                    <strong>{TAHAP_PEMILIK[selectedKontrak.tahap] || '–'}</strong>
                    {batasTahap(selectedKontrak) && ` · Batas: ${fmtDate(batasTahap(selectedKontrak))}`}
                  </p>

                  {/* Konteks Risiko spesifik */}
                  {selectedKontrak.bertugasTanpaSpkHari && selectedKontrak.tahap === 'menunggu_verifikasi' && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 font-medium">
                      ⚠️ Petugas sudah bertugas {selectedKontrak.bertugasTanpaSpkHari} hari tanpa SPK sah. {fmtRp(selectedKontrak.nilai)} belum dapat ditagihkan.
                    </div>
                  )}

                  {selectedKontrak.tahap === 'eskalasi' && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 font-medium">
                      ⚠️ Tidak ada tanggapan klien hingga H-30. Kontrak berakhir {fmtDate(selectedKontrak.berakhir)}. Keputusan Direksi diperlukan.
                    </div>
                  )}
                </div>

                {/* Tombol Aksi: Untuk pemilik tahap vs peran lain */}
                <div className="pt-2">
                  {isPemilik(selectedKontrak, currentUser) ? (
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Aksi Berdasarkan Tahap */}
                      {selectedKontrak.tahap === 'belum_ada' && (
                        <button
                          type="button"
                          onClick={() => setFormDrawer({ open: true, mode: 'isi', targetId: selectedKontrak.id })}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                        >
                          Input SPK Lokasi Ini
                        </button>
                      )}

                      {['draf', 'dikembalikan'].includes(selectedKontrak.tahap) && (
                        <button
                          type="button"
                          onClick={() => setFormDrawer({ open: true, mode: 'isi', targetId: selectedKontrak.id })}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                        >
                          {selectedKontrak.tahap === 'dikembalikan' ? 'Perbaiki & Kirim Ulang' : 'Lengkapi & Kirim Verifikasi'}
                        </button>
                      )}

                      {selectedKontrak.tahap === 'menunggu_verifikasi' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSahkan(selectedKontrak)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Sahkan SPK</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleKembalikan(selectedKontrak)}
                            className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold"
                          >
                            Kembalikan untuk Diperbaiki
                          </button>
                        </>
                      )}

                      {selectedKontrak.tahap === 'persiapan_perpanjangan' && (
                        <button
                          type="button"
                          onClick={() => setMemoModal(true)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                        >
                          Susun & Kirim Memo
                        </button>
                      )}

                      {selectedKontrak.tahap === 'telaah_memo' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setujuiTelaah(selectedKontrak.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                          >
                            Setujui Telaah
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const note = prompt('Alasan pengembalian memo:');
                              if (note) kembalikanMemo(selectedKontrak.id, note);
                            }}
                            className="px-4 py-2 bg-white text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold"
                          >
                            Kembalikan Memo
                          </button>
                        </>
                      )}

                      {selectedKontrak.tahap === 'persetujuan_memo' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setujuiMemo(selectedKontrak.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                          >
                            Setujui Memo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const note = prompt('Alasan pengembalian memo:');
                              if (note) kembalikanMemo(selectedKontrak.id, note);
                            }}
                            className="px-4 py-2 bg-white text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold"
                          >
                            Kembalikan Memo
                          </button>
                        </>
                      )}

                      {selectedKontrak.tahap === 'kirim_memo' && (
                        <button
                          type="button"
                          onClick={() => {
                            const proof = prompt('Nama file bukti kirim (contoh: Surat_Kirim.pdf):');
                            if (proof) tandaiTerkirim(selectedKontrak.id, TODAY, { name: proof, size: 1024 });
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Tandai Terkirim + Bukti</span>
                        </button>
                      )}

                      {['menunggu_tanggapan', 'negosiasi'].includes(selectedKontrak.tahap) && (
                        <button
                          type="button"
                          onClick={() => setTanggapanModal(true)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                        >
                          Catat Tanggapan Klien
                        </button>
                      )}

                      {selectedKontrak.tahap === 'menunggu_spk_perpanjangan' && (
                        <button
                          type="button"
                          onClick={() => setFormDrawer({ open: true, mode: 'perpanjangan', targetId: selectedKontrak.id })}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Input SPK Perpanjangan</span>
                        </button>
                      )}

                      {selectedKontrak.tahap === 'eskalasi' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setEskalasiModal('putuskan')}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                          >
                            Putuskan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEskalasiModal('batas')}
                            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold"
                          >
                            Perpanjang Batas Waktu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEskalasiModal('delegasi')}
                            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold"
                          >
                            Delegasikan
                          </button>
                        </div>
                      )}

                      {selectedKontrak.tahap === 'demobilisasi' && (
                        <button
                          type="button"
                          onClick={() => {
                            const note = prompt('Catatan penyelesaian demobilisasi:') || '';
                            selesaikanDemobilisasi(selectedKontrak.id, note);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                        >
                          Selesaikan Demobilisasi
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Non-owner: Status Saja + Tombol Kirim Pengingat */
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-xs text-slate-500">
                        Menunggu tindakan dari <strong>{TAHAP_PEMILIK[selectedKontrak.tahap] || 'tim terkait'}</strong>.
                      </span>

                      {selectedKontrak.tahap !== 'selesai' && selectedKontrak.tahap !== 'berlaku' && (
                        <button
                          type="button"
                          onClick={() => kirimPengingat(selectedKontrak.id)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Send className="w-3 h-3 text-slate-400" />
                          <span>Kirim pengingat</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Isi Panel per Tahap */}
              {/* 4.3 Menunggu Verifikasi: Pratinjau Dokumen (Kiri) | Tabel Pencocokan (Kanan) */}
              {selectedKontrak.tahap === 'menunggu_verifikasi' && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                    Verifikasi Dokumen & Pencocokan FPK
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {/* Pratinjau Dokumen Sederhana di Kiri */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span>Berkas SPK Klien</span>
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">PDF (Resmi)</span>
                      </div>

                      {selectedKontrak.dokumen.length > 0 ? (
                        <div className="space-y-2">
                          <p className="font-mono text-xs font-bold text-slate-800">
                            {selectedKontrak.dokumen[0].nama}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Diunggah oleh {selectedKontrak.dokumen[0].pengunggah} pada {fmtDate(selectedKontrak.dokumen[0].tanggal)}
                          </p>
                          <button
                            type="button"
                            onClick={() => setDocPreviewModal({
                              open: true,
                              doc: selectedKontrak.dokumen[0],
                              kontrak: selectedKontrak,
                            })}
                            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700"
                          >
                            Buka Layar Penuh
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Belum ada file diunggah.</p>
                      )}
                    </div>

                    {/* Tabel Pencocokan FPK vs SPK di Kanan */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-800 block">
                        Pencocokan Alokasi FPK (Lokasi {selectedKontrak.lokasi})
                      </span>

                      {selectedKontrak.fpkAlokasi ? (
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                              <tr>
                                <th className="px-3 py-2">Komponen</th>
                                <th className="px-3 py-2">FPK</th>
                                <th className="px-3 py-2">SPK</th>
                                <th className="px-3 py-2 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(cocokkan(selectedKontrak) || []).map((row, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2.5 font-semibold text-slate-800">{row.komponen}</td>
                                  <td className="px-3 py-2.5 text-slate-600">{row.fpk}</td>
                                  <td className="px-3 py-2.5 font-bold text-slate-900">
                                    {row.spk}
                                    {row.penjelasan && (
                                      <span className="block text-[10px] font-normal text-amber-700 mt-0.5">
                                        {row.penjelasan}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {row.status === 'sesuai' ? (
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                        ✓ Sesuai
                                      </span>
                                    ) : row.status === 'berbeda' ? (
                                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                                        ⚠ Berbeda
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                                        ✗ Tidak sesuai
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-rose-600 font-semibold p-3 bg-rose-50 rounded-lg border border-rose-200">
                          FPK untuk lokasi ini belum tersedia.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 4.5 Perpanjangan: 3 Pilihan Tanggapan Klien (Besar, bukan dropdown) */}
              {['menunggu_tanggapan', 'negosiasi'].includes(selectedKontrak.tahap) && isMarketing && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Catat Tanggapan Klien
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => catatTanggapan(selectedKontrak.id, { jenis: 'setuju', catatan: 'Klien menyetujui perpanjangan kontrak.' })}
                      className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-left space-y-1 transition-all"
                    >
                      <strong className="text-xs font-bold text-emerald-900 block">✓ Setuju</strong>
                      <span className="text-[11px] text-emerald-700 block">Lanjut ke input SPK perpanjangan baru.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const note = prompt('Catatan negosiasi:') || '';
                        const date = prompt('Tanggal tindak lanjut (YYYY-MM-DD):') || addDays(TODAY, 14);
                        if (note) catatTanggapan(selectedKontrak.id, { jenis: 'negosiasi', catatan: note, tindakLanjut: date });
                      }}
                      className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-left space-y-1 transition-all"
                    >
                      <strong className="text-xs font-bold text-amber-900 block">💬 Negosiasi</strong>
                      <span className="text-[11px] text-amber-700 block">Perlu pembahasan penyesuaian tarif / klausul.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const note = prompt('Alasan tidak melanjutkan:') || '';
                        if (note) catatTanggapan(selectedKontrak.id, { jenis: 'tidak_lanjut', catatan: note });
                      }}
                      className="p-4 rounded-xl border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-left space-y-1 transition-all"
                    >
                      <strong className="text-xs font-bold text-rose-900 block">✕ Tidak Melanjutkan</strong>
                      <span className="text-[11px] text-rose-700 block">Buat tugas demobilisasi untuk Operasional.</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 5. Ringkasan SPK */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ringkasan SPK Lokasi Ini
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Periode</span>
                    <strong className="text-xs text-slate-900 block mt-0.5">
                      {fmtDate(selectedKontrak.mulai)} – {fmtDate(selectedKontrak.berakhir)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Nilai Kontrak</span>
                    <strong className="text-xs text-slate-900 block mt-0.5">
                      {fmtRp(selectedKontrak.nilai)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Kebutuhan Petugas</span>
                    <strong className="text-xs text-slate-900 block mt-0.5">
                      {selectedKontrak.kebutuhanPetugas} petugas
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Petugas Terisi</span>
                    <strong className="text-xs text-slate-900 block mt-0.5">
                      {selectedKontrak.petugasTerisi} petugas
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Kekurangan</span>
                    <strong className={`text-xs block mt-0.5 ${
                      selectedKontrak.kebutuhanPetugas - selectedKontrak.petugasTerisi > 0 ? 'text-amber-600 font-bold' : 'text-slate-900'
                    }`}>
                      {Math.max(0, selectedKontrak.kebutuhanPetugas - selectedKontrak.petugasTerisi)} petugas
                    </strong>
                  </div>
                </div>
              </div>

              {/* 6. Dokumen Terkait */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Dokumen ({selectedKontrak.dokumen.length})
                  </h3>
                  {isPemilik(selectedKontrak, currentUser) && (
                    <button
                      type="button"
                      onClick={() => setUploadModal(true)}
                      className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Unggah</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedKontrak.dokumen.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setDocPreviewModal({ open: true, doc, kontrak: selectedKontrak })}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 text-xs block truncate">
                            {doc.nama}
                            {doc.versi && <span className="text-slate-400 font-normal ml-1">v{doc.versi}</span>}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {doc.jenis} · Diunggah oleh {doc.pengunggah}, {fmtDate(doc.tanggal)}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded shrink-0">
                        {doc.statusVersi}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Aktivitas Linimasa */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                  Aktivitas
                </h3>
                <div className="space-y-3 text-xs">
                  {selectedKontrak.aktivitas.map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {act.teks}
                        </p>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {act.pada} · {act.oleh} ({act.peran})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* ======================================================== */}
      {/* Drawer Formulir Input / Draf SPK */}
      {/* ======================================================== */}
      {formDrawer.open && (
        <SpkFormDrawer
          mode={formDrawer.mode}
          targetKontrak={formDrawer.targetId ? getKontrak(formDrawer.targetId) : null}
          onClose={() => setFormDrawer({ open: false, mode: 'baru', targetId: null })}
          onSuccess={(newId) => {
            setFormDrawer({ open: false, mode: 'baru', targetId: null });
            if (newId) {
              setSelectedSpkId(newId);
              setShowMobileDetail(true);
            }
          }}
        />
      )}

      {/* Modal Pratinjau Dokumen (dengan simulasi gagal & tombol Unduh) */}
      {docPreviewModal.open && docPreviewModal.doc && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{docPreviewModal.doc.nama}</h3>
                  <span className="text-[11px] text-slate-500">{docPreviewModal.doc.jenis}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocPreviewModal({ open: false, doc: null, kontrak: null })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulasi Gagal Muat Pratinjau (Edge Case 22) */}
            {docPreviewModal.doc.gagalPratinjau ? (
              <div className="p-8 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-900">Pratinjau dokumen tidak dapat ditampilkan.</p>
                  <p className="text-[11px] text-amber-700">Berkas dapat diunduh untuk dibuka secara lokal.</p>
                </div>
                <button
                  type="button"
                  onClick={() => alert(`Mengunduh file: ${docPreviewModal.doc?.nama}`)}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File</span>
                </button>
              </div>
            ) : (
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
                <FileCheck className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">Dokumen Resmi Tersimpan</p>
                  <p className="text-[11px] text-slate-500">
                    Versi {docPreviewModal.doc.versi || 1} · Status: {docPreviewModal.doc.statusVersi}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDocPreviewModal({ open: false, doc: null, kontrak: null })}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload File Dokumen */}
      {uploadModal && selectedKontrak && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Unggah Dokumen Tambahan</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nama File:</label>
                <input
                  type="text"
                  id="upload-doc-name"
                  defaultValue="Dokumen_Lampiran_Resmi.pdf"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('upload-doc-name') as HTMLInputElement;
                    const val = el?.value || 'Dokumen_Baru.pdf';
                    unggahDokumen(selectedKontrak.id, 'SPK', { name: val, size: 2048 });
                    setUploadModal(false);
                  }}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Unggah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ---------------------------------------------------------------------------
// Drawer Form Input / Draf SPK (Bagian 4.2 & Edge Cases 1-5)
// ---------------------------------------------------------------------------
const SpkFormDrawer: React.FC<{
  mode: SpkFormMode;
  targetKontrak: Kontrak | null;
  onClose: () => void;
  onSuccess: (newId?: string) => void;
}> = ({ mode, targetKontrak, onClose, onSuccess }) => {
  const { projects } = useApp();
  const { lokasiOptions, simpanSpk } = useContracts();

  const [projectId, setProjectId] = useState<string>(targetKontrak?.projectId || projects[0]?.id || '');
  const [lokasiKey, setLokasiKey] = useState<string>(targetKontrak?.siteId || `nama:${targetKontrak?.lokasi}` || '');
  const [nomor, setNomor] = useState<string>(
    mode === 'perpanjangan' && targetKontrak?.spkNumber
      ? `${targetKontrak.spkNumber}/EXT`
      : targetKontrak?.spkNumber || ''
  );
  const [mulai, setMulai] = useState<string>(
    mode === 'perpanjangan' && targetKontrak?.berakhir
      ? addDays(targetKontrak.berakhir, 1)
      : targetKontrak?.mulai || TODAY
  );
  const [berakhir, setBerakhir] = useState<string>(
    mode === 'perpanjangan' && targetKontrak?.berakhir
      ? addDays(targetKontrak.berakhir, 365)
      : targetKontrak?.berakhir || addDays(TODAY, 365)
  );
  const [nilai, setNilai] = useState<string>(targetKontrak?.nilai ? String(targetKontrak.nilai) : '265000000');
  const [kuota, setKuota] = useState<string>(targetKontrak?.kuota ? String(targetKontrak.kuota) : '25');
  const [uploadedFile, setUploadedFile] = useState<FileMeta | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const availableLokasi = useMemo(() => lokasiOptions(projectId), [projectId, lokasiOptions]);

  // Handle Drag & Drop / File Input (Validation: PDF, max 10MB)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('File harus berupa PDF.');
      setUploadedFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 10 MB.');
      setUploadedFile(null);
      return;
    }

    setFileError(null);
    setUploadedFile({ name: file.name, size: file.size });
  };

  const handleSubmit = (kirim: boolean) => {
    const values: SpkFormValues = {
      projectId,
      lokasiKey: lokasiKey || availableLokasi[0]?.key || '',
      nomor,
      mulai,
      berakhir,
      nilai,
      kuota,
      file: uploadedFile,
    };

    const res = simpanSpk(mode, targetKontrak?.id || null, values, kirim);
    if (!res.ok) {
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }
    onSuccess(res.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in">
      <div className="w-full md:w-3/5 lg:w-1/2 bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 overflow-hidden">
        
        {/* Header Drawer */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {mode === 'perpanjangan' ? 'Input SPK Perpanjangan' : mode === 'isi' ? 'Kelola Dokumen SPK' : 'Input SPK Baru'}
            </h3>
            <span className="text-xs text-slate-500">
              {targetKontrak ? `${targetKontrak.clientName} · ${targetKontrak.lokasi}` : 'Lengkapi data perjanjian kontrak per lokasi'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          
          {/* Peringatan jika status Dikembalikan */}
          {targetKontrak?.tahap === 'dikembalikan' && targetKontrak.alasanPengembalian && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-900">
              <strong className="block font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Alasan Pengembalian dari Keuangan:</span>
              </strong>
              <p className="text-[11px] leading-relaxed pl-5">
                &ldquo;{targetKontrak.alasanPengembalian}&rdquo;
              </p>
            </div>
          )}

          {/* Proyek */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">Proyek (Wajib)</label>
            <select
              value={projectId}
              disabled={mode === 'perpanjangan' || (mode === 'isi' && !!targetKontrak)}
              onChange={(e) => {
                setProjectId(e.target.value);
                setLokasiKey('');
              }}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>
              ))}
            </select>
          </div>

          {/* Lokasi */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">Lokasi Jaga (Wajib)</label>
            <select
              value={lokasiKey}
              disabled={mode === 'perpanjangan' || (mode === 'isi' && !!targetKontrak)}
              onChange={(e) => setLokasiKey(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
            >
              {availableLokasi.map(o => (
                <option key={o.key} value={o.key}>{o.lokasi} — {o.lokasiDetail}</option>
              ))}
            </select>
            {fieldErrors.lokasiKey && <p className="text-rose-600 text-[11px] font-semibold">{fieldErrors.lokasiKey}</p>}
          </div>

          {/* Nomor SPK */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">Nomor SPK Resmi</label>
            <input
              type="text"
              placeholder="Contoh: SPK/NSL/2026/105"
              value={nomor}
              onChange={(e) => setNomor(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
            />
            {fieldErrors.nomor && <p className="text-rose-600 text-[11px] font-semibold">{fieldErrors.nomor}</p>}
          </div>

          {/* Periode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">Tanggal Mulai</label>
              <input
                type="date"
                value={mulai}
                onChange={(e) => setMulai(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
              {fieldErrors.mulai && <p className="text-rose-600 text-[11px] font-semibold">{fieldErrors.mulai}</p>}
            </div>
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">Tanggal Berakhir</label>
              <input
                type="date"
                value={berakhir}
                onChange={(e) => setBerakhir(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
              {fieldErrors.berakhir && <p className="text-rose-600 text-[11px] font-semibold">{fieldErrors.berakhir}</p>}
            </div>
          </div>

          {/* Nilai & Kuota */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">Nilai Kontrak (Rp)</label>
              <input
                type="text"
                value={nilai}
                onChange={(e) => setNilai(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
              {fieldErrors.nilai && <p className="text-rose-600 text-[11px] font-semibold">{fieldErrors.nilai}</p>}
            </div>
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">Jumlah Petugas</label>
              <input
                type="number"
                value={kuota}
                onChange={(e) => setKuota(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
              {fieldErrors.kuota && <p className="text-rose-600 text-[11px] font-semibold">{fieldErrors.kuota}</p>}
            </div>
          </div>

          {/* Unggah File SPK (PDF, max 10MB) */}
          <div className="space-y-1 pt-1">
            <label className="block font-semibold text-slate-700">File SPK (PDF, Wajib, Maks 10 MB)</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:bg-slate-50 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <input
                type="file"
                accept=".pdf,application/pdf"
                id="spk-file-upload"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="spk-file-upload"
                className="cursor-pointer text-indigo-600 font-bold hover:underline"
              >
                Pilih file PDF
              </label>
              <span className="text-slate-400 ml-1">atau tarik berkas ke sini</span>
              {uploadedFile && (
                <div className="mt-2 text-emerald-700 font-bold flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
            {fileError && <p className="text-rose-600 text-[11px] font-semibold">{fileError}</p>}
            {fieldErrors.file && <p className="text-rose-600 text-[11px] font-semibold">{fieldErrors.file}</p>}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
          >
            Simpan Draf
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
          >
            Kirim untuk Verifikasi
          </button>
        </div>

      </div>
    </div>
  );
};
