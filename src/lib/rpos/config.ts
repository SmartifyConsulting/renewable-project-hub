// Canonical RPOS configuration: object families, readiness domains, agents, roles.
// Domain and agent lists are placeholders to be reconciled against the RPOS
// Functional Specification / Architecture Blueprint before backend integration.

export const BANDS = ["Low", "Slightly elevated", "Moderate", "High", "Very high"] as const;
export type Band = (typeof BANDS)[number];

export const STAGES = [
  "Origination",
  "Feasibility",
  "Development",
  "Activation",
  "Pre-construction",
  "Construction",
  "Commissioning",
  "Operations",
] as const;

export const GATES = [
  { id: "G0", name: "Opportunity screening", stage: "Origination" },
  { id: "G1", name: "Feasibility approval", stage: "Feasibility" },
  { id: "G2", name: "Development approval", stage: "Development" },
  { id: "G3", name: "Readiness / FID", stage: "Activation" },
  { id: "G4", name: "Construction start", stage: "Pre-construction" },
  { id: "G5", name: "Commissioning readiness", stage: "Construction" },
  { id: "G6", name: "Operations handover", stage: "Commissioning" },
];

export interface ExtraField {
  key: string;
  label: string;
  options?: string[];
}
export interface RegisterDef {
  key: string;
  label: string;
  singular: string;
  prefix: string;
  statuses: string[];
  severity?: boolean;
  extra?: ExtraField[];
}

const DOMAIN_OPTS = [
  "Grid",
  "Land",
  "Permitting",
  "Technical",
  "Commercial",
  "Financial",
  "Procurement",
  "HSE",
  "Community",
  "Governance",
];

