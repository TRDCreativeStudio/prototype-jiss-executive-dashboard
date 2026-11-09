import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  UserPlus, 
  ArrowRightLeft, 
  Search, 
  Check, 
  MapPin, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Personnel } from '../../types';

export const PersonnelView: React.FC = () => {
  const { personnel, sites, areas, assignGuardToSite } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState<string>('All');
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [selectedTargetSiteId, setSelectedTargetSiteId] = useState<string>(sites[0]?.id || '');

  const filtered = personnel.filter(p => {
    const matchesSearch = 
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.personnelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = filterArea === 'All' || p.areaName.includes(filterArea);
    return matchesSearch && matchesArea;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Data Personel Penjagaan & Kelengkapan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pangkalan data resmi seluruh petugas keamanan, riwayat penempatan pos jaga, ukuran seragam & sepatu, serta status sertifikasi.
          </p>
        </div>
        <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 font-medium">
          Total Petugas: <span className="font-bold">{personnel.length} Orang</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, NIP (SEC-...), atau jabatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
          <span className="text-slate-500 font-medium">Wilayah:</span>
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          >
            <option value="All">Semua Wilayah</option>
            <option value="Jakarta">Jabodetabek & Sekitarnya</option>
            <option value="Sulawesi">Sulawesi Tengah</option>
          </select>
        </div>
      </div>

      {/* Personnel Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-2xs">
        <table className="min-w-[760px] w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-3">NIP & Nama Lengkap</th>
              <th className="px-4 py-3">Jabatan</th>
              <th className="px-4 py-3">Penempatan Wilayah & Pos Jaga</th>
              <th className="px-4 py-3">Status Karyawan</th>
              <th className="px-4 py-3">Ukuran Seragam / Sepatu</th>
              <th className="px-4 py-3">Status Tugas</th>
              <th className="px-4 py-3 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((person) => (
              <tr key={person.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="font-mono text-[10px] text-slate-400 block">{person.personnelId}</span>
                  <span className="font-bold text-slate-900 text-sm">{person.fullName}</span>
                </td>

                <td className="px-4 py-3.5">
                  <span className="font-semibold text-slate-800">{person.position}</span>
                  <span className="text-[10px] text-slate-400 block">
                    K3: {person.k3Certified ? 'Bersertifikasi' : 'Standar'}
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{person.siteName || 'Belum Ditempatkan / Cadangan'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block pl-5">{person.areaName}</span>
                </td>

                <td className="px-4 py-3.5">
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {person.employmentStatus === 'PKWT' ? 'Kontrak PKWT' : person.employmentStatus}
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  <span className="font-semibold text-slate-800">Baju: {person.uniformSize}</span>
                  <span className="text-[10px] text-slate-400 block">Sepatu: {person.shoeSize}</span>
                </td>

                <td className="px-4 py-3.5">
                  <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                    person.assignmentStatus === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {person.assignmentStatus === 'Active' ? 'Aktif Menjaga' : 'Cadangan'}
                  </span>
                </td>

                <td className="px-4 py-3.5 text-right">
                  {!person.siteId ? (
                    <button
                      onClick={() => {
                        setSelectedTargetSiteId(sites[0]?.id || '');
                        setShowAssignModal(person.id);
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded text-xs transition-colors"
                    >
                      Tempatkan ke Lokasi
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Sudah Ditempatkan</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Penempatan Petugas ke Lokasi Jaga</h3>
            <p className="text-xs text-slate-500">
              Pilih lokasi penempatan pos jaga untuk petugas ini:
            </p>

            <select
              value={selectedTargetSiteId}
              onChange={(e) => setSelectedTargetSiteId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.siteCode})</option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAssignModal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  assignGuardToSite(showAssignModal, selectedTargetSiteId);
                  setShowAssignModal(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Simpan Penempatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
