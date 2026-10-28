// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileUp, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REGISTERS } from "@/lib/rpos/config";
import { dayOffset } from "@/lib/rpos/data";
import { actions, currentUser, projectName } from "@/lib/rpos/store";
import { useScope } from "@/components/rpos/hooks";
import { Kpi, PageHeader, Panel, ViewTabs, searchView } from "@/components/rpos/page";
import { NAV } from "@/components/rpos/nav";
import { Register } from "@/components/rpos/register";
import { ApprovalQueue } from "@/components/rpos/shared";
import { Meter, SourceTag, StatusBadge } from "@/components/rpos/status";
import { BarsChart, DonutChart, Grid, LineageGraph, MiniList } from "@/components/rpos/viz";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rki")({
  validateSearch: searchView,
  head: () => ({
    meta: [
      { title: "Renewable Project Knowledge Intelligence — RPOS" },
      { name: "description", content: "Sources, evidence, lineage, knowledge gaps and contradictions that underpin every RPOS decision." },
      { property: "og:title", content: "Knowledge Intelligence (RKI) — RPOS" },
      { property: "og:description", content: "Sources, evidence, lineage, knowledge gaps and contradictions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Rki,
});

function Rki() {
  const { view = "dashboard" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const go = (v: string) => navigate({ search: { view: v } });
  return (
    <div>
      <PageHeader crumbs={["Knowledge Intelligence"]} title="Renewable Project Knowledge Intelligence" description="The knowledge foundation of RPOS: every fact, finding and decision traces back to a governed source." help="Sources are registered and classified, evidence is extracted and validated, and lineage links evidence to requirements, risks, findings and decisions." />
      <ViewTabs wrap views={NAV[3].views.filter((v) => ["dashboard", "sources", "hierarchy", "upload", "evidence", "lineage", "capture"].includes(v.id)).map((v) => v.id === "capture" ? { ...v, label: "Capture & extract" } : v)} value={view} onChange={go} />
      {view === "dashboard" && <Dashboard go={go} />}
      {view === "sources" && <Register type="source" />}
      {view === "hierarchy" && <Hierarchy />}
      {view === "upload" && <Upload />}
      {view === "evidence" && <Register type="evidence" />}
      {view === "lineage" && <Lineage />}
      {view === "capture" && <Capture />}
      {view === "validation" && <Register type="evidence" title="Validation / review queue" filter={(r) => r.status === "Under review" || r.status === "Captured"} />}
      {view === "gaps" && <Register type="gap" />}
      {view === "contradictions" && <Register type="contradiction" />}
      {view === "approvals" && <ApprovalQueue types={["source", "evidence", "knowledge"]} />}
      {view === "refresh" && <Refresh />}
      {view === "map" && <KnowledgeMap />}
    </div>
  );
}

function Dashboard({ go }: { go: (v: string) => void }) {
  const { of, projects } = useScope();
  const ev = of("evidence"), src = of("source"), gaps = of("gap"), con = of("contradiction");
  const validated = ev.filter((e) => e.status === "Validated").length;
  const stale = ev.filter((e) => e.created < dayOffset(-120)).length;
  const statuses = REGISTERS.evidence.statuses.map((st) => ({ name: st, value: ev.filter((e) => e.status === st).length }));
  const fresh = [["< 30 days", 0, 30], ["30–90 days", 30, 90], ["90–180 days", 90, 180], ["> 180 days", 180, 999]].map(([n, a, b]) => ({ name: n as string, Evidence: ev.filter((e) => e.created <= dayOffset(-(a as number)) && e.created > dayOffset(-(b as number))).length }));
  return (
    <div className="space-y-4">
      <Grid cols={6}>
        <Kpi label="Knowledge coverage" value={`${Math.round((validated / Math.max(1, ev.length)) * 100)}%`} sub="validated evidence" onClick={() => go("evidence")} />
        <Kpi label="Sources" value={src.length} sub={`${src.filter((x) => x.status === "Approved").length} approved`} onClick={() => go("sources")} />
        <Kpi label="Evidence items" value={ev.length} onClick={() => go("evidence")} />
        <Kpi label="Open gaps" value={gaps.filter((g) => g.status !== "Closed").length} tone="bad" onClick={() => go("gaps")} />
        <Kpi label="Contradictions" value={con.filter((c) => c.status !== "Resolved").length} tone="bad" onClick={() => go("contradictions")} />
        <Kpi label="Stale evidence" value={stale} sub="> 120 days old" onClick={() => go("refresh")} />
      </Grid>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Validation status"><DonutChart data={statuses} /></Panel>
        <Panel title="Knowledge freshness"><BarsChart data={fresh} keys={["Evidence"]} /></Panel>
        <Panel title="Evidence completeness by project">
          <div className="space-y-2">{projects.map((p) => { const e = ev.filter((x) => x.projectId === p.id); const v = e.filter((x) => x.status === "Validated").length; return <div key={p.id} className="text-xs"><div className="mb-0.5 flex justify-between"><span>{p.name}</span><span className="text-muted-foreground">{v}/{e.length}</span></div><Meter value={(v / Math.max(1, e.length)) * 100} /></div>; })}</div>
        </Panel>
        <Panel title="Recently updated knowledge" className="lg:col-span-2"><MiniList items={[...ev].sort((a, b) => (a.history[0].at < b.history[0].at ? 1 : -1)).slice(0, 7)} /></Panel>
        <Panel title="Conflicting information"><MiniList items={con.filter((c) => c.status !== "Resolved").slice(0, 6)} /></Panel>
      </div>
    </div>
  );
}

function Hierarchy() {
  const { of } = useScope();
  const tiers = REGISTERS.source.extra![1].options!;
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {tiers.map((t, i) => (
        <Panel key={t} title={t}>
          <p className="mb-2 text-[11px] text-muted-foreground">{["Statutory and regulatory instruments; prevails on conflict.", "Executed agreements and binding commitments.", "Independent studies and advisor reports.", "Correspondence, minutes and working notes."][i]}</p>
          <MiniList items={of("source").filter((s) => s.fields.hierarchy === t)} empty="No sources in this tier." />
        </Panel>
      ))}
    </div>
  );
}

function Upload() {
  const { s, projects, of } = useScope();
  const user = currentUser(s);
  const [busy, setBusy] = useState<string | null>(null);
  const [f, setF] = useState({ projectId: projects[0]?.id ?? "", classification: "Technical study", hierarchy: "Tier 3 – Advisory" });
  const onFile = (file: File) => {
    setBusy(file.name);
    setTimeout(() => {
      const r = actions.addRecord("source", { title: file.name.replace(/\.[^.]+$/, ""), projectId: f.projectId, status: "Under review", description: `Uploaded ${file.name} (${Math.round(file.size / 1024)} KB). Simulated — file is not stored.`, fields: { version: "v1.0", classification: f.classification, hierarchy: f.hierarchy }, attachments: [file.name] });
      setBusy(null);
      toast.success(`Source ${r.id} registered`, { description: "Queued for source review" });
    }, 1200);
  };
  const review = of("source").filter((x) => x.status === "Under review");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Upload source">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="space-y-1"><Label>Project</Label><Select value={f.projectId} onValueChange={(v) => setF({ ...f, projectId: v })}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Classification</Label><Select value={f.classification} onValueChange={(v) => setF({ ...f, classification: v })}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent>{REGISTERS.source.extra![2].options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Hierarchy</Label><Select value={f.hierarchy} onValueChange={(v) => setF({ ...f, hierarchy: v })}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent>{REGISTERS.source.extra![1].options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <label className={cn("flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center", user.canEdit ? "hover:border-primary hover:bg-accent" : "pointer-events-none opacity-50")}>
          <input type="file" className="sr-only" disabled={!user.canEdit || !!busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ""; }} />
          {busy ? <><Loader2 className="size-6 animate-spin text-primary" /><span className="mt-2 text-sm">Registering {busy}…</span></> : <><FileUp className="size-6 text-primary" /><span className="mt-2 text-sm font-semibold">Choose a file to register as a source</span><span className="text-xs text-muted-foreground">PDF, DOCX, XLSX — processing is simulated</span></>}
        </label>
      </Panel>
      <ApprovalQueue types={["source"]} title={`Source review (${review.length} under review)`} />
    </div>
  );
}

