import type { Band } from "./config";

export interface Organisation {
  id: string;
  name: string;
  country: string;
}
export interface Portfolio {
  id: string;
  orgId: string;
  name: string;
  description: string;
  owner: string;
  status: string;
  geography: string;
  technology: string;
}
export interface Project {
  id: string;
  portfolioId: string;
  name: string;
  technology: "Solar PV" | "Wind" | "BESS" | "Hybrid";
  capacity: string;
  country: string;
  region: string;
  stage: string;
  status: string;
  director: string;
  manager: string;
  budget: number; // ZAR/USD m
  spent: number;
  spi: number;
  cpi: number;
  cod: string;
  offtaker: string;
  epc: string;
  objective: string;
  activationDay: number; // 0..60
}
export interface Comment {
  id: string;
  author: string;
  at: string;
  text: string;
}
export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  target?: string;
  projectId?: string;
}
export interface RecordItem {
  id: string;
  type: string;
  title: string;
  description: string;
  projectId: string;
  owner: string;
  status: string;
  severity?: Band;
  created: string;
  due: string;
  fields: Record<string, string>;
  links: string[];
  comments: Comment[];
  attachments: string[];
  history: AuditEvent[];
  archived?: boolean;
}
export interface AgentProposal {
  id: string;
  agentId: string;
  projectId: string;
  kind: "Observation" | "Recommendation";
  title: string;
  analysis: string;
  evidence: string[];
  assumptions: string[];
  findings: string[];
  confidence: number;
  actions: string[];
  status: "Pending review" | "Approved" | "Rejected";
  reviewer?: string;
  created: string;
}
export interface Notification {
  id: string;
  text: string;
  at: string;
  read: boolean;
  href?: string;
}
export interface ReadinessEntry {
  score: number; // 0-5
  confidence: number; // 0-100
  evidence: number; // coverage %
  criteria: boolean[];
  note: string;
}
export interface ActivationTask {
  id: string;
  workstream: string;
  name: string;
  start: number;
  duration: number;
  owner: string;
  progress: number;
  milestone?: boolean;
}
