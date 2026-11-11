import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ContractProvider } from './context/ContractContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { ProjectDetailView } from './components/projects/ProjectDetailView';
import { ClientsView } from './components/clients/ClientsView';
import { FPKView } from './components/fpk/FPKView';
import { ContractsView } from './components/contracts/ContractsView';
import { DeploymentMonitoringView } from './components/deployment/DeploymentMonitoringView';
import { PersonnelView } from './components/personnel/PersonnelView';
import { TasksApprovalsView } from './components/tasks/TasksApprovalsView';
import { RolesUsersView } from './components/admin/RolesUsersView';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

// Global Confirmation Dialog (P1: Dialog konfirmasi aksi penting)
const GlobalConfirmationDialog: React.FC = () => {
  const { confirmDialog, closeConfirmation } = useApp();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setNotes('');
    setError('');
  }, [confirmDialog]);

  if (!confirmDialog) return null;

  const handleConfirm = () => {
    if (confirmDialog.requiresNotes && !notes.trim()) {
      setError('Catatan wajib diisi sebelum melanjutkan.');
      return;
    }
    confirmDialog.onConfirm(notes.trim());
    closeConfirmation();
  };

  const variant = confirmDialog.variant || 'primary';

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertCircle className="w-6 h-6 text-rose-600" />,
          iconBg: 'bg-rose-50 border-rose-200',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-50 border-amber-200',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
          iconBg: 'bg-emerald-50 border-emerald-200',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        };
      default:
        return {
          icon: <Info className="w-6 h-6 text-indigo-600" />,
          iconBg: 'bg-indigo-50 border-indigo-200',
          btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <div>
              <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900">
                {confirmDialog.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>
          </div>
          <button
            onClick={closeConfirmation}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            aria-label="Tutup dialog konfirmasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmDialog.requiresNotes && (
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-slate-700">
              {confirmDialog.notesLabel || 'Catatan / Alasan (Wajib diisi):'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (error) setError('');
              }}
              placeholder={confirmDialog.notesPlaceholder || 'Tuliskan rincian pertimbangan atau alasan keputusan...'}
              rows={3}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-hidden focus:ring-2 ${
                error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'
              }`}
            />
            {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={closeConfirmation}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            {confirmDialog.cancelLabel || 'Batal'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-xs ${styles.btnBg}`}
          >
            {confirmDialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { activeView } = useApp();

  const renderCurrentView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'clients':
        return <ClientsView />;
      case 'projects':
        return <ProjectsView />;
      case 'project-detail':
        return <ProjectDetailView />;
      case 'fpk':
        return <FPKView />;
      case 'kontrak':
      case 'spk':
      case 'memos':
        return <ContractsView />;
      case 'deployment':
      case 'sites':
        return <DeploymentMonitoringView />;
      case 'personnel':
        return <PersonnelView />;
      case 'tasks':
        return <TasksApprovalsView />;
      case 'users':
        return <RolesUsersView initialTab="users" />;
      case 'audit':
        return <RolesUsersView initialTab="audit" />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Dark Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className={`flex-1 min-w-0 ${
          ['kontrak', 'spk', 'memos'].includes(activeView)
            ? 'overflow-hidden flex flex-col'
            : 'overflow-y-auto pb-12'
        }`}>
          {renderCurrentView()}
        </main>
      </div>

      {/* Global Confirmation Dialog */}
      <GlobalConfirmationDialog />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <ContractProvider>
        <MainLayout />
      </ContractProvider>
    </AppProvider>
  );
}
