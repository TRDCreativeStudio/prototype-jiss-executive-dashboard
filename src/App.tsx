import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { FloatingRoleSwitcher } from './components/floating/FloatingRoleSwitcher';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { ProjectDetailView } from './components/projects/ProjectDetailView';
import { ClientsView } from './components/clients/ClientsView';
import { FPKView } from './components/fpk/FPKView';
import { SPKContractsView } from './components/spk/SPKContractsView';
import { ExternalMemosView } from './components/memos/ExternalMemosView';
import { DeploymentMonitoringView } from './components/deployment/DeploymentMonitoringView';
import { PersonnelView } from './components/personnel/PersonnelView';
import { TasksApprovalsView } from './components/tasks/TasksApprovalsView';
import { RolesUsersView } from './components/admin/RolesUsersView';

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
      case 'spk':
        return <SPKContractsView />;
      case 'memos':
        return <ExternalMemosView />;
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
        <main className="flex-1 overflow-y-auto pb-24">
          {renderCurrentView()}
        </main>
      </div>

      {/* Floating Bottom-Right Role Switcher (All 9 PRD Roles) */}
      <FloatingRoleSwitcher />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
