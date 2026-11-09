# JISS — End-to-End Business Process & MVP PRD Implementation Plan

Implement the official **JISS End-to-End Business Process Map** (HD Draft v1) and **MVP PRD v0.1**, pruning obsolete prototype artifacts and establishing a streamlined, highly cohesive operational platform.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Streamlining & Deprecations (Removing Unneeded Features for a Cleaner Architecture):**
> 1. **Prune "Admin Area" as a standalone module**: The new workflow map confirms that FPK approval by **BOD Decision** directly creates the **Project Record**, handing off directly to **Mobilization Prep**. The separate intermediate "Admin Area Bridge" screen is removed and consolidated into standard role-based handoffs.
> 2. **Prune actual vendor order purchasing & inventory management**: The PRD (p. 7 & p. 24) explicitly notes that actual procurement purchasing transactions and inventory management are out of scope. Procurement's role is strictly **FPK Material Requirement Review & Availability Confirmation**.
> 3. **Prune multi-version structured BOQ builder**: Scope note confirms BOQ is attached as a document file; financial analysis focuses on Estimated Cost vs. Contract Value and Margin %.
> 4. **Solidify the 4 Official Process Stages**:
>    - **Stage 01: Request & FPK**: Client request $\rightarrow$ Marketing clarifies scope $\rightarrow$ Create FPK with deal proof.
>    - **Stage 02: Review & Approval**: Parallel reviews (Operations, Recruitment, Procurement) $\rightarrow$ Finance review (Cost estimate & margin) $\rightarrow$ BOD decision (Approve / Return / Reject) $\rightarrow$ **Project Record created upon BOD approval**.
>    - **Stage 03: Project & Mobilization**: Mobilization prep $\rightarrow$ HR registration & assignment $\rightarrow$ **PIC Area Start Guard Confirmation**.
>    - **Stage 04: SPK & Contract Control**: SPK received $\rightarrow$ Finance verifies (Compares SPK with approved FPK) $\rightarrow$ SPK Active.
> 5. **Jalan Tanpa SPK Monitoring**: Dedicated indicator & duration counter when Stage 03 mobilization starts prior to SPK verification, with escalation threshold.
> 6. **Ongoing Lifecycle & Expiration**: H-75 (Task creation) $\rightarrow$ H-60 (Marketing sends external memo) $\rightarrow$ H-30 (Client response checkpoint: Agree / Negotiate / Not Continuing, escalate to BOD if unresponded).
> 7. **Personnel Mutation & Replacement Flow**: Recruitment selects mutation $\rightarrow$ Origin Ops confirms release $\rightarrow$ HR updates placement $\rightarrow$ Notify PIC Area $\rightarrow$ Origin area quota check (triggers replacement task within 5 working days if under quota).

---

## 1. Overview & Information Architecture

The system navigation directly mirrors Section 7 of the PRD and the HD Business Process diagram:

- **OVERVIEW**
  - **Dashboard**: Executive overview of active projects, active SPKs, readiness, Jalan Tanpa SPK alerts, pending approvals, and upcoming expirations.
- **BUSINESS**
  - **Clients**: Client master, contact information, associated projects.
  - **Projects**: Unified Project Records created upon BOD approval, monitoring linked Sites, SPKs, and operational status.
  - **FPK**: Internal work request lifecycle (Drafting $\rightarrow$ Parallel Ops/Rec/Proc Review $\rightarrow$ Finance Review $\rightarrow$ BOD Decision).
  - **SPK & Contracts**: Contract registry, FPK vs SPK comparison, Finance verification.
  - **External Memos**: Contract renewal and notice memos (H-75, H-60, H-30 timeline).
- **OPERATIONS**
  - **Sites & Areas**: Geographic areas and physical guard deployment locations.
  - **Personnel**: Active guard database, assignments, uniform/shoe sizing, mutation flow.
  - **Deployment**: Live site staffing, shortage monitoring, and PIC Area **Start Guard** confirmation.
- **WORKSPACE**
  - **My Tasks & Approvals**: Cross-department task inbox with deadlines and escalation flags.
- **ADMINISTRATION**
  - **Users & Roles**: 9 target roles with data scope and live floating role switcher.
  - **Master Data & Audit**: Traceable log of decisions, FPK approvals, and contract verifications.

---

## 2. End-to-End Workflow & Business Rules

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 01: REQUEST & FPK                                                                         │
│  [Client Request] ──► [Marketing Scope] ──► [Create FPK with BOQ Attachment]                   │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 02: REVIEW & APPROVAL                                                                     │
│  ┌───────────────────────┐                                                                      │
│  │ Operations Review     │ ──┐                                                                  │
│  ├───────────────────────┤   │                                                                  │
│  │ Recruitment Review    │ ──┼──► [Finance Review: Cost & Margin] ──► [BOD Decision: Approve]   │
│  ├───────────────────────┤   │                                                     │            │
│  │ Procurement Review    │ ──┘                                                     ▼            │
│  └───────────────────────┘                                               [Project Record Created]
└────────────────────────────────────────────────────────────────────────────────────┬────────────┘
                                                                                     │
                       ┌─────────────────────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 03: PROJECT & MOBILIZATION                                                                │
