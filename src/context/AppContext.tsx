import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { 
  UserAccount, 
  UserRole,
  Project, 
  Client, 
  Site, 
  Area, 
  SPK, 
  FPK, 
  Personnel, 
  ExternalMemo, 
  TaskItem, 
  PersonnelMutation, 
  AuditLogEntry,
  OperationsReview,
  RecruitmentReview,
  ProcurementReview
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_AREAS, 
  INITIAL_CLIENTS, 
  INITIAL_SITES, 
  INITIAL_SPKS, 
  INITIAL_FPKS, 
  INITIAL_PROJECTS, 
  INITIAL_PERSONNEL, 
  INITIAL_EXTERNAL_MEMOS, 
  INITIAL_TASKS, 
  INITIAL_MUTATIONS, 
  INITIAL_AUDIT_LOGS 
} from '../mockData';

interface AppContextType {
  currentUser: UserAccount;
  users: UserAccount[];
  switchUser: (userId: string) => void;
  
  projects: Project[];
  clients: Client[];
  sites: Site[];
  areas: Area[];
  spks: SPK[];
  fpks: FPK[];
  personnel: Personnel[];
  externalMemos: ExternalMemo[];
  tasks: TaskItem[];
  mutations: PersonnelMutation[];
  auditLogs: AuditLogEntry[];
  
