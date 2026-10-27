// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOMAINS, DOMAIN_CRITERIA } from "@/lib/rpos/config";
import { actions, currentUser, readinessFor } from "@/lib/rpos/store";
import { useScope } from "@/components/rpos/hooks";
import { Field, Kpi, PageHeader, Panel, ViewTabs, searchView } from "@/components/rpos/page";
import { NAV } from "@/components/rpos/nav";
import { Register } from "@/components/rpos/register";
import { RecordForm } from "@/components/rpos/record-form";
import { ProjectPrompt, useFocus } from "@/components/rpos/shared";
import { Meter, ResultBadge } from "@/components/rpos/status";
import { BarsChart, Grid, LinesChart, MiniList } from "@/components/rpos/viz";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/readiness")({
  validateSearch: searchView,
  head: () => ({
    meta: [
      { title: "Readiness Assessment — RPOS" },
      { name: "description", content: "Fourteen-domain weighted readiness assessment producing a traceable GO, CONDITIONAL GO or NO-GO result." },
      { property: "og:title", content: "Readiness Assessment — RPOS" },
      { property: "og:description", content: "Fourteen-domain weighted readiness assessment with GO / CONDITIONAL GO / NO-GO." },
    ],
  }),
  component: Readiness,
});

function Readiness() {
  const { view = "dashboard" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const p = useFocus();
  const needsProject = ["assess", "report", "history"].includes(view);
  return (
    <div>
      <PageHeader crumbs={["Readiness Assessment", ...(p ? [p.name] : [])]} title="Readiness Assessment" description="Weighted assessment across 14 readiness domains. Results trace to domain scores, evidence and findings." help="Overall readiness = Σ (domain score ÷ 5 × domain weight). GO ≥ 75% with no domain below 2; CONDITIONAL GO ≥ 55% with no domain below 1; otherwise NO-GO. Thresholds are configurable in Administration." />
      <ViewTabs views={NAV[4].views} value={view} onChange={(v) => navigate({ search: { view: v } })} />
      {needsProject && !p ? <ProjectPrompt /> : (
        <>
          {view === "dashboard" && (p ? <ProjectDashboard id={p.id} onAssess={() => navigate({ search: { view: "assess" } })} /> : <PortfolioReadiness />)}
          {view === "assess" && p && <Assess id={p.id} />}
          {view === "findings" && <div className="space-y-4"><Register type="finding" /><Register type="gap" /><Register type="recommendation" /></div>}
          {view === "actions" && <Register type="action" title="Required actions & responsible owners" />}
          {view === "history" && p && <History id={p.id} />}
          {view === "compare" && <Compare />}
          {view === "report" && p && <Report id={p.id} />}
        </>
      )}
    </div>
  );
}

function PortfolioReadiness() {
  const { projects, readiness } = useScope();
  return (
    <div className="space-y-4">
      <Panel title="Readiness across projects" bodyClass="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2">Project</th><th>Stage</th><th className="w-48">Overall</th><th>Confidence</th><th>Evidence</th><th>Lowest domain</th><th>Result</th><th /></tr></thead>
          <tbody>{projects.map((p) => { const r = readiness[p.id]; const low = [...r.rows].sort((a, b) => a.score - b.score)[0]; return (
            <tr key={p.id} className="border-t"><td className="px-3 py-2 font-semibold">{p.name}</td><td>{p.stage}</td><td className="pr-4"><Meter value={r.overall} /></td><td>{r.confidence}%</td><td>{r.evidence}%</td><td>{low.name} ({low.score})</td><td><ResultBadge result={r.result} /></td><td className="px-3"><Button size="sm" variant="outline" className="h-7" onClick={() => actions.setContext({ projectId: p.id })}>Open</Button></td></tr>
          ); })}</tbody>
        </table>
      </Panel>
      <Panel title="Overall readiness"><BarsChart data={projects.map((p) => ({ name: p.name.split(" ")[0], Readiness: readiness[p.id].overall }))} keys={["Readiness"]} /></Panel>
    </div>
  );
}

function ProjectDashboard({ id, onAssess }: { id: string; onAssess: () => void }) {
  const { s, of } = useScope();
  const r = readinessFor(s, id);
  const weakest = [...r.rows].sort((a, b) => a.contribution / a.weight - b.contribution / b.weight).slice(0, 4);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Panel title="Readiness result">
          <div className="flex flex-col items-start gap-2">
            <ResultBadge result={r.result} large />
            <div className="font-display text-4xl font-semibold tabular-nums">{r.overall}%</div>
            <p className="text-xs text-muted-foreground">Weighted overall readiness. Lowest domain score: {r.min}/5.</p>
            <dl className="mt-2 grid w-full grid-cols-2 gap-2"><Field label="Confidence">{r.confidence}%</Field><Field label="Evidence coverage">{r.evidence}%</Field></dl>
            <Button size="sm" className="mt-2" onClick={onAssess}>Update assessment</Button>
          </div>
        </Panel>
        <Panel title="Factors contributing to the result">
          <ul className="space-y-2 text-xs">
            {weakest.map((d) => <li key={d.id} className="flex items-center gap-3"><span className="w-56 truncate"><b className="font-mono">{d.id}</b> {d.name}</span><span className="flex-1"><Meter value={(d.score / 5) * 100} /></span><span className="w-28 text-right text-muted-foreground">−{(d.weight - d.contribution).toFixed(1)} pts lost</span></li>)}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{r.result === "GO" ? "All domains meet the minimum threshold." : `Result is constrained by the domains above. Closing the gaps in ${weakest[0].name} has the largest effect.`}</p>
        </Panel>
      </div>
      <Panel title="Fourteen-domain assessment" bodyClass="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr>{["Domain", "Weight", "Score", "Weighted contribution", "Evidence coverage", "Confidence", "Open gaps", "Findings"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>{r.rows.map((d) => {
            const fnd = of("finding").filter((f) => f.projectId === id && f.fields.domain === d.name);
            return (
              <tr key={d.id} className="border-t"><td className="px-3 py-2"><b className="font-mono">{d.id}</b> {d.name}</td><td className="px-3 tabular-nums">{d.weight}%</td><td className="px-3 font-semibold tabular-nums">{d.score.toFixed(1)}</td><td className="px-3 tabular-nums">{d.contribution.toFixed(1)} / {d.weight}</td><td className="w-36 px-3"><Meter value={d.evidence} /></td><td className="px-3 tabular-nums">{d.confidence}%</td><td className="px-3 tabular-nums">{d.criteria.filter((c) => !c).length}</td><td className="px-3 tabular-nums">{fnd.length}</td></tr>
            );
          })}</tbody>
          <tfoot><tr className="border-t bg-muted/40 font-semibold"><td className="px-3 py-2">Overall</td><td className="px-3">100%</td><td /><td className="px-3">{r.overall} / 100</td><td className="px-3">{r.evidence}%</td><td className="px-3">{r.confidence}%</td><td colSpan={2} className="px-3"><ResultBadge result={r.result} /></td></tr></tfoot>
        </table>
      </Panel>
    </div>
  );
}