│  [Mobilization Prep] ──► [HR Registration & Site Assignment] ──► [PIC Area Confirms Start Guard]│
│            │                                                                                    │
│            ▼ (If SPK not yet verified)                                                          │
│  [Jalan Tanpa SPK Monitor: Tracks Days Active & Escalates if unverified]                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                       │
                       ▼ (Parallel / Concurrently)
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 04: SPK & CONTRACT CONTROL                                                                │
│  [SPK Received / Input] ──► [Finance Verifies: Compare SPK vs FPK] ──► [SPK Active / Verified]  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ONGOING LIFECYCLE & CONTRACT EXPIRATION                                                         │
│  [H-75 System Renewal Task] ──► [H-60 Marketing External Memo] ──► [H-30 Client Response]       │
│                                                                              │                  │
│                                            ┌───────────────────┬─────────────┴─────────────┐    │
│                                            ▼                   ▼                           ▼    │
│                                        [Agree]            [Negotiate]               [Not Continuing]
│                                           │                   │                            │    │
│                                     (Extend SPK)      (Revise BOQ/Margin)             (Demobilize)
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Functional Modules to Build & Update

### 3.1 Enhanced Data Models (`src/types.ts`)
- Update `UserRole` to exactly match the 9 PRD roles:
  `Marketing` | `Operations` | `Recruitment` | `HR` | `PIC Area` | `Procurement` | `Finance` | `BOD` | `System Admin`.
- `FPK`:
  - `status`: `'Draft' | 'Under Review' | 'Financial Review' | 'Pending BOD' | 'Approved' | 'Returned' | 'Rejected'`.
  - `reviews`:
    - `operations`: `{ status, feasibilityOk, surveyRequired, notes, reviewer }`
    - `recruitment`: `{ status, sourcingMethod: 'Internal Mutation' | 'New Hire' | 'Combined', notes, reviewer }`
    - `procurement`: `{ status, materialAvailabilityOk, needToOrder, notes, reviewer }`
    - `finance`: `{ status, estimatedCostRp, calculatedMarginPercent, financialAssessment, reviewer }`
  - `bodDecision`: `{ status, decisionDate, decidedBy, returnReason, notes }`.
- `Project`:
  - Created only after FPK approval (or pre-seeded as active projects).
  - Contains linked `siteIds` and `spkIds`.
  - Holds `isJalanTanpaSPK: boolean` and `daysWithoutSPK: number`.
- `SPK`:
  - `spkNumber`, `projectId`, `clientName`, `contractStart`, `contractEnd`, `contractValueRp`, `personnelQuota`, `verificationStatus: 'Draft' | 'Submitted' | 'Verified' | 'Returned'`, `verificationNotes`.
- `Site`:
  - `siteCode`, `name`, `areaName`, `requiredPersonnel`, `assignedPersonnel`, `startGuardConfirmed: boolean`, `startGuardTimestamp?: string`, `startGuardConfirmedBy?: string`.
- `ExternalMemo`:
  - `memoNumber`, `spkId`, `stage: 'H-75' | 'H-60' | 'H-30'`, `dispatchDate`, `clientResponse: 'Pending' | 'Agree' | 'Negotiate' | 'Not Continuing'`, `escalatedToBOD: boolean`.
- `PersonnelMutation`:
  - `personnelId`, `originArea`, `originSite`, `destinationArea`, `destinationSite`, `effectiveDate`, `status: 'Initiated' | 'Origin Approved' | 'HR Placed' | 'Completed'`.

### 3.2 Context & Business Engine (`src/context/AppContext.tsx` & `src/mockData.ts`)
- Seed authentic projects illustrating:
  1. **PT Nusantara Security Logistics** — Jakarta Industrial Site & Bekasi Warehouse: Approved FPK, active mobilization, 1 SPK active, 1 SPK undergoing "Jalan Tanpa SPK" tracking.
  2. **PT Mineral Indo Resources** — Morowali Smelter: Active project, SPK entering H-60 expiration timeline.
  3. **PT Graha Logistik Indonesia** — New FPK currently in Stage 02 (Parallel review & BOD decision queue).
- Actions:
  - `submitFPKReview(fpkId, department, reviewData)`
  - `submitFinanceAssessment(fpkId, estimatedCost, margin)`
  - `decideBOD(fpkId, decision, returnReason)` $\rightarrow$ automatically spawns/activates Project Record!
  - `verifySPK(spkId, approved, notes)`
  - `confirmStartGuard(siteId)` (exclusive to PIC Area role)
  - `sendRenewalMemo(memoId, proof)`
  - `recordClientResponse(memoId, response)`
  - `processMutation(mutationData)`

### 3.3 Clean Visual Components & Screens
- **Navigation (`Sidebar.tsx`)**: Upgraded to 5 clean operational sections: Overview, Business, Operations, Workspace, Administration.
- **Dashboard (`DashboardView.tsx`)**: Incorporates the HD map lifecycle strips, Jalan Tanpa SPK KPI counter, active SPK count, and direct jump to pending reviews.
- **FPK Review Board (`FPKView.tsx`)**: Interactive parallel review cards for Operations, Recruitment, Procurement, Finance margin calculation, and BOD Decision modal.
- **SPK & Contract Verification (`SPKContractsView.tsx`)**: FPK vs. SPK side-by-side reconciliation (Personnel Quota, Contract Value, Start/End dates) and verification sign-off.
- **Deployment & Start Guard (`DeploymentMonitoringView.tsx`)**: Site guard shortage detector, personnel allocation roster, and PIC Area "Confirm Start Guard" action button.
- **Contract Expiration & Memos (`ExternalMemosView.tsx`)**: H-75, H-60, H-30 countdown timeline with client response recording.
- **Floating Role Switcher (`FloatingRoleSwitcher.tsx`)**: Quick switcher updated with all 9 PRD roles so every approval and permission check can be tested live in seconds.
