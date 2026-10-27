// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REGISTERS } from "@/lib/rpos/config";
import { isOverdue, isPending, projectName } from "@/lib/rpos/store";
import { useScope } from "@/components/rpos/hooks";
import { Kpi, PageHeader, Panel, ViewTabs, searchView } from "@/components/rpos/page";
import { NAV } from "@/components/rpos/nav";
import { Register } from "@/components/rpos/register";
import { RecordSheet } from "@/components/rpos/record-sheet";
import { ApprovalQueue, RaciMatrix, WORKSTREAMS } from "@/components/rpos/shared";
import { OrgChart } from "@/components/rpos/org-chart";
import { Meter, StatusBadge } from "@/components/rpos/status";
import { BarsChart, Gantt, Grid, MiniList } from "@/components/rpos/viz";
import { dayOffset } from "@/lib/rpos/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/delivery")({
  validateSearch: searchView,
  head: () => ({
    meta: [
      { title: "Delivery Operating System — RPOS" },
      { name: "description", content: "Integrated project controls, governance, delivery management and operational controls." },
      { property: "og:title", content: "Delivery Operating System — RPOS" },
      { property: "og:description", content: "Integrated project controls, governance and delivery management." },
    ],
  }),
  component: Delivery,
});

const SIMPLE: Record<string, [string, string?]> = {
  milestones: ["milestone"], deliverables: ["deliverable"], workpackages: ["workpackage"], actions: ["action"], decisions: ["decision"], dependencies: ["dependency"], changes: ["change"], interfaces: ["dependency", "Interface register"],
};