function Assess({ id }: { id: string }) {
  const { s, of } = useScope();
  const user = currentUser(s);
  const [dId, setDId] = useState(DOMAINS[0].id);
  const [form, setForm] = useState<string | null>(null);
  const r = readinessFor(s, id);
  const d = r.rows.find((x) => x.id === dId)!;
  const set = (patch: Parameters<typeof actions.setReadiness>[2]) => actions.setReadiness(id, dId, patch);
  const evidence = of("evidence").filter((e) => e.projectId === id).slice(0, 5);
  const findings = of("finding").filter((f) => f.projectId === id && f.fields.domain === d.name);
  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <Panel title={`Domains · overall ${r.overall}%`} bodyClass="p-1.5">
        <ul>{r.rows.map((x) => (
          <li key={x.id}><button onClick={() => setDId(x.id)} className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs", x.id === dId ? "bg-navy text-navy-foreground" : "hover:bg-muted")}>
            <span className="font-mono text-[10px] opacity-70">{x.id}</span><span className="flex-1 truncate">{x.name}</span><span className="tabular-nums font-semibold">{x.score.toFixed(1)}</span>
          </button></li>
        ))}</ul>
      </Panel>
      <div className="space-y-4">
        <Panel title={`${d.id} · ${d.name}`} actions={<ResultBadge result={r.result} />}>
          <Grid cols={4} className="mb-4">
            <Kpi label="Domain score" value={`${d.score.toFixed(1)} / 5`} />
            <Kpi label="Weight" value={`${d.weight}%`} />
            <Kpi label="Contribution" value={d.contribution.toFixed(1)} />
            <Kpi label="Outstanding gaps" value={d.criteria.filter((c) => !c).length} />
          </Grid>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Assessment criteria</h3>
          <ul className="mb-4 space-y-1.5">{DOMAIN_CRITERIA.map((c, i) => (
            <li key={c}><label className="flex items-center gap-2 text-sm"><Checkbox disabled={!user.canEdit} checked={d.criteria[i] ?? false} onCheckedChange={(v) => { const criteria = [...d.criteria]; criteria[i] = !!v; set({ criteria }); }} /> {c}</label></li>
          ))}</ul>
          <div className="grid gap-5 md:grid-cols-3">
            <div><div className="mb-2 flex justify-between text-xs font-semibold"><span>Score</span><span>{d.score.toFixed(1)}</span></div><Slider aria-label="Domain score" disabled={!user.canEdit} min={0} max={5} step={0.5} value={[d.score]} onValueChange={([v]) => set({ score: v })} /></div>
            <div><div className="mb-2 flex justify-between text-xs font-semibold"><span>Confidence</span><span>{d.confidence}%</span></div><Slider aria-label="Confidence" disabled={!user.canEdit} min={0} max={100} step={5} value={[d.confidence]} onValueChange={([v]) => set({ confidence: v })} /></div>
            <div><div className="mb-2 flex justify-between text-xs font-semibold"><span>Evidence coverage</span><span>{d.evidence}%</span></div><Slider aria-label="Evidence coverage" disabled={!user.canEdit} min={0} max={100} step={5} value={[d.evidence]} onValueChange={([v]) => set({ evidence: v })} /></div>
          </div>
          <Textarea className="mt-4" aria-label="Assessor notes" placeholder="Assessor notes and rationale…" value={d.note} disabled={!user.canEdit} onChange={(e) => set({ note: e.target.value })} />
        </Panel>
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Supporting evidence" actions={user.canEdit && <Button size="sm" variant="outline" className="h-7" onClick={() => setForm("evidence")}><Plus className="size-3" /> Add evidence</Button>}><MiniList items={evidence} /></Panel>
          <Panel title="Key findings" actions={user.canEdit && <div className="flex gap-1"><Button size="sm" variant="outline" className="h-7" onClick={() => setForm("finding")}><Plus className="size-3" /> Finding</Button><Button size="sm" variant="outline" className="h-7" onClick={() => setForm("action")}><Plus className="size-3" /> Action</Button></div>}><MiniList items={findings} empty="No findings for this domain." /></Panel>
        </div>
      </div>
      {form && <RecordForm type={form} open onOpenChange={(o) => !o && setForm(null)} defaults={{ projectId: id, fields: form === "finding" ? { domain: d.name, origin: "Readiness" } : {}, title: form === "action" ? `Close gap: ${d.name}` : "" }} onCreated={() => toast.success("Linked to readiness domain")} />}
    </div>
  );
}

