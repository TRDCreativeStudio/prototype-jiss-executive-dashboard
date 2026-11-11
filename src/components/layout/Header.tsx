import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X,
  Menu,
  ChevronDown,
  Users,
  Check,
  Search,
  Bell,
  LayoutGrid
} from 'lucide-react';
import { UserRole } from '../../types';

export const Header: React.FC = () => {
  const { 
    activeView, 
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
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Dashboard';
      case 'clients': return 'Direktori Klien';
      case 'projects': return 'Daftar Proyek';
      case 'project-detail': return 'Detail Proyek';
      case 'fpk': return 'Kerja Sama Baru';
      case 'kontrak':
      case 'spk':
      case 'memos': return 'Kontrak (SPK)';
      case 'sites':
      case 'deployment': return 'Deployments & Sites';
      case 'personnel': return 'Personnel Directory';
      case 'tasks': return 'Tugas & Persetujuan';
      case 'users': return 'Pengguna & Akses';
      case 'audit': return 'Data Induk & Riwayat';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-zinc-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 font-sans shadow-2xs">
      
      {/* Zone 1: Mobile Hamburger + Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-1.5 -ml-1 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg lg:hidden transition-colors shrink-0"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-zinc-600">
          <LayoutGrid className="w-4 h-4 text-zinc-500 shrink-0" />
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-900 text-xs sm:text-sm">
            {getViewTitle()}
          </span>
        </div>
      </div>

      {/* Zone 2: Search, Bell, Date, Time, User Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-xs text-zinc-600">
        
        {/* Search icon */}
        <button
          type="button"
          className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
          title="Pencarian cepat"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notification bell with badge */}
        <button
          type="button"
          className="relative p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
          title="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>

        <div className="h-4 w-[1px] bg-zinc-200 hidden md:block"></div>

        {/* Date: e.g. "Rabu, 14 Oktober 2024" or "Kamis, 12 Nov 2026" */}
        <div className="hidden md:block font-medium text-zinc-700">
          Kamis, 12 November 2026
        </div>

        {/* Time: "10:43 WIB" */}
        <div className="hidden lg:block font-semibold text-zinc-900 font-mono">
          10:43 WIB
        </div>

        <div className="h-4 w-[1px] bg-zinc-200 hidden sm:block"></div>

        {/* User Profile dropdown */}
        <div ref={roleSwitcherRef} className="relative">
          <button
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            className="flex items-center gap-2 p-1 hover:bg-zinc-100 rounded-lg transition-colors text-left"
            title="Ganti Pengguna / Simulasi Peran"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-[#FFDE00] text-zinc-950 text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
              {currentUser.avatarInitials}
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-900">
                {currentUser.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          </button>

          {/* Role Switcher Dropdown */}
          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-3.5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Ganti Peran Pengguna
                  </span>
                  <span className="text-xs text-zinc-600 font-medium">
                    Pilih akun untuk simulasi alur divisi
                  </span>
                </div>
                <Users className="w-4 h-4 text-zinc-400" />
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 py-1">
                {users.map((u) => {
                  const isSelected = u.id === currentUser.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setRoleSwitcherOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-zinc-50 transition-colors ${
                        isSelected ? 'bg-amber-50/60' : ''
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#FFDE00] text-black' : 'bg-zinc-200 text-zinc-700'
                        }`}>
                          {u.avatarInitials}
                        </div>
                        <div className="truncate">
                          <div className={`text-xs font-semibold truncate ${isSelected ? 'text-zinc-950' : 'text-zinc-800'}`}>
                            {u.name}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate">
                            {u.title}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-zinc-900 shrink-0" />}
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
        <div className="absolute top-16 left-1/2 -translate-x-1/2 mt-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-top-2 bg-white max-w-[calc(100vw-2rem)] sm:max-w-lg">
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
          {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
          {notification.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
          <span className="text-zinc-800 font-medium leading-snug truncate sm:whitespace-normal">
            {notification.message}
          </span>
          <button
            onClick={() => setNotification(null)}
            className="text-zinc-400 hover:text-zinc-600 p-0.5 ml-auto sm:ml-2 shrink-0"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
