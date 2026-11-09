import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Flame, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    projects, 
    spks, 
    fpks, 
    sites, 
    tasks, 
    externalMemos, 
    setSelectedProjectId, 
    setActiveView 
  } = useApp();

  const activeProjectsCount = projects.filter(p => p.status === 'Active' || p.status === 'Mobilizing').length;
  const activeSPKCount = spks.filter(s => s.verificationStatus === 'Verified').length;
  const jalanTanpaSPKProjects = projects.filter(p => p.isJalanTanpaSPK);
  const expiringSoonCount = spks.filter(s => s.isExpiringSoon).length;

  const handleOpenProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveView('project-detail');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header: Clean & focused */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Dashboard Kendali Operasional
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau kesiapan proyek, verifikasi kontrak kerja sama, dan penempatan petugas di lapangan secara langsung.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-medium hidden sm:block">
          Pusat Kendali Terpadu
        </div>
      </div>

      {/* KPI Cards: 4 decision-driving operational metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <button
          onClick={() => setActiveView('projects')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all group"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-slate-700 flex items-center justify-between">
            <span>Proyek Aktif</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {activeProjectsCount}
            </span>
            <span className="text-xs text-slate-400">Kerja Sama</span>
          </div>
        </button>

        {/* Metric 2 */}
        <button
          onClick={() => setActiveView('spk')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all group"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-emerald-700 flex items-center justify-between">
            <span>SPK Terverifikasi</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
              {activeSPKCount}
            </span>
            <span className="text-xs text-emerald-700 font-medium">Kontrak Sah</span>
          </div>
        </button>

        {/* Metric 3 */}
        <button
          onClick={() => setActiveView('projects')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all group"
        >
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              Operasional Tanpa SPK
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-600 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 font-mono tabular-nums">
              {jalanTanpaSPKProjects.length}
            </span>
            <span className="text-xs text-amber-700 font-medium">Perlu Tindak Lanjut</span>
          </div>
        </button>

        {/* Metric 4 */}
        <button
          onClick={() => setActiveView('memos')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-rose-400 hover:shadow-xs transition-all group"
        >
          <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              Mendekati Berakhir
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-600 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600 font-mono tabular-nums">
              {expiringSoonCount}
            </span>
            <span className="text-xs text-rose-700 font-medium">H-75 s/d H-30</span>
          </div>
        </button>
      </div>

      {/* Actionable Alert: Jalan Tanpa SPK (Only visible if active) */}
      {jalanTanpaSPKProjects.length > 0 && (
        <section className="bg-amber-50/80 border border-amber-300 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                Peringatan: Pos Penjagaan Beroperasi Tanpa SPK Sah
              </h2>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Perlu Tindakan Verifikasi
            </span>
          </div>

          <div className="space-y-2">
            {jalanTanpaSPKProjects.map(p => (
              <div 
                key={p.id}
                className="bg-white p-3 rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{p.clientName} — {p.name}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Telah bertugas selama <strong>{p.daysOperatingWithoutSPK} hari</strong> tanpa SPK terverifikasi · Nilai kontrak belum terlindungi: <strong>Rp {p.unverifiedContractValueRp.toLocaleString('id-ID')}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveView('spk')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold transition-colors shadow-xs"
                  >
                    Verifikasi SPK Sekarang
                  </button>
                  <button
                    onClick={() => handleOpenProject(p.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition-colors"
                  >
                    Lihat Proyek
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Primary Section: Active Projects Readiness & Deployment Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
            Daftar Proyek Aktif & Penempatan Lokasi
          </h2>
          <button
            onClick={() => setActiveView('projects')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Lihat semua proyek ({projects.length})
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-2xs">
          <table className="min-w-[650px] w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Klien & Nama Proyek</th>
                <th className="px-4 py-3">Lokasi Jaga</th>
                <th className="px-4 py-3">Dokumen SPK</th>
                <th className="px-4 py-3">Petugas Ditempatkan</th>
                <th className="px-4 py-3">Status Legalitas</th>
                <th className="px-4 py-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => {
                const projectSites = sites.filter(s => p.siteIds.includes(s.id));
                const projectSPKs = spks.filter(s => p.spkIds.includes(s.id));
                const verifiedSPKCount = projectSPKs.filter(s => s.verificationStatus === 'Verified').length;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-[10px] text-slate-500 font-semibold">{p.clientName}</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{p.name}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{projectSites.length} Lokasi</span>
                      <div className="text-[10px] text-slate-500">
                        {projectSites.filter(s => s.startGuardConfirmed).length} aktif menjaga
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{projectSPKs.length} SPK</span>
                      <div className="text-[10px] text-slate-500">
                        {verifiedSPKCount} terverifikasi
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 font-mono">
                        {p.totalAssignedPersonnel} / {p.totalRequiredPersonnel}
                      </span>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${Math.min(100, (p.totalAssignedPersonnel / p.totalRequiredPersonnel) * 100)}%` }}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {p.isJalanTanpaSPK ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          <Flame className="w-3 h-3 text-amber-600" /> Tanpa SPK ({p.daysOperatingWithoutSPK} hr)
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">
                          Kontrak Sah
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenProject(p.id)}
                        className="font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
                      >
                        Periksa <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Secondary Row: Upcoming Contract Expirations & Pending Approvals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expiring Contracts Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              Kontrak Mendekati Berakhir (H-75 s/d H-30)
            </span>
            <button
              onClick={() => setActiveView('memos')}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Lihat Memo
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {externalMemos.map(memo => (
              <div key={memo.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{memo.clientName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    SPK: {memo.spkNumber} · Tahapan: {memo.stage}
                  </div>
                </div>

                <button
                  onClick={() => setActiveView('memos')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 shrink-0"
                >
                  Catat Respons
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Approvals Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Tugas & Persetujuan Tertunda
            </span>
            <button
              onClick={() => setActiveView('tasks')}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {tasks.filter(t => t.status !== 'Completed').slice(0, 3).map(task => (
              <div key={task.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{task.title}</div>
                  <div className="text-[10px] text-slate-500">
                    Penanggung Jawab: {task.assignedRole} · Batas Waktu: {task.dueDate}
                  </div>
                </div>

                <button
                  onClick={() => setActiveView(task.relatedEntity === 'FPK' ? 'fpk' : task.relatedEntity === 'SPK' ? 'spk' : 'tasks')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold whitespace-nowrap shrink-0"
                >
                  Tinjau
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