export const REGISTERS: Record<string, RegisterDef> = {
  risk: { key: "risk", label: "Risks", singular: "Risk", prefix: "RSK", statuses: ["Open", "Mitigating", "Accepted", "Closed"], severity: true, extra: [{ key: "likelihood", label: "Likelihood", options: ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"] }, { key: "domain", label: "Domain", options: DOMAIN_OPTS }] },
  issue: { key: "issue", label: "Issues", singular: "Issue", prefix: "ISS", statuses: ["Open", "In progress", "Resolved", "Closed"], severity: true },
  decision: { key: "decision", label: "Decisions", singular: "Decision", prefix: "DEC", statuses: ["Draft", "Pending approval", "Approved", "Rejected", "Superseded"], extra: [{ key: "authority", label: "Authority", options: ["Project Board", "Investment Committee", "Project Director", "Steering Committee"] }] },
  action: { key: "action", label: "Actions", singular: "Action", prefix: "ACT", statuses: ["Open", "In progress", "Completed", "Overdue"] },
  dependency: { key: "dependency", label: "Dependencies", singular: "Dependency", prefix: "DEP", statuses: ["Identified", "Agreed", "At risk", "Resolved"], extra: [{ key: "party", label: "External party" }] },
  change: { key: "change", label: "Change requests", singular: "Change request", prefix: "CHG", statuses: ["Raised", "Assessed", "Pending approval", "Approved", "Rejected", "Implemented"], extra: [{ key: "impact", label: "Cost impact" }] },
  requirement: { key: "requirement", label: "Requirements", singular: "Requirement", prefix: "REQ", statuses: ["Draft", "Baselined", "Verified", "Deferred"], extra: [{ key: "category", label: "Category", options: ["Grid code", "Permit condition", "Lender", "Technical", "HSE", "Local content"] }] },
  deliverable: { key: "deliverable", label: "Deliverables", singular: "Deliverable", prefix: "DLV", statuses: ["Planned", "Submitted", "Reviewed", "Accepted", "Rejected", "Verified"] },
  workpackage: { key: "workpackage", label: "Work packages", singular: "Work package", prefix: "WP", statuses: ["Not started", "In progress", "Complete", "On hold"], extra: [{ key: "progress", label: "Progress %" }] },
  milestone: { key: "milestone", label: "Milestones", singular: "Milestone", prefix: "MS", statuses: ["Planned", "On track", "At risk", "Achieved", "Missed"] },
  evidence: { key: "evidence", label: "Evidence", singular: "Evidence item", prefix: "EVD", statuses: ["Captured", "Under review", "Validated", "Rejected"], extra: [{ key: "quality", label: "Quality", options: ["A – Primary", "B – Secondary", "C – Indicative"] }, { key: "confidence", label: "Confidence %" }, { key: "classification", label: "Classification", options: ["Study", "Contract", "Permit", "Survey", "Correspondence", "Model"] }] },
  source: { key: "source", label: "Sources", singular: "Source", prefix: "SRC", statuses: ["Registered", "Under review", "Approved", "Superseded"], extra: [{ key: "version", label: "Version" }, { key: "hierarchy", label: "Hierarchy", options: ["Tier 1 – Authoritative", "Tier 2 – Contractual", "Tier 3 – Advisory", "Tier 4 – Informal"] }, { key: "classification", label: "Classification", options: ["Regulatory", "Technical study", "Contract", "Survey", "Financial", "Correspondence"] }] },
  gap: { key: "gap", label: "Knowledge gaps", singular: "Knowledge gap", prefix: "GAP", statuses: ["Open", "Assigned", "Closed"], severity: true },
  contradiction: { key: "contradiction", label: "Contradictions", singular: "Contradiction", prefix: "CON", statuses: ["Open", "Under review", "Resolved"], severity: true },
  control: { key: "control", label: "Controls", singular: "Control", prefix: "CTL", statuses: ["Effective", "Partially effective", "Ineffective", "Not tested"], extra: [{ key: "frequency", label: "Frequency", options: ["Weekly", "Fortnightly", "Monthly", "Quarterly", "Per event"] }] },
  test: { key: "test", label: "Tests & inspections", singular: "Test", prefix: "TST", statuses: ["Planned", "Executed", "Passed", "Failed"] },
  ncr: { key: "ncr", label: "Non-conformances", singular: "Non-conformance", prefix: "NCR", statuses: ["Open", "Under investigation", "Corrective action", "Closed"], severity: true },
  defect: { key: "defect", label: "Defects", singular: "Defect", prefix: "DEF", statuses: ["Open", "Fixing", "Retest", "Closed"], severity: true },
  capa: { key: "capa", label: "Corrective actions", singular: "Corrective action", prefix: "CAPA", statuses: ["Open", "In progress", "Verified", "Closed"] },
  review: { key: "review", label: "Assurance reviews", singular: "Review", prefix: "REV", statuses: ["Scheduled", "In review", "Completed"], extra: [{ key: "kind", label: "Review type", options: ["Deliverable review", "Quality review", "Stage-gate review", "Design review", "Readiness review"] }] },
  finding: { key: "finding", label: "Findings", singular: "Finding", prefix: "FND", statuses: ["Open", "Action raised", "Closed"], severity: true, extra: [{ key: "origin", label: "Origin", options: ["Readiness", "Assurance", "Agent", "Audit"] }] },
  recommendation: { key: "recommendation", label: "Recommendations", singular: "Recommendation", prefix: "RCM", statuses: ["Proposed", "Under review", "Approved", "Rejected", "Implemented"] },
  stakeholder: { key: "stakeholder", label: "Stakeholders", singular: "Stakeholder", prefix: "STK", statuses: ["Active", "Engaged", "Concern raised", "Inactive"], extra: [{ key: "influence", label: "Influence", options: ["Low", "Medium", "High"] }] },
  document: { key: "document", label: "Documents", singular: "Document", prefix: "DOC", statuses: ["Draft", "In review", "Approved", "Superseded"], extra: [{ key: "doctype", label: "Document type", options: ["Report", "Drawing", "Contract", "Procedure", "Plan", "Minutes"] }] },
  knowledge: { key: "knowledge", label: "Knowledge objects", singular: "Knowledge object", prefix: "KNO", statuses: ["Draft", "In review", "Approved", "Retired"], extra: [{ key: "kind", label: "Kind", options: ["Template", "SOP", "Lesson learned", "Best practice", "Reusable requirement", "Reusable work package", "Assurance test", "Reference"] }, { key: "version", label: "Version" }, { key: "technology", label: "Technology", options: ["Solar PV", "Wind", "BESS", "All"] }] },
  meeting: { key: "meeting", label: "Meetings", singular: "Meeting", prefix: "MTG", statuses: ["Scheduled", "Held", "Minutes approved"], extra: [{ key: "forum", label: "Forum", options: ["Project Board", "Steering Committee", "Weekly Delivery", "Technical Review", "Risk Review"] }] },
  intervention: { key: "intervention", label: "Interventions", singular: "Intervention", prefix: "INT", statuses: ["Proposed", "Approved", "In progress", "Closed"] },
  acceptance: { key: "acceptance", label: "Acceptance records", singular: "Acceptance record", prefix: "ACC", statuses: ["Pending", "Accepted", "Conditional", "Rejected"] },
};

export type RegisterKey = keyof typeof REGISTERS;

export const PENDING_STATUSES = ["Pending approval", "Under review", "Submitted", "In review", "Proposed"];

// 14 readiness domains (weights sum to 100).
export const DOMAINS = [
  { id: "D01", name: "Strategic alignment & investment intent", weight: 6 },
  { id: "D02", name: "Land & site control", weight: 8 },
  { id: "D03", name: "Resource assessment & energy yield", weight: 7 },
  { id: "D04", name: "Grid connection & capacity", weight: 10 },
  { id: "D05", name: "Permitting & environmental authorisation", weight: 9 },
  { id: "D06", name: "Technical design & technology", weight: 8 },
  { id: "D07", name: "Offtake & commercial structure", weight: 9 },
  { id: "D08", name: "Financial model & funding", weight: 9 },
  { id: "D09", name: "Procurement & supply chain", weight: 6 },
  { id: "D10", name: "Contracting strategy", weight: 6 },
  { id: "D11", name: "Stakeholder & community", weight: 6 },
  { id: "D12", name: "Health, safety & environment", weight: 5 },
  { id: "D13", name: "Governance, organisation & controls", weight: 6 },
  { id: "D14", name: "Schedule & delivery readiness", weight: 5 },
];

export const DOMAIN_CRITERIA = [
  "Required studies are complete and current",
  "Evidence is from an authoritative source",
  "Key risks are identified with owners",
  "Dependencies and interfaces are agreed",
  "Approvals required for next gate are secured",
];

export function readinessResult(overall: number, minScore: number) {
  if (overall >= 75 && minScore >= 2) return "GO" as const;
  if (overall >= 55 && minScore >= 1) return "CONDITIONAL GO" as const;
  return "NO-GO" as const;
}

// 19 specialist agents.
export const AGENTS = [
  { id: "AG01", name: "Orchestrator Agent", area: "Platform", resp: "Routes requests to specialist agents and assembles responses for human review." },
  { id: "AG02", name: "Source Intake Agent", area: "RKI", resp: "Registers and classifies incoming sources, assigns hierarchy and ownership." },
  { id: "AG03", name: "Knowledge Extraction Agent", area: "RKI", resp: "Extracts facts, obligations and parameters from sources into evidence records." },
  { id: "AG04", name: "Evidence Validation Agent", area: "RKI", resp: "Scores evidence quality and confidence; flags stale or weak evidence." },
  { id: "AG05", name: "Contradiction Detection Agent", area: "RKI", resp: "Detects conflicting facts across sources and raises contradictions." },
  { id: "AG06", name: "Knowledge Gap Agent", area: "RKI", resp: "Identifies missing knowledge against readiness criteria." },
  { id: "AG07", name: "Readiness Assessment Agent", area: "Readiness", resp: "Drafts domain scores and findings with linked evidence." },
  { id: "AG08", name: "Grid & Interconnection Agent", area: "Domain", resp: "Analyses grid studies, capacity allocation and connection risks." },
  { id: "AG09", name: "Permitting & Environmental Agent", area: "Domain", resp: "Tracks authorisations, conditions and compliance obligations." },
  { id: "AG10", name: "Commercial & Offtake Agent", area: "Domain", resp: "Reviews PPA terms, tariffs and commercial exposures." },
  { id: "AG11", name: "Financial Model Agent", area: "Domain", resp: "Checks model assumptions, sensitivities and funding readiness." },
  { id: "AG12", name: "Activation Planning Agent", area: "Activation", resp: "Proposes 60-day activation plans, workstreams and RACI." },
  { id: "AG13", name: "Schedule Intelligence Agent", area: "Delivery", resp: "Analyses schedule performance and critical path slippage." },
  { id: "AG14", name: "Risk Intelligence Agent", area: "Delivery", resp: "Identifies emerging risks and suggests mitigations." },
  { id: "AG15", name: "Governance & Decision Agent", area: "Delivery", resp: "Prepares decision papers and tracks delegated authority." },
  { id: "AG16", name: "Assurance Verification Agent", area: "Assurance", resp: "Maps requirements to verification evidence and flags gaps." },
  { id: "AG17", name: "Quality & Non-conformance Agent", area: "Assurance", resp: "Analyses inspection results and NCR trends." },
  { id: "AG18", name: "Executive Briefing Agent", area: "Intelligence", resp: "Drafts executive briefs from approved project information." },
  { id: "AG19", name: "Lessons Learned Agent", area: "Knowledge", resp: "Captures and generalises lessons into reusable knowledge." },
];

export const ROLES = [
  { id: "sysadmin", name: "System Administrator", person: "Pieter van Wyk" },
  { id: "orgadmin", name: "Organisation Administrator", person: "Naledi Khumalo" },
  { id: "director", name: "Project Director", person: "Thandi Mokoena" },
  { id: "pm", name: "Project Manager", person: "James Whitfield" },
  { id: "pmo", name: "PMO", person: "Aisha Patel" },
  { id: "analyst", name: "Knowledge Analyst", person: "Lerato Dlamini" },
  { id: "specialist", name: "Domain Specialist", person: "Dr. Marco Rossi" },
  { id: "delivery", name: "Delivery Lead", person: "Sipho Ndlovu" },
  { id: "assurance", name: "Assurance Lead", person: "Claire Bennett" },
  { id: "executive", name: "Executive", person: "Richard Okafor" },
  { id: "client", name: "Client Viewer", person: "Elena Vargas" },
] as const;
export type RoleId = (typeof ROLES)[number]["id"];

export const MODULES = [
  { id: "overview", label: "Executive Overview" },
  { id: "portfolios", label: "Portfolio Management" },
  { id: "projects", label: "Project Workspace" },
  { id: "rki", label: "Knowledge Intelligence (RKI)" },
  { id: "readiness", label: "Readiness Assessment" },
  { id: "activation", label: "Project Activation" },
  { id: "delivery", label: "Delivery Operating System" },
  { id: "assurance", label: "Delivery Assurance" },
  { id: "intelligence", label: "Executive Intelligence" },
  { id: "knowledge", label: "Knowledge Management" },
  { id: "agents", label: "AI Agent Centre" },
  { id: "reports", label: "Reports & Analytics" },
  { id: "admin", label: "Administration" },
] as const;
export type ModuleId = (typeof MODULES)[number]["id"];

const ALL = MODULES.map((m) => m.id);
export const ROLE_ACCESS: Record<RoleId, { modules: ModuleId[]; canEdit: boolean; canApprove: boolean }> = {
  sysadmin: { modules: ALL, canEdit: true, canApprove: true },
  orgadmin: { modules: ALL, canEdit: true, canApprove: true },
  director: { modules: ALL.filter((m) => m !== "admin"), canEdit: true, canApprove: true },
  pm: { modules: ALL.filter((m) => m !== "admin"), canEdit: true, canApprove: false },
  pmo: { modules: ALL.filter((m) => m !== "admin" && m !== "agents"), canEdit: true, canApprove: false },
  analyst: { modules: ["overview", "projects", "rki", "readiness", "knowledge", "agents", "reports"], canEdit: true, canApprove: false },
  specialist: { modules: ["overview", "projects", "rki", "readiness", "assurance", "knowledge", "agents"], canEdit: true, canApprove: false },
  delivery: { modules: ["overview", "projects", "activation", "delivery", "assurance", "knowledge", "reports"], canEdit: true, canApprove: false },
  assurance: { modules: ["overview", "projects", "readiness", "delivery", "assurance", "knowledge", "reports"], canEdit: true, canApprove: true },
  executive: { modules: ["overview", "portfolios", "projects", "readiness", "intelligence", "reports"], canEdit: false, canApprove: true },
  client: { modules: ["overview", "projects", "reports"], canEdit: false, canApprove: false },
};

export const PEOPLE = [
  "Thandi Mokoena",
  "James Whitfield",
  "Aisha Patel",
  "Lerato Dlamini",
  "Dr. Marco Rossi",
  "Sipho Ndlovu",
  "Claire Bennett",
  "Richard Okafor",
  "Kofi Mensah",
  "Sofia Herrera",
  "Daniel Brooks",
  "Naledi Khumalo",
];
