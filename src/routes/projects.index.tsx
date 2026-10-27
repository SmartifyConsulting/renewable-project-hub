import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PEOPLE, STAGES } from "@/lib/rpos/config";
import { actions, currentUser, readinessFor, useRpos } from "@/lib/rpos/store";
import { PageHeader, Panel } from "@/components/rpos/page";
import { Meter, ResultBadge, StatusBadge } from "@/components/rpos/status";
import { useScope } from "@/components/rpos/hooks";
import type { Project } from "@/lib/rpos/types";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Project Workspace — RPOS" },
      { name: "description", content: "Register of renewable energy projects across solar PV, wind and battery storage." },
      { property: "og:title", content: "Project Workspace — RPOS" },
      { property: "og:description", content: "Register of renewable energy projects across solar PV, wind and battery storage." },
    ],
  }),
  component: Projects,
});

function Projects() {
  const { s, projects } = useScope();
  const [q, setQ] = useState("");
  const [tech, setTech] = useState("all");
  const [open, setOpen] = useState(false);
  const rows = projects.filter((p) => (tech === "all" || p.technology === tech) && `${p.name} ${p.region} ${p.id}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader crumbs={["Project Workspace"]} title="Project Workspace" description="Select a project to open its structured workspace." actions={currentUser(s).canEdit && <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> New project</Button>} />
      <Panel
        title={`Project register (${rows.length})`}
        bodyClass="p-0 overflow-x-auto"
        actions={
          <div className="flex gap-2">
            <Input aria-label="Search projects" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-44 text-xs" />
            <Select value={tech} onValueChange={setTech}><SelectTrigger aria-label="Technology" className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All technologies</SelectItem>{["Solar PV", "Wind", "BESS", "Hybrid"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </div>
        }
      >
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr>{["ID", "Project", "Portfolio", "Technology", "Capacity", "Location", "Stage", "Status", "Readiness", "Result", "Manager"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>{rows.map((p) => { const r = readinessFor(s, p.id); return (
            <tr key={p.id} className="border-t hover:bg-accent/50">
              <td className="px-3 py-2 font-mono text-muted-foreground">{p.id}</td>
              <td className="px-3"><Link to="/projects/$id" params={{ id: p.id }} className="font-semibold hover:text-primary">{p.name}</Link></td>
              <td className="px-3">{s.portfolios.find((x) => x.id === p.portfolioId)?.name}</td><td className="px-3">{p.technology}</td><td className="px-3">{p.capacity}</td><td className="px-3">{p.region}, {p.country}</td><td className="px-3">{p.stage}</td><td className="px-3"><StatusBadge status={p.status} /></td>
              <td className="w-32 px-3"><Meter value={r.overall} /></td><td className="px-3"><ResultBadge result={r.result} /></td><td className="px-3">{p.manager}</td>
            </tr>
          ); })}</tbody>
        </table>
      </Panel>
      <CreateProject open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CreateProject({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useRpos();
  const navigate = useNavigate();
  const blank: Omit<Project, "id"> = { portfolioId: s.portfolios[0].id, name: "", technology: "Solar PV", capacity: "", country: "South Africa", region: "", stage: "Origination", status: "Active", director: PEOPLE[0], manager: PEOPLE[1], budget: 0, spent: 0, spi: 1, cpi: 1, cod: "2030-01-01", offtaker: "TBC", epc: "Not appointed", objective: "", activationDay: 0 };
  const [f, setF] = useState(blank);
  const sel = (label: string, key: keyof Project, opts: string[][]) => (
    <div className="space-y-1"><Label>{label}</Label><Select value={String(f[key])} onValueChange={(v) => setF({ ...f, [key]: v })}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!f.name) return toast.error("Project name is required"); const id = actions.addProject(f); toast.success(`${f.name} created`, { description: `${id} added to the project register` }); onOpenChange(false); setF(blank); navigate({ to: "/projects/$id", params: { id } }); }}>
          <DialogHeader><DialogTitle>New project</DialogTitle><DialogDescription>Registers the project and creates an empty 14-domain readiness assessment.</DialogDescription></DialogHeader>
          <div className="space-y-1"><Label htmlFor="np-name">Project name</Label><Input id="np-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            {sel("Portfolio", "portfolioId", s.portfolios.map((p) => [p.id, p.name]))}
            {sel("Technology", "technology", ["Solar PV", "Wind", "BESS", "Hybrid"].map((t) => [t, t]))}
            <div className="space-y-1"><Label htmlFor="np-cap">Capacity</Label><Input id="np-cap" placeholder="e.g. 120 MWp" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="np-reg">Region</Label><Input id="np-reg" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} /></div>
            {sel("Stage", "stage", STAGES.map((t) => [t, t]))}
            {sel("Project manager", "manager", PEOPLE.map((t) => [t, t]))}
          </div>
          <div className="space-y-1"><Label htmlFor="np-obj">Objective & investment intent</Label><Textarea id="np-obj" value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Create project</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
