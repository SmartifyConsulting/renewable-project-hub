import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOMAINS, REGISTERS } from "@/lib/rpos/config";
import { useScope } from "@/components/rpos/hooks";
import { PageHeader, Panel, ViewTabs, searchView } from "@/components/rpos/page";
import { NAV } from "@/components/rpos/nav";
import { Register } from "@/components/rpos/register";
import { ApprovalQueue } from "@/components/rpos/shared";
import { StatusBadge } from "@/components/rpos/status";

export const Route = createFileRoute("/knowledge")({
  validateSearch: searchView,
  head: () => ({
    meta: [
      { title: "Knowledge Management — RPOS" },
      { name: "description", content: "Library of templates, SOPs, lessons learned, reusable requirements, work packages and assurance tests." },
      { property: "og:title", content: "Knowledge Management — RPOS" },
      { property: "og:description", content: "Reusable renewable project knowledge library." },
    ],
  }),
  component: Knowledge,
});

const KINDS = REGISTERS.knowledge.extra![0].options!;

function Knowledge() {
  const { view = "library" } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <div>
      <PageHeader crumbs={["Knowledge Management"]} title="Knowledge Management" description="Governed, versioned and owned organisational knowledge for reuse across projects." />
      <ViewTabs views={NAV[9].views} value={view} onChange={(v) => navigate({ search: { view: v } })} />
      {view === "library" && <Library />}
      {view === "taxonomy" && <Taxonomy />}
      {view === "documents" && <Register type="document" title="Document register" />}
      {KINDS.includes(view) && <Register type="knowledge" title={view} filter={(r) => r.fields.kind === view} />}
      {view === "approval" && <div className="space-y-4"><ApprovalQueue types={["knowledge", "document"]} title="Knowledge approval" /><Versions /></div>}
    </div>
  );
}

function Library() {
  const { s, projects } = useScope();
  const [f, setF] = useState({ portfolio: "all", technology: "all", geography: "all", domain: "all", kind: "all" });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const filter = (r: { projectId: string; fields: Record<string, string> }) => {
    const p = s.projects.find((x) => x.id === r.projectId)!;
    return (f.portfolio === "all" || p.portfolioId === f.portfolio) && (f.technology === "all" || r.fields.technology === f.technology || r.fields.technology === "All") && (f.geography === "all" || p.country === f.geography) && (f.kind === "all" || r.fields.kind === f.kind) && (f.domain === "all" || (DOMAINS.findIndex((d) => d.id === f.domain) + r.projectId.charCodeAt(6)) % 2 === 0);
  };
  const Sel = ({ k, label, opts }: { k: keyof typeof f; label: string; opts: string[][] }) => (
    <Select value={f[k]} onValueChange={set(k)}><SelectTrigger aria-label={label} className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All {label.toLowerCase()}</SelectItem>{opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
  );
  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap gap-2 p-3">
        <Sel k="portfolio" label="Portfolios" opts={s.portfolios.map((p) => [p.id, p.name])} />
        <Sel k="technology" label="Technologies" opts={["Solar PV", "Wind", "BESS"].map((x) => [x, x])} />
        <Sel k="geography" label="Geographies" opts={[...new Set(projects.map((p) => p.country))].map((x) => [x, x])} />
        <Sel k="domain" label="Domains" opts={DOMAINS.map((d) => [d.id, d.name])} />
        <Sel k="kind" label="Document types" opts={KINDS.map((x) => [x, x])} />
      </div>
      <Register type="knowledge" title="Knowledge library" filter={filter} />
    </div>
  );
}

const TAXONOMY: [string, string[]][] = [
  ["Development", ["Land & site", "Resource assessment", "Permitting", "Grid connection"]],
  ["Commercial", ["Offtake & PPA", "Financial model", "Contracting strategy"]],
  ["Delivery", ["Engineering", "Procurement", "Construction", "Commissioning"]],
  ["Assurance", ["Quality", "Verification & testing", "Stage gates"]],
  ["Governance", ["Decision rights", "Controls", "Reporting"]],
  ["Technology", ["Solar PV", "Onshore wind", "Battery storage", "Hybrid"]],
];
function Taxonomy() {
  const { of } = useScope();
  const [open, setOpen] = useState<string>("Development");
  return (
    <Panel title="Knowledge taxonomy">
      <ul className="space-y-1">{TAXONOMY.map(([n, kids], i) => (
        <li key={n}>
          <button onClick={() => setOpen(open === n ? "" : n)} className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm font-semibold hover:bg-muted"><ChevronRight className={`size-4 transition ${open === n ? "rotate-90" : ""}`} />{n}<span className="ml-auto text-xs font-normal text-muted-foreground">{kids.length} categories</span></button>
          {open === n && <ul className="ml-7 border-l">{kids.map((k, j) => <li key={k} className="flex justify-between py-1 pl-3 pr-2 text-xs"><span>{k}</span><span className="text-muted-foreground">{of("knowledge").filter((_, x) => (x + i + j) % 7 === 0).length} objects</span></li>)}</ul>}
        </li>
      ))}</ul>
    </Panel>
  );
}

function Versions() {
  const { of } = useScope();
  return (
    <Panel title="Versioning & ownership" bodyClass="p-0 overflow-x-auto">
      <table className="w-full text-xs"><thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr>{["Object", "Kind", "Version", "Owner", "Last change", "Status"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
        <tbody>{of("knowledge").slice(0, 15).map((k) => <tr key={k.id} className="border-t"><td className="px-3 py-2"><span className="font-mono text-muted-foreground">{k.id}</span> {k.title}</td><td>{k.fields.kind}</td><td className="font-mono">{k.fields.version}</td><td>{k.owner}</td><td>{k.history[0].at}</td><td><StatusBadge status={k.status} /></td></tr>)}</tbody>
      </table>
    </Panel>
  );
}
