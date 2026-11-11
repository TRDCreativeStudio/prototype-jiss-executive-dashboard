import React from 'react';
import { useApp } from '../../context/AppContext';
import { useContracts } from '../../context/ContractContext';
import { 
  LayoutDashboard, 
  Building2, 
  FolderKanban, 
  FileText, 
  ScrollText, 
  Mail, 
  Users2, 
  ShieldAlert, 
  CheckSquare, 
  ShieldCheck, 
  Database,
  Layers,
  Flame,
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    mobileMenuOpen, 
    setMobileMenuOpen, 
    fpks, 
    spks, 
    projects, 
    tasks,
    currentUser
  } = useApp();
  const { myActionCount } = useContracts();

  const pendingFPKCount = fpks.filter(f => f.status === 'Under Review' || f.status === 'Financial Review' || f.status === 'Pending BOD').length;
  const isFPKMyAction = (currentUser.role === 'BOD' && fpks.some(f => f.status === 'Pending BOD')) ||
    (currentUser.role === 'Finance' && fpks.some(f => f.status === 'Financial Review')) ||
    (['Operations', 'Recruitment', 'Procurement'].includes(currentUser.role) && fpks.some(f => f.status === 'Under Review'));

  const pendingSPKVerifyCount = spks.filter(s => s.verificationStatus === 'Pending Verification').length;
  const isSPKMyAction = currentUser.role === 'Finance' && pendingSPKVerifyCount > 0;

  const expiringMemosCount = spks.filter(s => s.isExpiringSoon).length;
  const myOpenTasksCount = tasks.filter(t => t.assignedRole === currentUser.role && t.status !== 'Completed').length;
  const allOpenTasksCount = tasks.filter(t => t.status !== 'Completed').length;

  const handleNavigate = (viewKey: string) => {
    setActiveView(viewKey);
    setMobileMenuOpen(false);
  };

  const navItemClass = (viewKey: string) => {
    const isActive = activeView === viewKey ||
      (viewKey === 'deployment' && activeView === 'sites') ||
      (viewKey === 'kontrak' && (activeView === 'spk' || activeView === 'memos'));
    return `w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
      isActive
        ? 'bg-slate-800 text-white font-semibold shadow-inner border border-slate-700'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
    }`;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block leading-tight">
              OPERASIONAL JISS
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
              Sistem Kendali Layanan
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition-colors"
          aria-label="Tutup menu navigasi"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* UTAMA */}
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Menu Utama
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('dashboard')}
              className={navItemClass('dashboard')}
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-slate-400" />
                Dashboard Eksekutif
              </span>
            </button>
          </div>
        </div>

        {/* KOMERSIAL & KONTRAK */}
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Komersial & Kontrak
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('clients')}
              className={navItemClass('clients')}
            >
              <span className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                Direktori Klien
              </span>
            </button>

            <button
              onClick={() => handleNavigate('projects')}
              className={navItemClass('projects')}
            >
              <span className="flex items-center gap-2.5">
                <FolderKanban className="w-4 h-4 text-slate-400" />
                Daftar Proyek
              </span>
            </button>

            <button
              onClick={() => handleNavigate('fpk')}
              className={navItemClass('fpk')}
            >
              <span className="flex items-center gap-2.5 text-left min-w-0">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">Kerja Sama Baru</span>
              </span>
              {pendingFPKCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                  isFPKMyAction
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/60 font-medium'
                }`}>
                  {pendingFPKCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNavigate('kontrak')}
              className={navItemClass('kontrak')}
            >
              <span className="flex items-center gap-2.5">
                <ScrollText className="w-4 h-4 text-slate-400" />
                Kontrak (SPK)
              </span>
              {myActionCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  {myActionCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* OPERASIONAL LAPANGAN */}
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Operasional Lapangan
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('deployment')}
              className={navItemClass('deployment')}
            >
              <span className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-slate-400" />
                Penempatan Petugas
              </span>
            </button>

            <button
              onClick={() => handleNavigate('personnel')}
              className={navItemClass('personnel')}
            >
              <span className="flex items-center gap-2.5">
                <Users2 className="w-4 h-4 text-slate-400" />
                Data Petugas
              </span>
            </button>
          </div>
        </div>

        {/* RUANG KERJA */}
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Ruang Kerja
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('tasks')}
              className={navItemClass('tasks')}
            >
              <span className="flex items-center gap-2.5">
                <CheckSquare className="w-4 h-4 text-slate-400" />
                Tugas & Persetujuan
              </span>
              {allOpenTasksCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  myOpenTasksCount > 0
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/60 font-medium'
                }`}>
                  {myOpenTasksCount > 0 ? myOpenTasksCount : allOpenTasksCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* PENGATURAN */}
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Pengaturan & Akses
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('users')}
              className={navItemClass('users')}
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                Pengguna & Hak Akses
              </span>
            </button>

            <button
              onClick={() => handleNavigate('audit')}
              className={navItemClass('audit')}
            >
              <span className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-slate-400" />
                Data Induk & Riwayat
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* System Status Footnote */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 shrink-0">
        <div className="text-[10px] text-slate-400 leading-relaxed">
          <span className="text-indigo-400 font-semibold">Alur Layanan:</span> Pengajuan → Penelaahan → Pelaksanaan → Verifikasi Kontrak
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <aside className="fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
