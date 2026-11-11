import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Flame, 
  Clock, 
  ChevronRight, 
  ShieldCheck, 
  Building2, 
  Check, 
  AlertTriangle,
  HelpCircle,
  FileText,
  X,
  Eye,
  CheckCircle2,
  BadgeCheck
} from 'lucide-react';
import { TaskItem, SPK } from '../../types';

// Tooltip helper component for terms
const GlossaryTooltip: React.FC<{ term: 'FPK' | 'SPK' | 'K3' | 'Margin'; children: React.ReactNode }> = ({ term, children }) => {
  const [show, setShow] = useState(false);
  const definitions = {
    FPK: 'Formulir pengajuan kerja sama baru dengan klien.',
    SPK: 'Kontrak resmi yang ditandatangani klien. Tanpa SPK, layanan belum dapat ditagihkan.',
    K3: 'Keselamatan & Kesehatan Kerja.',
    Margin: 'Persentase keuntungan setelah semua biaya.'
  };

  return (
    <span className="relative inline-flex items-center gap-0.5">
      <span>{children}</span>
      <span 
        onMouseEnter={() => setShow(true)} 
        onMouseLeave={() => setShow(false)} 
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        className="cursor-pointer text-slate-400 hover:text-indigo-600 inline-flex items-center ml-0.5"
        title={definitions[term]}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 p-2.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-50 pointer-events-none font-normal leading-snug animate-in fade-in">
          <strong className="block text-indigo-300 mb-0.5 font-bold">{term}</strong>
          {definitions[term]}
        </span>
      )}
    </span>
  );
};

// Team member interface and data for project avatar stacks
interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarUrl: string;
  bgColor: string;
}

interface ProjectTeamData {
  coordinator: TeamMember;
  guards: TeamMember[];
}

const getProjectTeam = (projectId: string): ProjectTeamData => {
  const coordinatorList: Record<string, { name: string; role: string; initials: string; seed: string }> = {
    'proj-1': { name: 'Hendra Setiawan', role: 'Pengawas Wilayah & Koordinator Lapangan', initials: 'HS', seed: 'Hendra' },
    'proj-2': { name: 'M. Tahir', role: 'Danru & Koordinator Lapangan Morowali', initials: 'MT', seed: 'Tahir' },
    'proj-3': { name: 'Fajar Nugraha', role: 'Koordinator Pengamanan Perbankan BSM', initials: 'FN', seed: 'Fajar' },
    'proj-4': { name: 'Dwi Santika', role: 'Koordinator Aviation Security Bandara', initials: 'DS', seed: 'Dwi' },
    'proj-5': { name: 'Gunawan Prasetyo', role: 'Pengawas Wilayah Jabodetabek Selatan', initials: 'GP', seed: 'Gunawan' },
    'proj-6': { name: 'Agus Haryanto', role: 'Koordinator Pengamanan Kawasan Tuban', initials: 'AH', seed: 'Agus' },
    'proj-7': { name: 'Hendra Setiawan', role: 'Pengawas Wilayah Operasional', initials: 'HS', seed: 'Hendra' },
    'proj-8': { name: 'Bambang Irawan', role: 'Koordinator Area Ritel Surabaya', initials: 'BI', seed: 'Bambang' },
    'proj-9': { name: 'Surya Dharma', role: 'Koordinator Operasi Tambang Sangatta', initials: 'SD', seed: 'Surya' },
    'proj-10': { name: 'Dian Permatasari', role: 'Koordinator Lapangan PLTS Cirata', initials: 'DP', seed: 'Dian' },
  };

  const coordInfo = coordinatorList[projectId] || { name: 'Hendra Setiawan', role: 'Koordinator Lapangan', initials: 'HS', seed: projectId };

  return {
    coordinator: {
      id: `coord-${projectId}`,
      name: coordInfo.name,
      role: coordInfo.role,
      initials: coordInfo.initials,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${coordInfo.seed}&backgroundColor=ffdfbf`,
      bgColor: 'bg-amber-100 text-amber-900',
    },
    guards: [
      {
        id: `guard-${projectId}-1`,
        name: 'Supriyanto',
        role: 'Danru (Supervisor)',
        initials: 'SP',
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Guard1_${projectId}&backgroundColor=c0aede`,
        bgColor: 'bg-purple-100 text-purple-900',
      },
      {
        id: `guard-${projectId}-2`,
        name: 'Joko Prabowo',
        role: 'Petugas Patroli',
        initials: 'JP',
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Guard2_${projectId}&backgroundColor=b6e3f4`,
        bgColor: 'bg-sky-100 text-sky-900',
      },
      {
        id: `guard-${projectId}-3`,
        name: 'Ahmad Fauzi',
        role: 'Petugas Akses Gerbang',
        initials: 'AF',
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Guard3_${projectId}&backgroundColor=e2e8f0`,
        bgColor: 'bg-slate-200 text-slate-800',
      },
    ]
  };
};

