import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  UserCheck, 
  KeyRound, 
  Check, 
  X, 
  History, 
  Database,
  Building2,
  MapPin
} from 'lucide-react';

export const RolesUsersView: React.FC<{ initialTab?: 'users' | 'roles' | 'audit' }> = ({ initialTab = 'users' }) => {
  const { users, currentUser, switchUser, auditLogs, areas, sites } = useApp();
  const [tab, setTab] = useState<'users' | 'roles' | 'audit'>(initialTab);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Manajemen Hak Akses & Pembagian Tugas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pengaturan kewenangan pengguna berdasarkan tanggung jawab jabatan serta rekaman riwayat seluruh aktivitas operasional sistem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
            Peran Aktif: {currentUser.role} ({currentUser.name})
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setTab('users')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            tab === 'users'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Akun Pengguna & Kewenangan ({users.length})
        </button>

        <button
          onClick={() => setTab('roles')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            tab === 'roles'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Tanggung Jawab Tiap Divisi
        </button>

        <button
          onClick={() => setTab('audit')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            tab === 'audit'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Catatan Aktivitas Sistem ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {tab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-2xs">
            <table className="min-w-[700px] w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Nama Pengguna & Email</th>
                  <th className="px-4 py-3">Peran Divisi</th>
                  <th className="px-4 py-3">Jabatan & Tanggung Jawab</th>
                  <th className="px-4 py-3 text-center">Persetujuan Direksi</th>
                  <th className="px-4 py-3 text-center">Verifikasi SPK</th>
                  <th className="px-4 py-3 text-center">Konfirmasi Jaga</th>
                  <th className="px-4 py-3 text-right">Simulasi Akun</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className={isCurrent ? 'bg-indigo-50/50' : 'hover:bg-slate-50/60'}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                            {u.avatarInitials}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-normal">
                                  Aktif
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono block">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                          {u.role}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {u.title}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {u.canApproveBOD ? (
                          <Check className="w-4 h-4 text-emerald-600 mx-auto stroke-[2.5]" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {u.canVerifyFinance ? (
                          <Check className="w-4 h-4 text-emerald-600 mx-auto stroke-[2.5]" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {u.canConfirmStartGuard ? (
                          <Check className="w-4 h-4 text-emerald-600 mx-auto stroke-[2.5]" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {!isCurrent ? (
                          <button
                            onClick={() => switchUser(u.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                          >
                            Ganti ke Peran Ini
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Sedang Digunakan</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES MATRIX */}
      {tab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { role: 'Pemasaran (Marketing)', desc: 'Menjalin hubungan dengan klien, menginput data FPK baru, menerima dokumen SPK klien, dan mengirimkan surat pemberitahuan perpanjangan (H-60).' },
            { role: 'Operasional Lapangan', desc: 'Menilai kelayakan lokasi penjagaan, melakukan survei fisik bila diperlukan, dan mengevaluasi alokasi personel di pos jaga.' },
            { role: 'Rekrutmen Personel', desc: 'Memastikan pemenuhan kuota petugas pengamanan melalui jalur mutasi internal maupun rekrutmen baru yang bersertifikat.' },
            { role: 'SDM & Administrasi (HR)', desc: 'Mengelola pangkalan data personel, ukuran seragam & sepatu dinas, pencatatan sertifikasi K3/Gada Pratama, dan surat tugas.' },
            { role: 'Pengawas Wilayah (PIC Area)', desc: 'Memimpin operasional di wilayah tertentu, inspeksi pos jaga harian, dan mengonfirmasi serah terima jaga fisik (Mulai Bertugas).' },
            { role: 'Pengadaan & Logistik', desc: 'Memastikan ketersediaan stok seragam PDH/PDL, sepatu dinas, handy-talkie, metal detector, dan perlengkapan pos jaga.' },
            { role: 'Keuangan (Finance)', desc: 'Menghitung estimasi biaya operasional bulanan, proyeksi margin, dan mencocokkan dokumen SPK klien terhadap kesepakatan FPK.' },
            { role: 'Direksi (BOD)', desc: 'Memberikan persetujuan akhir kerja sama komersial, mengesahkan pembentukan proyek baru, dan mengawasi risiko pos tanpa SPK.' },
            { role: 'Admin Sistem', desc: 'Mengatur hak akses pengguna, memelihara master data wilayah/lokasi, dan memantau riwayat audit sistem.' },
          ].map(r => (
            <div key={r.role} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <span className="font-bold text-xs bg-slate-100 px-2.5 py-1 rounded text-slate-800 inline-block">
                {r.role}
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: AUDIT LEDGER */}
      {tab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Catatan Riwayat & Aktivitas Sistem
            </h3>
            <span className="text-xs text-slate-500">{auditLogs.length} Catatan Tersimpan</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      log.type === 'APPROVAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {log.type === 'APPROVAL' ? 'PERSETUJUAN' : log.type}
                    </span>
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="text-slate-500">— {log.user} ({log.userRole})</span>
                  </div>
                  <p className="text-slate-600 text-xs">{log.details}</p>
                </div>
                <span className="text-slate-400 shrink-0 text-[11px] font-mono">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
