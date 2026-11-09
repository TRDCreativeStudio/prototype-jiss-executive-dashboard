import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldAlert, 
  CheckCircle2, 
  MapPin, 
  Check, 
  Clock, 
  Users, 
  AlertTriangle,
  FolderKanban
} from 'lucide-react';

export const DeploymentMonitoringView: React.FC = () => {
  const { sites, personnel, currentUser, confirmStartGuard, setSelectedProjectId, setActiveView } = useApp();

  const canConfirm = currentUser.role === 'PIC Area' || currentUser.canConfirmStartGuard || currentUser.role === 'BOD';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pemantauan Penempatan & Pos Jaga Lapangan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau pemenuhan kuota petugas keamanan di setiap pos jaga, deteksi dini kekurangan personel, dan konfirmasi serah terima tugas fisik di lapangan.
          </p>
        </div>

        <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 font-medium">
          Total Lokasi: {sites.length} ({sites.filter(s => s.startGuardConfirmed).length} Aktif Berjaga)
        </div>
      </div>

      {/* Sites Deployment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sites.map((site) => {
          const shortage = site.requiredPersonnel - site.assignedPersonnel;
          const assignedList = personnel.filter(p => site.assignedPersonnelIds.includes(p.id));

          return (
            <div
              key={site.id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {site.siteCode}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">{site.areaName}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{site.name}</h3>
                  <div className="text-xs text-slate-500">{site.projectName}</div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    site.startGuardConfirmed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {site.startGuardConfirmed ? 'Aktif Menjaga' : 'Tahap Persiapan'}
                  </span>
                </div>
              </div>

              {/* Guard Quota & Shortage Alert */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Kebutuhan</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{site.requiredPersonnel} org</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Terisi</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{site.assignedPersonnel} org</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Kekurangan</span>
                  <span className={`text-sm font-bold ${shortage > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {shortage > 0 ? `Kurang ${shortage}` : 'Lengkap'}
                  </span>
                </div>
              </div>

              {/* Start Guard Confirmation Status */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    Konfirmasi Mulai Tugas Lapangan:
                  </span>
                  {site.startGuardConfirmed ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sudah Bertugas
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <Clock className="w-4 h-4 text-amber-600" /> Menunggu Konfirmasi
                    </span>
                  )}
                </div>

                {site.startGuardConfirmed ? (
                  <div className="text-[11px] text-slate-500">
                    Dikonfirmasi oleh: <strong>{site.startGuardConfirmedBy}</strong> pada {site.startGuardTimestamp}
                  </div>
                ) : (
                  canConfirm ? (
                    <button
                      onClick={() => confirmStartGuard(site.id)}
                      className="w-full mt-2 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Konfirmasi Mulai Tugas (Pengawas Lapangan)
                    </button>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">
                      Silakan beralih ke peran <strong>Hendra Setiawan (Pengawas Lapangan)</strong> via tombol pojok kanan bawah untuk konfirmasi serah terima pos jaga.
                    </div>
                  )
                )}
              </div>

              {/* Assigned Guards Roster Mini */}
              <div className="text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-700 block">Daftar Petugas Ditempatkan:</span>
                <div className="flex flex-wrap gap-1.5">
                  {assignedList.length > 0 ? (
                    assignedList.map(p => (
                      <span key={p.id} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-700">
                        {p.fullName} ({p.position.split(' ')[0]})
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Belum ada petugas dijadwalkan di pos ini</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
