import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { membershipState } from "@/lib/rpos/auth-config";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({
    meta: [
      { title: "Projects — RPOS Workspace" },
      { name: "description", content: "Read-only register of projects you are a member of." },
      { property: "og:title", content: "Projects — RPOS Workspace" },
      { property: "og:description", content: "Read-only register of projects you are a member of." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workspace,
});

async function loadWorkspace(userId: string) {
  const [orgs, pms, projects] = await Promise.all([
    supabase.from("organisation_memberships").select("organisation_id, role").eq("user_id", userId),
    supabase.from("project_memberships").select("project_id, role").eq("user_id", userId),
    supabase.from("projects").select("id, name, technology, capacity, region, country, stage, status, cod").order("name"),
  ]);
  const err = orgs.error ?? pms.error ?? projects.error;
  if (err) throw err;
  return { orgCount: orgs.data?.length ?? 0, projectMemberships: pms.data?.length ?? 0, projects: projects.data ?? [] };
}

function Workspace() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["workspace", user.id], queryFn: () => loadWorkspace(user.id) });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center gap-3 border-b bg-card px-5">
        <span className="grid size-8 place-items-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">R</span>
        <span className="font-display text-sm font-bold">RPOS Workspace</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">Live · read-only</span>
        <span className="ml-auto text-xs text-muted-foreground">{user.email}</span>
        <Button size="sm" variant="outline" onClick={signOut}><LogOut className="size-4" /> Sign out</Button>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">
        <h1 className="font-display text-2xl font-semibold">Projects</h1>
        <p className="mb-4 text-sm text-muted-foreground">Records you can see through your organisation or project membership.</p>
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {q.error && <p role="alert" className="text-sm text-destructive">Could not load your workspace. Please try again.</p>}
        {q.data && membershipState(q.data.orgCount, q.data.projectMemberships) === "no-membership" && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">No organisation membership</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your account is signed in but has not been added to any organisation or project. Ask your organisation administrator to grant access.</p>
            <Link to="/" className="mt-3 inline-block text-xs text-primary hover:underline">Explore the demo meanwhile</Link>
          </div>
        )}
        {q.data && membershipState(q.data.orgCount, q.data.projectMemberships) === "has-access" && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground">
                <tr>{["Project", "Technology", "Capacity", "Location", "Stage", "Status", "COD"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {q.data.projects.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No projects yet.</td></tr>}
                {q.data.projects.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-semibold">{p.name}</td>
                    <td className="px-3 py-2">{p.technology}</td>
                    <td className="px-3 py-2">{p.capacity}</td>
                    <td className="px-3 py-2">{[p.region, p.country].filter(Boolean).join(", ")}</td>
                    <td className="px-3 py-2">{p.stage}</td>
                    <td className="px-3 py-2">{p.status}</td>
                    <td className="px-3 py-2">{p.cod ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
