import { createFileRoute, Link } from "@tanstack/react-router";
import { REGISTERS } from "@/lib/rpos/config";
import { projectName, useRpos } from "@/lib/rpos/store";
import { EmptyState, PageHeader, Panel } from "@/components/rpos/page";
import { RecordDetailBody } from "@/components/rpos/record-sheet";
import { LineageGraph } from "@/components/rpos/viz";

export const Route = createFileRoute("/records/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — RPOS record` },
      { name: "description", content: `Record detail, relationships, comments and audit history for ${params.id}.` },
      { property: "og:title", content: `${params.id} — RPOS record` },
      { property: "og:description", content: "RPOS record detail with relationships and audit history." },
    ],
  }),
  component: RecordPage,
});

function RecordPage() {
  const { id } = Route.useParams();
  const s = useRpos();
  const r = s.records.find((x) => x.id === id);
  if (!r) return <EmptyState title="Record not found" text={`No record with ID ${id} exists in this prototype.`} action={<Link to="/" className="text-sm font-semibold text-primary">Back to overview</Link>} />;
  const def = REGISTERS[r.type];
  return (
    <div>
      <PageHeader crumbs={[projectName(s, r.projectId), def.label, r.id]} title={r.title} description={`${def.singular} · ${projectName(s, r.projectId)}`} />
      <div className="grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3"><RecordDetailBody record={r} /></Panel>
        <Panel title="Relationship map" className="xl:col-span-2">
          <p className="mb-3 text-xs text-muted-foreground">How this object is supported by sources and evidence, and what it drives downstream.</p>
          <div className="-mx-1"><LineageGraph rootId={r.id} /></div>
        </Panel>
      </div>
    </div>
  );
}