function Delivery() {
  const { view = "plan" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { s, projects, of } = useScope();
  const [open, setOpen] = useState<string | null>(null);
  const simple = SIMPLE[view];

  return (
    <div>
      <PageHeader crumbs={["Delivery Operating System"]} title="Delivery Operating System" description="Integrated controls, governance and delivery management for projects in execution." />
      <ViewTabs views={NAV[6].views} value={view} onChange={(v) => navigate({ search: { view: v } })} />
      {simple && <Register type={simple[0]} title={simple[1]} />}
      {view === "plan" && (
        <div className="space-y-4">
          <Grid cols={4}>
            <Kpi label="Milestones at risk" value={of("milestone").filter((m) => m.status === "At risk" || m.status === "Missed").length} tone="bad" onClick={() => navigate({ search: { view: "milestones" } })} />
            <Kpi label="Deliverables submitted" value={of("deliverable").filter((d) => d.status === "Submitted").length} onClick={() => navigate({ search: { view: "submissions" } })} />
            <Kpi label="Open changes" value={of("change").filter((c) => !["Implemented", "Rejected"].includes(c.status)).length} onClick={() => navigate({ search: { view: "changes" } })} />
            <Kpi label="Overdue actions" value={of("action").filter(isOverdue).length} tone="bad" onClick={() => navigate({ search: { view: "actions" } })} />
          </Grid>
          <Panel title="Integrated project plan — work packages (next 60 days)">
            <Gantt day={20} onSelect={setOpen} rows={of("workpackage").slice(0, 18).map((w, i) => ({ id: w.id, label: w.title, sub: projectName(s, w.projectId), start: (i * 7) % 40, duration: 12 + ((i * 5) % 20), progress: Number(w.fields.progress ?? 0) }))} />
          </Panel>
        </div>
      )}
      {view === "risks" && <div className="space-y-4"><Register type="risk" /><Register type="issue" /></div>}
      {view === "governance" && (
        <div className="space-y-4">
          <Grid cols={4}>
            <Kpi label="Decisions pending" value={of("decision").filter(isPending).length} onClick={() => navigate({ search: { view: "approvals" } })} />
            <Kpi label="Meetings this month" value={of("meeting").length} onClick={() => navigate({ search: { view: "meetings" } })} />
            <Kpi label="Changes awaiting approval" value={of("change").filter(isPending).length} onClick={() => navigate({ search: { view: "approvals" } })} />
            <Kpi label="Decisions approved" value={of("decision").filter((d) => d.status === "Approved").length} tone="good" />
          </Grid>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Decision tracking"><BarsChart data={REGISTERS.decision.statuses.map((st) => ({ name: st, Decisions: of("decision").filter((d) => d.status === st).length }))} keys={["Decisions"]} /></Panel>
            <Panel title="Recently approved decisions"><MiniList items={of("decision").filter((d) => d.status === "Approved").slice(0, 6)} /></Panel>
          </div>
        </div>
      )}
      {view === "orgchart" && <OrgChart director={projects[0]?.director ?? "—"} manager={projects[0]?.manager ?? "—"} />}
      {view === "raci" && <RaciMatrix rows={["Grid connection", "Civil works", "Electrical BoP", "Procurement", "Commissioning", "Permit compliance", "Stakeholder engagement", "Reporting"]} />}
      {view === "meetings" && <div className="space-y-4"><MeetingCalendar onOpen={setOpen} /><Register type="meeting" title="Meeting records" /></div>}
      {view === "approvals" && <ApprovalQueue types={["decision", "change", "deliverable"]} title="Approval workflows" />}
      {view === "authority" && (
        <Panel title="Delegated authority" bodyClass="p-0 overflow-x-auto">
          <table className="w-full text-xs"><thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr>{["Authority", "Decisions", "Financial limit", "Change limit", "Delegate"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{[["Investment Committee", "FID, capex baseline, portfolio entry", "Unlimited", "> R50 m", "—"], ["Project Board", "Stage gates, contract award", "≤ R500 m", "≤ R50 m", "Executive"], ["Project Director", "Package award, risk acceptance (High)", "≤ R50 m", "≤ R5 m", "Project Manager"], ["Project Manager", "Operational decisions, action closure", "≤ R5 m", "≤ R1 m", "Delivery Lead"], ["AI agents", "None — recommendations only", "R 0", "R 0", "Not delegable"]].map((r) => <tr key={r[0]} className={cn("border-t", r[0] === "AI agents" && "bg-ai-soft")}>{r.map((c, i) => <td key={i} className="px-3 py-2">{i === 0 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody>
          </table>
        </Panel>
      )}
      {view === "workstreams" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {WORKSTREAMS.map((w, i) => { const wps = of("workpackage").filter((_, j) => j % WORKSTREAMS.length === i); const prog = Math.round(wps.reduce((a, x) => a + Number(x.fields.progress ?? 0), 0) / Math.max(1, wps.length)); return (
            <Panel key={w} title={w}><Meter value={prog} /><ul className="mt-2 space-y-1 text-xs">{wps.slice(0, 4).map((x) => <li key={x.id}><button onClick={() => setOpen(x.id)} className="flex w-full justify-between text-left hover:text-primary"><span className="truncate">{x.title}</span><StatusBadge status={x.status} /></button></li>)}</ul></Panel>
          ); })}
        </div>
      )}
      {view === "submissions" && <Register type="deliverable" title="Deliverable submissions & progress updates" filter={(r) => ["Submitted", "Reviewed", "Rejected"].includes(r.status)} />}
      {view === "resources" && <Resources />}
      {view === "opcontrols" && <div className="space-y-4"><Register type="control" title="Control register" /><Register type="capa" title="Control exceptions & corrective actions" /></div>}
      <RecordSheet id={open} onOpenChange={(o) => !o && setOpen(null)} onNavigate={setOpen} />
    </div>
  );
}

function MeetingCalendar({ onOpen }: { onOpen: (id: string) => void }) {
  const { of } = useScope();
  const [offset, setOffset] = useState(0);
  const base = new Date(dayOffset(0));
  const m = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
  const days = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();
  const lead = (m.getUTCDay() + 6) % 7;
  const key = (d: number) => `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const meetings = of("meeting");
  return (
    <Panel title={m.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })} actions={<div className="flex gap-1"><Button size="icon" variant="ghost" className="size-7" aria-label="Previous month" onClick={() => setOffset(offset - 1)}><ChevronLeft className="size-4" /></Button><Button size="icon" variant="ghost" className="size-7" aria-label="Next month" onClick={() => setOffset(offset + 1)}><ChevronRight className="size-4" /></Button></div>}>
      <div className="grid grid-cols-7 gap-1 text-[11px]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="text-center font-semibold text-muted-foreground">{d}</div>)}
        {Array.from({ length: lead }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }).map((_, i) => { const ms = meetings.filter((x) => x.due === key(i + 1)); return (
          <div key={i} className="min-h-16 rounded border p-1"><div className="text-muted-foreground">{i + 1}</div>{ms.map((x) => <button key={x.id} onClick={() => onOpen(x.id)} className="mt-0.5 block w-full truncate rounded bg-primary-soft px-1 text-left text-[10px] text-primary hover:bg-primary hover:text-primary-foreground">{x.title}</button>)}</div>
        ); })}
      </div>
    </Panel>
  );
}

function Resources() {
  const { records } = useScope();
  const types = ["action", "risk", "deliverable", "workpackage", "decision"];
  const owners = [...new Set(records.map((r) => r.owner))].sort();
  return (
    <Panel title="Resource & responsibility view — open items by owner" bodyClass="p-0 overflow-x-auto">
      <table className="w-full text-xs"><thead className="bg-muted/60"><tr><th className="px-3 py-2 text-left">Owner</th>{types.map((t) => <th key={t} className="px-3 text-center">{REGISTERS[t].label}</th>)}<th className="px-3 text-center">Overdue</th></tr></thead>
        <tbody>{owners.map((o) => { const mine = records.filter((r) => r.owner === o); const od = mine.filter(isOverdue).length; return (
          <tr key={o} className="border-t"><td className="px-3 py-2 font-semibold">{o}</td>{types.map((t) => <td key={t} className="text-center tabular-nums">{mine.filter((r) => r.type === t).length}</td>)}<td className={cn("text-center font-semibold tabular-nums", od > 3 && "text-destructive")}>{od}</td></tr>
        ); })}</tbody>
      </table>
    </Panel>
  );
}
