import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { UserIdBadge, WorkspaceHeader } from "@/components/rpos/workspace-header";
import { canWriteOrg, mapRpcError, membershipState } from "@/lib/rpos/auth-config";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({
    meta: [
      { title: "Projects — RPOS Workspace" },
      { name: "description", content: "Portfolios and projects you are a member of." },
      { property: "og:title", content: "Projects — RPOS Workspace" },
      { property: "og:description", content: "Portfolios and projects you are a member of." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workspace,
});

type Portfolio = { id: string; org_id: string; name: string; description: string; owner: string; status: string; geography: string; technology: string };
type Project = { id: string; portfolio_id: string | null; name: string; technology: string; capacity: string; country: string; region: string; stage: string; status: string; budget: number; cod: string | null; objective: string };

const TECH = ["Solar PV", "Wind", "BESS", "Hybrid"];
const STATUS = ["Active", "On hold", "Closed"];

async function loadWorkspace(userId: string) {
  const [orgs, pms, portfolios, projects, orgNames] = await Promise.all([
    supabase.from("organisation_memberships").select("organisation_id, role").eq("user_id", userId),
    supabase.from("project_memberships").select("project_id, role").eq("user_id", userId),
    supabase.from("portfolios").select("id, org_id, name, description, owner, status, geography, technology").order("name"),
    supabase.from("projects").select("id, portfolio_id, name, technology, capacity, country, region, stage, status, budget, cod, objective").order("name"),
    supabase.from("organisations").select("id, name"),
  ]);
  const err = orgs.error ?? pms.error ?? portfolios.error ?? projects.error ?? orgNames.error;
  if (err) throw err;
  return {
    orgRoles: orgs.data ?? [],
    projectMemberships: pms.data?.length ?? 0,
    portfolios: (portfolios.data ?? []) as Portfolio[],
    projects: (projects.data ?? []) as Project[],
    orgs: orgNames.data ?? [],
  };
}

function Workspace() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["workspace", user.id], queryFn: () => loadWorkspace(user.id) });
  const [pfEdit, setPfEdit] = useState<Partial<Portfolio> | null>(null);
  const [prEdit, setPrEdit] = useState<Partial<Project> | null>(null);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const d = q.data;
  const writableOrgs = d ? d.orgRoles.filter((r) => canWriteOrg(r.role)).map((r) => r.organisation_id) : [];
  const writablePortfolios = d ? d.portfolios.filter((p) => writableOrgs.includes(p.org_id)) : [];
  const canEditProject = (p: Project) => writablePortfolios.some((pf) => pf.id === p.portfolio_id);
  const orgName = (id: string) => d?.orgs.find((o) => o.id === id)?.name ?? id;
  const pfName = (id: string | null) => d?.portfolios.find((p) => p.id === id)?.name ?? "—";
  const saved = () => qc.invalidateQueries({ queryKey: ["workspace", user.id] });

  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader email={user.email} onSignOut={signOut} />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-6">
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {q.error && <p role="alert" className="text-sm text-destructive">Could not load your workspace. Please try again.</p>}
        {d && membershipState(d.orgRoles.length, d.projectMemberships) === "no-membership" && (
          <div className="max-w-2xl rounded-lg border bg-card p-6">
            <h1 className="font-display text-lg font-semibold">No organisation membership yet</h1>
            <p className="mt-1 text-sm text-muted-foreground">You are signed in as <b className="text-foreground">{user.email}</b>, but your account has not been added to any organisation or project, so there are no records to show.</p>
            <UserIdBadge id={user.id} />
            <h2 className="mt-5 text-sm font-semibold">How to get access</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Copy your user ID above.</li>
              <li>Send it, with your email address, to an <b className="text-foreground">admin of your organisation's RPOS workspace</b> — usually your project director or RPOS lead.</li>
              <li>Tell them which organisation (and, if relevant, which projects) you need, and the role you expect: viewer, member, manager, director or admin.</li>
              <li>Once they add you, refresh this page.</li>
            </ol>
            <p className="mt-4 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
              Access can only be granted by an existing admin of that organisation. You cannot add yourself, and RPOS support cannot see your organisation's data. If your organisation has no RPOS admin yet, your organisation's appointed RPOS operator must set up the first admin.
            </p>
            <Link to="/" className="mt-3 inline-block text-xs text-primary hover:underline">Explore the demo (fictional data) meanwhile</Link>
          </div>
        )}
        {d && membershipState(d.orgRoles.length, d.projectMemberships) === "has-access" && (
          <>
            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h1 className="font-display text-2xl font-semibold">Portfolios</h1>
                  {writableOrgs.length === 0 && <p className="text-xs text-muted-foreground">Read-only: editing needs an admin, director or manager role.</p>}
                </div>
                {writableOrgs.length > 0 && <Button size="sm" onClick={() => setPfEdit({ org_id: writableOrgs[0] ?? "", status: "Active" })}><Plus className="size-4" /> New portfolio</Button>}
              </div>
              <Table heads={["Portfolio", "Organisation", "Owner", "Geography", "Status", ""]} empty={d.portfolios.length === 0}>
                {d.portfolios.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-semibold">{p.name}</td><td className="px-3 py-2">{orgName(p.org_id)}</td>
                    <td className="px-3 py-2">{p.owner}</td><td className="px-3 py-2">{p.geography}</td><td className="px-3 py-2">{p.status}</td>
                    <td className="px-3 py-2 text-right">{writableOrgs.includes(p.org_id) && <Button size="sm" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => setPfEdit(p)}><Pencil className="size-3.5" /></Button>}</td>
                  </tr>
                ))}
              </Table>
            </section>
            <section>
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-display text-2xl font-semibold">Projects</h2>
                {writablePortfolios.length > 0 && <Button size="sm" onClick={() => setPrEdit({ portfolio_id: writablePortfolios[0]?.id ?? "", technology: "Solar PV", status: "Active", country: "South Africa", stage: "Origination", budget: 0 })}><Plus className="size-4" /> New project</Button>}
              </div>
              <Table heads={["Project", "Portfolio", "Technology", "Capacity", "Location", "Stage", "Status", "COD", ""]} empty={d.projects.length === 0}>
                {d.projects.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-semibold">{p.name}</td><td className="px-3 py-2">{pfName(p.portfolio_id)}</td>
                    <td className="px-3 py-2">{p.technology}</td><td className="px-3 py-2">{p.capacity}</td>
                    <td className="px-3 py-2">{[p.region, p.country].filter(Boolean).join(", ")}</td>
                    <td className="px-3 py-2">{p.stage}</td><td className="px-3 py-2">{p.status}</td><td className="px-3 py-2">{p.cod ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{canEditProject(p) && <Button size="sm" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => setPrEdit(p)}><Pencil className="size-3.5" /></Button>}</td>
                  </tr>
                ))}
              </Table>
            </section>
          </>
        )}
      </main>
      {pfEdit && <PortfolioDialog value={pfEdit} orgs={writableOrgs.map((id) => [id, orgName(id)])} onClose={() => setPfEdit(null)} onSaved={saved} />}
      {prEdit && <ProjectDialog value={prEdit} portfolios={writablePortfolios.map((p) => [p.id, p.name])} onClose={() => setPrEdit(null)} onSaved={saved} />}
    </div>
  );
}

