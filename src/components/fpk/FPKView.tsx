import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FileText, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Upload, 
  Send,
  Sparkles,
  ShieldAlert,
  FolderKanban
} from 'lucide-react';
import { FPK } from '../../types';

export const FPKView: React.FC = () => {
  const { 
    fpks, 
    currentUser, 
    submitDepartmentReview, 
    submitFinanceAssessment, 
    decideBOD,
    createFPK,
    setSelectedProjectId,
    setActiveView 
  } = useApp();

  const [selectedFPKId, setSelectedFPKId] = useState<string>(fpks[2]?.id || fpks[0]?.id || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBODDecisionModal, setShowBODDecisionModal] = useState(false);
  const [bodAction, setBODAction] = useState<'Approved' | 'Returned' | 'Rejected'>('Approved');
  const [returnReason, setReturnReason] = useState('');
  const [previewDocument, setPreviewDocument] = useState<{
    title: string;
    filename: string;
    type: 'BOQ' | 'LOI';
  } | null>(null);

  // Finance assessment inputs
  const [financeCostInput, setFinanceCostInput] = useState(245000000);
  const [financeMarginInput, setFinanceMarginInput] = useState(18.5);

  // New FPK Form
  const [newClientName, setNewClientName] = useState('PT Cikarang Kawasan Industri');
  const [newProjectName, setNewProjectName] = useState('Pengamanan Gerbang & Pos Cikarang Tahap 2');
  const [newPersonnelQty, setNewPersonnelQty] = useState(30);

  const selectedFPK = fpks.find(f => f.id === selectedFPKId) || fpks[0];

  const canReviewOps = currentUser.role === 'Operations' || currentUser.role === 'BOD';
  const canReviewRec = currentUser.role === 'Recruitment' || currentUser.role === 'BOD';
  const canReviewProc = currentUser.role === 'Procurement' || currentUser.role === 'BOD';
  const canAssessFinance = currentUser.role === 'Finance' || currentUser.role === 'BOD';
  const canDecideBOD = currentUser.role === 'BOD' || currentUser.canApproveBOD;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Approved': return 'Disetujui';
      case 'Pending BOD': return 'Menunggu Direksi';
      case 'Financial Review': return 'Telaah Keuangan';
      case 'Under Review': return 'Sedang Ditelaah';
      case 'Returned': return 'Dikembalikan';
      case 'Rejected': return 'Ditolak';
      default: return status;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Persetujuan FPK (Formulir Pembukaan Kerjasama)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Alur telaah kelayakan kontrak baru dari aspek kesiapan operasional, pemenuhan personel, pengadaan alat, perhitungan margin, hingga persetujuan akhir direksi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'Marketing' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              + Ajukan FPK Baru
            </button>
          )}
        </div>
      </div>

      {/* FPK Selector List */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {fpks.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFPKId(f.id)}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
              f.id === selectedFPK.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="font-mono text-[10px] text-slate-400">{f.fpkNumber}</div>
            <div className="font-bold">{f.clientName.split(' ')[1] || f.clientName}</div>
            <div className={`text-[10px] mt-0.5 font-medium ${
              f.status === 'Approved' ? 'text-emerald-400' : f.status === 'Pending BOD' ? 'text-indigo-400' : 'text-amber-400'
            }`}>
              {getStatusLabel(f.status)}
            </div>
          </button>
        ))}
      </div>

      {/* Selected FPK Deep Dive Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                {selectedFPK.fpkNumber}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-600 font-semibold">{selectedFPK.clientName}</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-400">Diajukan oleh: {selectedFPK.createdBy} pada {selectedFPK.createdAt}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{selectedFPK.projectName}</h2>
            <p className="text-xs text-slate-600 max-w-2xl">{selectedFPK.securityScope}</p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Status Alur</span>
            <span className={`text-sm font-bold px-3 py-1 rounded-md inline-block mt-0.5 ${
              selectedFPK.status === 'Approved'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : selectedFPK.status === 'Pending BOD'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : selectedFPK.status === 'Returned'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {getStatusLabel(selectedFPK.status)}
            </span>

            {selectedFPK.createdProjectId && (
              <button
                onClick={() => {
                  setSelectedProjectId(selectedFPK.createdProjectId!);
                  setActiveView('project-detail');
                }}
                className="block text-xs font-semibold text-indigo-600 hover:text-indigo-800 mt-2 text-right"
              >
                Buka Detail Proyek Terkait $\rightarrow$
              </button>
            )}
          </div>
        </div>

        {/* Supporting Deal Attachments (Interactive Inspection UX-05) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div
            onClick={() => setPreviewDocument({
              title: `Rincian Anggaran Biaya (BOQ) — ${selectedFPK.projectName}`,
              filename: selectedFPK.boqAttachmentName,
              type: 'BOQ',
            })}
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer transition-all group"
            title="Klik untuk membuka rincian alokasi anggaran dan biaya"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 block font-medium group-hover:text-indigo-600">Dokumen BOQ</span>
              <span className="text-[10px] text-indigo-600 font-semibold">Buka Dokumen ↗</span>
            </div>
            <span className="font-semibold text-slate-900 font-mono flex items-center gap-1.5 mt-1 truncate">
              <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              {selectedFPK.boqAttachmentName}
            </span>
          </div>

          <div
            onClick={() => setPreviewDocument({
              title: `Surat Minat / Bukti Kesepakatan (LOI) — ${selectedFPK.clientName}`,
              filename: selectedFPK.dealProofName,
              type: 'LOI',
            })}
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer transition-all group"
            title="Klik untuk membuka bukti komitmen kerja sama dari klien"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 block font-medium group-hover:text-indigo-600">Bukti Kesepakatan (LOI)</span>
              <span className="text-[10px] text-indigo-600 font-semibold">Buka Dokumen ↗</span>
            </div>
            <span className="font-semibold text-slate-900 font-mono flex items-center gap-1.5 mt-1 truncate">
              <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              {selectedFPK.dealProofName}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
            <span className="text-slate-500 block font-medium">Kebutuhan Personel</span>
            <span className="font-bold text-slate-900 text-sm block mt-1">
              {selectedFPK.estimatedPersonnel} Petugas Keamanan Diajukan
            </span>
          </div>
        </div>

        {/* PARALLEL REVIEWS: OPERATIONS, RECRUITMENT, PROCUREMENT */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Telaah Kelayakan Bersama Lintas Divisi
            </h3>
            <span className="text-xs text-slate-500">
              Operasional, Rekrutmen, dan Pengadaan menelaah kesiapan secara serentak
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. OPERATIONS REVIEW */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs uppercase">
                  1. Kesiapan Operasional
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  selectedFPK.operationsReview.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {selectedFPK.operationsReview.status === 'Approved' ? 'Disetujui' : 'Menunggu'}
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                <div>Kesiapan Lokasi: <strong>{selectedFPK.operationsReview.locationReadiness === 'Ready' ? 'Siap' : selectedFPK.operationsReview.locationReadiness}</strong></div>
                <div>Perlu Survei: <strong>{selectedFPK.operationsReview.surveyRequired ? 'Ya (2 hari)' : 'Tidak Perlu'}</strong></div>
                <div>Kelayakan Pos: <strong>{selectedFPK.operationsReview.personnelFeasibility === 'Feasible' ? 'Layak' : selectedFPK.operationsReview.personnelFeasibility}</strong></div>
                {selectedFPK.operationsReview.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-1">"{selectedFPK.operationsReview.notes}"</p>
                )}
              </div>

              {selectedFPK.operationsReview.status !== 'Approved' && (
                canReviewOps ? (
                  <button
                    onClick={() => submitDepartmentReview(selectedFPK.id, 'Operations', { locationReadiness: 'Ready', surveyRequired: false, personnelFeasibility: 'Feasible', notes: 'Kesiapan lokasi telah diverifikasi dan siap.' })}
                    className="w-full px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
                  >
                    Konfirmasi Kelayakan Operasional
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic block">Beralih ke peran Operasional untuk menelaah</span>
                )
              )}
            </div>

            {/* 2. RECRUITMENT REVIEW */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs uppercase">
                  2. Kesiapan Rekrutmen (SDM)
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  selectedFPK.recruitmentReview.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {selectedFPK.recruitmentReview.status === 'Approved' ? 'Disetujui' : 'Menunggu'}
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                <div>Metode Pemenuhan: <strong>{selectedFPK.recruitmentReview.sourcingMethod === 'Combined' ? 'Mutasi + Rekrut Baru' : selectedFPK.recruitmentReview.sourcingMethod}</strong></div>
                <div>Kepastian Personel: <strong>{selectedFPK.recruitmentReview.headcountFeasibility === 'Confirmed' ? 'Tercukupi' : selectedFPK.recruitmentReview.headcountFeasibility}</strong></div>
                <div>Estimasi Penyiapan: <strong>{selectedFPK.recruitmentReview.estimatedLeadTimeDays} Hari</strong></div>
                {selectedFPK.recruitmentReview.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-1">"{selectedFPK.recruitmentReview.notes}"</p>
                )}
              </div>

              {selectedFPK.recruitmentReview.status !== 'Approved' && (
                canReviewRec ? (
                  <button
                    onClick={() => submitDepartmentReview(selectedFPK.id, 'Recruitment', { sourcingMethod: 'Combined', headcountFeasibility: 'Confirmed', estimatedLeadTimeDays: 14, notes: 'Kandidat bersertifikat telah disiapkan dalam pipeline.' })}
                    className="w-full px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
                  >
                    Konfirmasi Kelayakan Personel
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic block">Beralih ke peran Rekrutmen untuk menelaah</span>
                )
              )}
            </div>

            {/* 3. PROCUREMENT REVIEW */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs uppercase">
                  3. Kesiapan Perlengkapan & Seragam
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  selectedFPK.procurementReview.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {selectedFPK.procurementReview.status === 'Approved' ? 'Disetujui' : 'Menunggu'}
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                <div>Ketersediaan Stok: <strong>{selectedFPK.procurementReview.materialAvailability === 'Partial Stock' ? 'Stok Tersedia Sebagian' : selectedFPK.procurementReview.materialAvailability}</strong></div>
                <div>Seragam PDH/PDL: <strong>{selectedFPK.procurementReview.uniformReadiness === 'Available' ? 'Tersedia di Gudang' : selectedFPK.procurementReview.uniformReadiness}</strong></div>
                <div>Alat Pengamanan: <strong>{selectedFPK.procurementReview.equipmentReadiness === 'Need Procurement' ? 'Perlu Pemesanan Tambahan' : selectedFPK.procurementReview.equipmentReadiness}</strong></div>
                {selectedFPK.procurementReview.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-1">"{selectedFPK.procurementReview.notes}"</p>
                )}
              </div>

              {selectedFPK.procurementReview.status !== 'Approved' && (
                canReviewProc ? (
                  <button
                    onClick={() => submitDepartmentReview(selectedFPK.id, 'Procurement', { materialAvailability: 'Full Stock', uniformReadiness: 'Available', equipmentReadiness: 'Available', notes: 'Alat dan seragam telah dialokasikan dari gudang.' })}
                    className="w-full px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
                  >
                    Konfirmasi Ketersediaan Logistik
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic block">Beralih ke peran Logistik untuk menelaah</span>
                )
              )}
            </div>
          </div>
        </div>

        {/* FINANCE ASSESSMENT */}
        <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Tahap Keuangan · Analisis Biaya & Margin
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                Perhitungan Kelayakan Finansial & Profitabilitas
              </h4>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              selectedFPK.financeAssessment.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {selectedFPK.financeAssessment.status === 'Completed' ? 'Selesai Dihitung' : 'Menunggu Keuangan'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Estimasi Biaya Operasional</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                Rp {selectedFPK.financeAssessment.estimatedCostRp.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Proyeksi Nilai Kontrak Klien</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                Rp {selectedFPK.financeAssessment.contractValueRp.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Margin Bersih Proyeksi</span>
              <span className="text-sm font-bold text-emerald-600 font-mono">
                {selectedFPK.financeAssessment.calculatedMarginPercent}% (Standar Direksi $\ge$ 15%)
              </span>
            </div>
          </div>

          {selectedFPK.financeAssessment.status !== 'Completed' && (
            canAssessFinance ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => submitFinanceAssessment(selectedFPK.id, financeCostInput, financeMarginInput)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Kirim Hasil Perhitungan ke Direksi
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">
                Beralih ke peran Divisi Keuangan untuk menghitung biaya dan margin.
              </span>
            )
          )}
        </div>

        {/* BOD DECISION */}
        <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-indigo-900 uppercase">
                Persetujuan Akhir Direksi (BOD)
              </span>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">
                Otorisasi Bisnis (Membuka Izin Proyek & Mobilisasi Lapangan)
              </h4>
            </div>

            <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
              selectedFPK.bodDecision.status === 'Approved'
                ? 'bg-emerald-600 text-white'
                : selectedFPK.bodDecision.status === 'Returned'
                ? 'bg-rose-600 text-white'
                : 'bg-indigo-600 text-white'
            }`}>
              Direksi: {getStatusLabel(selectedFPK.bodDecision.status)}
            </span>
          </div>

          {selectedFPK.bodDecision.status === 'Approved' ? (
            <div className="bg-white p-4 rounded-lg border border-emerald-200 text-xs space-y-1">
              <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Disetujui oleh {selectedFPK.bodDecision.decidedBy} pada {selectedFPK.bodDecision.decidedAt}
              </div>
              <p className="text-slate-600">
                Proyek resmi terbentuk dalam sistem. Divisi Operasional dan SDM memiliki izin penuh untuk memulai mobilisasi dan penempatan personel penjagaan.
              </p>
            </div>
          ) : (
            canDecideBOD ? (
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <button
                  onClick={() => {
                    setBODAction('Approved');
                    setShowBODDecisionModal(true);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Setujui Kerja Sama (Buka Izin Mobilisasi)
                </button>

                <button
                  onClick={() => {
                    setBODAction('Returned');
                    setShowBODDecisionModal(true);
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
                >
                  Kembalikan ke Pemasaran
                </button>

                <button
                  onClick={() => {
                    setBODAction('Rejected');
                    setShowBODDecisionModal(true);
                  }}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition-colors"
                >
                  Tolak Pengajuan
                </button>
              </div>
            ) : (
              <div className="text-xs bg-white p-3 rounded-lg border border-indigo-200 text-indigo-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Persetujuan akhir kerja sama merupakan wewenang <strong>Direksi (Bambang Sutrisno)</strong>. Silakan beralih peran melalui tombol di pojok kanan bawah.
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* BOD Decision Confirmation Modal */}
      {showBODDecisionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Konfirmasi Keputusan Direksi: {bodAction === 'Approved' ? 'Setujui Pengajuan' : bodAction === 'Returned' ? 'Kembalikan Pengajuan' : 'Tolak Pengajuan'}
            </h3>
            <p className="text-xs text-slate-600">
              {bodAction === 'Approved'
                ? 'Menyetujui FPK ini akan secara otomatis membentuk data resmi proyek dan memberikan izin kerja bagi Operasional, Rekrutmen, dan Logistik untuk memulai mobilisasi.'
                : bodAction === 'Returned'
                ? 'Mengembalikan FPK ini memerlukan catatan evaluasi agar tim Pemasaran dapat merevisi nilai kesepakatan atau kuota personel.'
                : 'Menolak FPK ini akan membatalkan kerja sama. Mohon berikan alasan penolakan untuk catatan arsip perusahaan.'}
            </p>

            {(bodAction === 'Returned' || bodAction === 'Rejected') && (
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder={bodAction === 'Rejected' ? "Tuliskan alasan penolakan untuk catatan direksi..." : "Tuliskan alasan pengembalian (contoh: margin belum mencapai standar 15%)..."}
                className="w-full h-24 text-xs border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBODDecisionModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  decideBOD(selectedFPK.id, bodAction, returnReason);
                  setShowBODDecisionModal(false);
                }}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-colors ${
                  bodAction === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Konfirmasi {bodAction === 'Approved' ? 'Setujui' : bodAction === 'Returned' ? 'Kembalikan' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Document Inspection Modal (UX-05) */}
      {previewDocument && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {previewDocument.title}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    Dokumen: {previewDocument.filename} · Berkas Resmi Terverifikasi
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewDocument(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                aria-label="Tutup pratinjau dokumen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Content View */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 font-sans">
              {previewDocument.type === 'BOQ' ? (
                <>
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Klien / Pengajuan</span>
                      <span className="font-bold text-slate-900 text-sm">{selectedFPK.clientName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Nilai yang Diajukan</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        Rp {selectedFPK.financeAssessment.contractValueRp.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Headcount breakdown */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase mb-2">
                      Rincian Alokasi Petugas & Biaya Satuan
                    </h4>
                    <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-[11px] text-slate-600 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Jabatan / Jenjang</th>
                          <th className="px-3 py-2 text-center">Kuota</th>
                          <th className="px-3 py-2 text-right">Tarif Satuan (Rp/bln)</th>
                          <th className="px-3 py-2 text-right">Total Tagihan (Rp/bln)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        <tr>
                          <td className="px-3 py-2 font-sans font-semibold">Chief Security / Koordinator Area</td>
                          <td className="px-3 py-2 text-center">1 org</td>
                          <td className="px-3 py-2 text-right">9.500.000</td>
                          <td className="px-3 py-2 text-right">9.500.000</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-sans font-semibold">Komandan Regu (Danru)</td>
                          <td className="px-3 py-2 text-center">3 org</td>
                          <td className="px-3 py-2 text-right">7.800.000</td>
                          <td className="px-3 py-2 text-right">23.400.000</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-sans font-semibold">Anggota Petugas (Patroli & Pos)</td>
                          <td className="px-3 py-2 text-center">{Math.max(1, selectedFPK.estimatedPersonnel - 4)} org</td>
                          <td className="px-3 py-2 text-right">6.200.000</td>
                          <td className="px-3 py-2 text-right font-bold">
                            {(Math.max(1, selectedFPK.estimatedPersonnel - 4) * 6200000).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Equipment summary */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-[11px] space-y-1">
                    <span className="font-bold text-slate-800 uppercase block">Fasilitas & Perlengkapan Standar Termasuk:</span>
                    <p className="text-slate-600">
                      Seragam Lengkap PDH/PDL (2 pasang per personel), Sepatu Boots Keamanan, Walkie-Talkie VHF/UHF berizin, Metal Detector, Tongkat Pengaman, Jas Hujan, dan Senter Patroli LED.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Target Margin: <strong>{selectedFPK.financeAssessment.calculatedMarginPercent}%</strong></span>
                    <span>Status: Diverifikasi Keuangan & Siap Keputusan Direksi</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/40 space-y-4">
                    <div className="border-b border-slate-200 pb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide">
                          {selectedFPK.clientName}
                        </h4>
                        <span className="text-[11px] text-slate-500">Direktorat Pengadaan & Komersial Perusahaan</span>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                        SURAT MINAT RESMI
                      </span>
                    </div>

                    <div className="space-y-2 text-slate-700 leading-relaxed">
                      <p>
                        Dengan ini kami menyatakan minat resmi untuk menunjuk <strong>PT Jasa Integrated Security Services (JISS)</strong> sebagai mitra penyedia jasa pengamanan eksklusif untuk proyek <em>{selectedFPK.projectName}</em>.
                      </p>
                      <p className="text-slate-600">
                        Ruang lingkup mencakup pengamanan fisik 24/7, patroli perimeter, pengawasan gerbang akses, dan dukungan CCTV dengan alokasi awal sebanyak <strong>{selectedFPK.estimatedPersonnel} personel petugas keamanan</strong>.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                      <div>Penandatangan Sah: Direktur Umum & Operasional</div>
                      <div>Status: Berkas Resmi Mengikat</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Dokumen Internal Terverifikasi JISS
              </span>
              <button
                onClick={() => setPreviewDocument(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Tutup Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create FPK Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Ajukan FPK Baru (Inisiasi Tim Pemasaran)
            </h3>
            <p className="text-xs text-slate-500">
              Lengkapi informasi awal kerja sama untuk memulai telaah kesiapan bersama lintas divisi.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Perusahaan Klien</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Proyek / Lokasi Pengamanan</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Estimasi Kebutuhan Petugas Keamanan</label>
                <input
                  type="number"
                  value={newPersonnelQty}
                  onChange={(e) => setNewPersonnelQty(parseInt(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  createFPK({
                    clientName: newClientName,
                    projectName: newProjectName,
                    estimatedPersonnel: newPersonnelQty,
                  });
                  setShowCreateModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Kirim Pengajuan FPK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
