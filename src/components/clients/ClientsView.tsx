import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  Search, 
  ChevronRight, 
  Mail, 
  Phone, 
  FolderKanban
} from 'lucide-react';

export const ClientsView: React.FC = () => {
  const { clients, projects, setSelectedProjectId, setActiveView } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Direktori Klien & Mitra Kerja Sama
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar perusahaan mitra pengguna jasa pengamanan JISS beserta kontrak kerja sama aktif yang sedang berjalan.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total Klien: <span className="font-bold text-slate-900">{clients.length} Perusahaan</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari nama klien, kode, atau sektor industri..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
        />
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map((client) => {
          const clientProjects = projects.filter((p) => p.clientId === client.id);

          return (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {client.code}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{client.industry}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{client.name}</h3>
                </div>

                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {client.contractStatus === 'Active' ? 'Kontrak Aktif' : 'Tahap Negosiasi'}
                </span>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Penanggung Jawab:</span>
                  <span className="font-medium text-slate-800">{client.contactPerson}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{client.email}</span>
                </div>
              </div>

              {/* Linked Projects */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Proyek Kerja Sama Berjalan ({clientProjects.length})
                </span>

                <div className="space-y-1.5">
                  {clientProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setActiveView('project-detail');
                      }}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-between cursor-pointer transition-colors border border-slate-200/60"
                    >
                      <div>
                        <span className="font-semibold text-xs text-slate-900 block">{p.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {p.status === 'Active' ? 'Aktif' : 'Persiapan'} · {p.totalAssignedPersonnel}/{p.totalRequiredPersonnel} petugas
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {p.overallReadinessPercent}%
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
