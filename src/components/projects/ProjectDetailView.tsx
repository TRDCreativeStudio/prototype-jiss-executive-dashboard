import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  MapPin, 
  ScrollText, 
  Flame, 
  Check, 
  Users, 
  Calendar, 
  ChevronRight, 
  ShieldCheck, 
  Clock, 
  ArrowRight
} from 'lucide-react';

export const ProjectDetailView: React.FC = () => {
  const { selectedProject, sites, spks, fpks, currentUser, confirmStartGuard, verifySPK, setActiveView } = useApp();

  const project = selectedProject;
  const linkedSites = sites.filter(s => project.siteIds.includes(s.id));
  const linkedSPKs = spks.filter(s => project.spkIds.includes(s.id));
  const matchedFPK = fpks.find(f => f.id === project.fpkId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans">
      {/* Project Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {project.projectCode}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-semibold text-slate-600 uppercase">{project.clientName}</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-400">Dasar Pengajuan FPK: {matchedFPK?.fpkNumber || project.fpkId}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Pusat data terpadu untuk pos jaga fisik, dokumen kontrak legalitas, dan alokasi personel pengamanan.
            </p>
          </div>

          <div className="flex items-center gap-4 text-right">
            {project.isJalanTanpaSPK && (
              <div className="text-right">
                <span className="text-[10px] uppercase text-amber-700 font-bold block">Status Operasional</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded border border-amber-300">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  Tanpa SPK ({project.daysOperatingWithoutSPK} Hari)
                </span>
              </div>
            )}

            <div className="pl-4 border-l border-slate-200">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Kesiapan Operasional</span>
              <span className="text-2xl font-bold font-mono text-emerald-600">
                {project.overallReadinessPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Project Meta Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block font-medium">Tanggal Mulai</span>
            <span className="font-mono font-bold text-slate-800">{project.targetStartDate}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Target Selesai Proyek</span>
            <span className="font-mono font-bold text-slate-800">{project.projectEndDate || 'Sesuai SPK Berjalan'}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Petugas Ditempatkan</span>
            <span className="font-mono font-bold text-slate-800">
              {project.totalAssignedPersonnel} / {project.totalRequiredPersonnel} Petugas
            </span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Nilai Kontrak Sah Terverifikasi</span>
            <span className="font-mono font-bold text-slate-800">
              Rp {linkedSPKs.filter(s => s.verificationStatus === 'Verified').reduce((acc, s) => acc + s.contractValueRp, 0).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Jalan Tanpa SPK Action Banner */}
        {project.isJalanTanpaSPK && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <Flame className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Pemberitahuan Operasional Tanpa SPK:</strong> Petugas telah bertugas di pos jaga berdasarkan FPK yang disetujui, namun dokumen SPK resmi belum diverifikasi oleh Divisi Keuangan. Nilai tagihan belum terlindungi: Rp {project.unverifiedContractValueRp.toLocaleString('id-ID')}.
              </span>
            </div>

            {linkedSPKs.length > 0 ? (
              <button
                onClick={() => setActiveView('spk')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold whitespace-nowrap shadow-xs transition-colors shrink-0"
              >
                Verifikasi SPK Sekarang $\rightarrow$
              </button>
            ) : (
              <span className="text-[11px] text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded border border-amber-300 shrink-0 font-medium">
                Menunggu Draf SPK dari Pemasaran
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sites & Locations Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            Lokasi Penjagaan Fisik ({linkedSites.length})
          </h3>
          <span className="text-xs text-slate-500">
            {linkedSites.filter(s => s.startGuardConfirmed).length}/{linkedSites.length} Pos Telah Aktif Menjaga
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {linkedSites.map(site => (
            <div key={site.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveView('deployment')}
                    className="font-mono font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-2 py-0.5 rounded transition-colors text-left"
                    title="Buka pemantauan penempatan lokasi ini"
                  >
                    {site.siteCode} ↗
                  </button>
                  <span className="font-bold text-slate-900 text-sm">{site.name}</span>
                </div>
                <div className="text-slate-500 text-[11px]">{site.address}</div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="font-bold text-slate-900 font-mono">{site.assignedPersonnel}/{site.requiredPersonnel}</span>
                  <span className="text-[10px] text-slate-400 block">Petugas Ditempatkan</span>
                </div>

                <div className="text-right">
                  {site.startGuardConfirmed ? (
                    <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Aktif Menjaga ({site.startGuardTimestamp?.slice(0, 10)})
                    </span>
                  ) : (
                    <button
                      onClick={() => confirmStartGuard(site.id)}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold shadow-xs transition-colors"
                    >
                      Konfirmasi Mulai Tugas
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract SPKs Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-emerald-600" />
            Dokumen Kontrak SPK Terkait ({linkedSPKs.length})
          </h3>
          <span className="text-xs text-slate-500">
            Satu proyek dapat mencakup beberapa dokumen SPK bertahap
          </span>
        </div>

        {linkedSPKs.length === 0 ? (
          <div className="py-6 text-center text-slate-500 space-y-1 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-700">Belum ada dokumen SPK terdaftar untuk proyek ini</p>
            <p className="text-[11px] text-slate-400">Tim Pemasaran perlu mengunggah dokumen SPK resmi dari klien setelah proses penandatanganan selesai.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {linkedSPKs.map(spk => (
              <div key={spk.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <button
                    onClick={() => setActiveView('spk')}
                    className="font-mono font-bold text-slate-900 text-sm block hover:text-indigo-600 transition-colors text-left"
                    title="Buka verifikasi SPK ini"
                  >
                    {spk.spkNumber} ↗
                  </button>
                  <span className="text-[11px] text-slate-500">
                    Masa Berlaku: {spk.contractStart} s/d {spk.contractEnd} · Kuota: {spk.personnelQuota} Petugas
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-slate-900">
                    Rp {spk.contractValueRp.toLocaleString('id-ID')}
                  </span>

                  <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                    spk.verificationStatus === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {spk.verificationStatus === 'Verified' ? 'Terverifikasi' : 'Menunggu Verifikasi'}
                  </span>

                  {spk.verificationStatus === 'Pending Verification' && (
                    <button
                      onClick={() => setActiveView('spk')}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
                    >
                      Verifikasi
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
