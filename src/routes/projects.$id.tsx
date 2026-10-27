import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { GATES, STAGES } from "@/lib/rpos/config";
import { PROJECTS } from "@/lib/rpos/data";
import { isOverdue, readinessFor, useRpos } from "@/lib/rpos/store";
import { EmptyState, Field, Kpi, PageHeader, Panel, searchView } from "@/components/rpos/page";
import { Meter, ResultBadge, StatusBadge } from "@/components/rpos/status";
import { ActivityFeed, Gantt, Grid, MiniList } from "@/components/rpos/viz";
import { Register } from "@/components/rpos/register";
import { cn } from "@/lib/utils";
import { OrgChart } from "@/components/rpos/org-chart";

const SECTIONS = [
  ["overview", "Overview"], ["profile", "Profile"], ["objectives", "Objectives & investment intent"], ["organisation", "Organisation"], ["stakeholders", "Stakeholders"], ["governance", "Governance"], ["commercial", "Contract & commercial"], ["lifecycle", "Lifecycle & stage gates"], ["plan", "Plan & milestones"], ["workpackages", "Work packages"], ["requirements", "Requirements"], ["documents", "Documents & evidence"], ["risks", "Risks & issues"], ["decisions", "Decisions"], ["actions", "Actions"], ["dependencies", "Dependencies"], ["change", "Change control"], ["reporting", "Reporting"], ["activity", "Activity & audit"],
] as const;

