import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DOMAINS, MODULES, REGISTERS, ROLES, ROLE_ACCESS, type RoleId } from "@/lib/rpos/config";
import { actions, currentUser, useRpos } from "@/lib/rpos/store";
import { EmptyState, PageHeader, Panel, ViewTabs, searchView } from "@/components/rpos/page";
import { NAV } from "@/components/rpos/nav";
import { downloadCsv } from "@/components/rpos/register";
import { StatusBadge } from "@/components/rpos/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  validateSearch: searchView,
  head: () => ({
    meta: [
      { title: "Administration & Configuration — RPOS" },
      { name: "description", content: "Organisations, users, roles, permissions, workflows, registers, readiness criteria, thresholds and audit log." },
      { property: "og:title", content: "Administration — RPOS" },
      { property: "og:description", content: "RPOS administration and configuration." },
    ],
  }),
  component: Admin,
});

const saved = (what: string) => toast.success(`${what} saved`, { description: "Stored locally in this prototype" });

function Admin() {
  const { view = "users" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const s = useRpos();
  const user = currentUser(s);
  const allowed = user.modules.includes("admin") || view === "notifications";
  return (
    <div>
      <PageHeader crumbs={["Administration"]} title="Administration & Configuration" description="Access control, configuration of registers and criteria, and the system audit trail." />
      <ViewTabs views={NAV[12].views} value={view} onChange={(v) => navigate({ search: { view: v } })} />
      {!allowed ? <EmptyState title="Restricted" text={`${user.name} does not have access to administration. Switch role to System or Organisation Administrator.`} /> : (
        <>
          {view === "orgs" && <Orgs />}
          {view === "users" && <Users />}
          {view === "roles" && <Roles />}
          {view === "access" && <Access />}
          {view === "authority" && <Authority />}
          {view === "workflows" && <Workflows />}
          {view === "registers" && <Registers />}
          {view === "taxonomy" && <TaxonomyCfg />}
          {view === "criteria" && <Criteria />}
          {view === "thresholds" && <Thresholds />}
          {view === "reporting" && <Toggles title="Reporting configuration" items={["Monthly portfolio report auto-generation", "Weekly project status pack", "Include AI-drafted content (labelled)", "Watermark draft reports"]} />}
          {view === "notifications" && <Toggles title="Notification preferences" items={["Decisions awaiting my approval", "Risks rated Very high in my projects", "Overdue actions I own", "Agent proposals in my area", "Weekly digest email (simulated)"]} />}
          {view === "audit" && <Audit />}
          {view === "settings" && <Toggles title="System settings" items={["Enforce two-person approval for material decisions", "Require evidence link before closing findings", "Allow agents to read draft records", "Lock assessments after gate approval", "Maintenance mode"]} defaults={[true, true, false, true, false]} />}
        </>
      )}
    </div>
  );
}

function Orgs() {
  const s = useRpos();
  const [orgs, setOrgs] = useState(s.organisations.map((o) => ({ ...o, users: o.id === "ORG-1" ? 48 : 17, status: "Active" })));
  const [name, setName] = useState("");
  return (
    <Panel title="Organisation management" bodyClass="p-0">
      <table className="w-full text-xs"><thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2">ID</th><th>Name</th><th>Country</th><th>Portfolios</th><th>Users</th><th>Status</th></tr></thead>
        <tbody>{orgs.map((o) => <tr key={o.id} className="border-t"><td className="px-3 py-2 font-mono">{o.id}</td><td className="font-semibold">{o.name}</td><td>{o.country}</td><td>{s.portfolios.filter((p) => p.orgId === o.id).length}</td><td>{o.users}</td><td><StatusBadge status={o.status} /></td></tr>)}</tbody>
      </table>
      <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); if (!name) return; setOrgs([...orgs, { id: `ORG-${orgs.length + 1}`, name, country: "—", users: 0, status: "Active" }]); setName(""); saved("Organisation"); }}>
        <Input aria-label="New organisation name" placeholder="New organisation name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 max-w-xs text-xs" /><Button size="sm" type="submit"><Plus className="size-3.5" /> Add</Button>
      </form>
    </Panel>
  );
}