export const DashboardView: React.FC = () => {
  const { 
    projects, 
    spks, 
    fpks, 
    sites, 
    tasks, 
    externalMemos, 
    setSelectedProjectId, 
    setActiveView,
    currentUser
  } = useApp();

  const [taskFilter, setTaskFilter] = useState<'my' | 'all'>('my');
  const [previewSpkDoc, setPreviewSpkDoc] = useState<SPK | null>(null);
  const [multiSpkModal, setMultiSpkModal] = useState<{ clientName: string; spks: SPK[] } | null>(null);

  // Simulated current reference date for the prototype: 11 November 2026
  const SIMULATED_TODAY = new Date('2026-11-11T00:00:00');

  // Overdue and date helper with unified format "10 Nov 2026"
  const getOverdueStatus = (dueDateStr: string) => {
    const parts = dueDateStr.split('-');
    if (parts.length !== 3) return { readableDate: dueDateStr, isOverdue: false, daysOverdue: 0 };

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dueDate = new Date(year, month, day);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const readableDate = `${day} ${monthNames[month]} ${year}`;

    const diffMs = SIMULATED_TODAY.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      readableDate,
      isOverdue: diffDays > 0,
      daysOverdue: Math.max(0, diffDays),
      daysRemaining: Math.max(0, -diffDays),
    };
  };

  // Sort tasks by urgency
  const sortTasksByUrgency = (taskList: TaskItem[]) => {
    return [...taskList].sort((a, b) => {
      const aInfo = getOverdueStatus(a.dueDate);
      const bInfo = getOverdueStatus(b.dueDate);
      if (aInfo.isOverdue && !bInfo.isOverdue) return -1;
      if (!aInfo.isOverdue && bInfo.isOverdue) return 1;
      if (aInfo.isOverdue && bInfo.isOverdue) return bInfo.daysOverdue - aInfo.daysOverdue;
      return a.dueDate.localeCompare(b.dueDate);
    });
  };

  // Role decisions for top block
  const pendingBODFpk = currentUser.role === 'BOD' 
    ? fpks.find(f => f.status === 'Pending BOD') 
    : null;

  const myOpenTasks = tasks.filter(t => t.assignedRole === currentUser.role && t.status !== 'Completed');
  const allOpenTasks = tasks.filter(t => t.status !== 'Completed');
  const displayTasks = sortTasksByUrgency(taskFilter === 'my' ? myOpenTasks : allOpenTasks);

  const handleOpenProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveView('project-detail');
  };

  // Clean facility name so client name is not duplicated
  const getCleanFacilityName = (project: { name: string; clientName: string }) => {
    let name = project.name;
    if (name.includes('—')) {
      name = name.split('—')[1].trim();
    } else if (name.startsWith(project.clientName)) {
      name = name.replace(project.clientName, '').replace(/^[-–—\s]+/, '').trim();
    }
    return name || 'Pengamanan Fasilitas Lapangan';
  };

  const getRoleDisplayTitle = (role: string) => {
    switch (role) {
      case 'BOD': return 'Direksi';
      case 'Finance': return 'Keuangan';
      case 'Marketing': return 'Pemasaran';
      case 'Operations': return 'Operasional';
      case 'PIC Area': return 'Pengawas Lapangan';
      case 'Recruitment': return 'Rekrutmen';
      case 'HR': return 'HR';
      case 'Procurement': return 'Pengadaan';
      default: return role;
    }
  };

  // Sorted projects: projects without contract or pending verification appear on top!
  const sortedProjects = [...projects].sort((a, b) => {
    const aHasIssue = a.isJalanTanpaSPK || spks.some(s => a.spkIds.includes(s.id) && s.verificationStatus === 'Pending Verification');
    const bHasIssue = b.isJalanTanpaSPK || spks.some(s => b.spkIds.includes(s.id) && s.verificationStatus === 'Pending Verification');
    if (aHasIssue && !bHasIssue) return -1;
    if (!aHasIssue && bHasIssue) return 1;
    return 0;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* 1. Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Dashboard Eksekutif
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Ringkasan kondisi proyek, status kontrak, dan keputusan yang memerlukan persetujuan Anda.
        </p>
      </div>

      {/* 2. Memerlukan Keputusan Anda */}
      {(pendingBODFpk || myOpenTasks.length > 0) && (
        <div className="bg-indigo-50/80 border-2 border-indigo-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <h2 className="text-sm font-bold text-indigo-950">
                Memerlukan Keputusan Anda
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Peran: {getRoleDisplayTitle(currentUser.role)}
              </span>
            </div>
            <span className="text-xs font-medium text-indigo-900">
              {pendingBODFpk ? '1 pengajuan kerja sama menunggu persetujuan Direksi' : `${myOpenTasks.length} tugas menunggu tindakan`}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* If BOD: FPK approval card (Margin info removed, "Seluruh divisi" text removed, button renamed to "Lihat Detail") */}
            {pendingBODFpk && (
              <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="space-y-1">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {pendingBODFpk.clientName}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-slate-500">
                        <GlossaryTooltip term="FPK">{pendingBODFpk.fpkNumber}</GlossaryTooltip>
                      </span>
                      <span className="text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.2 rounded text-[11px]">
                        Terlambat 2 hari
                      </span>
                    </div>
                  </div>

                  <div className="text-slate-700 text-xs font-medium pt-0.5">
                    Kebutuhan Petugas: 25 orang
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveView('fpk', undefined, '?detail=FPK-2026-015')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Lihat Detail</span>
                  </button>
                </div>
              </div>
            )}

            {/* Other tasks for the current role */}
            {myOpenTasks.filter(t => t.entityId !== pendingBODFpk?.id).slice(0, 2).map(task => {
              const { isOverdue } = getOverdueStatus(task.dueDate);
              const isBODTask = task.assignedRole === 'BOD' && task.entityId === 'fpk-3';
              const displayTitle = isBODTask 
                ? 'Persetujuan kerja sama baru: PT Graha Logistik Indonesia' 
                : task.title;

              return (
                <div key={task.id} className="bg-white p-3 rounded-lg border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{displayTitle}</span>
                      {isOverdue && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 font-semibold px-2 py-0.5 rounded text-[11px]">
                          Terlambat 2 hari
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Penanggung Jawab: <strong className="text-slate-700">{task.assignedRole === currentUser.role ? 'Direksi' : task.assignedRole}</strong> · Batas Waktu: <strong className="text-slate-700">9 Nov 2026</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (task.relatedEntity === 'FPK') setActiveView('fpk', undefined, '?detail=FPK-2026-015');
                      else if (task.relatedEntity === 'SPK' || task.relatedEntity === 'Memo') setActiveView('kontrak');
                      else setActiveView('tasks');
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0"
                  >
                    Tinjau
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Kartu Ringkasan (3 Kartu Saja, tanpa label satuan, font standar) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Proyek Berjalan (P1: ⚠ 1 proyek berjalan tanpa SPK · 13 hari / ✓ Seluruh proyek telah memiliki SPK) */}
        {(() => {
          const projectsWithoutSPK = projects.filter(p => p.isJalanTanpaSPK).length;
          return (
            <button
              onClick={() => {
                const el = document.getElementById('daftar-proyek');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else setActiveView('projects');
              }}
              className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all group"
            >
              <div className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 flex items-center justify-between">
                <span>Proyek Berjalan</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {projects.length}
              </div>
              <div className={`text-[11px] mt-1 ${projectsWithoutSPK > 0 ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
                {projectsWithoutSPK > 0 
                  ? `⚠ ${projectsWithoutSPK} proyek berjalan tanpa SPK · 13 hari`
                  : '✓ Seluruh proyek telah memiliki SPK'}
              </div>
            </button>
          );
        })()}

        {/* Card 2: Petugas Bertugas (P1 & P2: istilah petugas aktif, kalkulasi dinamis) */}
        {(() => {
          const totalAssignedGuards = projects.reduce((acc, p) => acc + p.totalAssignedPersonnel, 0);
          return (
            <button
              onClick={() => setActiveView('deployment')}
              className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all group"
            >
              <div className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 flex items-center justify-between">
                <span>Petugas Bertugas</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {totalAssignedGuards}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                dari 400 petugas aktif
              </div>
            </button>
          );
        })()}

        {/* Card 3: Kontrak Akan Berakhir (Kalkulasi dinamis) */}
        {(() => {
          const expiringContracts = spks.filter(s => s.isExpiringSoon || (s.daysToExpiration && s.daysToExpiration <= 60));
          return (
            <button
              onClick={() => setActiveView('kontrak')}
              className="text-left bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all group"
            >
              <div className="text-xs font-semibold text-amber-800 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Kontrak Akan Berakhir
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-700 transition-colors" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-700">
                {expiringContracts.length}
              </div>
              <div className="text-[11px] text-amber-700 mt-1">
                {expiringContracts.length > 0 ? `${expiringContracts.length} kontrak mendekati tempo` : 'Tidak ada kontrak segera berakhir'}
              </div>
            </button>
          );
        })()}
      </div>

      {/* 4. Daftar Proyek Berjalan (5 Kolom Saja, Status Kontrak digabung ke kolom Kontrak, Proyek bermasalah ditaruh paling atas) */}
      <section id="daftar-proyek" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Daftar Proyek Berjalan
          </h2>
          <button
            onClick={() => setActiveView('projects')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
          >
            <span>Lihat Semua Proyek</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-2xs">
          <table className="min-w-[720px] w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold text-[11px]">
                <th className="px-4 py-3">Klien</th>
                <th className="px-4 py-3">Lokasi Jaga</th>
                <th className="px-4 py-3">
                  <GlossaryTooltip term="SPK">Kontrak (SPK)</GlossaryTooltip>
                </th>
                <th className="px-4 py-3">Jumlah Petugas</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedProjects.slice(0, 5).map((p) => {
                const projectSites = sites.filter(s => p.siteIds.includes(s.id));
                const projectSPKs = spks.filter(s => p.spkIds.includes(s.id));

                return (
                  <tr 
                    key={p.id} 
                    onClick={() => handleOpenProject(p.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    {/* Klien */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                        {p.clientName}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {getCleanFacilityName(p)}
                      </div>
                    </td>

                    {/* Lokasi Jaga: 2 lokasi aktif */}
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-800">
                        {projectSites.length} lokasi aktif
                      </span>
                    </td>

                    {/* Kontrak (SPK): Status terintegrasi & dokumen klik pratinjau (P1 & P2: 2 dokumen modal daftar) */}
                    <td className="px-4 py-3.5">
                      {p.isJalanTanpaSPK ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            <Flame className="w-3 h-3 text-rose-600" />
                            Belum ada kontrak · 13 hari
                          </span>
                          {projectSPKs.length > 0 && (
                            <div className="text-[11px] text-slate-600 flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (projectSPKs.length > 1) {
                                    setMultiSpkModal({ clientName: p.clientName, spks: projectSPKs });
                                  } else {
                                    setPreviewSpkDoc(projectSPKs[0]);
                                  }
                                }}
                                className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline inline-flex items-center gap-1"
                                title="Klik untuk membuka daftar berkas SPK"
                              >
                                📄 {projectSPKs.length > 1 ? `${projectSPKs.length} dokumen` : projectSPKs[0].spkDocumentName}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : projectSPKs.length > 1 ? (
                        <div className="space-y-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMultiSpkModal({ clientName: p.clientName, spks: projectSPKs });
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline inline-flex items-center gap-1 text-left"
                            title="Klik untuk membuka daftar berkas SPK"
                          >
                            📄 {projectSPKs.length} dokumen
                          </button>
                          <div className="text-[10px] text-emerald-700 font-semibold">
                            ✓ Kontrak resmi terverifikasi
                          </div>
                        </div>
                      ) : projectSPKs.length === 1 && projectSPKs[0].verificationStatus === 'Verified' ? (
                        <div className="space-y-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewSpkDoc(projectSPKs[0]);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline inline-flex items-center gap-1 text-left"
                            title="Klik untuk pratinjau berkas SPK"
                          >
                            📄 {projectSPKs[0].spkDocumentName}
                          </button>
                          <div className="text-[10px] text-emerald-700 font-semibold">
                            ✓ Kontrak resmi terverifikasi
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          Menunggu verifikasi
                        </span>
                      )}
                    </td>

                    {/* Jumlah Petugas: Tampilkan avatar stack dengan Koordinator di paling depan */}
                    <td className="px-4 py-3.5">
                      {(() => {
                        const team = getProjectTeam(p.id);
                        return (
                          <div className="flex items-center gap-3">
                            {/* Avatar Stack: Petugas di belakang, Koordinator paling depan */}
                            <div className="flex items-center -space-x-2 shrink-0">
                              {team.guards.map((guard, idx) => (
                                <div 
                                  key={guard.id}
                                  className="relative inline-block w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-white overflow-hidden shadow-2xs group/avatar"
                                  style={{ zIndex: idx }}
                                  title={`${guard.name} (${guard.role})`}
                                >
                                  <img 
                                    src={guard.avatarUrl} 
                                    alt={guard.name} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${guard.bgColor}`}>
                                    {guard.initials}
                                  </div>
                                </div>
                              ))}

                              {/* Koordinator: PALING DEPAN (z-10, ring-2 ring-white, dengan Verified BadgeCheck biru) */}
                              <div 
                                className="relative z-10 inline-block w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-white shadow-xs group/avatar"
                                title={`⭐ Koordinator Proyek: ${team.coordinator.name} (${team.coordinator.role})`}
                              >
                                <div className="w-full h-full rounded-full overflow-hidden bg-amber-100">
                                  <img 
                                    src={team.coordinator.avatarUrl} 
                                    alt={team.coordinator.name} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${team.coordinator.bgColor}`}>
                                    {team.coordinator.initials}
                                  </div>
                                </div>
                                
                                {/* Badge biru centang sesuai referensi */}
                                <span 
                                  className="absolute -bottom-1 -right-1 flex items-center justify-center bg-white rounded-full p-0.5 shadow-xs"
                                  title="Koordinator Proyek"
                                >
                                  <BadgeCheck className="w-3.5 h-3.5 text-white fill-sky-500" />
                                </span>
                              </div>
                            </div>

                            {/* Info angka & nama koordinator */}
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-800 block">
                                {p.totalAssignedPersonnel} petugas
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate">
                                Koor: <strong className="text-slate-700 font-semibold">{team.coordinator.name}</strong>
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold text-slate-600 group-hover:text-indigo-600 inline-flex items-center gap-0.5 text-xs transition-colors">
                        Lihat Detail <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sortedProjects.length > 5 && (
            <div className="p-3 bg-slate-50/80 border-t border-slate-200 text-center flex flex-col sm:flex-row items-center justify-between gap-2 px-4">
              <span className="text-xs text-slate-500 font-medium">
                Menampilkan 5 prioritas utama dari {sortedProjects.length} proyek aktif
              </span>
              <button
                onClick={() => setActiveView('projects')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
              >
                <span>Lihat {sortedProjects.length - 5} Proyek Lainnya di Daftar Proyek</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 5. Kontrak Akan Berakhir & Tugas Belum Diselesaikan (Balanced Layout, Height follows content) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        
        {/* Left Card: Kontrak Akan Berakhir (Link 'Lihat Memo' di header dihapus, fokus tombol bawah) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Kontrak Akan Berakhir
            </span>
          </div>

          <div className="space-y-3">
            {externalMemos.map(memo => (
              <div key={memo.id} className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200/80 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">{memo.clientName}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      SPK: {memo.spkNumber}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    Berakhir dalam 50 hari
                  </span>
                </div>

                <div className="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200/70">
                  Surat penawaran perpanjangan telah dikirim pada 1 Nov 2026. Menunggu tanggapan klien.
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1">
            <button
              onClick={() => setActiveView('kontrak')}
              className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <span>Catat Tanggapan Klien</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Card: Tugas Belum Diselesaikan (Height follows content) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                Tugas Belum Diselesaikan
              </span>
            </div>

            {/* Toggle: Tugas Saya (1) vs Semua Tugas (4) */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setTaskFilter('my')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  taskFilter === 'my' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tugas Saya ({myOpenTasks.length})
              </button>
              <button
                onClick={() => setTaskFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  taskFilter === 'all' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semua Tugas ({allOpenTasks.length})
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {displayTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Tidak ada tugas lain.
              </div>
            ) : (
              <>
                {displayTasks.slice(0, 3).map(task => {
                  const isBODTask = task.assignedRole === 'BOD' && task.entityId === 'fpk-3';
                  const displayTitle = isBODTask 
                    ? 'Persetujuan kerja sama baru: PT Graha Logistik Indonesia' 
                    : task.title;

                  return (
                    <div key={task.id} className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-semibold text-slate-900 truncate">{displayTitle}</div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <span>Penanggung Jawab: <strong className="text-slate-800">{task.assignedRole === currentUser.role ? 'Direksi' : task.assignedRole}</strong></span>
                          <span>·</span>
                          <span>Batas Waktu: <strong className="text-slate-800">9 Nov 2026</strong></span>
                        </div>
                        <div className="pt-0.5">
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 font-semibold px-2 py-0.2 rounded text-[10px]">
                            Terlambat 2 hari
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (task.relatedEntity === 'FPK') setActiveView('fpk');
                          else if (task.relatedEntity === 'SPK' || task.relatedEntity === 'Memo') setActiveView('kontrak');
                          else setActiveView('tasks');
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap shrink-0"
                      >
                        Tinjau
                      </button>
                    </div>
                  );
                })}
                {displayTasks.length === 1 && (
                  <div className="text-center py-2 text-[11px] text-slate-500">
                    Tidak ada tugas lain
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-1">
            <button
              onClick={() => setActiveView('tasks')}
              className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <span>Lihat Semua Tugas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* In-App Multi-SPK Documents List Modal (P2: 2 dokumen dibuka jadi daftar) */}
      {multiSpkModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="multi-spk-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 id="multi-spk-title" className="font-bold text-slate-900 text-base">
                  Daftar Dokumen Kontrak SPK
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {multiSpkModal.clientName} · {multiSpkModal.spks.length} Berkas Kontrak Terkait
                </p>
              </div>
              <button
                onClick={() => setMultiSpkModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                aria-label="Tutup daftar dokumen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {multiSpkModal.spks.map((spk, idx) => (
                <div
                  key={spk.id}
                  className="p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{spk.spkNumber}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        spk.verificationStatus === 'Verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {spk.verificationStatus === 'Verified' ? '✓ Terverifikasi' : 'Menunggu Verifikasi'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{spk.spkDocumentName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Masa Berlaku: {spk.contractStart} s/d {spk.contractEnd} · Kuota: {spk.personnelQuota} Petugas
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setPreviewSpkDoc(spk);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 font-semibold border border-indigo-200 rounded-lg text-xs transition-colors shrink-0 shadow-2xs"
                  >
                    Buka Berkas
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setMultiSpkModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Document Preview Modal */}
      {previewSpkDoc && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Pratinjau Berkas Kontrak Resmi (SPK)
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {previewSpkDoc.spkDocumentName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewSpkDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                aria-label="Tutup pratinjau berkas SPK"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-600 uppercase text-[10px] font-semibold block">Nomor Kontrak</span>
                  <strong className="text-slate-900 font-mono text-xs">{previewSpkDoc.spkNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-600 uppercase text-[10px] font-semibold block">Klien Mitra</span>
                  <strong className="text-slate-900 text-xs">{previewSpkDoc.clientName}</strong>
                </div>
                <div>
                  <span className="text-slate-600 uppercase text-[10px] font-semibold block">Kuota Petugas</span>
                  <strong className="text-slate-900 text-xs">{previewSpkDoc.personnelQuota} Petugas</strong>
                </div>
                <div>
                  <span className="text-slate-600 uppercase text-[10px] font-semibold block">Periode Kontrak</span>
                  <strong className="text-slate-900 text-xs">{previewSpkDoc.contractStart} s/d {previewSpkDoc.contractEnd}</strong>
                </div>
                <div>
                  <span className="text-slate-600 uppercase text-[10px] font-semibold block">Status Verifikasi</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi Keuangan
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-slate-500 text-[11px] italic">
                {previewSpkDoc.verificationNotes || 'Dokumen telah diverifikasi dan dicocokkan dengan FPK rujukan.'}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPreviewSpkDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
