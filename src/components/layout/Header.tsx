import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X,
  Plus,
  Menu,
  ChevronDown,
  Users,
  Check,
  Building2,
  ArrowLeft
} from 'lucide-react';
import { UserRole } from '../../types';

export const Header: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    selectedProject, 
    notification, 
    setNotification,
    currentUser,
    users,
    switchUser,
    setMobileMenuOpen
  } = useApp();

  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(event.target as Node)) {
        setRoleSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'BOD': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Finance': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Marketing': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Operations': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PIC Area': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Recruitment': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HR': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Procurement': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getBreadcrumbTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Dashboard Eksekutif';
      case 'clients': return 'Direktori Klien';
      case 'projects': return 'Daftar Proyek';
      case 'project-detail': return `Detail Proyek: ${selectedProject?.name || 'Proyek Aktif'}`;
      case 'fpk': return 'Persetujuan FPK Lintas Divisi';
      case 'kontrak':
      case 'spk':
      case 'memos': return 'Kontrak (SPK)';
      case 'sites':
      case 'deployment': return 'Penempatan & Lokasi Jaga';
      case 'personnel': return 'Data Petugas Penjagaan';
      case 'tasks': return 'Tugas & Persetujuan';
      case 'users': return 'Pengguna & Kewenangan';
      case 'audit': return 'Data Induk & Riwayat Aktivitas';
      default: return 'Dashboard Eksekutif';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Zone 1: Mobile Hamburger + Clean Unified Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden transition-colors shrink-0"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs hidden md:flex shrink-0">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>PT JISS</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden md:inline shrink-0" />
        
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
            {getBreadcrumbTitle()}
          </span>
        </div>
      </div>

      {/* Zone 2: Role Switcher & Contextual Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Back to dashboard if viewing project-detail */}
        {activeView === 'project-detail' && (
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kembali ke Dashboard</span>
          </button>
        )}

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

        {/* Embedded Role Switcher in Top Bar */}
        <div ref={roleSwitcherRef} className="relative">
          <button
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-left"
            title="Ganti Peran Pengguna / Simulasi"
          >
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {currentUser.avatarInitials}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                {currentUser.name.split(',')[0]}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {currentUser.role}
              </div>
            </div>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border hidden md:inline-block ${getRoleBadge(currentUser.role)}`}>
              {currentUser.role}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Role Switcher Dropdown Popover */}
          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ganti Peran Pengguna
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    Pilih akun untuk simulasi alur divisi
                  </span>
                </div>
                <Users className="w-4 h-4 text-slate-400" />
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 py-1">
                {users.map((u) => {
                  const isSelected = u.id === currentUser.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setRoleSwitcherOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {u.avatarInitials}
                        </div>
                        <div className="truncate">
                          <div className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                            {u.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {u.title}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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
