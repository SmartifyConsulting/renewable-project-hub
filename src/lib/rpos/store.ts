// Local mock store. Swap these actions for server functions when the backend lands.
import { useSyncExternalStore } from "react";
import { DOMAINS, PENDING_STATUSES, REGISTERS, ROLE_ACCESS, ROLES, readinessResult, type RoleId } from "./config";
import { dayOffset, initialData } from "./data";
import type { AgentProposal, Portfolio, Project, RecordItem } from "./types";

type Data = ReturnType<typeof initialData>;
export interface State extends Data {
  orgId: string;
  portfolioId: string; // "all"
  projectId: string; // "all"
  roleId: RoleId;
}

let state: State = { ...initialData(), orgId: "all", portfolioId: "all", projectId: "all", roleId: "director" };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
function set(fn: (s: State) => Partial<State>) {
  state = { ...state, ...fn(state) };
  listeners.forEach((l) => l());
}
export function getState() {
  return state;
}
export function useRpos() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function currentUser(s: State = state) {
  const role = ROLES.find((r) => r.id === s.roleId)!;
  return { ...role, ...ROLE_ACCESS[s.roleId] };
}

const now = () => dayOffset(0);
let seq = 1000;
function logAudit(action: string, target?: string, projectId?: string) {
  const actor = currentUser().person;
  return { id: `AUD-N${seq++}`, at: now(), actor, action, target, projectId };
}

/** Projects visible under the current org/portfolio/project context. */
export function scopedProjects(s: State): Project[] {
  return s.projects.filter((p) => {
    const pf = s.portfolios.find((x) => x.id === p.portfolioId);
    if (s.orgId !== "all" && pf?.orgId !== s.orgId) return false;
    if (s.portfolioId !== "all" && p.portfolioId !== s.portfolioId) return false;
    if (s.projectId !== "all" && p.id !== s.projectId) return false;
    return true;
  });
}

