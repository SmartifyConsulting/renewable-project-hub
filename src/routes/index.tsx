// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GATES } from "@/lib/rpos/config";
import { isOverdue, isPending } from "@/lib/rpos/store";
import { useScope } from "@/components/rpos/hooks";
import { Kpi, PageHeader, Panel, searchView } from "@/components/rpos/page";
import { Meter, ResultBadge, RiskBadge, StatusBadge } from "@/components/rpos/status";
import { ActivityFeed, BarsChart, DonutChart, BAND_COLORS, Grid, LinesChart, MiniList } from "@/components/rpos/viz";
import { BANDS } from "@/lib/rpos/config";

export const Route = createFileRoute("/")({
  validateSearch: searchView,
  head: () => ({
    meta: [
      { title: "Executive Overview — RPOS" },
      { name: "description", content: "Portfolio health, readiness, delivery performance and critical exposures across renewable projects." },
      { property: "og:title", content: "Executive Overview — RPOS" },
      { property: "og:description", content: "Portfolio health, readiness, delivery performance and critical exposures across renewable projects." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { s, projects, records, of, readiness } = useScope();
  const navigate = useNavigate();
  const critical = of("risk").filter((r) => (r.severity === "Very high" || r.severity === "High") && r.status !== "Closed");
  const pendingDecisions = of("decision").filter(isPending);
  const overdue = of("action").filter(isOverdue);
  const evidence = of("evidence");
  const validated = evidence.filter((e) => e.status === "Validated").length;
  const avgReady = Math.round(projects.reduce((a, p) => a + readiness[p.id].overall, 0) / Math.max(1, projects.length));
  const avgSpi = projects.reduce((a, p) => a + p.spi, 0) / Math.max(1, projects.length);
  const avgCpi = projects.reduce((a, p) => a + p.cpi, 0) / Math.max(1, projects.length);
  const assuranceOpen = [...of("ncr"), ...of("finding")].filter((r) => r.status !== "Closed").length;
  const single = projects.length === 1 ? projects[0] : null;

  const trend = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((m, i) => ({ name: m, SPI: +(avgSpi - 0.06 + i * 0.012).toFixed(2), CPI: +(avgCpi - 0.03 + i * 0.006).toFixed(2) }));
  const bands = BANDS.map((b) => ({ name: b, value: of("risk").filter((r) => r.severity === b && r.status !== "Closed").length }));

  return (
    <div>
      <PageHeader
        crumbs={["Executive Overview"]}
        title={single ? `${single.name} — overview` : "Executive Overview"}
        description={single ? `${single.technology} · ${single.capacity} · ${single.stage}` : `${projects.length} projects across ${new Set(projects.map((p) => p.portfolioId)).size} portfolios in the current context.`}
        help="Click any KPI to drill into the underlying register. Use the top selectors to switch between portfolio-level and project-level views."
      />
      <Grid cols={6} className="mb-4">
        <Kpi label="Active projects" value={projects.filter((p) => p.status === "Active").length} sub={`${projects.length} in scope`} onClick={() => navigate({ to: "/projects" })} />
        <Kpi label="Avg readiness" value={`${avgReady}%`} sub="weighted 14-domain" trend={2} onClick={() => navigate({ to: "/readiness" })} />
        <Kpi label="Schedule (SPI)" value={avgSpi.toFixed(2)} sub="portfolio average" trend={avgSpi - 1} tone={avgSpi < 0.95 ? "bad" : undefined} onClick={() => navigate({ to: "/intelligence", search: { view: "performance" } })} />
        <Kpi label="Critical risks" value={critical.length} sub="High / Very high" tone="bad" onClick={() => navigate({ to: "/delivery", search: { view: "risks" } })} />
        <Kpi label="Decisions pending" value={pendingDecisions.length} sub="awaiting approval" onClick={() => navigate({ to: "/delivery", search: { view: "decisions" } })} />
        <Kpi label="Overdue actions" value={overdue.length} sub="past due date" tone={overdue.length ? "bad" : "good"} onClick={() => navigate({ to: "/delivery", search: { view: "actions" } })} />
      </Grid>
      <Grid cols={4} className="mb-4">
        <Kpi label="Evidence validated" value={`${Math.round((validated / Math.max(1, evidence.length)) * 100)}%`} sub={`${validated} of ${evidence.length} items`} onClick={() => navigate({ to: "/rki", search: { view: "evidence" } })} />
        <Kpi label="Knowledge gaps" value={of("gap").filter((g) => g.status !== "Closed").length} sub="open" onClick={() => navigate({ to: "/rki", search: { view: "gaps" } })} />
        <Kpi label="Assurance exceptions" value={assuranceOpen} sub="open NCRs & findings" onClick={() => navigate({ to: "/assurance" })} />
        <Kpi label="Cost performance (CPI)" value={avgCpi.toFixed(2)} sub={`R ${projects.reduce((a, p) => a + p.spent, 0).toLocaleString()} m spent`} onClick={() => navigate({ to: "/intelligence", search: { view: "performance" } })} />
      </Grid>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Portfolio health" className="lg:col-span-2" actions={<Link to="/portfolios" search={{ view: "compare" }} className="text-xs font-semibold text-primary">Compare →</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-[11px] uppercase text-muted-foreground">
                <tr><th className="py-1.5">Project</th><th>Stage</th><th className="w-40">Readiness</th><th>Result</th><th>SPI</th><th>CPI</th><th>Top risk</th></tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const top = of("risk").filter((r) => r.projectId === p.id && r.status !== "Closed").sort((a, b) => BANDS.indexOf(b.severity!) - BANDS.indexOf(a.severity!))[0];
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="py-2"><Link to="/projects/$id" params={{ id: p.id }} className="font-semibold hover:text-primary">{p.name}</Link><div className="text-[10px] text-muted-foreground">{p.technology} · {p.capacity}</div></td>
                      <td>{p.stage}</td>
                      <td><Meter value={readiness[p.id].overall} /></td>
                      <td><ResultBadge result={readiness[p.id].result} /></td>
                      <td className={p.spi < 0.95 ? "font-semibold text-destructive" : ""}>{p.spi.toFixed(2)}</td>
                      <td className={p.cpi < 0.95 ? "font-semibold text-destructive" : ""}>{p.cpi.toFixed(2)}</td>
                      <td><RiskBadge band={top?.severity} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Open risk profile">
          <DonutChart data={bands} colors={BAND_COLORS} />
        </Panel>
        <Panel title="Delivery performance trend">
          <LinesChart data={trend} keys={["SPI", "CPI"]} />
        </Panel>
        <Panel title="Readiness by project">
          <BarsChart data={projects.map((p) => ({ name: p.name.split(" ")[0], Readiness: readiness[p.id].overall, Evidence: readiness[p.id].evidence }))} keys={["Readiness", "Evidence"]} />
        </Panel>
        <Panel title="Upcoming stage gates">
          <ul className="divide-y text-xs">
            {projects.filter((p) => p.status === "Active").map((p, i) => {
              const g = GATES.find((x) => x.stage === p.stage) ?? GATES[3];
              return (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span><b className="font-mono">{g.id}</b> {g.name}<span className="block text-[10px] text-muted-foreground">{p.name}</span></span>
                  <StatusBadge status={readiness[p.id].result} />
                  <span className="tabular-nums text-muted-foreground">+{14 + i * 9}d</span>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Critical risks & issues" actions={<Link to="/delivery" search={{ view: "risks" }} className="text-xs font-semibold text-primary">Register →</Link>}>
          <MiniList items={critical.slice(0, 6)} empty="No critical risks." />
        </Panel>
        <Panel title="Decisions awaiting approval">
          <MiniList items={pendingDecisions.slice(0, 6)} empty="No decisions pending." />
        </Panel>
        <Panel title="Recent activity">
          <ActivityFeed events={s.audit.filter((a) => !a.projectId || projects.some((p) => p.id === a.projectId))} />
        </Panel>
        <Panel title="Overdue actions" className="lg:col-span-2">
          <MiniList items={overdue.slice(0, 8)} empty="No overdue actions." />
        </Panel>
        <Panel title="Commercial indicators">
          <dl className="space-y-2 text-xs">
            {projects.map((p) => (
              <div key={p.id} className="flex justify-between gap-2 border-b pb-1.5 last:border-0">
                <dt className="truncate">{p.name}<span className="block text-[10px] text-muted-foreground">{p.offtaker}</span></dt>
                <dd className="text-right tabular-nums">R {p.spent.toLocaleString()} / {p.budget.toLocaleString()} m</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[10px] text-muted-foreground">{records.length} records in scope.</p>
        </Panel>
      </div>
    </div>
  );
}
