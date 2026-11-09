import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FolderKanban, 
  MapPin, 
  ScrollText, 
  Flame, 
  Check, 
  Clock, 
  ChevronRight, 
  Users, 
  Calendar,
  AlertTriangle,
  Building2
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const { projects, sites, spks, setSelectedProjectId, setActiveView } = useApp();
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filtered = projects.filter(p => statusFilter === 'All' || p.status === statusFilter);

  const handleOpenProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveView('project-detail');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Daftar Proyek & Kontrak Kerja Sama
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau seluruh kontrak kerja sama pengamanan aktif, pemenuhan kuota personel di tiap pos jaga, dan kelengkapan dokumen SPK.
          </p>
        </div>
        <div className="text-xs font-medium text-slate-600">
          Total Proyek: <span className="font-bold text-slate-900">{projects.length}</span>
        </div>
      </div>

      {/* Projects Cards Grid */}
      <div className="space-y-4">
        {filtered.map((proj) => {
          const linkedSites = sites.filter(s => proj.siteIds.includes(s.id));
          const linkedSPKs = spks.filter(s => proj.spkIds.includes(s.id));

          return (
            <div
              key={proj.id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {proj.projectCode}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase">{proj.clientName}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{proj.name}</h3>
                  <div className="text-xs text-slate-500">
                    Mulai Layanan: <strong>{proj.targetStartDate}</strong> · Target Selesai: <strong>{proj.projectEndDate || 'Sesuai SPK Berjalan'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {proj.isJalanTanpaSPK && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md">
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                      Tanpa SPK ({proj.daysOperatingWithoutSPK} Hari)
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                    proj.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}>
                    {proj.status === 'Active' ? 'Aktif Berjalan' : 'Tahap Persiapan'}
                  </span>
                </div>
              </div>

              {/* 2-Column Split: Linked Sites vs Linked SPKs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Physical Sites */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Lokasi Penjagaan Fisik ({linkedSites.length})
                    </span>
                    <span>Petugas</span>
                  </div>
                  <div className="divide-y divide-slate-200/60 text-xs">
                    {linkedSites.map(s => (
                      <div key={s.id} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-900 block">{s.name}</span>
                          <span className="text-[10px] text-slate-500">{s.areaName}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800 font-mono">{s.assignedPersonnel}/{s.requiredPersonnel}</span>
                          <span className={`block text-[10px] ${s.startGuardConfirmed ? 'text-emerald-600 font-medium' : 'text-amber-600'}`}>
                            {s.startGuardConfirmed ? 'Aktif Menjaga' : 'Persiapan'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contract SPKs */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
                    <span className="flex items-center gap-1.5">
                      <ScrollText className="w-3.5 h-3.5 text-emerald-600" />
                      Dokumen Kontrak SPK ({linkedSPKs.length})
                    </span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-slate-200/60 text-xs">
                    {linkedSPKs.length === 0 ? (
                      <div className="py-3 text-slate-400 text-[11px] italic">
                        Belum ada SPK diunggah untuk proyek ini
                      </div>
                    ) : (
                      linkedSPKs.map(spk => (
                        <div key={spk.id} className="py-2 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-slate-800 block">{spk.spkNumber}</span>
                            <span className="text-[10px] text-slate-500">
                              Berakhir: {spk.contractEnd} · Rp {spk.contractValueRp.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            spk.verificationStatus === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {spk.verificationStatus === 'Verified' ? 'Terverifikasi' : 'Menunggu'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                <div className="text-xs text-slate-600">
                  Tingkat Kesiapan: <strong className="text-slate-900">{proj.overallReadinessPercent}%</strong> · Personel Terisi: <strong>{proj.totalAssignedPersonnel}/{proj.totalRequiredPersonnel} Petugas</strong>
                </div>

                <button
                  onClick={() => handleOpenProject(proj.id)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors self-end sm:self-auto"
                >
                  Buka Rincian Proyek <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