function Lineage() {
  const { of } = useScope();
  const ev = of("evidence");
  const [id, setId] = useState(ev[0]?.id ?? "");
  return (
    <Panel title="Evidence lineage" actions={
      <Select value={id} onValueChange={setId}><SelectTrigger aria-label="Choose evidence" className="h-8 w-80 text-xs"><SelectValue placeholder="Choose evidence" /></SelectTrigger><SelectContent>{ev.map((e) => <SelectItem key={e.id} value={e.id}>{e.id} — {e.title}</SelectItem>)}</SelectContent></Select>
    }>
      <p className="mb-4 text-xs text-muted-foreground">How a source supports a fact, requirement, finding or risk, and how that flows into recommendations, decisions and actions. Click any node to open it.</p>
      {id ? <LineageGraph rootId={id} /> : <p className="text-sm">No evidence in scope.</p>}
    </Panel>
  );
}

function Capture() {
  const { s, projects, of } = useScope();
  const user = currentUser(s);
  const [form, setForm] = useState({ title: "", text: "", projectId: projects[0]?.id ?? "" });
  const [srcId, setSrcId] = useState(of("source")[0]?.id ?? "");
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [accepted, setAccepted] = useState<number[]>([]);
  const src = s.records.find((r) => r.id === srcId);
  const facts = src ? [`Contracted capacity stated as ${src.projectId === "PRJ-001" ? "175 MWp" : "as per grid application"}`, `Document dated ${src.created}, version ${src.fields.version ?? "v1.0"}`, "Obligation: notify authority 30 days before construction start", "Condition: avifauna monitoring for 24 months post-COD"] : [];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Knowledge capture">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!form.title) return toast.error("Title required"); const r = actions.addRecord("evidence", { title: form.title, description: form.text, projectId: form.projectId, status: "Captured", fields: { quality: "B – Secondary", confidence: "70", classification: "Correspondence" } }); toast.success(`Evidence ${r.id} captured`); setForm({ ...form, title: "", text: "" }); }}>
          <div className="space-y-1"><Label htmlFor="kc-t">Fact or observation</Label><Input id="kc-t" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="kc-x">Context & source reference</Label><Textarea id="kc-x" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></div>
          <div className="space-y-1"><Label>Project</Label><Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
          <Button type="submit" disabled={!user.canEdit}>Capture evidence</Button>
        </form>
      </Panel>
      <Panel title="Knowledge extraction" actions={<SourceTag kind="AI observation" />}>
        <div className="mb-3 flex gap-2">
          <Select value={srcId} onValueChange={(v) => { setSrcId(v); setState("idle"); setAccepted([]); }}><SelectTrigger aria-label="Source" className="text-xs"><SelectValue /></SelectTrigger><SelectContent>{of("source").map((x) => <SelectItem key={x.id} value={x.id}>{x.id} — {x.title}</SelectItem>)}</SelectContent></Select>
          <Button disabled={!src || state === "running"} onClick={() => { setState("running"); setTimeout(() => setState("done"), 1400); }}>{state === "running" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Extract</Button>
        </div>
        {state === "idle" && <p className="text-xs text-muted-foreground">Knowledge Extraction Agent proposes facts from the selected source. Nothing is recorded until a human accepts it.</p>}
        {state === "running" && <p className="text-xs text-muted-foreground">Reading {src?.title}…</p>}
        {state === "done" && src && (
          <ul className="space-y-2">{facts.map((fct, i) => (
            <li key={i} className="flex items-center gap-2 rounded-md border p-2 text-xs">
              <span className="flex-1">{fct}<span className="block text-[10px] text-muted-foreground">Confidence {78 - i * 6}% · {projectName(s, src.projectId)}</span></span>
              {accepted.includes(i) ? <SourceTag kind="Human-approved" /> : <Button size="sm" className="h-7" disabled={!user.canEdit} onClick={() => { actions.addRecord("evidence", { title: fct, projectId: src.projectId, links: [src.id], status: "Under review", description: `Extracted from ${src.id} and accepted by ${user.person}.`, fields: { quality: "A – Primary", confidence: String(78 - i * 6), classification: "Study" } }); setAccepted([...accepted, i]); toast.success("Accepted as evidence"); }}>Accept</Button>}
            </li>
          ))}</ul>
        )}
      </Panel>
    </div>
  );
}

