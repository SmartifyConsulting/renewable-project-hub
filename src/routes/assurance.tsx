// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GATES, REGISTERS } from "@/lib/rpos/config";
import { projectName, readinessFor } from "@/lib/rpos/store";
import { useScope } from "@/components/rpos/hooks";
import { Field, Kpi, PageHeader, Panel, ViewTabs, searchView } from "@/components/rpos/page";
import { NAV } from "@/components/rpos/nav";
import { Register } from "@/components/rpos/register";
import { RecordSheet } from "@/components/rpos/record-sheet";
import { ResultBadge, StatusBadge } from "@/components/rpos/status";
import { BarsChart, Grid, MiniList } from "@/components/rpos/viz";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assurance")({
  validateSearch: searchView,
  head: () => ({
    meta: [
      { title: "Delivery Assurance — RPOS" },
      { name: "description", content: "Assurance plan, reviews, tests, non-conformances, acceptance and requirements-to-verification traceability." },
      { property: "og:title", content: "Delivery Assurance — RPOS" },
      { property: "og:description", content: "Assurance reviews, verification and requirements traceability." },
    ],
  }),
  component: Assurance,
});

const SIMPLE: Record<string, string> = { reviews: "review", tests: "test", ncr: "ncr", defects: "defect", capa: "capa", acceptance: "acceptance", findings: "finding" };

function Assurance() {
  const { view = "dashboard" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { of } = useScope();
  const go = (v: string) => navigate({ search: { view: v } });
  return (
    <div>
      <PageHeader crumbs={["Delivery Assurance"]} title="Delivery Assurance" description="Independent verification that requirements, deliverables and controls meet acceptance criteria." help="Items move Planned → Submitted → Reviewed → Accepted / Rejected → Verified. Only verified items count as assured." />
      <ViewTabs views={NAV[7].views} value={view} onChange={go} />
      {SIMPLE[view] && <Register type={SIMPLE[view]} />}
      {view === "dashboard" && (
        <div className="space-y-4">
          <Grid cols={5}>
            <Kpi label="Requirements verified" value={`${of("requirement").filter((r) => r.status === "Verified").length}/${of("requirement").length}`} onClick={() => go("trace")} />
            <Kpi label="Open NCRs" value={of("ncr").filter((r) => r.status !== "Closed").length} tone="bad" onClick={() => go("ncr")} />
            <Kpi label="Open defects" value={of("defect").filter((r) => r.status !== "Closed").length} onClick={() => go("defects")} />
            <Kpi label="Tests failed" value={of("test").filter((r) => r.status === "Failed").length} tone="bad" onClick={() => go("tests")} />
            <Kpi label="Open findings" value={of("finding").filter((r) => r.status === "Open").length} onClick={() => go("findings")} />
          </Grid>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Deliverable assurance lifecycle"><BarsChart data={REGISTERS.deliverable.statuses.map((st) => ({ name: st, Deliverables: of("deliverable").filter((d) => d.status === st).length }))} keys={["Deliverables"]} /></Panel>
            <Panel title="Upcoming reviews"><MiniList items={of("review").filter((r) => r.status !== "Completed").slice(0, 7)} /></Panel>
          </div>
        </div>
      )}
      {view === "plan" && <div className="space-y-4"><Panel title="Assurance plan"><ul className="grid gap-2 text-xs md:grid-cols-2 xl:grid-cols-4">{[["Design assurance", "Basic & detailed design reviews at 30/60/90%"], ["Procurement assurance", "FAT witness, vendor document review"], ["Construction assurance", "ITPs, hold points, NCR management"], ["Commissioning assurance", "SAT, grid compliance tests, acceptance"]].map(([t, d]) => <li key={t} className="rounded-md border p-3"><b>{t}</b><p className="text-muted-foreground">{d}</p></li>)}</ul></Panel><Register type="review" title="Review schedule & assurance activities" /></div>}
      {view === "trace" && <Trace />}
      {view === "gates" && <Gates />}
      {view === "record" && <AssuranceRecord />}
    </div>
  );
}

function Trace() {
  const { s, of } = useScope();
  const [open, setOpen] = useState<string | null>(null);
  const linked = (r: { links: string[] }, t: string) => s.records.filter((x) => r.links.includes(x.id) && x.type === t);
  const reqs = of("requirement");
  return (
    <Panel title="Requirements-to-verification traceability" bodyClass="p-0 overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr>{["Requirement", "Project", "Evidence", "Deliverable", "Verification test", "Acceptance", "Coverage"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
        <tbody>{reqs.map((r) => {
          const ev = linked(r, "evidence"), dl = linked(r, "deliverable"), ts = linked(r, "test");
          const acc = ts.flatMap((t) => linked(t, "acceptance"));
          const cov = [ev.length, dl.length, ts.length, acc.length].filter(Boolean).length;
          const Cell = ({ items }: { items: typeof ev }) => <td className="px-3 py-1.5">{items.length ? items.slice(0, 2).map((x) => <button key={x.id} onClick={() => setOpen(x.id)} className="mb-0.5 flex items-center gap-1 hover:text-primary"><StatusBadge status={x.status} /><span className="font-mono text-[10px]">{x.id}</span></button>) : <span className="font-semibold text-destructive">Gap</span>}</td>;
          return (
            <tr key={r.id} className="border-t align-top">
              <td className="max-w-64 px-3 py-1.5"><button onClick={() => setOpen(r.id)} className="text-left font-medium hover:text-primary">{r.title}</button><div className="font-mono text-[10px] text-muted-foreground">{r.id}</div></td>
              <td className="px-3 py-1.5">{projectName(s, r.projectId)}</td>
              <Cell items={ev} /><Cell items={dl} /><Cell items={ts} /><Cell items={acc} />
              <td className="px-3 py-1.5"><div className="flex gap-0.5">{[0, 1, 2, 3].map((i) => <span key={i} className={cn("h-3 w-4 rounded-sm", i < cov ? "bg-success" : "bg-muted")} />)}</div></td>
            </tr>
          );
        })}</tbody>
      </table>
      <RecordSheet id={open} onOpenChange={(o) => !o && setOpen(null)} onNavigate={setOpen} />
    </Panel>
  );
}

function Gates() {
  const { s, projects, of } = useScope();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {projects.map((p) => {
        const r = readinessFor(s, p.id);
        const g = GATES.find((x) => x.stage === p.stage) ?? GATES[GATES.length - 1];
        const rev = of("review").filter((x) => x.projectId === p.id && x.fields.kind === "Stage-gate review")[0];
        return (
          <Panel key={p.id} title={`${p.name} · ${g.id} ${g.name}`} actions={<ResultBadge result={r.result} />}>
            <ul className="space-y-1 text-xs">
              {[["Readiness ≥ threshold", r.overall >= 55], ["No domain below minimum", r.min >= 1], ["Critical findings closed", of("finding").filter((f) => f.projectId === p.id && f.severity === "Very high" && f.status !== "Closed").length === 0], ["Gate deliverables accepted", of("deliverable").filter((d) => d.projectId === p.id && ["Accepted", "Verified"].includes(d.status)).length >= 2]].map(([c, ok]) => (
                <li key={c as string} className="flex justify-between"><span>{c}</span><StatusBadge status={ok ? "Passed" : "Failed"} /></li>
              ))}
            </ul>
            <div className="mt-3 text-xs">Gate review: {rev ? <Link to="/records/$id" params={{ id: rev.id }} className="font-semibold text-primary">{rev.id} ({rev.status})</Link> : <span className="text-muted-foreground">not yet scheduled</span>}</div>
          </Panel>
        );
      })}
    </div>
  );
}

