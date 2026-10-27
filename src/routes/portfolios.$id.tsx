import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { readinessFor, useRpos } from "@/lib/rpos/store";
import { PORTFOLIOS } from "@/lib/rpos/data";
import { Field, Kpi, PageHeader, Panel } from "@/components/rpos/page";
import { Meter, ResultBadge, StatusBadge } from "@/components/rpos/status";
import { BarsChart, Grid } from "@/components/rpos/viz";
import { Register } from "@/components/rpos/register";
import { usePortfolioStats } from "@/components/rpos/hooks";

export const Route = createFileRoute("/portfolios/$id")({
  loader: ({ params }) => {
    const pf = PORTFOLIOS.find((p) => p.id === params.id);
    return { name: pf?.name ?? params.id };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Portfolio"} — RPOS` },
      { name: "description", content: `Portfolio details, projects, performance and risks for ${loaderData?.name ?? "this portfolio"}.` },
      { property: "og:title", content: `${loaderData?.name ?? "Portfolio"} — RPOS` },
      { property: "og:description", content: "Portfolio details, projects, performance and risks." },
    ],
  }),
  component: PortfolioDetail,
  notFoundComponent: () => <p>Portfolio not found.</p>,
});

function PortfolioDetail() {
  const { id } = Route.useParams();
  const s = useRpos();
  const pf = usePortfolioStats().find((p) => p.id === id) ?? null;
  if (!pf) {
    const exists = s.portfolios.find((p) => p.id === id);
    if (!exists) throw notFound();
    return <p className="text-sm text-muted-foreground">This portfolio belongs to another organisation. Change the organisation selector to view it.</p>;
  }
  const ids = pf.projects.map((p) => p.id);
  return (
    <div>
      <PageHeader crumbs={["Portfolio Management", pf.name]} title={pf.name} description={pf.description} />
      <Grid cols={5} className="mb-4">
        <Kpi label="Projects" value={pf.projects.length} />
        <Kpi label="Overall readiness" value={`${pf.readiness}%`} />
        <Kpi label="Delivery health" value={<StatusBadge status={pf.health} />} sub={`SPI ${pf.spi.toFixed(2)}`} />
        <Kpi label="Critical risks" value={pf.critical} tone="bad" />
        <Kpi label="Open milestones" value={pf.milestones.length} />
      </Grid>
      <Tabs defaultValue="projects">
        <TabsList><TabsTrigger value="projects">Projects</TabsTrigger><TabsTrigger value="details">Details</TabsTrigger><TabsTrigger value="performance">Performance</TabsTrigger><TabsTrigger value="risks">Risks</TabsTrigger><TabsTrigger value="milestones">Milestones</TabsTrigger></TabsList>
        <TabsContent value="projects" className="pt-3">
          <Panel bodyClass="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr>{["Project", "Technology", "Capacity", "Stage", "Readiness", "Result", "SPI", "COD"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>{pf.projects.map((p) => { const r = readinessFor(s, p.id); return (
                <tr key={p.id} className="border-t"><td className="px-3 py-2"><Link to="/projects/$id" params={{ id: p.id }} className="font-semibold hover:text-primary">{p.name}</Link></td><td className="px-3">{p.technology}</td><td className="px-3">{p.capacity}</td><td className="px-3">{p.stage}</td><td className="w-36 px-3"><Meter value={r.overall} /></td><td className="px-3"><ResultBadge result={r.result} /></td><td className="px-3">{p.spi.toFixed(2)}</td><td className="px-3">{p.cod}</td></tr>
              ); })}</tbody>
            </table>
          </Panel>
        </TabsContent>
        <TabsContent value="details" className="pt-3">
          <Panel><dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Field label="Owner">{pf.owner}</Field><Field label="Status"><StatusBadge status={pf.status} /></Field><Field label="Geography">{pf.geography}</Field><Field label="Technology">{pf.technology}</Field>
            <Field label="Organisation">{s.organisations.find((o) => o.id === pf.orgId)?.name}</Field><Field label="Portfolio ID">{pf.id}</Field>
          </dl></Panel>
        </TabsContent>
        <TabsContent value="performance" className="pt-3">
          <Panel title="Project performance"><BarsChart data={pf.projects.map((p) => ({ name: p.name.split(" ")[0], SPI: p.spi, CPI: p.cpi }))} keys={["SPI", "CPI"]} /></Panel>
        </TabsContent>
        <TabsContent value="risks" className="pt-3"><Register type="risk" filter={(r) => ids.includes(r.projectId)} title={`${pf.name} risks`} /></TabsContent>
        <TabsContent value="milestones" className="pt-3"><Register type="milestone" filter={(r) => ids.includes(r.projectId)} /></TabsContent>
      </Tabs>
    </div>
  );
}