function Table({ heads, empty, children }: { heads: string[]; empty: boolean; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr>{heads.map((h, i) => <th key={i} className="px-3 py-2">{h}</th>)}</tr></thead>
        <tbody className="divide-y">{empty ? <tr><td colSpan={heads.length} className="px-3 py-6 text-center text-muted-foreground">Nothing here yet.</td></tr> : children}</tbody>
      </table>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-xs"><span className="font-semibold">{label}</span>{children}</label>;
}
function Choice({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[][]; label: string }) {
  return <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
}

function useSave(onClose: () => void, onSaved: () => void) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(fn: () => PromiseLike<{ error: unknown }>) {
    setBusy(true); setError("");
    const { error } = await fn();
    setBusy(false);
    if (error) return setError(mapRpcError(error));
    toast.success("Saved");
    onSaved(); onClose();
  }
  return { error, busy, run };
}

function PortfolioDialog({ value, orgs, onClose, onSaved }: { value: Partial<Portfolio>; orgs: string[][]; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState(value);
  const set = (k: keyof Portfolio) => (x: string) => setV({ ...v, [k]: x });
  const { error, busy, run } = useSave(onClose, onSaved);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{v.id ? "Edit portfolio" : "New portfolio"}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => supabase.rpc("rpos_upsert_portfolio", {
          p_id: (v.id ?? null) as string, p_org_id: v.org_id!, p_name: v.name ?? "", p_description: v.description ?? "",
          p_owner: v.owner ?? "", p_status: v.status ?? "Active", p_geography: v.geography ?? "", p_technology: v.technology ?? "" })); }}>
          <Field label="Organisation">{v.id ? <Input value={orgs.find(([id]) => id === v.org_id)?.[1] ?? v.org_id} disabled /> : <Choice label="Organisation" value={v.org_id ?? ""} onChange={set("org_id")} options={orgs} />}</Field>
          <Field label="Name"><Input value={v.name ?? ""} onChange={(e) => set("name")(e.target.value)} maxLength={200} /></Field>
          <Field label="Owner"><Input value={v.owner ?? ""} onChange={(e) => set("owner")(e.target.value)} maxLength={200} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Geography"><Input value={v.geography ?? ""} onChange={(e) => set("geography")(e.target.value)} maxLength={200} /></Field>
            <Field label="Status"><Choice label="Status" value={v.status ?? "Active"} onChange={set("status")} options={STATUS.map((s) => [s, s])} /></Field>
          </div>
          <Field label="Description"><Input value={v.description ?? ""} onChange={(e) => set("description")(e.target.value)} maxLength={2000} /></Field>
          <p role="alert" aria-live="polite" className="min-h-4 text-xs text-destructive">{error}</p>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDialog({ value, portfolios, onClose, onSaved }: { value: Partial<Project>; portfolios: string[][]; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState(value);
  const set = (k: keyof Project) => (x: string) => setV({ ...v, [k]: x });
  const { error, busy, run } = useSave(onClose, onSaved);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{v.id ? "Edit project" : "New project"}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => supabase.rpc("rpos_upsert_project", {
          p_id: (v.id ?? null) as string, p_portfolio_id: v.portfolio_id ?? "", p_name: v.name ?? "", p_technology: v.technology ?? "Solar PV",
          p_capacity: v.capacity ?? "", p_country: v.country ?? "", p_region: v.region ?? "", p_stage: v.stage ?? "",
          p_status: v.status ?? "Active", p_budget: Number(v.budget ?? 0), p_cod: (v.cod || null) as string, p_objective: v.objective ?? "" })); }}>
          <Field label="Portfolio"><Choice label="Portfolio" value={v.portfolio_id ?? ""} onChange={set("portfolio_id")} options={portfolios} /></Field>
          <Field label="Name"><Input value={v.name ?? ""} onChange={(e) => set("name")(e.target.value)} maxLength={200} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Technology"><Choice label="Technology" value={v.technology ?? "Solar PV"} onChange={set("technology")} options={TECH.map((t) => [t, t])} /></Field>
            <Field label="Capacity"><Input value={v.capacity ?? ""} onChange={(e) => set("capacity")(e.target.value)} placeholder="e.g. 75 MW" maxLength={50} /></Field>
            <Field label="Country"><Input value={v.country ?? ""} onChange={(e) => set("country")(e.target.value)} maxLength={100} /></Field>
            <Field label="Region"><Input value={v.region ?? ""} onChange={(e) => set("region")(e.target.value)} maxLength={100} /></Field>
            <Field label="Stage"><Input value={v.stage ?? ""} onChange={(e) => set("stage")(e.target.value)} maxLength={50} /></Field>
            <Field label="Status"><Choice label="Status" value={v.status ?? "Active"} onChange={set("status")} options={STATUS.map((s) => [s, s])} /></Field>
            <Field label="Budget"><Input type="number" min={0} value={String(v.budget ?? 0)} onChange={(e) => set("budget")(e.target.value)} /></Field>
            <Field label="Commercial operation date"><Input type="date" value={v.cod ?? ""} onChange={(e) => set("cod")(e.target.value)} /></Field>
          </div>
          <Field label="Objective"><Input value={v.objective ?? ""} onChange={(e) => set("objective")(e.target.value)} maxLength={2000} /></Field>
          <p role="alert" aria-live="polite" className="min-h-4 text-xs text-destructive">{error}</p>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
