// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Download, FileBarChart, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BANDS } from "@/lib/rpos/config";
import { isOverdue, readinessFor, useRpos } from "@/lib/rpos/store";
import { PageHeader, Panel } from "@/components/rpos/page";
import { downloadCsv } from "@/components/rpos/register";
import { ResultBadge, RiskBadge, StatusBadge } from "@/components/rpos/status";
import { BAND_COLORS, BarsChart, DonutChart, Grid } from "@/components/rpos/viz";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — RPOS" },
      { name: "description", content: "Configure and preview portfolio, project, readiness, delivery, assurance, risk, knowledge, executive and audit reports." },
      { property: "og:title", content: "Reports & Analytics — RPOS" },
      { property: "og:description", content: "Configurable RPOS reports with previews and export." },
    ],
  }),
  component: Reports,
});

const TYPES = [
  ["portfolio", "Portfolio report", "risk"], ["project", "Project report", "action"], ["readiness", "Readiness report", "finding"], ["activation", "Activation report", "action"], ["delivery", "Delivery report", "milestone"], ["assurance", "Assurance report", "ncr"], ["risk", "Risk report", "risk"], ["knowledge", "Knowledge report", "evidence"], ["executive", "Executive report", "decision"], ["audit", "Audit report", "audit"],
] as const;

