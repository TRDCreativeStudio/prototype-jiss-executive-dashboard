import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Check, 
  KeyRound,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { UserRole } from '../../types';

export const FloatingRoleSwitcher: React.FC = () => {
  const { currentUser, users, switchUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'BOD':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Finance':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Marketing':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Operations':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'PIC Area':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'Recruitment':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HR':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'Procurement':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'System Admin':
        return 'bg-slate-700 text-slate-200 border-slate-600';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'BOD': return 'Direksi (BOD)';
      case 'Finance': return 'Keuangan';
      case 'Marketing': return 'Pemasaran';
      case 'Operations': return 'Operasional';
      case 'PIC Area': return 'Pengawas Wilayah';
      case 'Recruitment': return 'Rekrutmen';
      case 'HR': return 'SDM (HR)';
      case 'Procurement': return 'Pengadaan & Logistik';
      case 'System Admin': return 'Admin Sistem';
      default: return role;
    }
  };

  return (
    <div ref={containerRef} className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 font-sans">
      {/* Expanded Popover */}
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-2rem)] max-w-sm sm:w-96 max-h-[75vh] sm:max-h-[82vh] flex flex-col bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold tracking-wide uppercase text-slate-200">
                  Simulasi Peran Pengguna
                </h4>
                <p className="text-[11px] text-slate-400">
                  Ganti peran untuk mencoba alur persetujuan tiap divisi
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              aria-label="Tutup pemilih peran"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Workflow Reminder */}
          <div className="px-3 py-2 bg-indigo-950/40 border-b border-indigo-900/40 text-[11px] text-indigo-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Alur:</strong> Pemasaran (FPK) $\rightarrow$ Operasional/SDM/Logistik $\rightarrow$ Keuangan $\rightarrow$ Direksi $\rightarrow$ Pengawas Lapangan.
            </span>
          </div>

          {/* Users List */}
          <div className="overflow-y-auto divide-y divide-slate-800/80 p-1.5 space-y-1">
            {users.map((user) => {
              const isSelected = user.id === currentUser.id;
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    switchUser(user.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-950/80 border border-indigo-500/60'
                      : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {user.avatarInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {user.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono border ${getRoleBadge(user.role)}`}>
                          {getRoleDisplayName(user.role)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {user.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>{user.department}</span>
                        {user.canApproveBOD && (
                          <span className="text-purple-300 font-medium">· Persetujuan Akhir Direksi</span>
                        )}
                        {user.canVerifyFinance && (
                          <span className="text-emerald-300 font-medium">· Verifikasi SPK</span>
                        )}
                        {user.canConfirmStartGuard && (
                          <span className="text-teal-300 font-medium">· Konfirmasi Mulai Tugas</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer with permission hint */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              Sistem Operasional Terintegrasi
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              9 Peran
            </span>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-3 bg-slate-900 text-white pl-3.5 pr-4 py-2.5 rounded-full shadow-2xl border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition-all active:scale-95"
        title="Ganti peran pengguna untuk simulasi akses"
        aria-label="Pilih peran pengguna"
      >
        <div className="relative">
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-inner">
            {currentUser.avatarInitials}
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
        </div>

        <div className="text-left">
          <div className="text-[11px] font-semibold text-white leading-tight flex items-center gap-1.5">
            <span>{currentUser.name}</span>
          </div>
          <div className="text-[10px] text-slate-400 leading-tight">
            Peran: <span className="text-indigo-300 font-medium">{getRoleDisplayName(currentUser.role)}</span>
          </div>
        </div>

        <div className="pl-1 border-l border-slate-700 text-slate-400 group-hover:text-white transition-colors">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </button>
    </div>
  );
};
