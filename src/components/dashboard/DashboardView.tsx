import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  ChevronRight, 
  Eye, 
  Calendar, 
  Plus, 
  Scan, 
  HelpCircle,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    currentUser, 
    projects, 
    sites, 
    areas, 
    personnel, 
    spks, 
    tasks, 
    setActiveView, 
    setSelectedProjectId 
  } = useApp();

  const [dateFilter, setDateFilter] = useState('Today');

  // Format currency
  const formatCompactRupiah = (amount?: number) => {
    if (!amount) return 'Rp 0';
    if (amount >= 1_000_000_000) {
      return `Rp ${(amount / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} miliar`;
    }
    if (amount >= 1_000_000) {
      return `Rp ${(amount / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} juta`;
    }
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  // Mock ready personnel data matching the guideline image
  const readyOfficers = [
    {
      id: 'off-1',
      name: 'Wahyu Syahputra',
      code: 'JISS-332',
      position: 'Security Officer (Pratama)',
      certification: 'Gada Pratama',
      extraCert: '+1',
      offDuty: '1384 day',
      lastDeployment: 'SCBD Pacific Place Out...',
      lastDate: 'Last: 30 September 2026',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80'
    },
    {
      id: 'off-2',
      name: 'Wahyu Syahputra',
      code: 'JISS-332',
      position: 'Security Officer (Pratama)',
      certification: 'Gada Pratama',
      extraCert: '+1',
      offDuty: '1384 day',
      lastDeployment: 'SCBD Pacific Place Out...',
      lastDate: 'Last: 30 September 2026',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'
    },
    {
      id: 'off-3',
      name: 'Wahyu Syahputra',
      code: 'JISS-332',
      position: 'Security Officer (Pratama)',
      certification: 'Gada Pratama',
      extraCert: '+1',
      offDuty: '1384 day',
      lastDeployment: 'SCBD Pacific Place Out...',
      lastDate: 'Last: 30 September 2026',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80'
    },
    {
      id: 'off-4',
      name: 'Wahyu Syahputra',
      code: 'JISS-332',
      position: 'Security Officer (Pratama)',
      certification: 'Gada Pratama',
      extraCert: '+1',
      offDuty: '1384 day',
      lastDeployment: 'SCBD Pacific Place Out...',
      lastDate: 'Last: 30 September 2026',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&h=120&q=80'
    },
    {
      id: 'off-5',
      name: 'Wahyu Syahputra',
      code: 'JISS-332',
      position: 'Security Officer (Pratama)',
      certification: 'Gada Pratama',
      extraCert: '+1',
      offDuty: '1384 day',
      lastDeployment: 'SCBD Pacific Place Out...',
      lastDate: 'Last: 30 September 2026',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&h=120&q=80'
    }
  ];

  // Mock Active Sites list matching the design mockup image
  const displayActiveSites = [
    {
      id: 's-1',
      name: 'Menara Astra Headquarters Perimeters & Access',
      areaCount: 2,
      personnelCount: 75,
      contractPeriod: '12 - 26 Oct 2026',
      status: 'Active'
    },
    {
      id: 's-2',
      name: 'BCA Sentul Data Center',
      areaCount: 2,
      personnelCount: 75,
      contractPeriod: '12 - 26 Oct 2026',
      status: 'Active'
    },
    {
      id: 's-3',
      name: 'BCA Sentul Data Center',
      areaCount: 2,
      personnelCount: 75,
      contractPeriod: '12 - 26 Oct 2026',
      status: 'Active'
    },
    {
      id: 's-4',
      name: 'SCBD District Commercial Hub Patrol',
      areaCount: 1,
      personnelCount: 75,
      contractPeriod: '12 - 26 Oct 2026',
      status: 'Active'
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* 1. Header Greeting & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
            Selamat Datang, Ahmad Nurlan!
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Pantau seluruh personel, area, dan operasional keamanan hari ini.
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Today Filter dropdown button */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200/90 rounded-xl text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>Today</span>
              <span className="text-zinc-400 text-[10px]">⌵</span>
            </button>
          </div>

          {/* Primary Action Button: Signature Yellow */}
          <button
            type="button"
            onClick={() => setActiveView('deployment')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FFDE00] hover:bg-[#E6C800] text-zinc-950 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Buat Penugasan Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Three Metric KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Card 1: Personel Tersedia */}
        <div 
          onClick={() => setActiveView('personnel')}
          className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-4xl font-extrabold text-zinc-900 tracking-tight">
              100
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-700">
              <Scan className="w-4 h-4 text-zinc-700" />
            </div>
          </div>

          <div className="flex items-end justify-between mt-6 pt-2">
            <div>
              <div className="text-xs font-bold text-zinc-900">
                Personel Tersedia
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Siap ditugaskan hari ini
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </div>
        </div>

        {/* Card 2: Area Aktif */}
        <div 
          onClick={() => setActiveView('deployment')}
          className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-4xl font-extrabold text-zinc-900 tracking-tight">
              8 Area
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-700">
              <Scan className="w-4 h-4 text-zinc-700" />
            </div>
          </div>

          <div className="flex items-end justify-between mt-6 pt-2">
            <div>
              <div className="text-xs font-bold text-zinc-900">
                Area Aktif
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Area operasi yang sedang berjalan
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </div>
        </div>

        {/* Card 3: Available Personnel */}
        <div 
          onClick={() => setActiveView('personnel')}
          className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-4xl font-extrabold text-zinc-900 tracking-tight">
              100
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-700">
              <Scan className="w-4 h-4 text-zinc-700" />
            </div>
          </div>

          <div className="flex items-end justify-between mt-6 pt-2">
            <div>
              <div className="text-xs font-bold text-zinc-900">
                Available Personnel
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Standby &amp; ready for dispatch
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </div>
        </div>

      </div>

      {/* 3. Site Aktif (4) Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-700">
              <Scan className="w-4 h-4 text-zinc-700" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Site Aktif (4)
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Status terkini site dan area pengamanan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveView('projects')}
            className="text-xs font-semibold text-zinc-800 hover:text-black flex items-center gap-0.5 transition-colors"
          >
            <span>Lihat semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table of Active Sites */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-semibold text-zinc-400 pb-3">
                <th className="py-3 px-2 font-medium">Perusahaan / Proyek</th>
                <th className="py-3 px-4 font-medium">Area</th>
                <th className="py-3 px-4 font-medium">Total Personel</th>
                <th className="py-3 px-4 font-medium">Masa Kontrak ⓘ</th>
                <th className="py-3 px-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {displayActiveSites.map((site) => (
                <tr 
                  key={site.id}
                  onClick={() => setActiveView('projects')}
                  className="hover:bg-zinc-50/70 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-2.5">
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
                      <span className="font-semibold text-zinc-900 text-xs group-hover:text-black">
                        {site.name}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-zinc-600 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                      {site.areaCount} {site.areaCount > 1 ? 'Areas' : 'Area'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-medium text-zinc-700">
                    {site.personnelCount} orang
                  </td>

                  <td className="py-3.5 px-4 text-zinc-600 font-medium">
                    {site.contractPeriod}
                  </td>

                  <td className="py-3.5 px-2 text-right">
                    <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-bold text-white bg-[#22C55E] shadow-2xs">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* 4. Personel Siap Ditugaskan Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-700">
              <Scan className="w-4 h-4 text-zinc-700" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Personel Siap Ditugaskan
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Daftar personel dengan status off-duty terlama, direkomendasikan untuk penugasan berikutnya
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveView('personnel')}
            className="text-xs font-semibold text-zinc-800 hover:text-black flex items-center gap-0.5 transition-colors"
          >
            <span>Lihat 125+ lainnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table of Personnel */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-semibold text-zinc-400 pb-3">
                <th className="py-3 px-2 font-medium">Security Officer</th>
                <th className="py-3 px-4 font-medium">Position</th>
                <th className="py-3 px-4 font-medium">Skills / Certification</th>
                <th className="py-3 px-4 font-medium">Off-duty Period</th>
                <th className="py-3 px-4 font-medium">Last Deployment</th>
                <th className="py-3 px-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {readyOfficers.map((officer, idx) => (
                <tr 
                  key={idx}
                  className="hover:bg-zinc-50/70 transition-colors"
                >
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={officer.avatar}
                        alt={officer.name}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-200 shrink-0"
                      />
                      <div>
                        <div className="font-bold text-zinc-900 text-xs">
                          {officer.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          {officer.code}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-medium text-zinc-800">
                    {officer.position}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-[11px] font-medium">
                        {officer.certification}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[10px] font-semibold">
                        {officer.extraCert}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-zinc-600 font-medium">
                    {officer.offDuty}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-zinc-900">
                      {officer.lastDeployment}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {officer.lastDate}
                    </div>
                  </td>

                  <td className="py-3.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => setActiveView('personnel')}
                      className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors"
                      title="Lihat profil detail"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
