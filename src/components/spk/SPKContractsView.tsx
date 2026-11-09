import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ScrollText, 
  Check, 
  X, 
  FileCheck, 
  AlertCircle, 
  Clock, 
  Flame, 
  ChevronRight,
  ShieldCheck,
  Search
} from 'lucide-react';

export const SPKContractsView: React.FC = () => {
  const { spks, fpks, currentUser, verifySPK, setSelectedProjectId, setActiveView } = useApp();
  const [selectedSPKId, setSelectedSPKId] = useState<string>(spks[1]?.id || spks[0]?.id || '');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const selectedSPK = spks.find(s => s.id === selectedSPKId) || spks[0];
  const matchedFPK = fpks.find(f => f.id === selectedSPK.fpkReferenceId);

  // Reconciliation analysis
  const fpkValue = matchedFPK?.financeAssessment.contractValueRp || 0;
  const spkValue = selectedSPK.contractValueRp;
  const isValueExactMatch = fpkValue === spkValue;
  const isValueTranche = fpkValue > 0 && spkValue < fpkValue;
  
  const fpkQuota = matchedFPK?.estimatedPersonnel || 0;
  const spkQuota = selectedSPK.personnelQuota;
  const isQuotaExactMatch = fpkQuota === spkQuota;
  const isQuotaTranche = fpkQuota > 0 && spkQuota < fpkQuota;

  const fpkStartDate = matchedFPK?.targetStartDate;
  const spkStartDate = selectedSPK.contractStart;
  const isDateMatch = !fpkStartDate || fpkStartDate === spkStartDate;

  const canVerify = currentUser.role === 'Finance' || currentUser.role === 'BOD' || currentUser.canVerifyFinance;

  const filteredSPKs = spks.filter(s => 
    s.spkNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Verifikasi & Manajemen Kontrak SPK
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pencocokan dokumen resmi SPK dari klien terhadap kesepakatan FPK guna mengesahkan nilai tagihan dan melindungi operasional dari risiko hukum.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg font-medium text-slate-700">
            Total Dokumen: {spks.length} ({spks.filter(s => s.verificationStatus === 'Verified').length} Sah)
          </span>
        </div>
      </div>

      {/* Main Split Layout: SPK List vs SPK-FPK Reconciliation Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: SPKs List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor SPK, nama klien, atau proyek..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="space-y-2">
            {filteredSPKs.map((spk) => {
              const isSelected = spk.id === selectedSPK.id;
              const isPending = spk.verificationStatus === 'Pending Verification';

              return (
                <div
                  key={spk.id}
                  onClick={() => setSelectedSPKId(spk.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`}>
                      {spk.spkNumber}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      spk.verificationStatus === 'Verified'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {spk.verificationStatus === 'Verified' ? 'Terverifikasi' : 'Menunggu Verifikasi'}
                    </span>
                  </div>

                  <h4 className={`text-sm font-bold mt-1.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {spk.clientName}
                  </h4>
                  <div className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    Kuota: {spk.personnelQuota} Petugas · Nilai: Rp {spk.contractValueRp.toLocaleString('id-ID')}
                  </div>

                  {isPending && (
                    <div className="mt-2 text-[10px] text-amber-400 font-medium flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      Memerlukan Verifikasi Keuangan
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: SPK Verification & FPK Comparison Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Rincian Dokumen Kontrak
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedSPK.spkNumber}</h3>
                <p className="text-xs text-slate-500">{selectedSPK.projectName}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase block font-medium">Status</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded inline-block mt-0.5 ${
                  selectedSPK.verificationStatus === 'Verified'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedSPK.verificationStatus === 'Verified' ? 'Terverifikasi (Aktif)' : 'Menunggu Verifikasi'}
                </span>
              </div>
            </div>

            {/* Document metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-500 block font-medium">Mulai Kontrak</span>
                <span className="font-mono font-bold text-slate-900">{selectedSPK.contractStart}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Selesai Kontrak</span>
                <span className="font-mono font-bold text-slate-900">{selectedSPK.contractEnd}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Kuota Petugas</span>
                <span className="font-bold text-slate-900">{selectedSPK.personnelQuota} Petugas</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Nilai Kontrak</span>
                <span className="font-mono font-bold text-slate-900">
                  Rp {selectedSPK.contractValueRp.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* FPK vs SPK Comparison Matrix */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pencocokan Data: Kesepakatan FPK vs Dokumen SPK
                </h4>
                <span className="text-xs text-slate-500">
                  Rujukan: {matchedFPK?.fpkNumber || 'FPK Terkait'}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
                <table className="min-w-[540px] w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Komponen Kesepakatan</th>
                      <th className="px-4 py-2.5">Persetujuan FPK Awal</th>
                      <th className="px-4 py-2.5">Dokumen SPK Klien</th>
                      <th className="px-4 py-2.5 text-center">Status Kesesuaian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-slate-700">Nilai Kontrak</td>
                      <td className="px-4 py-2.5 font-mono">
                        Rp {matchedFPK?.financeAssessment.contractValueRp.toLocaleString('id-ID') || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                        Rp {selectedSPK.contractValueRp.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isValueExactMatch ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Sesuai
                          </span>
                        ) : isValueTranche ? (
                          <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 text-[11px]" title="Alokasi tahap lokasi dalam satu kesepakatan FPK induk">
                            <Check className="w-3.5 h-3.5 text-indigo-600" /> Alokasi Tahap
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Terdapat Selisih
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-slate-700">Jumlah Petugas</td>
                      <td className="px-4 py-2.5">
                        {fpkQuota} Petugas (Total FPK)
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        {selectedSPK.personnelQuota} Petugas
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isQuotaExactMatch ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Sesuai
                          </span>
                        ) : isQuotaTranche ? (
                          <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 text-[11px]" title="Alokasi kuota petugas untuk lokasi ini">
                            <Check className="w-3.5 h-3.5 text-indigo-600" /> {selectedSPK.personnelQuota}/{fpkQuota} Petugas Lokasi
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Beda Kuota
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-slate-700">Tanggal Mulai Layanan</td>
                      <td className="px-4 py-2.5 font-mono">
                        {matchedFPK?.targetStartDate || selectedSPK.contractStart}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                        {selectedSPK.contractStart}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isDateMatch ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Sesuai
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 text-[11px]" title="Mulai bertugas bertahap sesuai jadwal lokasi">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Jadwal Bertahap
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Finance Verification Sign-off Box */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Tindakan Verifikasi Divisi Keuangan
                  </h4>
                  <p className="text-xs text-slate-500">
                    Hanya dokumen SPK yang telah diverifikasi yang sah diakui sebagai kontrak aktif.
                  </p>
                </div>
                {selectedSPK.verifiedBy && (
                  <div className="text-xs text-slate-500">
                    Diverifikasi oleh: <strong>{selectedSPK.verifiedBy}</strong> pada {selectedSPK.verifiedAt}
                  </div>
                )}
              </div>

              {selectedSPK.verificationStatus === 'Pending Verification' ? (
                canVerify ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Catatan verifikasi (contoh: Nilai kontrak dan kuota personel sesuai kesepakatan)..."
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <button
                        onClick={() => verifySPK(selectedSPK.id, true, verificationNotes)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        Konfirmasi & Sahkan SPK (Kontrak Aktif)
                      </button>

                      <button
                        onClick={() => verifySPK(selectedSPK.id, false, verificationNotes || 'Terdapat selisih dokumen')}
                        className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
                      >
                        Kembalikan untuk Diperbaiki
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Verifikasi kontrak memerlukan kewenangan <strong>Divisi Keuangan (Siti Rahma)</strong>. Silakan beralih peran melalui tombol di pojok kanan bawah.
                    </span>
                  </div>
                )
              ) : (
                <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  SPK ini telah diverifikasi dan resmi aktif dalam sistem pemantauan operasional JISS.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
