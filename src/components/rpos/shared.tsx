// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REGISTERS } from "@/lib/rpos/config";
import { actions, currentUser, isPending, projectName, scopedProjects, useRpos } from "@/lib/rpos/store";
import type { Project } from "@/lib/rpos/types";
import { cn } from "@/lib/utils";
import { Panel, EmptyState } from "./page";
import { StatusBadge } from "./status";
import { RecordSheet } from "./record-sheet";

/** Project currently in focus (global project selector), or null when "All projects". */
export function useFocus(): Project | null {
  const s = useRpos();
  return s.projectId === "all" ? null : s.projects.find((p) => p.id === s.projectId) ?? null;
}

export function ProjectPrompt({ text = "Select a project to continue." }: { text?: string }) {
  const s = useRpos();
  return (
    <Panel title="Choose a project">
      <p className="mb-3 text-sm text-muted-foreground">{text} This sets the global project selector.</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {scopedProjects(s).map((p) => (
          <button key={p.id} onClick={() => actions.setContext({ projectId: p.id })} className="rounded-md border p-3 text-left text-xs hover:border-primary hover:bg-accent">
            <div className="font-semibold">{p.name}</div>
            <div className="text-muted-foreground">{p.technology} · {p.capacity} · {p.stage}</div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function ApprovalQueue({ types, title = "Approval queue" }: { types: string[]; title?: string }) {
  const s = useRpos();
  const user = currentUser(s);
  const [open, setOpen] = useState<string | null>(null);
  const ids = scopedProjects(s).map((p) => p.id);
  const items = s.records.filter((r) => types.includes(r.type) && ids.includes(r.projectId) && isPending(r) && !r.archived);
  const decide = (id: string, approve: boolean) => {
    const r = s.records.find((x) => x.id === id)!;
    const def = REGISTERS[r.type];
    const next = approve ? def.statuses.find((x) => ["Approved", "Accepted", "Validated", "Verified", "Completed"].includes(x)) : def.statuses.find((x) => x === "Rejected") ?? def.statuses[0];
    actions.updateRecord(id, { status: next! }, `${approve ? "Approved" : "Rejected"} by ${user.person}`);
    toast.success(`${id} ${approve ? "approved" : "rejected"}`);
  };
  return (
    <Panel title={`${title} (${items.length})`} bodyClass="p-0">
      {!user.canApprove && <p className="border-b bg-warning-soft px-4 py-2 text-xs">Your role ({user.name}) can view but not approve. Switch role from the profile menu to approve.</p>}
      {items.length === 0 ? (
        <div className="p-4"><EmptyState title="Queue is clear" text="Nothing is awaiting review in the current context." /></div>
      ) : (
        <ul className="divide-y">
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-xs">
              <button onClick={() => setOpen(r.id)} className="min-w-0 flex-1 text-left hover:text-primary">
                <span className="font-mono text-[10px] text-muted-foreground">{r.id} · {REGISTERS[r.type].singular}</span>
                <span className="block truncate font-semibold">{r.title}</span>
                <span className="text-muted-foreground">{projectName(s, r.projectId)} · submitted by {r.owner}</span>
              </button>
              <StatusBadge status={r.status} />
              <Button size="sm" className="h-7" disabled={!user.canApprove} onClick={() => decide(r.id, true)}>Approve</Button>
              <Button size="sm" variant="outline" className="h-7" disabled={!user.canApprove} onClick={() => decide(r.id, false)}>Reject</Button>
            </li>
          ))}
        </ul>
      )}
      <RecordSheet id={open} onOpenChange={(o) => !o && setOpen(null)} onNavigate={setOpen} />
    </Panel>
  );
}

const RACI_ROLES = ["Project Director", "Project Manager", "PMO", "Delivery Lead", "Assurance Lead", "Domain Specialist", "Executive"];
const CYCLE = ["", "R", "A", "C", "I"];
export function RaciMatrix({ rows }: { rows: string[] }) {
  const canEdit = currentUser(useRpos()).canEdit;
  const [m, setM] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    rows.forEach((r, i) => RACI_ROLES.forEach((c, j) => { o[`${r}|${c}`] = j === (i % 3) + 1 ? "R" : j === 0 ? "A" : (i + j) % 3 === 0 ? "C" : (i + j) % 4 === 0 ? "I" : ""; }));
    return o;
  });
  const missingA = rows.filter((r) => !RACI_ROLES.some((c) => m[`${r}|${c}`] === "A"));
  return (
    <Panel title="RACI matrix" actions={<span className="text-[11px] text-muted-foreground">Click a cell to cycle R → A → C → I</span>} bodyClass="p-0 overflow-x-auto">
      {missingA.length > 0 && <p className="border-b bg-risk-very-high-soft px-4 py-2 text-xs text-destructive">System control: {missingA.length} row(s) have no Accountable role.</p>}
      <table className="w-full text-xs">
        <thead className="bg-muted/60"><tr><th className="px-3 py-2 text-left">Activity / workstream</th>{RACI_ROLES.map((c) => <th key={c} className="px-2 py-2 text-center font-semibold">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r} className="border-t"><td className="px-3 py-1.5 font-medium">{r}</td>
            {RACI_ROLES.map((c) => { const v = m[`${r}|${c}`]; return (
              <td key={c} className="px-1 py-1 text-center">
                <button disabled={!canEdit} aria-label={`${r} ${c}: ${v || "none"}`} onClick={() => setM({ ...m, [`${r}|${c}`]: CYCLE[(CYCLE.indexOf(v) + 1) % CYCLE.length] })} className={cn("size-7 rounded font-bold", v === "A" ? "bg-navy text-navy-foreground" : v === "R" ? "bg-primary text-primary-foreground" : v === "C" ? "bg-primary-soft text-primary" : v === "I" ? "bg-muted text-muted-foreground" : "border border-dashed text-muted-foreground/40 hover:border-primary")}>{v || "·"}</button>
              </td>
            ); })}
          </tr>
        ))}</tbody>
      </table>
    </Panel>
  );
}

export const WORKSTREAMS = ["Governance & controls", "Commercial & contracts", "Engineering & design", "Procurement", "Permitting & compliance", "Stakeholder & community", "HSE & quality"];
