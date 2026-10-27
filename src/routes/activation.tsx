// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { actions, currentUser } from "@/lib/rpos/store";
import { useScope } from "@/components/rpos/hooks";
import { Field, Kpi, PageHeader, Panel, ViewTabs, searchView } from "@/components/rpos/page";
import { NAV } from "@/components/rpos/nav";
import { Register } from "@/components/rpos/register";
import { ProjectPrompt, RaciMatrix, WORKSTREAMS, useFocus } from "@/components/rpos/shared";
import { Meter, StatusBadge } from "@/components/rpos/status";
import { BarsChart, Gantt, Grid } from "@/components/rpos/viz";
import type { ActivationTask } from "@/lib/rpos/types";

export const Route = createFileRoute("/activation")({
  validateSearch: searchView,
  head: () => ({
    meta: [
      { title: "Project Activation — RPOS" },
      { name: "description", content: "60-day project activation: workstreams, milestones, RACI, governance, controls and handover to delivery." },
      { property: "og:title", content: "Project Activation — RPOS" },
      { property: "og:description", content: "60-day project activation methodology and handover." },
    ],
  }),
  component: Activation,
});

function Activation() {
  const { view = "dashboard" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const p = useFocus();
  return (
    <div>
      <PageHeader crumbs={["Project Activation", ...(p ? [p.name] : [])]} title="Project Activation" description="Structured 60-day activation that establishes governance, controls and delivery readiness." />
      <ViewTabs views={NAV[5].views} value={view} onChange={(v) => navigate({ search: { view: v } })} />
      {!p ? <ProjectPrompt text="Activation is tracked per project." /> : <Body id={p.id} view={view} />}
    </div>
  );
}

function Body({ id, view }: { id: string; view: string }) {
  const { s } = useScope();
  const p = s.projects.find((x) => x.id === id)!;
  const tasks = s.activation[id] ?? [];
  const [sel, setSel] = useState<string | null>(null);
  const [ws, setWs] = useState<string | null>(null);
  const day = p.activationDay;
  const work = tasks.filter((t) => !t.milestone);
  const overdue = work.filter((t) => day > t.start + t.duration && t.progress < 100);
  const pct = Math.round(work.reduce((a, t) => a + t.progress, 0) / Math.max(1, work.length));
  const f = (r: { projectId: string }) => r.projectId === id;
  const task = tasks.find((t) => t.id === sel);
  const toRow = (t: ActivationTask) => ({ id: t.id, label: t.name, sub: `${t.workstream} · ${t.owner}`, start: t.start, duration: t.duration, progress: t.progress, milestone: t.milestone });

  return (
    <div className="space-y-4">
      {view === "dashboard" && (
        <>
          <Grid cols={5}>
            <Kpi label="Activation day" value={`${day} / 60`} sub={day >= 60 ? "Complete" : `${60 - day} days remaining`} />
            <Kpi label="Overall progress" value={`${pct}%`} />
            <Kpi label="Activities" value={work.length} sub={`${work.filter((t) => t.progress === 100).length} complete`} />
            <Kpi label="Overdue activities" value={overdue.length} tone={overdue.length ? "bad" : "good"} />
            <Kpi label="Milestones" value={`${tasks.filter((t) => t.milestone && t.progress === 100).length} / ${tasks.filter((t) => t.milestone).length}`} sub="achieved" />
          </Grid>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Workstream progress"><BarsChart horizontal data={WORKSTREAMS.map((w) => { const ts = work.filter((t) => t.workstream === w); return { name: w, Progress: Math.round(ts.reduce((a, t) => a + t.progress, 0) / Math.max(1, ts.length)) }; })} keys={["Progress"]} /></Panel>
            <Panel title="Overdue activities">{overdue.length ? <ul className="divide-y text-xs">{overdue.map((t) => <li key={t.id}><button onClick={() => setSel(t.id)} className="flex w-full justify-between py-2 text-left hover:text-primary"><span>{t.name}<span className="block text-[10px] text-muted-foreground">{t.owner} · due day {t.start + t.duration}</span></span><span>{t.progress}%</span></button></li>)}</ul> : <p className="text-xs text-muted-foreground">No overdue activities.</p>}</Panel>
          </div>
        </>
      )}
      {view === "timeline" && <Panel title={`60-day activation timeline · today is day ${day}`}><Gantt day={day} rows={tasks.map(toRow)} onSelect={setSel} /></Panel>}
      {view === "workstreams" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {WORKSTREAMS.map((w) => { const ts = work.filter((t) => t.workstream === w); const prog = Math.round(ts.reduce((a, t) => a + t.progress, 0) / Math.max(1, ts.length)); return (
            <Panel key={w} title={w} actions={<Button size="sm" variant="ghost" className="h-7" onClick={() => setWs(ws === w ? null : w)}>{ws === w ? "Hide" : "Inspect"}</Button>}>
              <Meter value={prog} />
              <ul className="mt-2 space-y-1 text-xs">{(ws === w ? ts : ts.slice(0, 2)).map((t) => <li key={t.id}><button className="flex w-full justify-between hover:text-primary" onClick={() => setSel(t.id)}><span className="truncate">{t.name}</span><span className="tabular-nums text-muted-foreground">{t.progress}%</span></button></li>)}</ul>
              <div className="mt-2 text-[11px] text-muted-foreground">Lead: {ts[0]?.owner}</div>
            </Panel>
          ); })}
        </div>
      )}
      {view === "raci" && <RaciMatrix rows={WORKSTREAMS} />}
      {view === "governance" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Governance structure">
            <ol className="space-y-2 text-xs">{[["Investment Committee", "Approves FID and budget baseline"], ["Project Board", "Owns activation outcome; approves stage gates"], ["Activation Steering Group", "Weekly — resolves cross-workstream issues"], ["Workstream leads", "Daily stand-up; owns activities and registers"]].map(([n, d], i) => <li key={n} className="rounded-md border p-2" style={{ marginLeft: `${i * 12}px` }}><b>{n}</b><div className="text-muted-foreground">{d}</div></li>)}</ol>
          </Panel>
          <Panel title="Meeting cadence" bodyClass="p-0"><table className="w-full text-xs"><tbody>{[["Daily", "Workstream stand-ups", "Leads"], ["Weekly", "Activation steering", "PM, PMO, Leads"], ["Fortnightly", "Risk & dependency review", "PMO, Assurance"], ["Day 30", "Control baseline review", "Project Board"], ["Day 60", "Activation close & handover", "Project Board"]].map((r) => <tr key={r[1]} className="border-t"><td className="px-3 py-2 font-semibold">{r[0]}</td><td>{r[1]}</td><td className="text-muted-foreground">{r[2]}</td></tr>)}</tbody></table></Panel>
          <div className="lg:col-span-2"><Register type="meeting" filter={f} /></div>
        </div>
      )}
      {view === "controls" && (
        <>
          <Panel title="Project registers established">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{["risk", "issue", "action", "decision", "dependency", "change", "deliverable", "requirement"].map((t, i) => { const n = s.records.filter((r) => r.projectId === id && r.type === t).length; const ok = n > 0 && day >= 18 + i; return <div key={t} className="flex items-center justify-between rounded-md border p-2 text-xs"><span className="capitalize">{t} register</span><StatusBadge status={ok ? "Active" : "Planned"} /></div>; })}</div>
          </Panel>
          <Register type="control" filter={f} title="Project controls" />
          <Register type="dependency" filter={f} />
        </>
      )}
      {view === "decisions" && (<><Register type="decision" filter={(r) => f(r) && r.status !== "Approved"} title="Outstanding decisions" /><Register type="risk" filter={f} title="Activation risks" /></>)}
      {view === "handover" && <Handover id={id} pct={pct} />}

      <Sheet open={!!task} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent>
          {task && (
            <>
              <SheetHeader className="px-0"><SheetDescription>{task.workstream}</SheetDescription><SheetTitle>{task.name}</SheetTitle></SheetHeader>
              <dl className="mt-4 grid grid-cols-2 gap-3"><Field label="Owner">{task.owner}</Field><Field label="Window">Day {task.start} – {task.start + task.duration}</Field><Field label="Status"><StatusBadge status={task.progress === 100 ? "Completed" : day > task.start + task.duration ? "Overdue" : task.progress > 0 ? "In progress" : "Open"} /></Field></dl>
              <div className="mt-6"><div className="mb-2 flex justify-between text-xs font-semibold"><span>Progress</span><span>{task.progress}%</span></div>
                <Slider aria-label="Progress" disabled={!currentUser(s).canEdit} value={[task.progress]} step={5} max={100} onValueChange={([v]) => actions.setTaskProgress(id, task.id, v)} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const CRITERIA = ["Governance structure and terms of reference approved", "RACI complete with an accountable owner for every workstream", "Integrated project plan baselined", "All registers established and populated", "Project controls defined with owners and frequency", "Meeting cadence operating", "Outstanding decisions logged with authority", "Activation risks transferred to delivery risk register"];
function Handover({ id, pct }: { id: string; pct: number }) {
  const { s } = useScope();
  const p = s.projects.find((x) => x.id === id)!;
  const [done, setDone] = useState<boolean[]>(CRITERIA.map((_, i) => pct > 70 || i < 3));
  const [handed, setHanded] = useState(p.activationDay >= 60);
  const user = currentUser(s);
  const ready = done.every(Boolean);
  return (
    <Panel title="Activation completion & handover to Delivery OS">
      {handed ? (
        <div className="flex items-center gap-3 rounded-md bg-success-soft p-4 text-sm"><CheckCircle2 className="size-5 text-success" /> Activation complete. {p.name} is operating under the Delivery Operating System.</div>
      ) : (
        <>
          <ul className="mb-4 space-y-2">{CRITERIA.map((c, i) => <li key={c}><label className="flex items-center gap-2 text-sm"><Checkbox checked={done[i]} disabled={!user.canEdit} onCheckedChange={(v) => setDone(done.map((d, j) => (j === i ? !!v : d)))} /> {c}</label></li>)}</ul>
          <div className="flex items-center gap-3">
            <Button disabled={!ready || !user.canApprove} onClick={() => { setHanded(true); actions.notify(`${p.name} activation complete — handed over to Delivery OS`, "/delivery"); toast.success("Activation handed over to delivery"); }}>Complete activation & hand over</Button>
            <span className="text-xs text-muted-foreground">{!ready ? `${done.filter((d) => !d).length} criteria outstanding.` : !user.canApprove ? "Requires an approver role (e.g. Project Director)." : "All criteria met."}</span>
          </div>
        </>
      )}
    </Panel>
  );
}
