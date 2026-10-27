import { Activity, BarChart3, Bot, BookOpen, Briefcase, ClipboardCheck, FolderKanban, Gauge, Layers, Library, Rocket, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
import type { ModuleId } from "@/lib/rpos/config";

export type ModulePath = "/" | "/portfolios" | "/projects" | "/rki" | "/readiness" | "/activation" | "/delivery" | "/assurance" | "/intelligence" | "/knowledge" | "/agents" | "/reports" | "/admin";

export interface NavItem {
  id: ModuleId;
  label: string;
  to: ModulePath;
  icon: LucideIcon;
  views: { id: string; label: string; group?: string }[];
}

export const NAV: NavItem[] = [
  { id: "overview", label: "Executive Overview", to: "/", icon: Gauge, views: [] },
  { id: "portfolios", label: "Portfolio Management", to: "/portfolios", icon: Layers, views: [
    { id: "overview", label: "Overview" }, { id: "register", label: "Register" }, { id: "performance", label: "Performance" }, { id: "risks", label: "Risks" }, { id: "compare", label: "Comparison" }, { id: "reporting", label: "Reporting" },
  ] },
  { id: "projects", label: "Project Workspace", to: "/projects", icon: FolderKanban, views: [] },
  { id: "rki", label: "Knowledge Intelligence", to: "/rki", icon: BookOpen, views: [
    { id: "dashboard", label: "Dashboard", group: "Knowledge" },
    { id: "sources", label: "Sources", group: "Sources" }, { id: "hierarchy", label: "Source hierarchy", group: "Sources" }, { id: "upload", label: "Upload & review", group: "Sources" },
    { id: "evidence", label: "Evidence", group: "Evidence" }, { id: "lineage", label: "Evidence lineage", group: "Evidence" },
    { id: "capture", label: "Capture & extraction", group: "Operations" }, { id: "validation", label: "Validation queue", group: "Operations" }, { id: "gaps", label: "Gaps", group: "Operations" }, { id: "contradictions", label: "Contradictions", group: "Operations" }, { id: "approvals", label: "Approval queue", group: "Operations" }, { id: "refresh", label: "Refresh", group: "Operations" }, { id: "map", label: "Knowledge map", group: "Operations" },
  ] },
  { id: "readiness", label: "Readiness Assessment", to: "/readiness", icon: ClipboardCheck, views: [
    { id: "dashboard", label: "Dashboard" }, { id: "assess", label: "14-domain assessment" }, { id: "findings", label: "Findings & gaps" }, { id: "actions", label: "Actions & owners" }, { id: "history", label: "History" }, { id: "compare", label: "Comparison" }, { id: "report", label: "Readiness report" },
  ] },
  { id: "activation", label: "Project Activation", to: "/activation", icon: Rocket, views: [
    { id: "dashboard", label: "Dashboard" }, { id: "timeline", label: "60-day timeline" }, { id: "workstreams", label: "Workstreams" }, { id: "raci", label: "RACI" }, { id: "governance", label: "Governance & cadence" }, { id: "controls", label: "Controls & registers" }, { id: "decisions", label: "Decisions & risks" }, { id: "handover", label: "Completion & handover" },
  ] },
  { id: "delivery", label: "Delivery Operating System", to: "/delivery", icon: Briefcase, views: [
    { id: "plan", label: "Integrated plan", group: "Controls" }, { id: "milestones", label: "Milestones", group: "Controls" }, { id: "deliverables", label: "Deliverables", group: "Controls" }, { id: "workpackages", label: "Work packages", group: "Controls" }, { id: "actions", label: "Actions", group: "Controls" }, { id: "decisions", label: "Decisions", group: "Controls" }, { id: "dependencies", label: "Dependencies", group: "Controls" }, { id: "changes", label: "Changes", group: "Controls" }, { id: "risks", label: "Risks & issues", group: "Controls" },
    { id: "governance", label: "Governance", group: "Governance" }, { id: "orgchart", label: "Org chart", group: "Governance" }, { id: "raci", label: "RACI", group: "Governance" }, { id: "meetings", label: "Meetings", group: "Governance" }, { id: "approvals", label: "Approvals", group: "Governance" }, { id: "authority", label: "Delegated authority", group: "Governance" },
    { id: "workstreams", label: "Workstreams", group: "Delivery" }, { id: "submissions", label: "Submissions", group: "Delivery" }, { id: "resources", label: "Resources", group: "Delivery" }, { id: "interfaces", label: "Interfaces", group: "Delivery" },
    { id: "opcontrols", label: "Operational controls", group: "Operations" },
  ] },
  { id: "assurance", label: "Delivery Assurance", to: "/assurance", icon: ShieldCheck, views: [
    { id: "dashboard", label: "Dashboard" }, { id: "plan", label: "Plan & schedule" }, { id: "trace", label: "Traceability" }, { id: "reviews", label: "Reviews" }, { id: "tests", label: "Tests & inspections" }, { id: "ncr", label: "NCRs" }, { id: "defects", label: "Defects" }, { id: "capa", label: "Corrective actions" }, { id: "acceptance", label: "Acceptance" }, { id: "gates", label: "Stage gates" }, { id: "findings", label: "Findings" }, { id: "record", label: "Assurance record" },
  ] },
  { id: "intelligence", label: "Executive Intelligence", to: "/intelligence", icon: Activity, views: [
    { id: "dashboard", label: "Dashboard" }, { id: "performance", label: "Performance" }, { id: "risk", label: "Risk exposure" }, { id: "readiness", label: "Commissioning & ops readiness" }, { id: "decisions", label: "Decision intelligence" }, { id: "interventions", label: "Interventions" }, { id: "forecasts", label: "Forecasts & trends" }, { id: "briefs", label: "Executive briefs" }, { id: "lessons", label: "Lessons learned" },
  ] },
  { id: "knowledge", label: "Knowledge Management", to: "/knowledge", icon: Library, views: [
    { id: "library", label: "Library" }, { id: "taxonomy", label: "Taxonomy" }, { id: "documents", label: "Documents" }, { id: "Template", label: "Templates" }, { id: "SOP", label: "SOPs" }, { id: "Lesson learned", label: "Lessons" }, { id: "Best practice", label: "Best practices" }, { id: "Reusable requirement", label: "Reusable requirements" }, { id: "Reusable work package", label: "Reusable WPs" }, { id: "Assurance test", label: "Assurance tests" }, { id: "Reference", label: "References" }, { id: "approval", label: "Approval & versions" },
  ] },
  { id: "agents", label: "AI Agent Centre", to: "/agents", icon: Bot, views: [
    { id: "overview", label: "Overview" }, { id: "directory", label: "Directory" }, { id: "console", label: "Agent console" }, { id: "queue", label: "Human review queue" }, { id: "performance", label: "Performance & evaluation" },
  ] },
  { id: "reports", label: "Reports & Analytics", to: "/reports", icon: BarChart3, views: [] },
  { id: "admin", label: "Administration", to: "/admin", icon: Settings, views: [
    { id: "orgs", label: "Organisations", group: "Access" }, { id: "users", label: "Users", group: "Access" }, { id: "roles", label: "Roles & permissions", group: "Access" }, { id: "access", label: "Project & portfolio access", group: "Access" }, { id: "authority", label: "Approval authority", group: "Access" },
    { id: "workflows", label: "Workflows", group: "Configuration" }, { id: "registers", label: "Registers & statuses", group: "Configuration" }, { id: "taxonomy", label: "Taxonomy", group: "Configuration" }, { id: "criteria", label: "Readiness criteria", group: "Configuration" }, { id: "thresholds", label: "Thresholds", group: "Configuration" }, { id: "reporting", label: "Reporting", group: "Configuration" }, { id: "notifications", label: "Notifications", group: "Configuration" },
    { id: "audit", label: "Audit log", group: "System" }, { id: "settings", label: "System settings", group: "System" },
  ] },
];