function Reports() {
  const s = useRpos();
  const [type, setType] = useState<(typeof TYPES)[number][0]>("portfolio");
  const [cfg, setCfg] = useState({ portfolio: "all", project: "all", from: "2026-07-01", to: "2026-10-31", summary: true, charts: true, tables: true });
  const [gen, setGen] = useState<typeof cfg & { type: string } | null>(null);
  const t = TYPES.find((x) => x[0] === type)!;

  const projects = s.projects.filter((p) => (cfg.portfolio === "all" || p.portfolioId === cfg.portfolio) && (cfg.project === "all" || p.id === cfg.project));
  const ids = projects.map((p) => p.id);
  const rows = t[2] === "audit" ? [] : s.records.filter((r) => r.type === t[2] && ids.includes(r.projectId) && r.created >= cfg.from && r.created <= cfg.to);
  const audit = s.audit.filter((a) => a.at >= cfg.from && a.at <= cfg.to && (!a.projectId || ids.includes(a.projectId)));

  return (
    <div>
      <PageHeader crumbs={["Reports & Analytics"]} title="Reports & Analytics" description="Configure a report, preview it, then export or schedule distribution." />
      <div className="grid gap-4 xl:grid-cols-[16rem_20rem_1fr]">
        <Panel title="Report catalogue" bodyClass="p-1.5">
          <ul>{TYPES.map(([id, label]) => <li key={id}><button onClick={() => { setType(id); setGen(null); }} className={cn("flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs", type === id ? "bg-navy text-navy-foreground" : "hover:bg-muted")}><FileBarChart className="size-3.5" />{label}</button></li>)}</ul>
        </Panel>
        <Panel title="Configuration">
          <div className="space-y-3">
            <div className="space-y-1"><Label>Portfolio</Label><Select value={cfg.portfolio} onValueChange={(v) => setCfg({ ...cfg, portfolio: v, project: "all" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All portfolios</SelectItem>{s.portfolios.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Project</Label><Select value={cfg.project} onValueChange={(v) => setCfg({ ...cfg, project: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All projects</SelectItem>{s.projects.filter((p) => cfg.portfolio === "all" || p.portfolioId === cfg.portfolio).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="r-from">From</Label><Input id="r-from" type="date" value={cfg.from} onChange={(e) => setCfg({ ...cfg, from: e.target.value })} /></div><div className="space-y-1"><Label htmlFor="r-to">To</Label><Input id="r-to" type="date" value={cfg.to} onChange={(e) => setCfg({ ...cfg, to: e.target.value })} /></div></div>
            <div className="space-y-1.5"><Label>Sections</Label>{(["summary", "charts", "tables"] as const).map((k) => <label key={k} className="flex items-center gap-2 text-xs capitalize"><Checkbox checked={cfg[k]} onCheckedChange={(v) => setCfg({ ...cfg, [k]: !!v })} /> {k === "summary" ? "Executive summary" : k}</label>)}</div>
            <Button className="w-full" onClick={() => { setGen({ ...cfg, type }); toast.success("Report preview generated"); }}>Generate preview</Button>
          </div>
        </Panel>
        <div className="min-w-0">
          {!gen ? (
            <div className="panel grid h-full min-h-80 place-items-center p-8 text-center text-sm text-muted-foreground">Configure the {t[1].toLowerCase()} and generate a preview.</div>
          ) : (
            <div className="panel space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
                <div><div className="text-xs font-bold uppercase tracking-wider text-primary">{t[1]}</div><h2 className="font-display text-xl font-semibold">{cfg.project !== "all" ? projects[0]?.name : cfg.portfolio !== "all" ? s.portfolios.find((p) => p.id === cfg.portfolio)?.name : "All portfolios"}</h2><p className="text-xs text-muted-foreground">{gen.from} to {gen.to} · {projects.length} projects</p></div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => downloadCsv(`${type}-report`, t[2] === "audit" ? audit.map((a) => ({ ...a })) : rows.map((r) => ({ ID: r.id, Title: r.title, Project: r.projectId, Owner: r.owner, Status: r.status, Rating: r.severity ?? "", Due: r.due })))}><Download className="size-3.5" /> CSV</Button>
                  <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-3.5" /> PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Scheduled monthly distribution", { description: "Simulated — no email is sent" })}><CalendarClock className="size-3.5" /> Schedule</Button>
                </div>
              </div>
              {gen.summary && (
                <section><h3 className="mb-1 font-display font-semibold">Executive summary</h3><p className="text-sm">Across {projects.length} projects, average readiness is {Math.round(projects.reduce((a, p) => a + readinessFor(s, p.id).overall, 0) / Math.max(1, projects.length))}%. {s.records.filter((r) => r.type === "risk" && ids.includes(r.projectId) && r.severity === "Very high" && r.status !== "Closed").length} very high risks remain open and {s.records.filter((r) => r.type === "action" && ids.includes(r.projectId) && isOverdue(r)).length} actions are overdue. This period recorded {rows.length || audit.length} {t[2] === "audit" ? "audit events" : "records"} in scope.</p></section>
              )}
              {gen.charts && (
                <Grid cols={2}>
                  <div className="panel p-3"><h4 className="mb-1 text-xs font-semibold">Readiness by project</h4><BarsChart height={200} data={projects.map((p) => ({ name: p.name.split(" ")[0], Readiness: readinessFor(s, p.id).overall }))} keys={["Readiness"]} /></div>
                  <div className="panel p-3"><h4 className="mb-1 text-xs font-semibold">Open risks by rating</h4><DonutChart height={200} colors={BAND_COLORS} data={BANDS.map((b) => ({ name: b, value: s.records.filter((r) => r.type === "risk" && ids.includes(r.projectId) && r.severity === b && r.status !== "Closed").length }))} /></div>
                </Grid>
              )}
              {gen.tables && (
                <section className="overflow-x-auto">
                  <h3 className="mb-1 font-display font-semibold">{t[2] === "audit" ? "Audit trail" : "Detail"}</h3>
                  {t[2] === "audit" ? (
                    <table className="w-full text-xs"><tbody>{audit.slice(0, 25).map((a) => <tr key={a.id} className="border-t"><td className="py-1.5 font-mono">{a.id}</td><td>{a.at}</td><td>{a.actor}</td><td>{a.action}</td><td className="font-mono">{a.target}</td></tr>)}</tbody></table>
                  ) : (
                    <table className="w-full text-xs"><tbody>{rows.slice(0, 25).map((r) => <tr key={r.id} className="border-t"><td className="py-1.5 font-mono text-muted-foreground">{r.id}</td><td>{r.title}</td><td>{r.owner}</td><td>{r.severity ? <RiskBadge band={r.severity} /> : null}</td><td><StatusBadge status={r.status} /></td></tr>)}{rows.length === 0 && <tr><td className="py-3 text-muted-foreground">No records in this date range.</td></tr>}</tbody></table>
                  )}
                  {type === "readiness" && <div className="mt-3 flex flex-wrap gap-2">{projects.map((p) => <span key={p.id} className="flex items-center gap-1 text-xs">{p.name} <ResultBadge result={readinessFor(s, p.id).result} /></span>)}</div>}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
