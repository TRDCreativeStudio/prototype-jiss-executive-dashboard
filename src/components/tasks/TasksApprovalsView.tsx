import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CheckSquare, 
  Check, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { UserRole } from '../../types';

export const TasksApprovalsView: React.FC = () => {
  const { tasks, completeTask, currentUser, setActiveView, setSelectedProjectId } = useApp();
  const [roleFilter, setRoleFilter] = useState<string>('All');

  const filteredTasks = tasks.filter(t => roleFilter === 'All' || t.assignedRole === roleFilter);

  const rolesList: { key: string; label: string }[] = [
    { key: 'All', label: 'Semua Peran' },
    { key: 'BOD', label: 'Direksi (BOD)' },
    { key: 'Finance', label: 'Keuangan' },
    { key: 'Marketing', label: 'Pemasaran' },
    { key: 'Operations', label: 'Operasional' },
    { key: 'Recruitment', label: 'Rekrutmen' },
    { key: 'HR', label: 'SDM (HR)' },
    { key: 'PIC Area', label: 'Pengawas Wilayah' },
    { key: 'Procurement', label: 'Pengadaan' },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold text-[11px]">Mendesak</span>;
      case 'High':
        return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold text-[11px]">Tinggi</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">Standar</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pusat Tugas & Persetujuan Kerja
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar tanggung jawab, telaah kelayakan, dan persetujuan kontrak yang memerlukan tindakan dari masing-masing divisi.
          </p>
        </div>
        <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 font-medium">
          Tugas Menunggu: <span className="font-bold">{tasks.filter(t => t.status !== 'Completed').length}</span>
        </div>
      </div>

      {/* Role Filter Buttons */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
        {rolesList.map(r => (
          <button
            key={r.key}
            onClick={() => setRoleFilter(r.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              roleFilter === r.key
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
            <p className="text-sm font-semibold">Tidak ada tugas tertunda untuk peran ini</p>
            <p className="text-xs text-slate-400 mt-1">Semua alur kerja dan persetujuan telah diselesaikan dengan baik.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'Completed';

            return (
              <div
                key={task.id}
                className={`p-5 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : task.priority === 'Critical'
                    ? 'bg-white border-amber-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      Divisi: {task.assignedRole}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500 font-mono">Rujukan: {task.entityReference}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">Tenggat Waktu: <strong>{task.dueDate}</strong></span>
                    {getPriorityBadge(task.priority)}
                  </div>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kategori Alur: <strong>{task.relatedEntity}</strong> · Dibuat: {task.createdDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.relatedEntity === 'FPK' && (
                      <button
                        onClick={() => setActiveView('fpk')}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold transition-colors"
                      >
                        Buka FPK
                      </button>
                    )}
                    {(task.relatedEntity === 'SPK' || task.relatedEntity === 'Memo') && (
                      <button
                        onClick={() => setActiveView('kontrak')}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold transition-colors"
                      >
                        Buka Kontrak
                      </button>
                    )}

                    {!isCompleted ? (
                      <button
                        onClick={() => completeTask(task.id)}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Tandai Selesai
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-4 h-4" /> Selesai Dikerjakan
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