function Users() {
  const s = useRpos();
  const [users, setUsers] = useState(ROLES.map((r, i) => ({ id: `USR-${100 + i}`, name: r.person, email: `${r.person.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@${i % 4 === 3 ? "meridian.co.uk" : "heita.co.za"}`, role: r.id as RoleId, active: r.id !== "client" || true })));
  const [inviting, setInviting] = useState(false);
  const [inv, setInv] = useState({ name: "", email: "", role: "pm" as RoleId });
  return (
    <Panel title={`User management (${users.length})`} actions={<Button size="sm" onClick={() => setInviting(true)}><Plus className="size-3.5" /> Invite user</Button>} bodyClass="p-0 overflow-x-auto">
      <table className="w-full text-xs"><thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2">User</th><th>Email</th><th>Role</th><th>Active</th><th /></tr></thead>
        <tbody>{users.map((u) => (
          <tr key={u.id} className="border-t"><td className="px-3 py-2 font-semibold">{u.name}</td><td className="text-muted-foreground">{u.email}</td>
            <td><Select value={u.role} onValueChange={(v) => { setUsers(users.map((x) => (x.id === u.id ? { ...x, role: v as RoleId } : x))); saved("Role assignment"); }}><SelectTrigger aria-label={`Role for ${u.name}`} className="h-7 w-52 text-xs"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></td>
            <td><Switch aria-label={`Active ${u.name}`} checked={u.active} onCheckedChange={(v) => setUsers(users.map((x) => (x.id === u.id ? { ...x, active: v } : x)))} /></td>
            <td className="px-3"><Button size="sm" variant="ghost" className="h-7" onClick={() => { actions.setContext({ roleId: u.role }); toast.success(`Now viewing as ${u.name}`); }} disabled={s.roleId === u.role}>View as</Button></td></tr>
        ))}</tbody>
      </table>
      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!inv.name || !inv.email) return toast.error("Name and email required"); setUsers([...users, { id: `USR-${200 + users.length}`, ...inv, active: true }]); setInviting(false); toast.success(`Invitation sent to ${inv.email}`, { description: "Simulated" }); setInv({ name: "", email: "", role: "pm" }); }}>
            <DialogHeader><DialogTitle>Invite user</DialogTitle></DialogHeader>
            <div className="space-y-1"><Label htmlFor="iv-n">Name</Label><Input id="iv-n" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="iv-e">Email</Label><Input id="iv-e" type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Role</Label><Select value={inv.role} onValueChange={(v) => setInv({ ...inv, role: v as RoleId })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setInviting(false)}>Cancel</Button><Button type="submit">Send invite</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function Roles() {
  const [m, setM] = useState(() => Object.fromEntries(ROLES.map((r) => [r.id, [...ROLE_ACCESS[r.id].modules]])) as Record<string, string[]>);
  const caps = (id: RoleId) => ROLE_ACCESS[id];
  return (
    <Panel title="Role & permission matrix" actions={<Button size="sm" onClick={() => saved("Permission matrix")}>Save</Button>} bodyClass="p-0 overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead className="bg-muted/60"><tr><th className="px-3 py-2 text-left">Module</th>{ROLES.map((r) => <th key={r.id} className="px-1 py-2 font-semibold" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{r.name}</th>)}</tr></thead>
        <tbody>
          {MODULES.map((mod) => (
            <tr key={mod.id} className="border-t"><td className="px-3 py-1.5 font-medium">{mod.label}</td>
              {ROLES.map((r) => { const on = m[r.id].includes(mod.id); return <td key={r.id} className="text-center"><button aria-label={`${r.name} ${mod.label}`} onClick={() => setM({ ...m, [r.id]: on ? m[r.id].filter((x) => x !== mod.id) : [...m[r.id], mod.id] })} className={cn("mx-auto grid size-6 place-items-center rounded", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/40")}>{on ? <Check className="size-3.5" /> : <X className="size-3" />}</button></td>; })}
            </tr>
          ))}
          <tr className="border-t bg-muted/40"><td className="px-3 py-1.5 font-semibold">Create & edit records</td>{ROLES.map((r) => <td key={r.id} className="text-center">{caps(r.id).canEdit ? "✓" : "—"}</td>)}</tr>
          <tr className="border-t bg-muted/40"><td className="px-3 py-1.5 font-semibold">Approve decisions</td>{ROLES.map((r) => <td key={r.id} className="text-center">{caps(r.id).canApprove ? "✓" : "—"}</td>)}</tr>
        </tbody>
      </table>
      <p className="border-t p-3 text-xs text-muted-foreground">Navigation access applies when switching demo role from the profile menu. Edits to this matrix are illustrative in this prototype.</p>
    </Panel>
  );
}

function Access() {
  const s = useRpos();
  const [m, setM] = useState<Record<string, boolean>>(() => Object.fromEntries(ROLES.flatMap((r, i) => s.projects.map((p, j) => [`${r.id}|${p.id}`, r.id !== "client" ? (i + j) % 4 !== 0 || ["sysadmin", "orgadmin", "executive"].includes(r.id) : j === 0]))));
  return (
    <Panel title="Project & portfolio access" actions={<Button size="sm" onClick={() => saved("Access assignments")}>Save</Button>} bodyClass="p-0 overflow-x-auto">
      <table className="w-full text-xs"><thead className="bg-muted/60"><tr><th className="px-3 py-2 text-left">User / role</th>{s.projects.map((p) => <th key={p.id} className="px-2 text-center">{p.name.split(" ").slice(0, 2).join(" ")}<div className="text-[10px] font-normal text-muted-foreground">{s.portfolios.find((x) => x.id === p.portfolioId)?.name}</div></th>)}</tr></thead>
        <tbody>{ROLES.map((r) => <tr key={r.id} className="border-t"><td className="px-3 py-1.5"><b>{r.person}</b><div className="text-[10px] text-muted-foreground">{r.name}</div></td>{s.projects.map((p) => <td key={p.id} className="text-center"><Checkbox aria-label={`${r.person} access ${p.name}`} checked={m[`${r.id}|${p.id}`]} onCheckedChange={(v) => setM({ ...m, [`${r.id}|${p.id}`]: !!v })} /></td>)}</tr>)}</tbody>
      </table>
    </Panel>
  );
}

function Authority() {
  const [rows, setRows] = useState([["Investment Committee", "500"], ["Project Board", "50"], ["Project Director", "5"], ["Project Manager", "1"]]);
  return (
    <Panel title="Approval authority (R m)" actions={<Button size="sm" onClick={() => saved("Approval authority")}>Save</Button>}>
      <div className="space-y-2">{rows.map(([n, v], i) => <div key={n} className="flex items-center gap-3 text-sm"><span className="w-48 font-semibold">{n}</span><Input aria-label={`${n} limit`} type="number" value={v} onChange={(e) => setRows(rows.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} className="h-8 w-32" /><span className="text-xs text-muted-foreground">Up to R {v} m per decision</span></div>)}</div>
      <p className="mt-3 text-xs text-muted-foreground">AI agents hold no approval authority; this is a fixed system control.</p>
    </Panel>
  );
}

function Workflows() {
  const [wf, setWf] = useState<Record<string, string[]>>({ "Decision approval": ["Draft", "Review by PMO", "Project Director", "Project Board"], "Evidence validation": ["Captured", "Knowledge Analyst review", "Domain Specialist validation"], "Change control": ["Raised", "Impact assessment", "Project Director", "Implemented"], "Agent proposal": ["AI proposal", "Human review", "Approved → actions created"] });
  const [add, setAdd] = useState<Record<string, string>>({});
  return (
    <div className="grid gap-4 lg:grid-cols-2">{Object.entries(wf).map(([n, steps]) => (
      <Panel key={n} title={n}>
        <ol className="flex flex-wrap items-center gap-1 text-xs">{steps.map((st, i) => <li key={st} className="flex items-center gap-1"><span className="rounded border bg-muted px-2 py-1">{i + 1}. {st}</span><button aria-label={`Remove ${st}`} onClick={() => setWf({ ...wf, [n]: steps.filter((x) => x !== st) })} className="text-muted-foreground hover:text-destructive"><X className="size-3" /></button>{i < steps.length - 1 && <span className="text-muted-foreground">→</span>}</li>)}</ol>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!add[n]) return; setWf({ ...wf, [n]: [...steps, add[n]] }); setAdd({ ...add, [n]: "" }); saved("Workflow"); }}><Input aria-label="New step" placeholder="Add step" value={add[n] ?? ""} onChange={(e) => setAdd({ ...add, [n]: e.target.value })} className="h-8 text-xs" /><Button size="sm" type="submit">Add</Button></form>
      </Panel>
    ))}</div>
  );
}

function Registers() {
  const [regs, setRegs] = useState(() => Object.values(REGISTERS).map((r) => ({ key: r.key, label: r.label, prefix: r.prefix, statuses: [...r.statuses], enabled: true })));
  const [add, setAdd] = useState<Record<string, string>>({});
  return (
    <Panel title="Register & status configuration" bodyClass="p-0 overflow-x-auto">
      <table className="w-full text-xs"><thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2">Register</th><th>Prefix</th><th>Statuses</th><th>Enabled</th></tr></thead>
        <tbody>{regs.map((r, i) => (
          <tr key={r.key} className="border-t align-top"><td className="px-3 py-2 font-semibold">{r.label}</td><td className="font-mono">{r.prefix}</td>
            <td className="py-1.5"><div className="flex flex-wrap items-center gap-1">{r.statuses.map((st) => <StatusBadge key={st} status={st} />)}
              <form onSubmit={(e) => { e.preventDefault(); if (!add[r.key]) return; setRegs(regs.map((x, j) => (j === i ? { ...x, statuses: [...x.statuses, add[r.key]] } : x))); setAdd({ ...add, [r.key]: "" }); saved("Status"); }}><Input aria-label={`Add status to ${r.label}`} placeholder="+ status" value={add[r.key] ?? ""} onChange={(e) => setAdd({ ...add, [r.key]: e.target.value })} className="h-6 w-24 text-[11px]" /></form>
            </div></td>
            <td><Switch aria-label={`Enable ${r.label}`} checked={r.enabled} onCheckedChange={(v) => setRegs(regs.map((x, j) => (j === i ? { ...x, enabled: v } : x)))} /></td></tr>
        ))}</tbody>
      </table>
    </Panel>
  );
}

function TaxonomyCfg() {
  const [terms, setTerms] = useState(["Solar PV", "Onshore wind", "Battery storage", "Hybrid", "Grid connection", "Permitting", "Offtake", "Commissioning"]);
  const [t, setT] = useState("");
  return (
    <Panel title="Taxonomy configuration">
      <div className="flex flex-wrap gap-1.5">{terms.map((x) => <span key={x} className="flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs">{x}<button aria-label={`Remove ${x}`} onClick={() => setTerms(terms.filter((y) => y !== x))}><X className="size-3" /></button></span>)}</div>
      <form className="mt-3 flex max-w-sm gap-2" onSubmit={(e) => { e.preventDefault(); if (!t) return; setTerms([...terms, t]); setT(""); saved("Taxonomy term"); }}><Input aria-label="New term" value={t} onChange={(e) => setT(e.target.value)} placeholder="New term" className="h-8 text-xs" /><Button size="sm" type="submit">Add</Button></form>
    </Panel>
  );
}

function Criteria() {
  const [w, setW] = useState(DOMAINS.map((d) => d.weight));
  const sum = w.reduce((a, b) => a + b, 0);
  return (
    <Panel title="Readiness criteria configuration" actions={<Button size="sm" disabled={sum !== 100} onClick={() => saved("Domain weights")}>Save</Button>}>
      <p className={cn("mb-3 text-xs font-semibold", sum === 100 ? "text-success" : "text-destructive")}>Total weight: {sum}% {sum !== 100 && "— system control: weights must total 100%"}</p>
      <div className="grid gap-2 md:grid-cols-2">{DOMAINS.map((d, i) => <div key={d.id} className="flex items-center gap-2 text-xs"><span className="w-10 font-mono">{d.id}</span><span className="flex-1">{d.name}</span><Input aria-label={`${d.name} weight`} type="number" value={w[i]} onChange={(e) => setW(w.map((x, j) => (j === i ? Number(e.target.value) : x)))} className="h-7 w-16 text-xs" /><span>%</span></div>)}</div>
    </Panel>
  );
}

function Thresholds() {
  const [t, setT] = useState({ go: 75, cgo: 55, goMin: 2, cgoMin: 1, stale: 120, overdue: 0 });
  const f = (k: keyof typeof t, label: string, suffix: string) => <div className="flex items-center gap-3 text-sm"><span className="w-64">{label}</span><Input aria-label={label} type="number" value={t[k]} onChange={(e) => setT({ ...t, [k]: Number(e.target.value) })} className="h-8 w-24" /><span className="text-xs text-muted-foreground">{suffix}</span></div>;
  return (
    <Panel title="Threshold configuration" actions={<Button size="sm" onClick={() => saved("Thresholds")}>Save</Button>}>
      <div className="space-y-2">{f("go", "GO — minimum overall readiness", "%")}{f("goMin", "GO — minimum domain score", "/ 5")}{f("cgo", "CONDITIONAL GO — minimum overall", "%")}{f("cgoMin", "CONDITIONAL GO — minimum domain score", "/ 5")}{f("stale", "Evidence considered stale after", "days")}{f("overdue", "Action grace period", "days")}</div>
    </Panel>
  );
}

function Toggles({ title, items, defaults }: { title: string; items: string[]; defaults?: boolean[] }) {
  const [v, setV] = useState(defaults ?? items.map(() => true));
  return (
    <Panel title={title} actions={<Button size="sm" onClick={() => saved(title)}>Save</Button>}>
      <ul className="space-y-3">{items.map((it, i) => <li key={it} className="flex items-center justify-between gap-3 text-sm"><span>{it}</span><Switch aria-label={it} checked={v[i]} onCheckedChange={(x) => setV(v.map((y, j) => (j === i ? x : y)))} /></li>)}</ul>
    </Panel>
  );
}

function Audit() {
  const s = useRpos();
  const [q, setQ] = useState("");
  const rows = s.audit.filter((a) => `${a.actor} ${a.action} ${a.target}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Panel title={`Audit log (${rows.length})`} actions={<div className="flex gap-2"><Input aria-label="Search audit" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-48 text-xs" /><Button size="sm" variant="outline" onClick={() => downloadCsv("audit-log", rows.map((a) => ({ ...a })))}>Export</Button></div>} bodyClass="p-0 overflow-x-auto">
      <table className="w-full text-xs"><thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2">Event</th><th>Date</th><th>Actor</th><th>Action</th><th>Target</th><th>Project</th></tr></thead>
        <tbody>{rows.slice(0, 60).map((a) => <tr key={a.id} className="border-t"><td className="px-3 py-1.5 font-mono text-muted-foreground">{a.id}</td><td>{a.at}</td><td>{a.actor}</td><td>{a.action}</td><td className="font-mono">{a.target}</td><td>{a.projectId}</td></tr>)}</tbody>
      </table>
    </Panel>
  );
}