export const Route = createFileRoute("/projects/$id")({
  validateSearch: searchView,
  loader: ({ params }) => ({ name: PROJECTS.find((p) => p.id === params.id)?.name ?? "Project" }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Project"} — Project Workspace — RPOS` },
      { name: "description", content: `Structured project workspace for ${loaderData?.name ?? "the project"}: profile, governance, plan, registers and audit history.` },
      { property: "og:title", content: `${loaderData?.name ?? "Project"} — RPOS` },
      { property: "og:description", content: "Structured renewable project workspace." },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const { id } = Route.useParams();
  const { view = "overview" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const s = useRpos();
  const p = s.projects.find((x) => x.id === id);
  if (!p) return <EmptyState title="Project not found" action={<Link to="/projects" className="text-sm font-semibold text-primary">All projects</Link>} />;
  const rd = readinessFor(s, p.id);
  const mine = (t: string) => s.records.filter((r) => r.projectId === p.id && r.type === t && !r.archived);
  const f = (r: { projectId: string }) => r.projectId === p.id;
  const stageIdx = STAGES.indexOf(p.stage as (typeof STAGES)[number]);

  return (
    <div>
      <PageHeader crumbs={["Project Workspace", p.name]} title={p.name} description={`${p.id} · ${p.technology} · ${p.capacity} · ${p.region}, ${p.country}`} actions={<div className="flex items-center gap-2"><StatusBadge status={p.stage} /><ResultBadge result={rd.result} /></div>} />
      <div className="grid gap-4 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Project sections" className="panel h-fit p-1.5 lg:sticky lg:top-20">
          <ul className="flex gap-1 overflow-x-auto lg:block">
            {SECTIONS.map(([k, l]) => (
              <li key={k}>
                <button onClick={() => navigate({ search: { view: k } })} className={cn("w-full rounded px-2.5 py-1.5 text-left text-xs whitespace-nowrap", view === k ? "bg-navy font-semibold text-navy-foreground" : "hover:bg-muted")}>{l}</button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-4">
          {view === "overview" && (
            <>
              <Grid cols={5}>
                <Kpi label="Readiness" value={`${rd.overall}%`} sub={rd.result} onClick={() => navigate({ to: "/readiness" })} />
                <Kpi label="SPI / CPI" value={`${p.spi.toFixed(2)} / ${p.cpi.toFixed(2)}`} />
                <Kpi label="Open risks" value={mine("risk").filter((r) => r.status !== "Closed").length} onClick={() => navigate({ search: { view: "risks" } })} />
                <Kpi label="Overdue actions" value={mine("action").filter(isOverdue).length} tone="bad" onClick={() => navigate({ search: { view: "actions" } })} />
                <Kpi label="Activation" value={`Day ${p.activationDay}/60`} onClick={() => navigate({ to: "/activation" })} />
              </Grid>
              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Lifecycle position"><Lifecycle idx={stageIdx} /></Panel>
                <Panel title="Objective"><p className="text-sm">{p.objective || "Not yet defined."}</p><dl className="mt-3 grid grid-cols-2 gap-3"><Field label="Director">{p.director}</Field><Field label="Manager">{p.manager}</Field><Field label="Offtaker">{p.offtaker}</Field><Field label="Target COD">{p.cod}</Field></dl></Panel>
                <Panel title="Decisions pending"><MiniList items={mine("decision").filter((d) => d.status === "Pending approval")} /></Panel>
                <Panel title="Recent activity"><ActivityFeed events={s.audit.filter((a) => a.projectId === p.id)} /></Panel>
              </div>
            </>
          )}
          {view === "profile" && (
            <Panel title="Project profile"><dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Field label="Project ID">{p.id}</Field><Field label="Technology">{p.technology}</Field><Field label="Capacity">{p.capacity}</Field><Field label="Country">{p.country}</Field><Field label="Region">{p.region}</Field><Field label="Stage">{p.stage}</Field><Field label="Portfolio">{s.portfolios.find((x) => x.id === p.portfolioId)?.name}</Field><Field label="Status"><StatusBadge status={p.status} /></Field><Field label="Target COD">{p.cod}</Field>
            </dl></Panel>
          )}
          {view === "objectives" && (
            <Panel title="Objectives & investment intent">
              <p className="text-sm">{p.objective}</p>
              <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4"><Field label="Capex (R m)">{p.budget.toLocaleString()}</Field><Field label="Target equity IRR">13.5%</Field><Field label="Local content target">40%</Field><Field label="Economic development">2.1% of revenue</Field></dl>
              <div className="mt-4"><div className="mb-1 text-xs font-semibold">Strategic alignment readiness</div><Meter value={(rd.rows[0].score / 5) * 100} /></div>
            </Panel>
          )}
          {view === "organisation" && <OrgChart director={p.director} manager={p.manager} />}
          {view === "stakeholders" && <Register type="stakeholder" filter={f} />}
          {view === "governance" && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Governance forums"><ul className="space-y-2 text-xs">{[["Investment Committee", "Quarterly", "FID, budget > R50 m"], ["Project Board", "Monthly", "Stage gates, changes > R5 m"], ["Steering Committee", "Fortnightly", "Cross-workstream decisions"], ["Weekly Delivery", "Weekly", "Actions, risks, progress"]].map(([n, c, a]) => <li key={n} className="flex justify-between border-b pb-1.5"><b>{n}</b><span className="text-muted-foreground">{c} · {a}</span></li>)}</ul></Panel>
              <Register type="meeting" filter={f} compact />
            </div>
          )}
          {view === "commercial" && (
            <Panel title="Contract & commercial"><dl className="grid grid-cols-2 gap-4 md:grid-cols-3"><Field label="Offtaker / PPA">{p.offtaker}</Field><Field label="EPC contractor">{p.epc}</Field><Field label="Budget (R m)">{p.budget.toLocaleString()}</Field><Field label="Spent to date (R m)">{p.spent.toLocaleString()}</Field><Field label="CPI">{p.cpi.toFixed(2)}</Field><Field label="Contract form">FIDIC Silver (EPC)</Field></dl></Panel>
          )}
          {view === "lifecycle" && (
            <Panel title="Lifecycle & stage gates">
              <Lifecycle idx={stageIdx} />
              <table className="mt-4 w-full text-xs"><thead className="text-left text-muted-foreground"><tr><th className="py-1">Gate</th><th>Name</th><th>Stage</th><th>Status</th></tr></thead><tbody>{GATES.map((g) => { const gi = STAGES.indexOf(g.stage as (typeof STAGES)[number]); return <tr key={g.id} className="border-t"><td className="py-1.5 font-mono">{g.id}</td><td>{g.name}</td><td>{g.stage}</td><td><StatusBadge status={gi < stageIdx ? "Approved" : gi === stageIdx ? rd.result : "Planned"} /></td></tr>; })}</tbody></table>
            </Panel>
          )}
          {view === "plan" && (
            <>
              <Panel title="Activation & plan timeline"><Gantt day={p.activationDay} rows={(s.activation[p.id] ?? []).filter((t, i) => i % 4 === 1 || t.milestone).map((t) => ({ id: t.id, label: t.name, sub: t.workstream, start: t.start, duration: t.duration, progress: t.progress, milestone: t.milestone }))} /></Panel>
              <Register type="milestone" filter={f} />
            </>
          )}
          {view === "workpackages" && <Register type="workpackage" filter={f} />}
          {view === "requirements" && <Register type="requirement" filter={f} />}
          {view === "documents" && (<><Register type="document" filter={f} /><Register type="evidence" filter={f} /></>)}
          {view === "risks" && (<><Register type="risk" filter={f} /><Register type="issue" filter={f} /></>)}
          {view === "decisions" && <Register type="decision" filter={f} />}
          {view === "actions" && <Register type="action" filter={f} />}
          {view === "dependencies" && <Register type="dependency" filter={f} />}
          {view === "change" && <Register type="change" filter={f} />}
          {view === "reporting" && (
            <Panel title="Project report" actions={<Link to="/reports" className="text-xs font-semibold text-primary">Configure full report →</Link>}>
              <p className="text-sm">{p.name} is at <b>{p.stage}</b> with readiness <b>{rd.overall}%</b> ({rd.result}). Schedule performance is {p.spi.toFixed(2)} and cost performance {p.cpi.toFixed(2)}. There are {mine("risk").filter((r) => r.severity === "Very high").length} very high risks and {mine("action").filter(isOverdue).length} overdue actions.</p>
            </Panel>
          )}
          {view === "activity" && <Panel title="Activity & audit history"><ActivityFeed events={s.audit.filter((a) => a.projectId === p.id)} limit={60} /></Panel>}
        </div>
      </div>
    </div>
  );
}

function Lifecycle({ idx }: { idx: number }) {
  return (
    <ol className="flex flex-wrap gap-1">
      {STAGES.map((st, i) => (
        <li key={st} className={cn("flex min-w-24 flex-1 items-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-semibold", i < idx ? "bg-success-soft text-success" : i === idx ? "bg-navy text-navy-foreground" : "bg-muted text-muted-foreground")}>
          {i < idx && <Check className="size-3" />} {st}
        </li>
      ))}
    </ol>
  );
}