function AssuranceRecord() {
  const { s, of } = useScope();
  const tests = of("test");
  const [id, setId] = useState(tests[0]?.id ?? "");
  const t = s.records.find((x) => x.id === id);
  if (!t) return <p className="text-sm text-muted-foreground">No tests in scope.</p>;
  const linked = (r: { links: string[] }, ty: string) => s.records.filter((x) => r.links.includes(x.id) && x.type === ty);
  const req = linked(t, "requirement")[0];
  const acc = linked(t, "acceptance")[0];
  const ev = req ? linked(req, "evidence") : [];
  const capa = of("capa").find((c) => c.projectId === t.projectId);
  const failed = t.status === "Failed";
  return (
    <Panel title="Structured assurance record" actions={<Select value={id} onValueChange={setId}><SelectTrigger aria-label="Choose test" className="h-8 w-72 text-xs"><SelectValue /></SelectTrigger><SelectContent>{tests.map((x) => <SelectItem key={x.id} value={x.id}>{x.id} — {x.title}</SelectItem>)}</SelectContent></Select>}>
      <dl className="grid gap-4 md:grid-cols-3">
        <Field label="Requirement / control verified">{req ? <Link to="/records/$id" params={{ id: req.id }} className="text-primary">{req.id} {req.title}</Link> : "—"}</Field>
        <Field label="Acceptance criteria">{req ? `Demonstrate compliance with "${req.title}" per ITP hold point.` : "—"}</Field>
        <Field label="Verification activity">{t.title} ({t.id})</Field>
        <Field label="Evidence">{ev.length ? ev.map((e) => <div key={e.id}><Link to="/records/$id" params={{ id: e.id }} className="text-primary">{e.id}</Link> {e.title}</div>) : "—"}</Field>
        <Field label="Reviewer">{t.owner}</Field>
        <Field label="Review date">{t.due}</Field>
        <Field label="Result"><StatusBadge status={t.status} /></Field>
        <Field label="Exceptions">{failed ? "Result outside tolerance — retest required" : "None"}</Field>
        <Field label="Corrective action">{failed && capa ? <Link to="/records/$id" params={{ id: capa.id }} className="text-primary">{capa.id} {capa.title}</Link> : "Not required"}</Field>
        <Field label="Acceptance record">{acc ? <span><StatusBadge status={acc.status} /> {acc.id}</span> : "—"}</Field>
        <Field label="Closure evidence">{t.attachments[0] ?? (t.status === "Passed" ? "Signed test certificate" : "Pending")}</Field>
      </dl>
    </Panel>
  );
}
