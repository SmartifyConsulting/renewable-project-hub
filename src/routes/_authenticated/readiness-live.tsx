import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DOMAINS } from "@/lib/rpos/config";
import { WorkspaceHeader, useSignOut } from "@/components/rpos/workspace-header";

export const Route = createFileRoute("/_authenticated/readiness-live")({
  component: LiveReadiness,
});

async function load() {
  const { data, error } = await supabase.from("projects").select("id,name,stage").order("name");
  if (error) throw error;
  return data ?? [];
}

function LiveReadiness() {
  const { user } = Route.useRouteContext();
  const signOut = useSignOut();
  const query = useQuery({ queryKey: ["readiness-projects", user.id], queryFn: load });
  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader email={user.email} onSignOut={signOut} />
      <main className="mx-auto max-w-6xl space-y-5 px-5 py-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Project readiness</h1>
          <p className="text-sm text-muted-foreground">
            Live, permission-scoped projects. Assessment scores and gate approvals will appear only when recorded and verified.
          </p>
        </div>
        {query.isLoading && <p className="text-sm text-muted-foreground">Loading projects…</p>}
        {query.error && <p role="alert" className="text-sm text-destructive">Unable to load projects.</p>}
        {query.data && query.data.length === 0 && (
          <p className="rounded-lg border p-4 text-sm">No accessible projects yet.</p>
        )}
        {query.data?.map((project) => (
          <section key={project.id} className="rounded-lg border bg-card p-4">
            <h2 className="font-display text-lg font-semibold">{project.name}</h2>
            <p className="text-xs text-muted-foreground">Stage: {project.stage}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Assessment pending. No evidence-backed readiness recommendation or authorised gate decision is available.
            </p>
          </section>
        ))}
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-display font-semibold">Fourteen readiness domains</h2>
          <p className="mb-3 text-xs text-muted-foreground">Reference weights, not assessed scores.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DOMAINS.map((domain) => (
              <div key={domain.id} className="flex justify-between gap-3 border-b py-1 text-xs">
                <span><span className="mr-2 font-mono text-muted-foreground">{domain.id}</span>{domain.name}</span>
                <strong className="shrink-0">{domain.weight}%</strong>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
