// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BANDS, REGISTERS } from "@/lib/rpos/config";
import { currentUser, isOverdue, isPending, projectName, readinessFor } from "@/lib/rpos/store";
import { useScope } from "@/components/rpos/hooks";
import { Kpi, PageHeader, Panel, ViewTabs, searchView } from "@/components/rpos/page";
import { NAV } from "@/components/rpos/nav";
import { Register } from "@/components/rpos/register";
import { ProjectPrompt, useFocus } from "@/components/rpos/shared";
import { Meter, ResultBadge, RiskBadge, SourceTag, StatusBadge } from "@/components/rpos/status";
import { BarsChart, Grid, LinesChart, MiniList } from "@/components/rpos/viz";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/intelligence")({
  validateSearch: searchView,
  head: () => ({
    meta: [
      { title: "Executive Project Intelligence — RPOS" },
      { name: "description", content: "Executive performance, risk exposure, forecasts, interventions and traceable executive briefs." },
      { property: "og:title", content: "Executive Project Intelligence — RPOS" },
      { property: "og:description", content: "Executive performance, risk exposure, forecasts and briefs." },
    ],
  }),
  component: Intel,
});

const LIKELIHOOD = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];

function Intel() {
  const { view = "dashboard" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { s, projects, of, readiness } = useScope();
  const go = (v: string) => navigate({ search: { view: v } });
  const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  return (
    <div>
      <PageHeader crumbs={["Executive Intelligence"]} title="Executive Project Intelligence" description="Decision-grade view of performance and exposure. Every recommendation traces to evidence." />
      <ViewTabs views={NAV[8].views} value={view} onChange={go} />
      {view === "dashboard" && (
        <div className="space-y-4">
          <Grid cols={6}>
            <Kpi label="Very high risks" value={of("risk").filter((r) => r.severity === "Very high" && r.status !== "Closed").length} tone="bad" onClick={() => go("risk")} />
            <Kpi label="Decisions required" value={of("decision").filter(isPending).length} onClick={() => go("decisions")} />
            <Kpi label="Active interventions" value={of("intervention").filter((i) => i.status !== "Closed").length} onClick={() => go("interventions")} />
            <Kpi label="LTIFR (12m)" value="0.18" sub="target < 0.25" trend={1} tone="good" onClick={() => go("performance")} />
            <Kpi label="Local content" value="37.4%" sub="target 40%" trend={-1} onClick={() => go("performance")} />
            <Kpi label="Forecast COD slip" value="+5.2 wks" sub="portfolio weighted" tone="bad" onClick={() => go("forecasts")} />
          </Grid>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Project performance (SPI / CPI)"><BarsChart data={projects.map((p) => ({ name: p.name.split(" ")[0], SPI: p.spi, CPI: p.cpi }))} keys={["SPI", "CPI"]} /></Panel>
            <Panel title="Recommendations awaiting executive decision"><MiniList items={of("recommendation").filter((r) => r.status === "Under review" || r.status === "Proposed").slice(0, 7)} /></Panel>
          </div>
        </div>
      )}
      {view === "performance" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Schedule performance (SPI)"><LinesChart data={months.map((m, i) => Object.fromEntries([["name", m], ...projects.slice(0, 4).map((p) => [p.name.split(" ")[0], +(p.spi - 0.05 + i * 0.01).toFixed(2)])]))} keys={projects.slice(0, 4).map((p) => p.name.split(" ")[0])} /></Panel>
          <Panel title="Cost performance (CPI)"><LinesChart data={months.map((m, i) => Object.fromEntries([["name", m], ...projects.slice(0, 4).map((p) => [p.name.split(" ")[0], +(p.cpi + 0.03 - i * 0.006).toFixed(2)])]))} keys={projects.slice(0, 4).map((p) => p.name.split(" ")[0])} /></Panel>
          <Panel title="Quality performance — NCRs raised vs closed"><BarsChart data={months.map((m, i) => ({ name: m, Raised: 3 + ((i * 7) % 5), Closed: 2 + ((i * 3) % 5) }))} keys={["Raised", "Closed"]} /></Panel>
          <Panel title="Safety performance — LTIFR & TRIFR"><LinesChart data={months.map((m, i) => ({ name: m, LTIFR: +(0.26 - i * 0.015).toFixed(2), TRIFR: +(1.1 - i * 0.05).toFixed(2) }))} keys={["LTIFR", "TRIFR"]} /></Panel>
          <Panel title="Local content performance (%)" className="lg:col-span-2"><BarsChart data={projects.map((p, i) => ({ name: p.name.split(" ")[0], Actual: 30 + ((i * 7) % 15), Target: 40 }))} keys={["Actual", "Target"]} /></Panel>
        </div>
      )}
      {view === "risk" && (
        <div className="space-y-4">
          <Panel title="Risk exposure heat map (open risks)" bodyClass="overflow-x-auto">
            <table className="mx-auto text-xs">
              <tbody>
                {[...LIKELIHOOD].reverse().map((l) => (
                  <tr key={l}><th className="pr-2 text-right font-semibold text-muted-foreground">{l}</th>
                    {BANDS.map((b, bi) => { const n = of("risk").filter((r) => r.fields.likelihood === l && r.severity === b && r.status !== "Closed").length; const score = (LIKELIHOOD.indexOf(l) + bi) / 8; return <td key={b} className="p-0.5"><div className={cn("grid size-16 place-items-center rounded font-display text-base font-semibold", score < 0.25 ? "bg-risk-low-soft" : score < 0.45 ? "bg-risk-slightly-elevated-soft" : score < 0.6 ? "bg-risk-moderate-soft" : score < 0.8 ? "bg-risk-high-soft" : "bg-risk-very-high text-risk-very-high-foreground")}>{n || ""}</div></td>; })}
                  </tr>
                ))}
                <tr><td />{BANDS.map((b) => <td key={b} className="pt-1 text-center text-[10px] text-muted-foreground">{b}</td>)}</tr>
              </tbody>
            </table>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Likelihood (rows) × impact rating (columns)</p>
          </Panel>
          <Register type="risk" title="Top exposures" filter={(r) => r.severity === "Very high" || r.severity === "High"} />
        </div>
      )}
      {view === "readiness" && (
        <Panel title="Commissioning & operations readiness" bodyClass="p-0 overflow-x-auto">
          <table className="w-full text-xs"><thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2">Project</th><th>Stage</th><th className="w-44">Commissioning readiness</th><th className="w-44">Operations readiness</th><th>Readiness result</th></tr></thead>
            <tbody>{projects.map((p, i) => <tr key={p.id} className="border-t"><td className="px-3 py-2 font-semibold">{p.name}</td><td>{p.stage}</td><td className="pr-4"><Meter value={Math.min(100, readiness[p.id].overall * 0.9 + i * 3)} /></td><td className="pr-4"><Meter value={Math.min(100, readiness[p.id].overall * 0.75 + i * 4)} /></td><td><ResultBadge result={readiness[p.id].result} /></td></tr>)}</tbody>
          </table>
        </Panel>
      )}
      {view === "decisions" && (
        <Panel title="Decision intelligence — pending decisions" bodyClass="p-0 overflow-x-auto">
          <table className="w-full text-xs"><thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr>{["Decision", "Project", "Authority", "Age (days)", "Supporting evidence", "Linked recommendation", "Status"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{of("decision").filter(isPending).map((d) => { const ev = s.records.filter((r) => d.links.includes(r.id) && r.type === "evidence"); const rc = s.records.filter((r) => d.links.includes(r.id) && r.type === "recommendation"); const age = Math.round((Date.parse("2026-10-27") - Date.parse(d.created)) / 86400000); return (
              <tr key={d.id} className="border-t"><td className="px-3 py-2"><Link to="/records/$id" params={{ id: d.id }} className="font-semibold hover:text-primary">{d.title}</Link></td><td className="px-3">{projectName(s, d.projectId)}</td><td className="px-3">{d.fields.authority}</td><td className={cn("px-3 tabular-nums", age > 60 && "font-semibold text-destructive")}>{age}</td><td className="px-3">{ev.length} items</td><td className="px-3">{rc[0]?.id ?? "—"}</td><td className="px-3"><StatusBadge status={d.status} /></td></tr>
            ); })}</tbody>
          </table>
        </Panel>
      )}
      {view === "interventions" && <Register type="intervention" title="Intervention tracking" />}
      {view === "forecasts" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="COD forecast" bodyClass="p-0"><table className="w-full text-xs"><thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2">Project</th><th>Baseline COD</th><th>P50 forecast</th><th>P90 forecast</th><th>Variance</th></tr></thead><tbody>{projects.map((p) => { const wk = Math.round((1 - p.spi) * 60); const add = (w: number) => { const d = new Date(p.cod); d.setDate(d.getDate() + w * 7); return d.toISOString().slice(0, 10); }; return <tr key={p.id} className="border-t"><td className="px-3 py-2 font-semibold">{p.name}</td><td>{p.cod}</td><td>{add(wk)}</td><td>{add(wk + 6)}</td><td className={wk > 3 ? "font-semibold text-destructive" : ""}>{wk > 0 ? `+${wk} wks` : "On plan"}</td></tr>; })}</tbody></table></Panel>
          <Panel title="Trend analysis — open risks & overdue actions"><LinesChart data={months.map((m, i) => ({ name: m, "Open risks": of("risk").length - 10 + i * 2, Overdue: of("action").filter(isOverdue).length + 4 - i }))} keys={["Open risks", "Overdue"]} /></Panel>
        </div>
      )}
      {view === "briefs" && <Briefs />}
      {view === "lessons" && <Register type="knowledge" title="Lessons learned" filter={(r) => r.fields.kind === "Lesson learned"} />}
    </div>
  );
}

function Briefs() {
  const p = useFocus();
  const { s, of } = useScope();
  const user = currentUser(s);
  const [state, setState] = useState<"none" | "running" | "draft" | "published">("none");
  if (!p) return <ProjectPrompt text="Executive briefs are prepared per project." />;
  const r = readinessFor(s, p.id);
  const mine = (t: string) => of(t).filter((x) => x.projectId === p.id);
  const exposures = mine("risk").filter((x) => x.severity === "Very high" || x.severity === "High").slice(0, 3);
  const decisions = mine("decision").filter(isPending).slice(0, 3);
  const interventions = mine("recommendation").slice(0, 3);
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="border-t pt-3"><h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>{children}</section>;
  const Ref = ({ id }: { id: string }) => <Link to="/records/$id" params={{ id }} className="font-mono text-[10px] text-primary hover:underline">[{id}]</Link>;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><div className="text-xs font-bold uppercase tracking-wider text-primary">Executive brief · October 2026</div><h2 className="font-display text-xl font-semibold">{p.name}</h2></div>
          {state === "draft" && <SourceTag kind="AI recommendation" />}{state === "published" && <SourceTag kind="Human-approved" />}
        </div>
        <Section title="Current position"><p className="text-sm">{p.stage} stage. Readiness {r.overall}% (<ResultBadge result={r.result} />), SPI {p.spi.toFixed(2)}, CPI {p.cpi.toFixed(2)}. R {p.spent.toLocaleString()} m of R {p.budget.toLocaleString()} m spent.</p></Section>
        <Section title="Material changes"><ul className="list-disc space-y-1 pl-5 text-sm">{mine("change").slice(0, 2).map((c) => <li key={c.id}>{c.title} — {c.status.toLowerCase()} <Ref id={c.id} /></li>)}</ul></Section>
        <Section title="Critical exposures"><ul className="space-y-1 text-sm">{exposures.map((x) => <li key={x.id} className="flex items-center gap-2"><RiskBadge band={x.severity} /> {x.title} <Ref id={x.id} /></li>)}</ul></Section>
        <Section title="Decisions required"><ul className="space-y-1 text-sm">{decisions.map((d) => <li key={d.id}>{d.title} — {d.fields.authority} <Ref id={d.id} /></li>)}{!decisions.length && <li className="text-muted-foreground">None.</li>}</ul></Section>
        <Section title="Recommended interventions · responsible executive · expected outcome · follow-up">
          <table className="w-full text-xs"><tbody>{interventions.map((x, i) => <tr key={x.id} className="border-t"><td className="py-1.5">{x.title} <Ref id={x.id} /></td><td>{[p.director, "Richard Okafor", p.manager][i % 3]}</td><td className="text-muted-foreground">{["Restore 4 weeks float", "Reduce exposure to Moderate", "Close gate condition"][i % 3]}</td><td><StatusBadge status={x.status} /></td></tr>)}</tbody></table>
        </Section>
        <p className="text-[11px] text-muted-foreground">All statements trace to the bracketed RPOS records. Supporting evidence: {mine("evidence").slice(0, 4).map((e) => <Ref key={e.id} id={e.id} />)}</p>
      </div>
      <Panel title="Brief workflow">
        <ol className="mb-4 space-y-1.5 text-xs">{[["Draft by Executive Briefing Agent", state !== "none"], ["Review by Project Director", state === "published"], ["Published to executives", state === "published"]].map(([l, ok]) => <li key={l as string} className="flex items-center gap-2"><span className={cn("size-2 rounded-full", ok ? "bg-success" : "bg-muted-foreground/30")} />{l}</li>)}</ol>
        {state === "none" && <Button className="w-full" onClick={() => { setState("running"); setTimeout(() => setState("draft"), 1300); }}><Sparkles className="size-4" /> Generate draft</Button>}
        {state === "running" && <Button className="w-full" disabled><Loader2 className="size-4 animate-spin" /> Drafting…</Button>}
        {state === "draft" && <Button className="w-full" disabled={!user.canApprove} onClick={() => { setState("published"); toast.success("Brief approved and published"); }}>Approve & publish</Button>}
        {state === "draft" && !user.canApprove && <p className="mt-2 text-[11px] text-muted-foreground">Your role cannot approve. AI drafts never publish themselves.</p>}
        {state === "published" && <p className="text-xs text-success">Published by {user.person}.</p>}
        <p className="mt-3 text-[11px] text-muted-foreground">Registers in brief: {REGISTERS.risk.label}, {REGISTERS.decision.label}, {REGISTERS.recommendation.label}, {REGISTERS.change.label}.</p>
      </Panel>
    </div>
  );
}