  activeView: string;
  setActiveView: (view: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  selectedProject: Project;
  
  notification: { message: string; type: 'success' | 'warning' | 'error' | 'info' } | null;
  setNotification: (notif: { message: string; type: 'success' | 'warning' | 'error' | 'info' } | null) => void;
  
  // Official Process Handlers
  submitDepartmentReview: (fpkId: string, dept: 'Operations' | 'Recruitment' | 'Procurement', review: any) => void;
  submitFinanceAssessment: (fpkId: string, estimatedCostRp: number, margin: number, notes?: string) => void;
  decideBOD: (fpkId: string, decision: 'Approved' | 'Returned' | 'Rejected', returnReason?: string, notes?: string) => void;
  verifySPK: (spkId: string, approved: boolean, notes?: string) => void;
  confirmStartGuard: (siteId: string) => void;
  sendRenewalMemo: (memoId: string, proofDocName?: string) => void;
  recordClientResponse: (memoId: string, response: 'Agree' | 'Negotiate' | 'Not Continuing', outcome?: 'Extend SPK' | 'Revise BOQ & Margin' | 'Demobilize') => void;
  completeTask: (taskId: string) => void;
  createFPK: (newFPK: Partial<FPK>) => void;
  assignGuardToSite: (personnelId: string, siteId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to BOD (Bambang Sutrisno) or Marketing
  const [currentUser, setCurrentUser] = useState<UserAccount>(INITIAL_USERS[0]);
  const [users] = useState<UserAccount[]>(INITIAL_USERS);
  
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [sites, setSites] = useState<Site[]>(INITIAL_SITES);
  const [areas, setAreas] = useState<Area[]>(INITIAL_AREAS);
  const [spks, setSpks] = useState<SPK[]>(INITIAL_SPKS);
  const [fpks, setFpks] = useState<FPK[]>(INITIAL_FPKS);
  const [personnel, setPersonnel] = useState<Personnel[]>(INITIAL_PERSONNEL);
  const [externalMemos, setExternalMemos] = useState<ExternalMemo[]>(INITIAL_EXTERNAL_MEMOS);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [mutations, setMutations] = useState<PersonnelMutation[]>(INITIAL_MUTATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-1');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);

  const triggerNotification = useCallback((message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  const appendAuditLog = useCallback((action: string, details: string, type: 'INFO' | 'ACTION' | 'SECURITY_ALERT' | 'APPROVAL') => {
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: currentUser.name,
      userRole: currentUser.role,
      action,
      details,
      type,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, [currentUser]);

  const switchUser = useCallback((userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      triggerNotification(`Peran aktif: ${target.name} (${target.role})`, 'info');
      appendAuditLog('ROLE_SWITCH', `Beralih peran pengguna ke ${target.name} [${target.role}]`, 'INFO');
    }
  }, [users, triggerNotification, appendAuditLog]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // STAGE 02: Parallel Review Submit
  const submitDepartmentReview = useCallback((fpkId: string, dept: 'Operations' | 'Recruitment' | 'Procurement', reviewData: any) => {
    setFpks(prev => prev.map(f => {
      if (f.id !== fpkId) return f;
      const updated = { ...f };
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      
      if (dept === 'Operations') {
        updated.operationsReview = { ...updated.operationsReview, ...reviewData, status: 'Approved', reviewedBy: currentUser.name, reviewedAt: timestamp };
      } else if (dept === 'Recruitment') {
        updated.recruitmentReview = { ...updated.recruitmentReview, ...reviewData, status: 'Approved', reviewedBy: currentUser.name, reviewedAt: timestamp };
      } else if (dept === 'Procurement') {
        updated.procurementReview = { ...updated.procurementReview, ...reviewData, status: 'Approved', reviewedBy: currentUser.name, reviewedAt: timestamp };
      }

      // Check if all 3 parallel reviews are approved
      const allThreeApproved = 
        updated.operationsReview.status === 'Approved' &&
        updated.recruitmentReview.status === 'Approved' &&
        updated.procurementReview.status === 'Approved';

      if (allThreeApproved && updated.status === 'Under Review') {
        updated.status = 'Financial Review';
      }

      return updated;
    }));

    appendAuditLog('FPK_REVIEW_SUBMITTED', `Telaah ${dept} diselesaikan oleh ${currentUser.name} untuk FPK ${fpkId}.`, 'ACTION');
    triggerNotification(`Telaah ${dept} berhasil dikirimkan!`, 'success');
  }, [currentUser, appendAuditLog, triggerNotification]);

  // STAGE 02: Finance Assessment
  const submitFinanceAssessment = useCallback((fpkId: string, estimatedCostRp: number, margin: number, notes?: string) => {
    setFpks(prev => prev.map(f => {
      if (f.id !== fpkId) return f;
      return {
        ...f,
        status: 'Pending BOD',
        financeAssessment: {
          status: 'Completed',
          estimatedCostRp,
          contractValueRp: f.financeAssessment.contractValueRp || estimatedCostRp / (1 - margin / 100),
          calculatedMarginPercent: margin,
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          notes: notes || 'Perhitungan biaya & margin selesai. Siap diputuskan Direksi.',
        }
      };
    }));

    // Add Task for BOD
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: `Persetujuan Direksi: FPK untuk ${fpkId}`,
      relatedEntity: 'FPK',
      entityId: fpkId,
      entityReference: fpkId,
      assignedRole: 'BOD',
      createdDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      status: 'Open',
      priority: 'Critical',
    };
    setTasks(prev => [newTask, ...prev]);

    appendAuditLog('FINANCE_ASSESSMENT_COMPLETED', `Perhitungan biaya & margin FPK ${fpkId} selesai diajukan oleh ${currentUser.name}.`, 'ACTION');
    triggerNotification('Analisis Keuangan selesai! FPK diteruskan ke Direksi untuk persetujuan akhir.', 'success');
  }, [currentUser, appendAuditLog, triggerNotification]);

  // STAGE 02 -> STAGE 03: BOD Decision (Approved -> Automatically creates Project Record!)
  const decideBOD = useCallback((fpkId: string, decision: 'Approved' | 'Returned' | 'Rejected', returnReason?: string, notes?: string) => {
    let createdProjId = '';
    const targetFPK = fpks.find(f => f.id === fpkId);
    if (!targetFPK) return;

    if (decision === 'Approved') {
      const newProjectId = `proj-${Date.now()}`;
      createdProjId = newProjectId;
      const newProjectCode = `PRJ-${targetFPK.clientName.split(' ')[1]?.toUpperCase() || 'SEC'}-${Math.floor(100 + Math.random() * 900)}`;

      // Create new Site
      const newSiteId = `site-${Date.now()}`;
      const newSite: Site = {
        id: newSiteId,
        siteCode: `SITE-${newProjectCode}-01`,
        name: `${targetFPK.clientName} Main Operational Site`,
        projectId: newProjectId,
        projectName: targetFPK.projectName,
        areaId: 'area-1',
        areaName: 'Greater Jakarta & Industrial Zone',
        address: 'Site Location specified in FPK documentation',
        requiredPersonnel: targetFPK.estimatedPersonnel,
        assignedPersonnel: 0,
        operationalStatus: 'Mobilizing',
        startGuardConfirmed: false,
        assignedPersonnelIds: [],
      };
      setSites(prev => [newSite, ...prev]);

      // Create new Project Record (Created after FPK approval!)
      const newProject: Project = {
        id: newProjectId,
        projectCode: newProjectCode,
        name: targetFPK.projectName,
        clientId: targetFPK.clientId,
        clientName: targetFPK.clientName,
        fpkId: fpkId,
        createdAt: new Date().toISOString().slice(0, 10),
        status: 'Mobilizing',
        siteIds: [newSiteId],
        spkIds: [],
        totalRequiredPersonnel: targetFPK.estimatedPersonnel,
        totalAssignedPersonnel: 0,
        isJalanTanpaSPK: false, // Mobilization phase: guards not deployed yet until Start Guard confirmed
        daysOperatingWithoutSPK: 0,
        unverifiedContractValueRp: targetFPK.financeAssessment.contractValueRp || 310000000,
        jalanTanpaSPKEscalated: false,
        targetStartDate: targetFPK.targetStartDate,
        overallReadinessPercent: 40,
      };
      setProjects(prev => [newProject, ...prev]);
      setSelectedProjectId(newProjectId);

      // Create Task for Marketing to input SPK
      const spkTask: TaskItem = {
        id: `task-spk-${Date.now()}`,
        title: `Input and upload formal SPK document for ${targetFPK.projectName}`,
        relatedEntity: 'Project',
        entityId: newProjectId,
        entityReference: newProjectCode,
        assignedRole: 'Marketing',
        createdDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        status: 'Open',
        priority: 'High',
      };
      setTasks(prev => [spkTask, ...prev]);
    }

    // Auto-resolve any open BOD task for this FPK
    setTasks(prev => prev.map(t => (
      (t.relatedEntity === 'FPK' && (t.entityId === fpkId || t.entityReference === fpkId))
        ? { ...t, status: 'Completed' as const }
        : t
    )));

    setFpks(prev => prev.map(f => {
      if (f.id !== fpkId) return f;
      return {
        ...f,
        status: decision === 'Approved' ? 'Approved' : decision === 'Returned' ? 'Returned' : 'Rejected',
        createdProjectId: createdProjId || f.createdProjectId,
        bodDecision: {
          status: decision,
          decidedBy: `${currentUser.name} (${currentUser.role})`,
          decidedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          returnReason: returnReason || '',
          notes: notes || '',
        }
      };
    }));

    appendAuditLog(
      'BOD_DECISION',
      `Keputusan Direksi: ${decision === 'Approved' ? 'MENYETUJUI' : decision === 'Returned' ? 'MENGEMBALIKAN' : 'MENOLAK'} FPK ${fpkId} oleh ${currentUser.name}. ${decision === 'Approved' ? 'Data resmi proyek terbentuk otomatis.' : `Alasan: ${returnReason}`}`,
      decision === 'Approved' ? 'APPROVAL' : 'ACTION'
    );
    triggerNotification(
      decision === 'Approved'
        ? 'FPK Disetujui Direksi! Data proyek resmi terbentuk & izin mobilisasi terbuka.'
        : decision === 'Returned'
        ? `FPK Dikembalikan: ${returnReason || 'Menunggu revisi tim Pemasaran.'}`
        : `FPK Ditolak: ${returnReason || 'Pengajuan kerja sama diarsipkan.'}`,
      decision === 'Approved' ? 'success' : 'warning'
    );
  }, [fpks, currentUser, appendAuditLog, triggerNotification]);

  // STAGE 04: SPK & Contract Verification by Finance (Compares SPK with FPK)
  const verifySPK = useCallback((spkId: string, approved: boolean, notes?: string) => {
    const targetSPK = spks.find(s => s.id === spkId);
    if (!targetSPK) return;

    setSpks(prev => prev.map(s => {
      if (s.id !== spkId) return s;
      return {
        ...s,
        verificationStatus: approved ? 'Verified' : 'Returned for Correction',
        verifiedBy: `${currentUser.name} (${currentUser.role})`,
        verifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        verificationNotes: notes || (approved ? 'SPK matches approved FPK quota and financial rates.' : 'Discrepancy detected against approved FPK.'),
      };
    }));

    if (approved) {
      // Auto-resolve task for this SPK
      setTasks(prev => prev.map(t => (
        (t.relatedEntity === 'SPK' && (t.entityId === spkId || t.entityReference === spkId || t.entityReference === targetSPK.spkNumber))
          ? { ...t, status: 'Completed' as const }
          : t
      )));

      // Resolve "Jalan Tanpa SPK" on the parent project if all SPKs verified
      setProjects(prev => prev.map(p => {
        if (p.id !== targetSPK.projectId) return p;
        return {
          ...p,
          isJalanTanpaSPK: false,
          daysOperatingWithoutSPK: 0,
          unverifiedContractValueRp: 0,
          status: 'Active',
          overallReadinessPercent: Math.min(100, p.overallReadinessPercent + 15),
        };
      }));
    }

    appendAuditLog(
      'SPK_VERIFICATION',
      `Verifikasi SPK ${spkId} oleh ${currentUser.name} (${currentUser.role}): ${approved ? 'DISETUJUI & AKTIF' : 'DIKEMBALIKAN UNTUK PERBAIKAN'}.`,
      approved ? 'APPROVAL' : 'ACTION'
    );
    triggerNotification(
      approved
        ? 'SPK berhasil diverifikasi! Kontrak kini resmi aktif dan risiko operasional terselesaikan.'
        : 'SPK dikembalikan ke Pemasaran untuk perbaikan dokumen.',
      approved ? 'success' : 'warning'
    );
  }, [spks, currentUser, appendAuditLog, triggerNotification]);

  // STAGE 03: PIC Area Confirms Start Guard
  const confirmStartGuard = useCallback((siteId: string) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const targetSite = sites.find(s => s.id === siteId);

    setSites(prev => prev.map(s => {
      if (s.id !== siteId) return s;
      return {
        ...s,
        startGuardConfirmed: true,
        startGuardTimestamp: timestamp,
        startGuardConfirmedBy: `${currentUser.name} (${currentUser.role})`,
        operationalStatus: 'Active Guard',
      };
    }));

    if (targetSite) {
      setProjects(prev => prev.map(p => {
        if (p.id !== targetSite.projectId) return p;
        const projectSPKs = spks.filter(s => p.spkIds.includes(s.id));
        const hasUnverified = projectSPKs.length === 0 || projectSPKs.some(s => s.verificationStatus !== 'Verified');
        return {
          ...p,
          isJalanTanpaSPK: hasUnverified,
          daysOperatingWithoutSPK: hasUnverified ? Math.max(1, p.daysOperatingWithoutSPK) : 0,
          status: 'Active',
        };
      }));
    }

    appendAuditLog(
      'START_GUARD_CONFIRMED',
      `Serah terima pos jaga dikonfirmasi di ${siteId} oleh ${currentUser.name} (${currentUser.role}).`,
      'ACTION'
    );
    triggerNotification('Konfirmasi mulai tugas lapangan berhasil! Pos jaga kini resmi aktif beroperasi.', 'success');
  }, [sites, spks, currentUser, appendAuditLog, triggerNotification]);

  // ONGOING LIFECYCLE: Send Renewal Memo
  const sendRenewalMemo = useCallback((memoId: string, proofDocName?: string) => {
    setExternalMemos(prev => prev.map(m => {
      if (m.id !== memoId) return m;
      return {
        ...m,
        dispatchDate: new Date().toISOString().slice(0, 10),
        proofOfDeliveryName: proofDocName || 'Surat_Tanda_Terima_Signed.pdf',
        stage: 'H-30', // Advances to client response checkpoint
      };
    }));

    appendAuditLog('RENEWAL_MEMO_DISPATCHED', `Memo perpanjangan ${memoId} dikirim ke klien dengan tanda terima resmi.`, 'ACTION');
    triggerNotification('Surat memo perpanjangan berhasil dikirim ke klien! Jadwal tindak lanjut H-30 aktif.', 'success');
  }, [appendAuditLog, triggerNotification]);

  // ONGOING LIFECYCLE: Record Client Response
  const recordClientResponse = useCallback((memoId: string, response: 'Agree' | 'Negotiate' | 'Not Continuing', outcome?: 'Extend SPK' | 'Revise BOQ & Margin' | 'Demobilize') => {
    const finalOutcome = outcome || (response === 'Agree' ? 'Extend SPK' : response === 'Negotiate' ? 'Revise BOQ & Margin' : 'Demobilize');
    
    setExternalMemos(prev => prev.map(m => {
      if (m.id !== memoId) return m;
      return {
        ...m,
        clientResponse: response,
        responseDate: new Date().toISOString().slice(0, 10),
        contractOutcome: finalOutcome,
      };
    }));

    const indonesianOutcome =
      finalOutcome === 'Extend SPK' ? 'Perpanjang Kontrak SPK'
      : finalOutcome === 'Revise BOQ & Margin' ? 'Revisi Anggaran / BOQ'
      : 'Demobilisasi Pos Jaga';

    appendAuditLog('CLIENT_RESPONSE_RECORDED', `Respons klien dicatat untuk memo ${memoId}: ${response}. Tindak lanjut: ${finalOutcome}`, 'ACTION');
    triggerNotification(`Respons klien berhasil dicatat: ${response === 'Agree' ? 'Setuju' : response === 'Negotiate' ? 'Negosiasi' : 'Tidak Melanjutkan'}! Tindak lanjut: ${indonesianOutcome}`, 'success');
  }, [appendAuditLog, triggerNotification]);

  // Complete Task
  const completeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: 'Completed' } : t)));
    appendAuditLog('TASK_COMPLETED', `Tugas ${taskId} ditandai selesai oleh ${currentUser.name}.`, 'ACTION');
    triggerNotification('Tugas berhasil diselesaikan!', 'success');
  }, [currentUser, appendAuditLog, triggerNotification]);

  // Create new FPK
  const createFPK = useCallback((newFPKData: Partial<FPK>) => {
    const newId = `fpk-${Date.now()}`;
    const fpkNum = `FPK-2026-${Math.floor(100 + Math.random() * 900)}`;
    const fpk: FPK = {
      id: newId,
      fpkNumber: fpkNum,
      clientId: newFPKData.clientId || 'cl-1',
      clientName: newFPKData.clientName || 'PT Klien',
      projectName: newFPKData.projectName || 'Pengamanan Operasional Baru',
      dealType: newFPKData.dealType || 'New Project',
      securityScope: newFPKData.securityScope || 'Pengamanan Fisik & Patroli 24/7',
      targetStartDate: newFPKData.targetStartDate || '2026-12-01',
      estimatedPersonnel: newFPKData.estimatedPersonnel || 30,
      boqAttachmentName: newFPKData.boqAttachmentName || 'Rincian_BOQ_Lampiran.pdf',
      dealProofName: newFPKData.dealProofName || 'Surat_Kesepakatan_Tertandatangan.pdf',
      status: 'Under Review', // Directly enters Stage 02 parallel review
      createdAt: new Date().toISOString().slice(0, 10),
      createdBy: `${currentUser.name} (Marketing)`,
      operationsReview: {
        status: 'Pending',
        locationReadiness: 'Ready',
        surveyRequired: false,
        personnelFeasibility: 'Feasible',
      },
      recruitmentReview: {
        status: 'Pending',
        sourcingMethod: 'Combined',
        headcountFeasibility: 'Confirmed',
        estimatedLeadTimeDays: 14,
      },
      procurementReview: {
        status: 'Pending',
        materialAvailability: 'Partial Stock',
        uniformReadiness: 'Available',
        equipmentReadiness: 'Need Procurement',
      },
      financeAssessment: {
        status: 'Pending',
        estimatedCostRp: (newFPKData.estimatedPersonnel || 30) * 8000000,
        contractValueRp: (newFPKData.estimatedPersonnel || 30) * 10000000,
        calculatedMarginPercent: 20,
      },
      bodDecision: {
        status: 'Pending',
      },
    };

    setFpks(prev => [fpk, ...prev]);
    appendAuditLog('FPK_CREATED', `Pengajuan FPK baru ${fpkNum} dibuat dan dikirimkan untuk telaah bersama lintas divisi.`, 'ACTION');
    triggerNotification(`Pengajuan FPK ${fpkNum} berhasil dibuat dan dikirim untuk telaah bersama!`, 'success');
  }, [currentUser, appendAuditLog, triggerNotification]);

  // Assign Guard to Site
  const assignGuardToSite = useCallback((personnelId: string, siteId: string) => {
    const targetSite = sites.find(s => s.id === siteId);
    if (!targetSite) return;

    setPersonnel(prev => prev.map(p => {
      if (p.id !== personnelId) return p;
      return {
        ...p,
        siteId: siteId,
        siteName: targetSite.name,
        assignmentStatus: 'Active',
      };
    }));

    setSites(prev => prev.map(s => {
      if (s.id !== siteId) return s;
      const alreadyAssigned = s.assignedPersonnelIds.includes(personnelId);
      const newIds = alreadyAssigned ? s.assignedPersonnelIds : [...s.assignedPersonnelIds, personnelId];
      return {
        ...s,
        assignedPersonnelIds: newIds,
        assignedPersonnel: newIds.length,
      };
    }));

    triggerNotification('Petugas keamanan berhasil ditempatkan ke pos jaga!', 'success');
  }, [sites, triggerNotification]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        switchUser,
        projects,
        clients,
        sites,
        areas,
        spks,
        fpks,
        personnel,
        externalMemos,
        tasks,
        mutations,
        auditLogs,
        activeView,
        setActiveView,
        mobileMenuOpen,
        setMobileMenuOpen,
        selectedProjectId,
        setSelectedProjectId,
        selectedProject,
        notification,
        setNotification,
        submitDepartmentReview,
        submitFinanceAssessment,
        decideBOD,
        verifySPK,
        confirmStartGuard,
        sendRenewalMemo,
        recordClientResponse,
        completeTask,
        createFPK,
        assignGuardToSite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
