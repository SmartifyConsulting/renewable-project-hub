import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { MEMBER_ROLES, mapRpcError, parseUserId } from "@/lib/rpos/auth-config";
import { UserIdBadge, WorkspaceHeader, useSignOut } from "@/components/rpos/workspace-header";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({
    meta: [
      { title: "Members — RPOS Workspace" },
      { name: "description", content: "Manage organisation and project membership." },
      { property: "og:title", content: "Members — RPOS Workspace" },
      { property: "og:description", content: "Manage organisation and project membership." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Members,
});

type Scope = { kind: "org" | "project"; id: string; name: string };

async function load(userId: string) {
  const [mine, orgs, orgMembers, projects, portfolios, projMembers] = await Promise.all([
    supabase.from("organisation_memberships").select("organisation_id, role").eq("user_id", userId),
    supabase.from("organisations").select("id, name").order("name"),
    supabase.from("organisation_memberships").select("organisation_id, user_id, role, created_at").order("created_at"),
    supabase.from("projects").select("id, name, portfolio_id").order("name"),
    supabase.from("portfolios").select("id, org_id"),
    supabase.from("project_memberships").select("project_id, user_id, role, created_at").order("created_at"),
  ]);
  const err = mine.error ?? orgs.error ?? orgMembers.error ?? projects.error ?? portfolios.error ?? projMembers.error;
  if (err) throw err;
  const adminOrgs = (mine.data ?? []).filter((m) => m.role === "admin").map((m) => m.organisation_id);
  const projOrg = (pid: string | null) => portfolios.data?.find((p) => p.id === pid)?.org_id;
  return {
    adminOrgs,
    orgs: orgs.data ?? [],
    orgMembers: orgMembers.data ?? [],
    projects: (projects.data ?? []).map((p) => ({ ...p, org_id: projOrg(p.portfolio_id) })),
    projMembers: projMembers.data ?? [],
  };
}

function Members() {
  const { user } = Route.useRouteContext();
  const signOut = useSignOut();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["members", user.id], queryFn: () => load(user.id) });
  const d = q.data;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["members", user.id] }); qc.invalidateQueries({ queryKey: ["workspace", user.id] }); };

  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader email={user.email} onSignOut={signOut} />
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">Organisation admins can add existing accounts, change roles and remove access. Every change is recorded in the audit history.</p>
          <div className="mt-3 rounded-md border bg-card p-3 text-xs text-muted-foreground">
            <b className="text-foreground">How to add someone:</b> the person signs in to RPOS once, copies the user ID shown on their screen, and sends it to you. Paste it below.
            Email invitations are not available yet. You cannot change your own role — ask another admin.
            <UserIdBadge id={user.id} />
          </div>
        </div>
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {q.error && <p role="alert" className="text-sm text-destructive">Could not load members.</p>}
        {d && d.adminOrgs.length === 0 && <p className="rounded-md border bg-card p-4 text-sm">You are not an admin of any organisation, so you can view but not manage members.</p>}
        {d && d.orgs.map((o) => {
          const isAdmin = d.adminOrgs.includes(o.id);
          return (
            <section key={o.id} className="space-y-4 rounded-lg border bg-card p-4">
              <MemberList scope={{ kind: "org", id: o.id, name: o.name }} rows={d.orgMembers.filter((m) => m.organisation_id === o.id)} me={user.id} canManage={isAdmin} onChange={refresh} />
              {d.projects.filter((p) => p.org_id === o.id).map((p) => (
                <div key={p.id} className="ml-4 border-l pl-4">
                  <MemberList scope={{ kind: "project", id: p.id, name: p.name }} rows={d.projMembers.filter((m) => m.project_id === p.id)} me={user.id} canManage={isAdmin} onChange={refresh} />
                </div>
              ))}
            </section>
          );
        })}
      </main>
    </div>
  );
}

function MemberList({ scope, rows, me, canManage, onChange }: { scope: Scope; rows: { user_id: string; role: string }[]; me: string; canManage: boolean; onChange: () => void }) {
  const [newId, setNewId] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    setBusy(true); setError("");
    const { error } = await fn();
    setBusy(false);
    if (error) return setError(mapRpcError(error));
    toast.success(ok); onChange();
  }
  const setRole = (userId: string, role: string) => call(() => scope.kind === "org"
    ? supabase.rpc("rpos_set_org_membership", { p_org_id: scope.id, p_user_id: userId, p_role: role })
    : supabase.rpc("rpos_set_project_membership", { p_project_id: scope.id, p_user_id: userId, p_role: role }), "Role saved");
  const remove = (userId: string) => {
    if (!window.confirm("Remove this person's access?")) return;
    call(() => scope.kind === "org"
      ? supabase.rpc("rpos_remove_org_membership", { p_org_id: scope.id, p_user_id: userId })
      : supabase.rpc("rpos_remove_project_membership", { p_project_id: scope.id, p_user_id: userId }), "Access removed");
  };
  function add(e: React.FormEvent) {
    e.preventDefault();
    const id = parseUserId(newId);
    if (!id) return setError("Enter a valid user ID (looks like 3f2504e0-4f89-11d3-9a0c-0305e82c3301).");
    setRole(id, newRole);
    setNewId("");
  }

  return (
    <div>
      <h2 className="font-display text-sm font-semibold">{scope.kind === "org" ? "Organisation" : "Project"}: {scope.name}</h2>
      <ul className="mt-2 divide-y text-xs">
        {rows.length === 0 && <li className="py-2 text-muted-foreground">No direct members.</li>}
        {rows.map((r) => (
          <li key={r.user_id} className="flex items-center gap-2 py-1.5">
            <code className="flex-1 truncate font-mono">{r.user_id}{r.user_id === me && " (you)"}</code>
            {canManage && r.user_id !== me ? (
              <>
                <select aria-label="Role" value={r.role} disabled={busy} onChange={(e) => setRole(r.user_id, e.target.value)} className="h-7 rounded border bg-background px-1">
                  {MEMBER_ROLES.map((x) => <option key={x}>{x}</option>)}
                </select>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(r.user_id)}>Remove</Button>
              </>
            ) : <span className="rounded bg-muted px-1.5 py-0.5">{r.role}</span>}
          </li>
        ))}
      </ul>
      {canManage && (
        <form onSubmit={add} className="mt-2 flex gap-2">
          <Input aria-label={`User ID to add to ${scope.name}`} placeholder="Paste user ID" value={newId} onChange={(e) => setNewId(e.target.value)} className="h-8 text-xs" />
          <select aria-label="New member role" value={newRole} onChange={(e) => setNewRole(e.target.value)} className="h-8 rounded border bg-background px-1 text-xs">
            {MEMBER_ROLES.map((x) => <option key={x}>{x}</option>)}
          </select>
          <Button size="sm" type="submit" disabled={busy}>Add</Button>
        </form>
      )}
      <p role="alert" aria-live="polite" className="min-h-4 text-xs text-destructive">{error}</p>
    </div>
  );
}