export const actions = {
  setContext(patch: Partial<Pick<State, "orgId" | "portfolioId" | "projectId" | "roleId">>) {
    set(() => patch);
  },
  addRecord(type: string, data: Partial<RecordItem> & { title: string; projectId: string }) {
    const def = REGISTERS[type];
    const count = state.records.filter((r) => r.type === type && r.projectId === data.projectId).length + 1;
    const id = `${def.prefix}-${data.projectId.slice(-3)}-${String(count + 100).padStart(3, "0")}`;
    const ev = logAudit(`Created ${def.singular.toLowerCase()}`, id, data.projectId);
    const rec: RecordItem = {
      id,
      type,
      description: "",
      owner: currentUser().person,
      status: def.statuses[0],
      created: now(),
      due: dayOffset(30),
      fields: {},
      links: [],
      comments: [],
      attachments: [],
      ...data,
      history: [ev],
    };
    // reciprocal links
    const records = state.records.map((r) => (rec.links.includes(r.id) ? { ...r, links: [...r.links, id] } : r));
    set((s) => ({ records: [rec, ...records], audit: [ev, ...s.audit] }));
    return rec;
  },
  updateRecord(id: string, patch: Partial<RecordItem>, message: string) {
    const target = state.records.find((r) => r.id === id);
    const ev = logAudit(message, id, target?.projectId);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, ...patch, history: [ev, ...r.history] } : r)),
      audit: [ev, ...s.audit],
    }));
  },
  addComment(id: string, text: string) {
    const r = state.records.find((x) => x.id === id);
    if (!r) return;
    actions.updateRecord(id, { comments: [...r.comments, { id: `C${seq++}`, author: currentUser().person, at: now(), text }] }, "Added comment");
  },
  addAttachment(id: string, name: string) {
    const r = state.records.find((x) => x.id === id);
    if (!r) return;
    actions.updateRecord(id, { attachments: [...r.attachments, name] }, `Attached ${name}`);
  },
  addProject(p: Omit<Project, "id">) {
    const id = `PRJ-${String(state.projects.length + 1).padStart(3, "0")}`;
    const ev = logAudit("Created project", id, id);
    const readiness = { ...state.readiness, [id]: Object.fromEntries(DOMAINS.map((d) => [d.id, { score: 0, confidence: 0, evidence: 0, criteria: [false, false, false, false, false], note: "" }])) };
    set((s) => ({ projects: [...s.projects, { ...p, id }], readiness, activation: { ...s.activation, [id]: [] }, audit: [ev, ...s.audit] }));
    return id;
  },
  addPortfolio(p: Omit<Portfolio, "id">) {
    const id = `PF-${String(state.portfolios.length + 1).padStart(2, "0")}`;
    set((s) => ({ portfolios: [...s.portfolios, { ...p, id }], audit: [logAudit("Created portfolio", id), ...s.audit] }));
    return id;
  },
  setReadiness(projectId: string, domainId: string, patch: Partial<State["readiness"][string][string]>) {
    set((s) => ({
      readiness: { ...s.readiness, [projectId]: { ...s.readiness[projectId], [domainId]: { ...s.readiness[projectId][domainId], ...patch } } },
      audit: [logAudit(`Updated readiness ${domainId}`, domainId, projectId), ...s.audit],
    }));
  },
  setTaskProgress(projectId: string, taskId: string, progress: number) {
    set((s) => ({
      activation: { ...s.activation, [projectId]: s.activation[projectId].map((t) => (t.id === taskId ? { ...t, progress } : t)) },
      audit: [logAudit(`Updated activation task to ${progress}%`, taskId, projectId), ...s.audit],
    }));
  },
  addProposal(p: AgentProposal) {
    set((s) => ({ proposals: [p, ...s.proposals] }));
  },
  reviewProposal(id: string, approve: boolean) {
    const p = state.proposals.find((x) => x.id === id);
    if (!p) return [];
    const reviewer = currentUser().person;
    set((s) => ({
      proposals: s.proposals.map((x) => (x.id === id ? { ...x, status: approve ? "Approved" : "Rejected", reviewer } : x)),
      audit: [logAudit(`${approve ? "Approved" : "Rejected"} agent proposal`, id, p.projectId), ...s.audit],
    }));
    if (!approve) return [];
    return p.actions.map((a) => actions.addRecord("action", { title: a, projectId: p.projectId, description: `Created from human-approved agent proposal ${p.id}: ${p.title}`, links: p.evidence }));
  },
  markNotificationsRead() {
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  },
  notify(text: string, href?: string) {
    set((s) => ({ notifications: [{ id: `N${seq++}`, text, at: now(), read: false, href }, ...s.notifications] }));
  },
};

// ---------- derived helpers ----------
export function readinessFor(s: State, projectId: string) {
  const r = s.readiness[projectId] ?? {};
  let overall = 0;
  let min = 5;
  const rows = DOMAINS.map((d) => {
    const e = r[d.id] ?? { score: 0, confidence: 0, evidence: 0, criteria: [], note: "" };
    const contribution = (e.score / 5) * d.weight;
    overall += contribution;
    min = Math.min(min, e.score);
    return { ...d, ...e, contribution };
  });
  const confidence = rows.reduce((a, r) => a + r.confidence * r.weight, 0) / 100;
  const evidence = rows.reduce((a, r) => a + r.evidence * r.weight, 0) / 100;
  return { rows, overall: Math.round(overall), min, confidence: Math.round(confidence), evidence: Math.round(evidence), result: readinessResult(overall, min) };
}

export function isPending(r: RecordItem) {
  return PENDING_STATUSES.includes(r.status);
}
export function isOverdue(r: RecordItem) {
  const closed = ["Completed", "Closed", "Approved", "Verified", "Accepted", "Resolved", "Achieved", "Implemented"];
  return (r.status === "Overdue" || r.due < dayOffset(0)) && !closed.includes(r.status);
}
export function projectName(s: State, id: string) {
  return s.projects.find((p) => p.id === id)?.name ?? id;
}
