import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BANDS, PEOPLE } from "@/lib/rpos/config";
import { actions, currentUser, readinessFor, useRpos } from "@/lib/rpos/store";
import { PageHeader, Panel, ViewTabs, searchView, Kpi } from "@/components/rpos/page";
import { Meter, ResultBadge, RiskBadge, StatusBadge } from "@/components/rpos/status";
import { BarsChart, Grid } from "@/components/rpos/viz";
import { Register, downloadCsv } from "@/components/rpos/register";
import { NAV } from "@/components/rpos/nav";
import { usePortfolioStats } from "@/components/rpos/hooks";

export const Route = createFileRoute("/portfolios/")({
  validateSearch: searchView,
  head: () => ({
    meta: [
      { title: "Portfolio Management — RPOS" },
      { name: "description", content: "Portfolio register, performance, risks and cross-project comparison for renewable portfolios." },
      { property: "og:title", content: "Portfolio Management — RPOS" },
      { property: "og:description", content: "Portfolio register, performance, risks and cross-project comparison." },
    ],
  }),
  component: Portfolios,
});

function Portfolios() {
  const { view = "overview" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const s = useRpos();
  const stats = usePortfolioStats();
  const [creating, setCreating] = useState(false);
  const user = currentUser(s);

  return (
    <div>
      <PageHeader
        crumbs={["Portfolio Management"]}
        title="Portfolio Management"
        description="Govern portfolios of renewable projects: readiness, delivery health, exposures and milestones."
        actions={user.canEdit && <Button size="sm" onClick={() => setCreating(true)}><Plus className="size-4" /> Create portfolio</Button>}
      />
      <ViewTabs views={NAV[1].views} value={view} onChange={(v) => navigate({ search: { view: v } })} />

      {view === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {stats.map((pf) => (
            <Link key={pf.id} to="/portfolios/$id" params={{ id: pf.id }} className="panel block p-4 transition hover:border-primary">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[10px] text-muted-foreground">{pf.id} · {s.organisations.find((o) => o.id === pf.orgId)?.name}</div>
                  <h3 className="font-display text-base font-semibold">{pf.name}</h3>
                </div>
                <StatusBadge status={pf.health} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{pf.description}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Projects</dt><dd className="font-display text-lg font-semibold">{pf.projects.length}</dd></div>
                <div><dt className="text-muted-foreground">Critical risks</dt><dd className="font-display text-lg font-semibold text-destructive">{pf.critical}</dd></div>
                <div><dt className="text-muted-foreground">SPI</dt><dd className="font-display text-lg font-semibold">{pf.spi.toFixed(2)}</dd></div>
              </dl>
              <div className="mt-2 text-[11px] text-muted-foreground">Overall readiness</div>
              <Meter value={pf.readiness} />
              <div className="mt-2 text-[11px] text-muted-foreground">Owner {pf.owner} · {pf.geography} · {pf.technology}</div>
            </Link>
          ))}
        </div>
      )}

      {view === "register" && <PortfolioTable stats={stats} />}

      {view === "performance" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Readiness vs schedule performance"><BarsChart data={stats.map((p) => ({ name: p.name.split(" ")[0], Readiness: p.readiness, "SPI×100": Math.round(p.spi * 100) }))} keys={["Readiness", "SPI×100"]} /></Panel>
          <Panel title="Budget & spend (R m)"><BarsChart data={stats.map((p) => ({ name: p.name.split(" ")[0], Budget: p.projects.reduce((a, x) => a + x.budget, 0), Spent: p.projects.reduce((a, x) => a + x.spent, 0) }))} keys={["Budget", "Spent"]} /></Panel>
          <Panel title="Key milestones" className="lg:col-span-2">
            <table className="w-full text-xs"><tbody>
              {stats.flatMap((pf) => pf.milestones.map((m) => (
                <tr key={m.id} className="border-t"><td className="py-1.5">{pf.name}</td><td><Link to="/records/$id" params={{ id: m.id }} className="hover:text-primary">{m.title}</Link></td><td>{m.due}</td><td><StatusBadge status={m.status} /></td></tr>
              )))}
            </tbody></table>
          </Panel>
        </div>
      )}

      {view === "risks" && (
        <div className="space-y-4">
          <Panel title="Risk heat by portfolio">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted-foreground"><th className="py-1">Portfolio</th>{BANDS.map((b) => <th key={b}>{b}</th>)}</tr></thead>
              <tbody>{stats.map((pf) => (
                <tr key={pf.id} className="border-t"><td className="py-2 font-semibold">{pf.name}</td>{BANDS.map((b) => { const n = pf.risks.filter((r) => r.severity === b).length; return <td key={b}>{n ? <RiskBadge band={b} className="tabular-nums" /> : "—"} <span className="ml-1 tabular-nums">{n || ""}</span></td>; })}</tr>
              ))}</tbody>
            </table>
          </Panel>
          <Register type="risk" title="Portfolio risks" />
        </div>
      )}

      {view === "compare" && <Comparison />}

      {view === "reporting" && (
        <Panel title="Portfolio reporting" actions={<Button size="sm" variant="outline" onClick={() => downloadCsv("portfolio-summary", stats.map((p) => ({ Portfolio: p.name, Projects: p.projects.length, Readiness: p.readiness, SPI: p.spi.toFixed(2), Critical: p.critical, Health: p.health })))}><Download className="size-3.5" /> Export summary</Button>}>
          <p className="mb-3 text-sm text-muted-foreground">Monthly portfolio report pack. Configure and preview full reports in Reports & Analytics.</p>
          <Grid cols={3}>
            {stats.map((p) => <Kpi key={p.id} label={p.name} value={`${p.readiness}%`} sub={`${p.projects.length} projects · ${p.health}`} onClick={() => navigate({ to: "/reports" })} />)}
          </Grid>
        </Panel>
      )}

      <CreatePortfolio open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function PortfolioTable({ stats }: { stats: ReturnType<typeof usePortfolioStats> }) {
  const [q, setQ] = useState("");
  const rows = stats.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Panel title="Portfolio register" actions={<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search portfolios" className="h-8 w-48 text-xs" />} bodyClass="p-0 overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr>{["ID", "Name", "Owner", "Status", "Geography", "Technology", "Projects", "Readiness", "Delivery health", "Critical risks"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
        <tbody>{rows.map((p) => (
          <tr key={p.id} className="border-t hover:bg-accent/50">
            <td className="px-3 py-2 font-mono">{p.id}</td>
            <td className="px-3"><Link to="/portfolios/$id" params={{ id: p.id }} className="font-semibold hover:text-primary">{p.name}</Link></td>
            <td className="px-3">{p.owner}</td><td className="px-3"><StatusBadge status={p.status} /></td><td className="px-3">{p.geography}</td><td className="px-3">{p.technology}</td>
            <td className="px-3 tabular-nums">{p.projects.length}</td><td className="w-36 px-3"><Meter value={p.readiness} /></td><td className="px-3"><StatusBadge status={p.health} /></td><td className="px-3 tabular-nums">{p.critical}</td>
          </tr>
        ))}</tbody>
      </table>
    </Panel>
  );
}

function Comparison() {
  const s = useRpos();
  const [sel, setSel] = useState<string[]>(s.projects.slice(0, 4).map((p) => p.id));
  const ps = s.projects.filter((p) => sel.includes(p.id));
  const metrics: [string, (p: (typeof ps)[number]) => React.ReactNode][] = [
    ["Technology", (p) => p.technology],
    ["Capacity", (p) => p.capacity],
    ["Stage", (p) => p.stage],
    ["Readiness", (p) => <Meter value={readinessFor(s, p.id).overall} />],
    ["Result", (p) => <ResultBadge result={readinessFor(s, p.id).result} />],
    ["Evidence coverage", (p) => `${readinessFor(s, p.id).evidence}%`],
    ["SPI", (p) => p.spi.toFixed(2)],
    ["CPI", (p) => p.cpi.toFixed(2)],
    ["Budget (R m)", (p) => p.budget.toLocaleString()],
    ["Open risks", (p) => s.records.filter((r) => r.type === "risk" && r.projectId === p.id && r.status !== "Closed").length],
    ["Overdue actions", (p) => s.records.filter((r) => r.type === "action" && r.projectId === p.id && r.status === "Overdue").length],
    ["COD", (p) => p.cod],
  ];
  return (
    <div className="space-y-4">
      <Panel title="Select projects to compare">
        <div className="flex flex-wrap gap-4">
          {s.projects.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-xs">
              <Checkbox checked={sel.includes(p.id)} onCheckedChange={(v) => setSel((x) => (v ? [...x, p.id] : x.filter((y) => y !== p.id)))} /> {p.name}
            </label>
          ))}
        </div>
      </Panel>
      <Panel title="Comparison matrix" bodyClass="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/60"><tr><th className="px-3 py-2 text-left">Indicator</th>{ps.map((p) => <th key={p.id} className="px-3 py-2 text-left">{p.name}</th>)}</tr></thead>
          <tbody>{metrics.map(([m, f]) => <tr key={m} className="border-t"><td className="px-3 py-2 font-semibold text-muted-foreground">{m}</td>{ps.map((p) => <td key={p.id} className="px-3 py-2">{f(p)}</td>)}</tr>)}</tbody>
        </table>
      </Panel>
      <Panel title="Readiness profile"><BarsChart data={ps.map((p) => ({ name: p.name.split(" ")[0], Readiness: readinessFor(s, p.id).overall, Confidence: readinessFor(s, p.id).confidence }))} keys={["Readiness", "Confidence"]} /></Panel>
    </div>
  );
}

function CreatePortfolio({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useRpos();
  const [f, setF] = useState({ name: "", description: "", owner: PEOPLE[0], orgId: s.organisations[0].id, geography: "South Africa", technology: "Solar PV", status: "Active" });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => { e.preventDefault(); if (!f.name) return toast.error("Name required"); const id = actions.addPortfolio(f); toast.success(`Portfolio ${id} created`); onOpenChange(false); setF({ ...f, name: "", description: "" }); }} className="space-y-3">
          <DialogHeader><DialogTitle>Create portfolio</DialogTitle></DialogHeader>
          <div className="space-y-1"><Label htmlFor="pf-name">Name</Label><Input id="pf-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="pf-desc">Description</Label><Textarea id="pf-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Organisation</Label><Select value={f.orgId} onValueChange={(v) => setF({ ...f, orgId: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{s.organisations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Owner</Label><Select value={f.owner} onValueChange={(v) => setF({ ...f, owner: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PEOPLE.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label htmlFor="pf-geo">Geography</Label><Input id="pf-geo" value={f.geography} onChange={(e) => setF({ ...f, geography: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="pf-tech">Technology</Label><Input id="pf-tech" value={f.technology} onChange={(e) => setF({ ...f, technology: e.target.value })} /></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Create</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
