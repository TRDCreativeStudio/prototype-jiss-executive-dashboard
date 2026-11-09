import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X,
  Plus,
  Menu,
  FolderKanban
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    selectedProject, 
    projects, 
    setSelectedProjectId,
    notification, 
    setNotification,
    currentUser,
    setMobileMenuOpen
  } = useApp();

  const getBreadcrumbTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Dashboard Operasional Eksekutif';
      case 'clients': return 'Direktori Klien';
      case 'projects': return 'Daftar Proyek & Lokasi Penjagaan';
      case 'project-detail': return `Detail Proyek: ${selectedProject?.name || 'Proyek Aktif'}`;
      case 'fpk': return 'Persetujuan FPK Lintas Divisi';
      case 'spk': return 'Verifikasi & Manajemen Kontrak SPK';
      case 'memos': return 'Pemantauan Masa Berlaku Kontrak (H-75 s/d H-30)';
      case 'sites':
      case 'deployment': return 'Pemantauan Penempatan & Pos Jaga';
      case 'personnel': return 'Data Personel Penjagaan & Kelengkapan';
      case 'tasks': return 'Pusat Tugas & Persetujuan Kerja';
      case 'users': return 'Manajemen Pengguna & Kewenangan';
      case 'audit': return 'Data Induk & Catatan Aktivitas';
      default: return 'Ringkasan';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Zone 1: Mobile Hamburger + Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden transition-colors shrink-0"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="text-slate-400 font-medium text-xs hidden md:inline shrink-0">
          Operasional JISS
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden md:inline shrink-0" />
        
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
            {getBreadcrumbTitle()}
          </span>

          {selectedProject?.isJalanTanpaSPK && (
            <span className="shrink-0 text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 sm:px-2 py-0.5 rounded font-semibold border border-amber-300 hidden sm:inline-block">
              Tanpa SPK: {selectedProject.daysOperatingWithoutSPK} Hari
            </span>
          )}
        </div>
      </div>

      {/* Zone 2: Project Fast Switcher & Primary Action */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          <label htmlFor="project-picker" className="text-slate-500 font-medium hidden xl:inline">
            Proyek Aktif:
          </label>
          <select
            id="project-picker"
            value={selectedProject?.id || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-900 rounded-lg px-2 sm:px-2.5 py-1.5 font-medium transition-colors cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-slate-900 max-w-[140px] sm:max-w-[200px] md:max-w-[240px] truncate"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.clientName.split(' ')[1] || p.clientName} — {p.name.slice(0, 24)}...
              </option>
            ))}
          </select>
        </div>

        {currentUser.role === 'Marketing' && (
          <button
            onClick={() => setActiveView('fpk')}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            title="Ajukan Pembukaan Kerjasama Baru"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buat FPK</span>
          </button>
        )}

        <button
          onClick={() => setActiveView(activeView === 'project-detail' ? 'dashboard' : 'project-detail')}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
          title={activeView === 'project-detail' ? 'Kembali ke Dashboard Utama' : 'Buka Detail Proyek Lengkap'}
        >
          <FolderKanban className="w-3.5 h-3.5 sm:hidden" />
          <span className="hidden sm:inline">
            {activeView === 'project-detail' ? 'Dashboard' : 'Detail Proyek'}
          </span>
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 mt-2 px-4 py-2.5 rounded-lg shadow-lg border text-xs flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-top-2 bg-white max-w-[calc(100vw-2rem)] sm:max-w-lg">
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
          {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
          {notification.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
          <span className="text-slate-800 font-medium leading-snug truncate sm:whitespace-normal">
            {notification.message}
          </span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 ml-auto sm:ml-2 shrink-0"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
