export type UserRole = 
  | 'Marketing'
  | 'Operations'
  | 'Recruitment'
  | 'HR'
  | 'PIC Area'
  | 'Procurement'
  | 'Finance'
  | 'BOD'
  | 'System Admin';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  department: string;
  assignedArea?: string; // For PIC Area scoping
  canApproveBOD?: boolean;
  canVerifyFinance?: boolean;
  canConfirmStartGuard?: boolean;
  canCreateFPK?: boolean;
  avatarInitials: string;
}

export type FPKStatus = 
  | 'Draft'
  | 'Submitted'
  | 'Under Review'      // Ops, Rec, Proc parallel reviews active
  | 'Financial Review'  // Finance cost estimate & margin calculation
  | 'Pending BOD'       // Waiting for BOD decision
  | 'Approved'          // Creates Project Record!
  | 'Returned'          // Returned to Marketing for revision
  | 'Rejected';

export interface DepartmentReview {
  status: 'Pending' | 'Approved' | 'Returned' | 'Survey Requested';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface OperationsReview extends DepartmentReview {
  locationReadiness: 'Ready' | 'Needs Survey' | 'Not Feasible';
  surveyRequired: boolean;
  personnelFeasibility: 'Feasible' | 'Tight' | 'Critical Shortage';
}

export interface RecruitmentReview extends DepartmentReview {
  sourcingMethod: 'Internal Mutation' | 'New Hire' | 'Combined';
  headcountFeasibility: 'Confirmed' | 'Partial' | 'Risk';
  estimatedLeadTimeDays: number;
}

export interface ProcurementReview extends DepartmentReview {
  materialAvailability: 'Full Stock' | 'Partial Stock' | 'Need Purchase';
  uniformReadiness: 'Available' | 'Need Procurement';
  equipmentReadiness: 'Available' | 'Need Procurement';
}

export interface FinanceAssessment {
  status: 'Pending' | 'Completed' | 'Returned';
  estimatedCostRp: number;
  contractValueRp: number;
  calculatedMarginPercent: number;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface BODDecision {
  status: 'Pending' | 'Approved' | 'Returned' | 'Rejected';
  decidedBy?: string;
  decidedAt?: string;
  returnReason?: string;
  notes?: string;
}

export interface FPK {
  id: string;
  fpkNumber: string;
  clientId: string;
  clientName: string;
  projectName: string;
  dealType: 'New Project' | 'Expansion' | 'Replacement';
  securityScope: string;
  targetStartDate: string;
  estimatedPersonnel: number;
  boqAttachmentName: string;
  dealProofName: string;
  status: FPKStatus;
  createdAt: string;
  createdBy: string;
  operationsReview: OperationsReview;
  recruitmentReview: RecruitmentReview;
  procurementReview: ProcurementReview;
  financeAssessment: FinanceAssessment;
  bodDecision: BODDecision;
  createdProjectId?: string; // Linked once BOD approves
}

export interface SPK {
  id: string;
  spkNumber: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  contractStart: string;
  contractEnd: string;
  contractValueRp: number;
  personnelQuota: number;
  siteIds: string[];
  spkDocumentName: string;
  verificationStatus: 'Pending Verification' | 'Verified' | 'Returned for Correction';
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  fpkReferenceId: string;
  isExpiringSoon?: boolean; // Within H-75
  daysToExpiration?: number;
}

export interface Site {
  id: string;
  siteCode: string;
  name: string;
  projectId: string;
  projectName: string;
  areaId: string;
  areaName: string;
  address: string;
  requiredPersonnel: number;
  assignedPersonnel: number;
  operationalStatus: 'Mobilizing' | 'Active Guard' | 'Suspended';
  startGuardConfirmed: boolean;
  startGuardTimestamp?: string;
  startGuardConfirmedBy?: string;
  assignedPersonnelIds: string[];
}

export interface Area {
  id: string;
  areaCode: string;
  name: string;
  picAreaUserId: string;
  picAreaName: string;
  siteIds: string[];
  totalGuards: number;
}

export interface Personnel {
  id: string;
  personnelId: string; // e.g. "SEC-2026-081"
  fullName: string;
  position: 'Danru (Supervisor)' | 'Patrol Guard' | 'Gate Controller' | 'CCTV Operator';
  areaId: string;
  areaName: string;
  siteId?: string;
  siteName?: string;
  employmentStatus: 'PKWT' | 'PKWTT' | 'Probation';
  assignmentStatus: 'Active' | 'Available / Standby' | 'Under Mutation' | 'Resigned';
  startAssignmentDate: string;
  uniformSize: 'M' | 'L' | 'XL' | 'XXL';
  shoeSize: number;
  skckValidUntil: string;
  k3Certified: boolean;
}

export interface ExternalMemo {
  id: string;
  memoNumber: string;
  spkId: string;
  spkNumber: string;
  projectId: string;
  projectName: string;
  clientName: string;
  stage: 'H-75' | 'H-60' | 'H-30';
  memoType: 'Renewal Notice' | 'Price Adjustment' | 'Contract Termination';
  dispatchDate: string;
  proofOfDeliveryName?: string;
  clientResponse: 'Pending' | 'Agree' | 'Negotiate' | 'Not Continuing';
  responseDate?: string;
  escalatedToBOD: boolean;
  contractOutcome?: 'Extend SPK' | 'Revise BOQ & Margin' | 'Demobilize';
}

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  clientId: string;
  clientName: string;
  fpkId: string;
  createdAt: string;
  status: 'Mobilizing' | 'Active' | 'Expired' | 'Terminated';
  siteIds: string[];
  spkIds: string[];
  totalRequiredPersonnel: number;
  totalAssignedPersonnel: number;
  
  // Jalan Tanpa SPK Monitoring (Section 6.3 & HD Map)
  isJalanTanpaSPK: boolean;
  daysOperatingWithoutSPK: number;
  unverifiedContractValueRp: number;
  jalanTanpaSPKEscalated: boolean;
  
  targetStartDate: string;
  projectEndDate?: string;
  overallReadinessPercent: number;
}

export interface TaskItem {
  id: string;
  title: string;
  relatedEntity: 'FPK' | 'SPK' | 'Project' | 'Site' | 'Personnel' | 'Memo';
  entityId: string;
  entityReference: string;
  assignedRole: UserRole;
  assignedUser?: string;
  createdDate: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Escalated';
  priority: 'Critical' | 'High' | 'Normal';
  actionUrl?: string;
}

export interface PersonnelMutation {
  id: string;
  personnelId: string;
  personnelName: string;
  originArea: string;
  originSite: string;
  destinationArea: string;
  destinationSite: string;
  effectiveDate: string;
  status: 'Initiated' | 'Origin Released' | 'HR Assigned' | 'Completed';
  originAreaUnderQuota: boolean;
  replacementTaskSpawned: boolean;
}

export interface Client {
  id: string;
  name: string;
  code: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  projectIds: string[];
  contractStatus: 'Active' | 'Under Review' | 'Negotiation';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  userRole: UserRole;
  action: string;
  details: string;
  type: 'INFO' | 'ACTION' | 'SECURITY_ALERT' | 'APPROVAL';
}