function Refresh() {
  const { s, of } = useScope();
  const user = currentUser(s);
  const ev = of("evidence").sort((a, b) => (a.created < b.created ? -1 : 1));
  const age = (d: string) => Math.round((new Date(dayOffset(0)).getTime() - new Date(d).getTime()) / 86400000);
  const stale = ev.filter((e) => age(e.created) > 120 && e.status === "Validated");
  return (
    <Panel title="Knowledge refresh" actions={<Button size="sm" disabled={!user.canEdit || !stale.length} onClick={() => { stale.forEach((e) => actions.updateRecord(e.id, { status: "Under review" }, "Flagged for refresh (stale)")); toast.success(`${stale.length} stale items sent for re-validation`); }}><RefreshCw className="size-3.5" /> Refresh {stale.length} stale</Button>} bodyClass="p-0 overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2">Evidence</th><th>Project</th><th>Age (days)</th><th>Status</th><th></th></tr></thead>
        <tbody>{ev.slice(0, 25).map((e) => (
          <tr key={e.id} className="border-t"><td className="px-3 py-1.5"><span className="font-mono text-muted-foreground">{e.id}</span> {e.title}</td><td>{projectName(s, e.projectId)}</td><td className={cn("tabular-nums", age(e.created) > 120 && "font-semibold text-destructive")}>{age(e.created)}</td><td><StatusBadge status={e.status} /></td>
            <td className="px-3"><Button size="sm" variant="ghost" className="h-7" disabled={!user.canEdit} onClick={() => { actions.updateRecord(e.id, { status: "Under review", created: dayOffset(0) }, "Refreshed evidence"); toast.success(`${e.id} refreshed`); }}>Refresh</Button></td></tr>
        ))}</tbody>
      </table>
    </Panel>
  );
}

function KnowledgeMap() {
  const { projects, of } = useScope();
  const types = ["source", "evidence", "requirement", "risk", "finding", "decision", "gap", "contradiction"];
  const max = Math.max(1, ...projects.flatMap((p) => types.map((t) => of(t).filter((r) => r.projectId === p.id).length)));
  return (
    <Panel title="Knowledge map — object density by project" bodyClass="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr><th className="py-1 text-left">Project</th>{types.map((t) => <th key={t} className="px-1 text-center">{REGISTERS[t].label}</th>)}</tr></thead>
        <tbody>{projects.map((p) => (
          <tr key={p.id}><td className="py-1 pr-2 font-semibold">{p.name}</td>{types.map((t) => { const n = of(t).filter((r) => r.projectId === p.id).length; return <td key={t} className="p-0.5"><div className="grid h-9 place-items-center rounded font-semibold tabular-nums" style={{ background: `color-mix(in oklch, var(--primary) ${Math.round((n / max) * 85)}%, var(--muted))`, color: n / max > 0.5 ? "var(--primary-foreground)" : "var(--foreground)" }}>{n}</div></td>; })}</tr>
        ))}</tbody>
      </table>
    </Panel>
  );
}
