import React from 'react';
import { useApp } from '../../context/AppContext';
import { useContracts } from '../../context/ContractContext';
import { 
  LayoutDashboard, 
  Building2, 
  FolderKanban, 
  FileText, 
  ScrollText, 
  Users2, 
  ShieldAlert, 
  CheckSquare, 
  ShieldCheck, 
  Database,
  Shield,
  X,
  LogOut,
  GitFork
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    mobileMenuOpen, 
    setMobileMenuOpen, 
    fpks, 
    spks, 
    tasks,
    currentUser,
    switchUser
  } = useApp();
  const { myActionCount } = useContracts();

  const pendingFPKCount = fpks.filter(f => f.status === 'Under Review' || f.status === 'Financial Review' || f.status === 'Pending BOD').length;
  const isFPKMyAction = (currentUser.role === 'BOD' && fpks.some(f => f.status === 'Pending BOD')) ||
    (currentUser.role === 'Finance' && fpks.some(f => f.status === 'Financial Review')) ||
    (['Operations', 'Recruitment', 'Procurement'].includes(currentUser.role) && fpks.some(f => f.status === 'Under Review'));

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
    
    return `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
      isActive
        ? 'bg-[#FFDE00] text-zinc-950 font-bold shadow-xs'
        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 font-medium'
    }`;
  };

  const iconClass = (viewKey: string) => {
    const isActive = activeView === viewKey ||
      (viewKey === 'deployment' && activeView === 'sites') ||
      (viewKey === 'kontrak' && (activeView === 'spk' || activeView === 'memos'));
    return `w-4 h-4 shrink-0 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full select-none bg-[#0B0C0E] text-zinc-300">
      
      {/* Brand Header: Logo Shield Crest + PT. JISS Indonesia */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-zinc-800/80 bg-[#0B0C0E] shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo Badge: Golden Crest */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-[#FFDE00] to-yellow-300 p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-full bg-[#0B0C0E] flex items-center justify-center">
              <Shield className="w-4 h-4 fill-[#FFDE00] text-[#FFDE00]" />
            </div>
          </div>

          <div>
            <span className="font-bold text-sm tracking-tight text-white block leading-tight">
              PT. JISS Indonesia
            </span>
            <span className="text-[10px] text-zinc-400 tracking-wide font-medium block leading-tight mt-0.5">
              Security Operation System
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 lg:hidden transition-colors"
          aria-label="Tutup menu navigasi"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6">
        
        {/* MAIN MENU */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            MAIN MENU
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('dashboard')}
              className={navItemClass('dashboard')}
            >
              <span className="flex items-center gap-3">
                <LayoutDashboard className={iconClass('dashboard')} />
                <span>Dashboard</span>
              </span>
            </button>

            <button
              onClick={() => handleNavigate('personnel')}
              className={navItemClass('personnel')}
            >
              <span className="flex items-center gap-3">
                <Users2 className={iconClass('personnel')} />
                <span>Personnel Directory</span>
              </span>
            </button>

            <button
              onClick={() => handleNavigate('deployment')}
              className={navItemClass('deployment')}
            >
              <span className="flex items-center gap-3">
                <ShieldAlert className={iconClass('deployment')} />
                <span>Deployments &amp; Sites</span>
              </span>
            </button>
          </div>
        </div>

        {/* KOMERSIAL & KONTRAK */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            KOMERSIAL &amp; KONTRAK
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('clients')}
              className={navItemClass('clients')}
            >
              <span className="flex items-center gap-3">
                <Building2 className={iconClass('clients')} />
                <span>Direktori Klien</span>
              </span>
            </button>

            <button
              onClick={() => handleNavigate('projects')}
              className={navItemClass('projects')}
            >
              <span className="flex items-center gap-3">
                <FolderKanban className={iconClass('projects')} />
                <span>Daftar Proyek</span>
              </span>
            </button>

            <button
              onClick={() => handleNavigate('fpk')}
              className={navItemClass('fpk')}
            >
              <span className="flex items-center gap-3 text-left min-w-0">
                <FileText className={iconClass('fpk')} />
                <span className="truncate">Kerja Sama Baru</span>
              </span>
              {pendingFPKCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                  isFPKMyAction
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-medium'
                }`}>
                  {pendingFPKCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNavigate('kontrak')}
              className={navItemClass('kontrak')}
            >
              <span className="flex items-center gap-3">
                <ScrollText className={iconClass('kontrak')} />
                <span>Kontrak (SPK)</span>
              </span>
              {myActionCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  {myActionCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* RUANG KERJA & TUGAS */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            RUANG KERJA
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('tasks')}
              className={navItemClass('tasks')}
            >
              <span className="flex items-center gap-3">
                <CheckSquare className={iconClass('tasks')} />
                <span>Tugas &amp; Persetujuan</span>
              </span>
              {allOpenTasksCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  myOpenTasksCount > 0
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-medium'
                }`}>
                  {myOpenTasksCount > 0 ? myOpenTasksCount : allOpenTasksCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ADMINISTRATION */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            ADMINISTRATION
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('users')}
              className={navItemClass('users')}
            >
              <span className="flex items-center gap-3">
                <ShieldCheck className={iconClass('users')} />
                <span>Pengguna &amp; Akses</span>
              </span>
            </button>

            <button
              onClick={() => handleNavigate('audit')}
              className={navItemClass('audit')}
            >
              <span className="flex items-center gap-3">
                <Database className={iconClass('audit')} />
                <span>Data Induk &amp; Riwayat</span>
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Log Out Bottom Action */}
      <div className="p-4 border-t border-zinc-800/80 bg-[#0B0C0E] shrink-0">
        <button
          onClick={() => switchUser(currentUser.id === 'usr-1' ? 'usr-2' : 'usr-1')}
          className="flex items-center gap-2.5 text-xs text-zinc-400 hover:text-white transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-zinc-800/50"
          title="Keluar atau Ganti Akun"
        >
          <LogOut className="w-4 h-4 text-zinc-400" />
          <span>Log Out</span>
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0B0C0E] text-zinc-300 flex-col border-r border-zinc-800/80 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-[#0B0C0E] text-zinc-300 flex flex-col border-r border-zinc-800 shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