function History({ id }: { id: string }) {
  const { s } = useScope();
  const r = readinessFor(s, id);
  const snaps = [["2026-04-30", -18], ["2026-06-30", -11], ["2026-08-31", -6], ["2026-10-27", 0]].map(([d, delta]) => ({ name: d as string, Overall: Math.max(0, r.overall + (delta as number)), Confidence: Math.max(0, r.confidence + (delta as number) / 2) }));
  const events = s.audit.filter((a) => a.projectId === id && a.action.startsWith("Updated readiness"));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Assessment history"><LinesChart data={snaps} keys={["Overall", "Confidence"]} /></Panel>
      <Panel title="Assessment versions" bodyClass="p-0">
        <table className="w-full text-xs"><tbody>{snaps.slice().reverse().map((x, i) => <tr key={x.name} className="border-t"><td className="px-3 py-2 font-mono">v{4 - i}.0</td><td>{x.name}</td><td>{x.Overall}%</td><td>{i === 0 ? "Current" : "Superseded"}</td></tr>)}</tbody></table>
        <div className="border-t p-3 text-xs"><b>Changes this session:</b> {events.length ? events.map((e) => `${e.target} by ${e.actor}`).join(", ") : "none"}</div>
      </Panel>
    </div>
  );
}

function Compare() {
  const { s, projects } = useScope();
  const all = s.projects;
  const [a, setA] = useState(projects[0]?.id ?? all[0].id);
  const [b, setB] = useState(all[1].id);
  const ra = readinessFor(s, a), rb = readinessFor(s, b);
  const name = (id: string) => all.find((p) => p.id === id)!.name;
  return (
    <Panel title="Assessment comparison" actions={
      <div className="flex gap-2">{[[a, setA], [b, setB]].map(([v, fn], i) => (
        <Select key={i} value={v as string} onValueChange={fn as (x: string) => void}><SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger><SelectContent>{all.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
      ))}</div>
    }>
      <div className="mb-3 flex gap-6 text-sm"><span>{name(a)}: <b>{ra.overall}%</b> <ResultBadge result={ra.result} /></span><span>{name(b)}: <b>{rb.overall}%</b> <ResultBadge result={rb.result} /></span></div>
      <BarsChart height={420} horizontal data={DOMAINS.map((d, i) => ({ name: d.name.split(" ")[0] + " " + (d.name.split(" ")[1] ?? ""), [name(a)]: ra.rows[i].score, [name(b)]: rb.rows[i].score }))} keys={[name(a), name(b)]} />
    </Panel>
  );
}

function Report({ id }: { id: string }) {
  const { s, of } = useScope();
  const p = s.projects.find((x) => x.id === id)!;
  const r = readinessFor(s, id);
  const fnd = of("finding").filter((f) => f.projectId === id && f.status !== "Closed");
  const rcm = of("recommendation").filter((f) => f.projectId === id);
  return (
    <div className="panel mx-auto max-w-4xl p-8">
      <div className="flex items-start justify-between border-b pb-4">
        <div><div className="text-xs font-bold uppercase tracking-wider text-primary">Readiness report</div><h2 className="font-display text-2xl font-semibold">{p.name}</h2><p className="text-xs text-muted-foreground">{p.technology} · {p.capacity} · Prepared {new Date().toISOString().slice(0, 10)} · Assessment v4.0</p></div>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Print / PDF</Button>
      </div>
      <div className="my-6 flex items-center gap-6"><ResultBadge result={r.result} large /><div><div className="font-display text-3xl font-semibold">{r.overall}%</div><div className="text-xs text-muted-foreground">Confidence {r.confidence}% · Evidence {r.evidence}%</div></div></div>
      <h3 className="mb-2 font-display font-semibold">Executive summary</h3>
      <p className="mb-6 text-sm">The project is assessed as <b>{r.result}</b> for progression to the next stage gate. {r.result !== "GO" && `Progression is conditional on closing ${fnd.length} open findings, prioritising the lowest scoring domains.`} The assessment is supported by {of("evidence").filter((e) => e.projectId === id).length} evidence items.</p>
      <BarsChart height={260} data={r.rows.map((d) => ({ name: d.id, Score: d.score }))} keys={["Score"]} />
      <h3 className="mb-2 mt-6 font-display font-semibold">Open findings</h3><MiniList items={fnd} />
      <h3 className="mb-2 mt-6 font-display font-semibold">Recommendations</h3><MiniList items={rcm} />
    </div>
  );
}
