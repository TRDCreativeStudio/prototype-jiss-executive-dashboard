import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  FileText, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  History,
  ShieldCheck,
  RotateCcw,
  Ban,
  User,
  Users,
  Eye
} from 'lucide-react';
import { FPK } from '../../types';

export const FPKView: React.FC = () => {
  const { 
    fpks, 
    clients,
    currentUser, 
    decideBOD,
    requestConfirmation,
    setActiveView 
  } = useApp();

  // Read URL query parameter: ?detail=FPK-2026-015 and ?tab=menunggu | archive
  const getDetailParam = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('detail') || null;
  };

  const getTabParam = (): 'menunggu' | 'archive' => {
    if (typeof window === 'undefined') return 'menunggu';
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return tab === 'archive' ? 'archive' : 'menunggu';
  };

  const [activeTab, setActiveTab] = useState<'menunggu' | 'archive'>(getTabParam());
  const [selectedFPKCode, setSelectedFPKCode] = useState<string | null>(getDetailParam());
  const [previewDocument, setPreviewDocument] = useState<{
    title: string;
    filename: string;
  } | null>(null);

  // Review modal state when clicking › on Telaah Divisi
  const [selectedReviewModal, setSelectedReviewModal] = useState<{
    dept: string;
    reviewer: string;
    date: string;
    summary: string;
    fullNote: string;
    details: { label: string; value: string }[];
  } | null>(null);

  // Sync URL popstate
  useEffect(() => {
    const handlePopState = () => {
      setSelectedFPKCode(getDetailParam());
      setActiveTab(getTabParam());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (tab: 'menunggu' | 'archive') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/kerja-sama-baru';
      url.searchParams.set('tab', tab);
      window.history.pushState(null, '', url.pathname + '?' + url.searchParams.toString());
    }
  };

  const openDetail = (code: string) => {
    setSelectedFPKCode(code);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/kerja-sama-baru';
      url.searchParams.set('detail', code);
      if (activeTab !== 'menunggu') {
        url.searchParams.set('tab', activeTab);
      }
      window.history.pushState(null, '', url.pathname + '?' + url.searchParams.toString());
    }
  };

  const closeDetail = () => {
    setSelectedFPKCode(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/kerja-sama-baru';
      url.searchParams.delete('detail');
      const searchStr = url.searchParams.toString();
      window.history.pushState(null, '', url.pathname + (searchStr ? '?' + searchStr : ''));
    }
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewDocument) {
          setPreviewDocument(null);
        } else if (selectedReviewModal) {
          setSelectedReviewModal(null);
        } else if (selectedFPKCode) {
          closeDetail();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDocument, selectedReviewModal, selectedFPKCode]);

  // Find active FPK if detail is open
  const activeFPK = useMemo(() => {
    if (!selectedFPKCode) return null;
    return fpks.find(f => 
      f.fpkNumber.toLowerCase() === selectedFPKCode.toLowerCase() || 
      f.id === selectedFPKCode
    ) || null;
  }, [selectedFPKCode, fpks]);

  // Client info for active FPK
  const activeClient = useMemo(() => {
    if (!activeFPK) return null;
    return clients.find(c => c.id === activeFPK.clientId) || null;
  }, [activeFPK, clients]);

  // Format readable date: "28 Okt 2026"
  const formatReadableDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split(' ')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    return `${day} ${monthNames[month]} ${year}`;
  };

  // Format compact Rupiah: "Rp 310 juta"
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

  // Clean project name
  const getCleanProjectTitle = (fpk: FPK) => {
    let name = fpk.projectName;
    if (name.includes('—')) {
      name = name.split('—')[1].trim();
    } else if (name.startsWith(fpk.clientName)) {
      name = name.replace(fpk.clientName, '').replace(/^[-–—\s]+/, '').trim();
    }
    return name.trim() || 'Pengamanan Fasilitas Lapangan';
  };

  // Groups for list view
  const pendingFPKs = fpks.filter(f => f.status === 'Pending BOD' || f.status === 'Submitted' || f.status === 'Under Review');
  const historyFPKs = fpks.filter(f => f.status === 'Approved' || f.status === 'Rejected' || f.status === 'Returned');

  // Decision actions for BOD
  const handleApprove = (fpk: FPK) => {
    requestConfirmation({
      title: 'Setujui Pembukaan Kerja Sama',
      message: `Apakah Anda yakin ingin menyetujui pengajuan ${fpk.fpkNumber} (${fpk.clientName})? Proyek baru akan otomatis dibuat dalam sistem.`,
      confirmLabel: 'Ya, Setujui',
      variant: 'primary',
      requiresNotes: false,
      onConfirm: () => {
        decideBOD(fpk.id, 'Approved');
      }
    });
  };

  const handleReturn = (fpk: FPK) => {
    requestConfirmation({
      title: 'Kembalikan ke Tim Pemasaran',
      message: `Pengajuan ${fpk.fpkNumber} akan dikembalikan ke Tim Pemasaran untuk perbaikan atau klarifikasi lebih lanjut.`,
      confirmLabel: 'Kembalikan Pengajuan',
      variant: 'warning',
      requiresNotes: true,
      notesLabel: 'Catatan Arahan Direksi (Wajib diisi):',
      notesPlaceholder: 'Tuliskan catatan arahan atau perbaikan yang perlu dilakukan tim pemasaran...',
      onConfirm: (notes) => {
        decideBOD(fpk.id, 'Returned', notes, notes);
      }
    });
  };

  const handleReject = (fpk: FPK) => {
    requestConfirmation({
      title: 'Tolak Pengajuan Kerja Sama',
      message: `Pengajuan ${fpk.fpkNumber} akan ditolak secara permanen.`,
      confirmLabel: 'Tolak Pengajuan',
      variant: 'danger',
      requiresNotes: true,
      notesLabel: 'Alasan Penolakan (Wajib diisi):',
      notesPlaceholder: 'Tuliskan alasan penolakan kerja sama ini...',
      onConfirm: (notes) => {
        decideBOD(fpk.id, 'Rejected', notes, notes);
      }
    });
  };

  const isBOD = currentUser.role === 'BOD' || currentUser.canApproveBOD;

  // Values for active FPK
  const cleanTitle = activeFPK ? getCleanProjectTitle(activeFPK) : '';
  const clientCode = activeClient?.code || 'GLI';
  const clientInitials = clientCode || (activeFPK ? activeFPK.clientName.split(' ').map(w => w[0]).filter(c => c && c.match(/[A-Za-z]/)).slice(0, 3).join('') : 'GL');
  const contractValue = activeFPK?.financeAssessment?.contractValueRp || 310000000;
  const estimatedCost = activeFPK?.financeAssessment?.estimatedCostRp || 255000000;
  const marginPercent = activeFPK?.financeAssessment?.calculatedMarginPercent || 17.7;
  const personnelQuota = activeFPK?.estimatedPersonnel || 25;
  const isPending = activeFPK?.status === 'Pending BOD';
  const isApproved = activeFPK?.status === 'Approved';

  return (
    <div className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Breadcrumb & Header */}
      <div className="border-b border-slate-200 pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <span className="font-semibold text-slate-700">PT JISS</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">Kerja Sama Baru</span>
        </nav>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Kerja Sama Baru (FPK)
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Daftar pengajuan pembukaan kerja sama baru dan telaah kelayakan kontrak lintas divisi.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 w-fit text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleTabChange('menunggu')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'menunggu'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Menunggu Keputusan ({pendingFPKs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('archive')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'archive'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Archive ({historyFPKs.length})</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 hidden sm:inline">
          {activeTab === 'menunggu' 
            ? 'Pengajuan yang telah menyelesaikan seluruh telaah divisi dan menunggu persetujuan Direksi' 
            : 'Pengajuan kerja sama yang telah selesai diputuskan (arsip riwayat)'}
        </span>
      </div>

      {/* Konten Tab Aktif: Hanya memunculkan FPK sesuai tab yang dipilih */}
      <div className="space-y-6">
        
        {/* Tab 1: Menunggu Keputusan */}
        {activeTab === 'menunggu' && (
          <section className="space-y-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Pengajuan</th>
                    <th className="px-4 py-3">Klien</th>
                    <th className="px-4 py-3">Nilai & Kuota</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingFPKs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-xs">
                        Tidak ada pengajuan yang sedang menunggu keputusan saat ini.
                      </td>
                    </tr>
                  ) : (
                    pendingFPKs.map(f => {
                      const cleanProjName = getCleanProjectTitle(f);
                      const val = f.financeAssessment?.contractValueRp || 310000000;
                      const margin = f.financeAssessment?.calculatedMarginPercent || 17.7;
                      const isSelected = selectedFPKCode === f.fpkNumber || selectedFPKCode === f.id;

                      return (
                        <tr
                          key={f.id}
                          onClick={() => openDetail(f.fpkNumber)}
                          className={`cursor-pointer transition-colors group ${
                            isSelected 
                              ? 'bg-indigo-50/60 ring-1 ring-inset ring-indigo-200' 
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {f.fpkNumber}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Diajukan {formatReadableDate(f.createdAt)}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">
                              {f.clientName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {cleanProjName}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">
                              {formatCompactRupiah(val)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {f.estimatedPersonnel} petugas · Margin {margin}%
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Menunggu Direksi (terlambat 2 hari)
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-800 inline-flex items-center gap-0.5">
                              Tinjau <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab 2: Archive (Arsip Riwayat Pengajuan) */}
        {activeTab === 'archive' && (
          <section className="space-y-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Pengajuan</th>
                    <th className="px-4 py-3">Klien</th>
                    <th className="px-4 py-3">Nilai & Kuota</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyFPKs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-xs">
                        Belum ada arsip riwayat pengajuan kerja sama.
                      </td>
                    </tr>
                  ) : (
                    historyFPKs.map(f => {
                      const cleanProjName = getCleanProjectTitle(f);
                      const val = f.financeAssessment?.contractValueRp || 685000000;
                      const margin = f.financeAssessment?.calculatedMarginPercent || 18.5;
                      const isSelected = selectedFPKCode === f.fpkNumber || selectedFPKCode === f.id;

                      return (
                        <tr
                          key={f.id}
                          onClick={() => openDetail(f.fpkNumber)}
                          className={`cursor-pointer transition-colors group ${
                            isSelected 
                              ? 'bg-indigo-50/60 ring-1 ring-inset ring-indigo-200' 
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {f.fpkNumber}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Diajukan {formatReadableDate(f.createdAt)}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">
                              {f.clientName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {cleanProjName}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">
                              {formatCompactRupiah(val)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {f.estimatedPersonnel} petugas · Margin {margin}%
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {f.status === 'Approved' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Disetujui Direksi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                {f.status}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-800 inline-flex items-center gap-0.5">
                              Lihat Rincian <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>

      {/* Side Modal Sheet (Drawer) dari kanan - 50% Screen Width */}
      {activeFPK && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200"
          onClick={closeDetail}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fpk-sheet-title"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full md:w-3/5 lg:w-1/2 bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 overflow-hidden"
          >
            {/* Drawer Header (Sticky) */}
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-white sticky top-0 z-10 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                  <span className="font-semibold text-slate-700">PT JISS</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-600 truncate">Kerja Sama Baru</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                    {activeFPK.fpkNumber}
                  </span>
                </nav>
                
                <button
                  type="button"
                  onClick={closeDetail}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                  title="Tutup (Esc)"
                  aria-label="Tutup panel rincian pengajuan"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Header Details */}
              <div className="flex items-start gap-3.5 pt-1">
                {/* Logo / Inisial Klien: 52px rounded-xl */}
                <div className="w-13 h-13 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-mono font-bold text-base shrink-0 shadow-2xs">
                  {clientInitials}
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h2 id="fpk-sheet-title" className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-snug">
                      {cleanTitle}
                    </h2>
                    {isPending ? (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        Menunggu Keputusan Direksi
                      </span>
                    ) : isApproved ? (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Disetujui
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
                        {activeFPK.status}
                      </span>
                    )}
                  </div>

                  {/* Line 1: Klien · Nilai · Petugas */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeClient) {
                          if (typeof window !== 'undefined') {
                            window.history.pushState(null, '', `/klien?detail=${activeClient.code}`);
                          }
                          setActiveView('clients');
                        }
                      }}
                      className="font-bold text-slate-900 hover:text-indigo-600 hover:underline transition-colors"
                      title="Buka direktori klien"
                    >
                      {activeFPK.clientName}
                    </button>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-slate-800">
                      {formatCompactRupiah(contractValue)}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-slate-800">
                      {personnelQuota} petugas
                    </span>
                  </div>

                  {/* Line 2: Diajukan oleh Dimas Wicaksono (Pemasaran), 28 Okt 2026 · terlambat 2 hari */}
                  <div className="text-[11px] text-slate-500">
                    Diajukan oleh <strong className="text-slate-700 font-semibold">{activeFPK.createdBy || 'Dimas Wicaksono (Pemasaran)'}</strong>, {formatReadableDate(activeFPK.createdAt)}
                    {isPending && (
                      <>
                        <span className="text-slate-300"> · </span>
                        <span className="text-rose-700 font-bold">terlambat 2 hari</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/40">
              
              {/* Stepper Progres */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="relative flex items-center justify-between">
                    {/* Connecting Line */}
                    <div className="absolute top-3.5 left-5 right-5 h-0.5 bg-slate-200 -z-0"></div>

                    {/* Step 1: Diajukan */}
                    <div className="relative z-10 flex flex-col items-center text-center w-24">
                      <div className="w-7 h-7 rounded-full border bg-emerald-50 border-emerald-300 text-emerald-700 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <span className="text-[11px] block font-bold text-slate-900 leading-tight">Diajukan</span>
                        <span className="text-[10px] block text-slate-500 font-medium">28 Okt 2026</span>
                      </div>
                    </div>

                    {/* Step 2: Telaah Divisi */}
                    <div className="relative z-10 flex flex-col items-center text-center w-24">
                      <div className="w-7 h-7 rounded-full border bg-emerald-50 border-emerald-300 text-emerald-700 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <span className="text-[11px] block font-bold text-slate-900 leading-tight">Telaah Divisi</span>
                        <span className="text-[10px] block text-slate-500 font-medium">30 Okt 2026</span>
                      </div>
                    </div>

                    {/* Step 3: Analisis Keuangan */}
                    <div className="relative z-10 flex flex-col items-center text-center w-24">
                      <div className="w-7 h-7 rounded-full border bg-emerald-50 border-emerald-300 text-emerald-700 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <span className="text-[11px] block font-bold text-slate-900 leading-tight">Keuangan</span>
                        <span className="text-[10px] block text-slate-500 font-medium">1 Nov 2026</span>
                      </div>
                    </div>

                    {/* Step 4: Keputusan Direksi */}
                    <div className="relative z-10 flex flex-col items-center text-center w-24">
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                        isApproved 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                          : 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-50 shadow-xs'
                      }`}>
                        {isApproved ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <span className="w-2 h-2 rounded-full bg-white"></span>}
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <span className="text-[11px] block font-bold text-slate-900 leading-tight">Keputusan Direksi</span>
                        <span className={`text-[10px] block font-medium ${isApproved ? 'text-slate-500' : 'text-rose-600 font-bold'}`}>
                          {isApproved ? 'Selesai' : 'batas 9 Nov'}
                        </span>
                      </div>
                    </div>

                    {/* Step 5: Proyek Dibuka */}
                    <div className="relative z-10 flex flex-col items-center text-center w-24">
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                        isApproved 
                          ? 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-50' 
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}>
                        {isApproved ? <span className="w-2 h-2 rounded-full bg-white"></span> : <span className="text-[10px] font-semibold">5</span>}
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <span className={`text-[11px] block font-bold leading-tight ${isApproved ? 'text-slate-900' : 'text-slate-500'}`}>
                          Proyek Dibuka
                        </span>
                        <span className="text-[10px] block text-slate-400 font-medium">
                          {isApproved ? 'Aktif' : 'Tahap akhir'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kotak Keputusan Direksi (Aksi Utama) */}
              <div className="bg-white rounded-xl border-2 border-indigo-200 shadow-2xs p-4 sm:p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Keputusan Direksi
                  </h3>
                  {isPending && (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                      Terlambat 2 hari
                    </span>
                  )}
                </div>

                {/* 3 Alasan Singkat */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>3 divisi menyetujui</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Margin 17,7% (standar ≥ 15%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Petugas siap dalam 10 hari</span>
                  </div>
                </div>

                {/* Action Buttons: Direksi Only */}
                {isBOD ? (
                  isPending ? (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleApprove(activeFPK)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Setujui Kerja Sama</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReturn(activeFPK)}
                        className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                      >
                        Kembalikan ke Pemasaran
                      </button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => handleReject(activeFPK)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                        >
                          Tolak Pengajuan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
                      ✓ Keputusan telah disahkan oleh Direksi: <strong>{activeFPK.status}</strong>
                    </div>
                  )
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                    {isPending ? 'Menunggu keputusan persetujuan Dewan Direksi.' : `Pengajuan berstatus: ${activeFPK.status}`}
                  </div>
                )}
              </div>

              {/* Ringkasan */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ringkasan Ruang Lingkup
                </h3>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {activeFPK.securityScope || 'Pemeriksaan akses gerbang rantai dingin, ruang monitor suhu, dan pos jembatan timbang.'}
                </p>
              </div>

              {/* Telaah Divisi: 3 Baris Ringkas */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Telaah Divisi
                  </h3>
                  <span className="text-[11px] text-slate-400">Klik baris untuk rincian</span>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {/* Operasional */}
                  <div 
                    onClick={() => setSelectedReviewModal({
                      dept: 'Operasional',
                      reviewer: activeFPK.operationsReview.reviewedBy || 'Aris Wijaya',
                      date: formatReadableDate(activeFPK.operationsReview.reviewedAt) || '30 Okt 2026',
                      summary: 'Lokasi siap, pos layak',
                      fullNote: activeFPK.operationsReview.notes || 'Tata letak pos jaga dan dermaga logistik sesuai standar pergudangan.',
                      details: [
                        { label: 'Kesiapan Lokasi', value: activeFPK.operationsReview.locationReadiness === 'Ready' ? 'Siap' : 'Perlu Survei' },
                        { label: 'Survei Lapangan', value: activeFPK.operationsReview.surveyRequired ? 'Wajib' : 'Tidak Perlu' },
                        { label: 'Kelayakan Personel', value: activeFPK.operationsReview.personnelFeasibility === 'Feasible' ? 'Layak' : 'Kritis' },
                      ]
                    })}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                      <strong className="text-slate-900 font-semibold w-24 shrink-0">Operasional</strong>
                      <span className="text-slate-600 truncate group-hover:text-indigo-600 transition-colors">
                        Lokasi siap, pos layak
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
                  </div>

                  {/* Rekrutmen */}
                  <div 
                    onClick={() => setSelectedReviewModal({
                      dept: 'Rekrutmen (SDM)',
                      reviewer: activeFPK.recruitmentReview.reviewedBy || 'Maya Indah',
                      date: formatReadableDate(activeFPK.recruitmentReview.reviewedAt) || '30 Okt 2026',
                      summary: '25 petugas, 10 hari',
                      fullNote: activeFPK.recruitmentReview.notes || '15 personel cadangan dari wilayah Cikarang siap dialokasikan.',
                      details: [
                        { label: 'Metode Pemenuhan', value: activeFPK.recruitmentReview.sourcingMethod === 'Internal Mutation' ? 'Mutasi Internal' : 'Rekrutmen Baru' },
                        { label: 'Kepastian Personel', value: activeFPK.recruitmentReview.headcountFeasibility === 'Confirmed' ? 'Tercukupi' : 'Parsial' },
                        { label: 'Estimasi Penyiapan', value: `${activeFPK.recruitmentReview.estimatedLeadTimeDays || 10} Hari` },
                      ]
                    })}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                      <strong className="text-slate-900 font-semibold w-24 shrink-0">Rekrutmen</strong>
                      <span className="text-slate-600 truncate group-hover:text-indigo-600 transition-colors">
                        25 petugas, 10 hari
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
                  </div>

                  {/* Pengadaan */}
                  <div 
                    onClick={() => setSelectedReviewModal({
                      dept: 'Pengadaan & Logistik',
                      reviewer: activeFPK.procurementReview.reviewedBy || 'Rian Prasetyo',
                      date: formatReadableDate(activeFPK.procurementReview.reviewedAt) || '30 Okt 2026',
                      summary: 'Seragam & alat tersedia',
                      fullNote: activeFPK.procurementReview.notes || 'Kelengkapan seragam dinas harian (PDH) tersedia lengkap di inventaris.',
                      details: [
                        { label: 'Ketersediaan Stok', value: activeFPK.procurementReview.materialAvailability === 'Full Stock' ? 'Tersedia Lengkap' : 'Parsial' },
                        { label: 'Seragam PDH/PDL', value: activeFPK.procurementReview.uniformReadiness === 'Available' ? 'Tersedia di Gudang' : 'Perlu Pengadaan' },
                        { label: 'Alat Pengamanan', value: activeFPK.procurementReview.equipmentReadiness === 'Available' ? 'Tersedia' : 'Perlu Beli' },
                      ]
                    })}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                      <strong className="text-slate-900 font-semibold w-24 shrink-0">Pengadaan</strong>
                      <span className="text-slate-600 truncate group-hover:text-indigo-600 transition-colors">
                        Seragam & alat tersedia
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
                  </div>
                </div>
              </div>

              {/* Analisis Keuangan: Ringkas 1 baris */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Analisis Keuangan
                </h3>
                <div className="text-xs text-slate-800 font-semibold flex items-center gap-2 flex-wrap">
                  <span>Biaya <strong className="text-slate-900">{formatCompactRupiah(estimatedCost)}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>Nilai <strong className="text-slate-900">{formatCompactRupiah(contractValue)}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>Margin <strong className="text-emerald-700">{marginPercent.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong></span>
                </div>
              </div>

              {/* Dokumen Lampiran */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Dokumen
                </h3>
                <div className="space-y-2">
                  {[
                    { name: activeFPK.boqAttachmentName || 'BOQ_Graha_Logistik_Draft.pdf', label: 'Lampiran Rincian Biaya (BOQ)' },
                    { name: activeFPK.dealProofName || 'LOI_Graha_Logistik.pdf', label: 'Surat Minat Kerjasama (LOI)' },
                  ].map((doc, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewDocument({ title: doc.label, filename: doc.name })}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-900 group-hover:text-indigo-600 block text-xs">
                            📄 {doc.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{doc.label}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Aktivitas Terakhir */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                  Aktivitas
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                    <div className="min-w-0">
                      <span className="text-slate-800 font-medium block">Keuangan selesai</span>
                      <span className="text-[10px] text-slate-400">1 Nov 2026 · Siti Rahma</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                    <div className="min-w-0">
                      <span className="text-slate-800 font-medium block">Pengadaan setuju</span>
                      <span className="text-[10px] text-slate-400">30 Okt 2026 · Rian Prasetyo</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                    <div className="min-w-0">
                      <span className="text-slate-800 font-medium block">Rekrutmen setuju</span>
                      <span className="text-[10px] text-slate-400">30 Okt 2026 · Maya Indah</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                    <div className="min-w-0">
                      <span className="text-slate-800 font-medium block">Operasional setuju</span>
                      <span className="text-[10px] text-slate-400">29 Okt 2026 · Aris Wijaya</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                    <div className="min-w-0">
                      <span className="text-slate-800 font-medium block">Diajukan Dimas</span>
                      <span className="text-[10px] text-slate-400">28 Okt 2026 · Pemasaran</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal Detail Catatan Telaah Divisi (z-[60] di atas drawer z-50) */}
      {selectedReviewModal && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Telaah Kelayakan Divisi
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedReviewModal.dept}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReviewModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {selectedReviewModal.details.map((d, i) => (
                  <div key={i}>
                    <span className="text-slate-400 block text-[10px]">{d.label}</span>
                    <strong className="text-slate-800 text-xs">{d.value}</strong>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-semibold block text-[11px]">Catatan Penelaah:</span>
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                  &ldquo;{selectedReviewModal.fullNote}&rdquo;
                </p>
              </div>

              <div className="text-[11px] text-slate-400 pt-1">
                Diverifikasi sah oleh <strong>{selectedReviewModal.reviewer}</strong> pada {selectedReviewModal.date}.
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedReviewModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal Dokumen Pratinjau (z-[60] di atas drawer z-50) */}
      {previewDocument && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{previewDocument.filename}</h3>
                  <span className="text-[11px] text-slate-500">{previewDocument.title}</span>
                </div>
              </div>
              <button
                onClick={() => setPreviewDocument(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Pratinjau Berkas Resmi Pengajuan</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Dokumen lampiran tersimpan secara aman di repositori internal PT JISS.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setPreviewDocument(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                Selesai Membaca
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
