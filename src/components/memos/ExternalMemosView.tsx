import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronRight,
  FileCheck,
  Building2,
  Calendar
} from 'lucide-react';

export const ExternalMemosView: React.FC = () => {
  const { externalMemos, spks, currentUser, sendRenewalMemo, recordClientResponse } = useApp();
  const [selectedMemoId, setSelectedMemoId] = useState<string>(externalMemos[0]?.id || '');
  const [proofFile, setProofFile] = useState('Surat_Tanda_Terima_Klien_Signed.pdf');

  const selectedMemo = externalMemos.find(m => m.id === selectedMemoId) || externalMemos[0];
  const selectedSpk = spks.find(s => s.id === selectedMemo?.spkId);
  const daysToExpiration = selectedSpk?.daysToExpiration ?? 54;
  const contractEnd = selectedSpk?.contractEnd ?? '-';
  const contractValueRp = selectedSpk?.contractValueRp ?? 0;
  const personnelQuota = selectedSpk?.personnelQuota ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Memo Pemberitahuan & Masa Berlaku Kontrak
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pengingat berkala untuk kontrak yang mendekati masa berakhir guna memastikan kelanjutan kerja sama dan kepastian alokasi personel.
          </p>
        </div>
        <div className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-lg font-bold">
          Jadwal Standar: H-75 hingga H-30
        </div>
      </div>

      {/* Expiration Milestone Guide Card */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-3">
        <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold block">
          Jadwal Pemantauan Kontrak Mendekati Berakhir
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="font-bold text-amber-300 font-mono block">H-75 Hari</span>
            <p className="text-slate-300 mt-0.5">Sistem otomatis membuat tugas bagi Pemasaran untuk menyiapkan evaluasi kinerja & proposal perpanjangan.</p>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="font-bold text-indigo-300 font-mono block">H-60 Hari</span>
            <p className="text-slate-300 mt-0.5">Surat resmi pemberitahuan perpanjangan dikirimkan kepada manajemen klien beserta draf penawaran.</p>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="font-bold text-emerald-300 font-mono block">H-30 Hari</span>
            <p className="text-slate-300 mt-0.5">Batas waktu pencatatan kepastian dari klien: perpanjang SPK, negosiasi ulang anggaran, atau demobilisasi pos.</p>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Memos List */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-700 uppercase block">
            Daftar Kontrak Mendekati Berakhir ({externalMemos.length})
          </span>

          <div className="space-y-2">
            {externalMemos.map((memo) => {
              const isSelected = memo.id === selectedMemo.id;
              const memoSpk = spks.find(s => s.id === memo.spkId);
              const mDays = memoSpk?.daysToExpiration ?? 54;
              const mEnd = memoSpk?.contractEnd ?? '-';
              return (
                <div
                  key={memo.id}
                  onClick={() => setSelectedMemoId(memo.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`}>
                      {memo.spkNumber}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      memo.stage === 'H-60'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}>
                      Tahap {memo.stage}
                    </span>
                  </div>

                  <h4 className={`text-sm font-bold mt-1.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {memo.clientName}
                  </h4>
                  <div className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    Sisa Waktu: <strong>{mDays} Hari</strong> (Berakhir: {mEnd})
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Memo Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">
                  Surat Pemberitahuan Perpanjangan Kontrak
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedMemo.clientName}</h3>
                <p className="text-xs text-slate-500 font-mono">No. SPK: {selectedMemo.spkNumber}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase block font-medium">Tahap Pemantauan</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-100 text-amber-800 inline-block mt-0.5">
                  Tahapan {selectedMemo.stage} ({daysToExpiration} Hari Tersisa)
                </span>
              </div>
            </div>

            {/* Memo Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-500 block font-medium">Tanggal Berakhir Kontrak</span>
                <span className="font-mono font-bold text-rose-600">{contractEnd}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Sisa Waktu Masa Tugas</span>
                <span className="font-bold text-slate-900">{daysToExpiration} Hari Lagi</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Nilai Kontrak Tahunan</span>
                <span className="font-mono font-bold text-slate-900">
                  Rp {contractValueRp.toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Kuota Petugas</span>
                <span className="font-bold text-slate-900">{personnelQuota} Petugas</span>
              </div>
            </div>

            {/* Action Step 1: Dispatch Renewal Memo (H-60) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  1. Pengiriman Memo Perpanjangan Resmi (Tahap H-60)
                </h4>
                {selectedMemo.dispatchDate ? (
                  <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Surat Terkirim
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Belum Dikirimkan
                  </span>
                )}
              </div>

              {selectedMemo.dispatchDate ? (
                <div className="text-xs text-slate-600 space-y-1">
                  <div>Telah dikirimkan pada: <strong>{selectedMemo.dispatchDate}</strong></div>
                  <div>Bukti Pengiriman Resmi: <strong className="font-mono">{selectedMemo.proofOfDeliveryName}</strong></div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600">
                    Kirimkan surat resmi pemberitahuan perpanjangan kepada perwakilan klien beserta proposal penawaran tarif baru.
                  </p>
                  <button
                    onClick={() => sendRenewalMemo(selectedMemo.id, proofFile)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Kirim Memo Perpanjangan ke Klien (Simulasi Kirim)
                  </button>
                </div>
              )}
            </div>

            {/* Action Step 2: Record Client Response (H-30) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  2. Pencatatan Kepastian Respons Klien (Tahap H-30)
                </h4>
                {selectedMemo.clientResponse ? (
                  <span className="text-emerald-700 font-semibold text-xs">
                    Respons Dicatat: {selectedMemo.clientResponse === 'Agree' ? 'Setuju' : selectedMemo.clientResponse === 'Negotiate' ? 'Negosiasi' : 'Tidak Lanjut'}
                  </span>
                ) : (
                  <span className="text-slate-500 text-xs">Menunggu Tanggapan Klien</span>
                )}
              </div>

              {selectedMemo.clientResponse ? (
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                  <div>Respons Klien: <strong>{selectedMemo.clientResponse === 'Agree' ? 'Setuju Perpanjang Kontrak' : selectedMemo.clientResponse === 'Negotiate' ? 'Perlu Negosiasi Ulang' : 'Tidak Melanjutkan'}</strong></div>
                  <div>Tindak Lanjut Operasional: <strong className="text-indigo-600">{selectedMemo.contractOutcome}</strong></div>
                  <div className="text-[11px] text-slate-400">Dicatat pada tanggal: {selectedMemo.responseDate}</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600">
                    Pilih keputusan klien setelah menerima surat pemberitahuan:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => recordClientResponse(selectedMemo.id, 'Agree', 'Extend SPK')}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      Klien Setuju Perpanjang
                    </button>
                    <button
                      onClick={() => recordClientResponse(selectedMemo.id, 'Negotiate', 'Revise BOQ & Margin')}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      Klien Ingin Negosiasi / Revisi BOQ
                    </button>
                    <button
                      onClick={() => recordClientResponse(selectedMemo.id, 'Not Continuing', 'Demobilize')}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      Klien Tidak Melanjutkan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
