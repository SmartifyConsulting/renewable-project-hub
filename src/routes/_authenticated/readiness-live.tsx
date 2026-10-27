import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { DOMAINS } from "@/lib/rpos/config";
import { canWriteOrg, mapRpcError } from "@/lib/rpos/auth-config";
import { evaluateReadiness } from "@/lib/rpos/readiness-engine";
import { WorkspaceHeader, useSignOut } from "@/components/rpos/workspace-header";

export const Route = createFileRoute("/_authenticated/readiness-live")({ component: LiveReadiness });

type Assessment = {
  project_id: string; domain_id: string; score: number | null;
  evidence_verified: boolean; hard_stop: boolean; evidence_notes: string;
};
type Project = { id: string; name: string; stage: string; portfolio_id: string | null };
type Membership = { organisation_id: string; role: string };
type Portfolio = { id: string; org_id: string };

// The migration adds these relations; regenerate generated Supabase types after applying 0006.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readinessDb = supabase as any;

async function load(userId: string) {
  const [projects, portfolios, memberships, assessments] = await Promise.all([
    supabase.from("projects").select("id,name,stage,portfolio_id").order("name"),
    supabase.from("portfolios").select("id,org_id"),
    supabase.from("organisation_memberships").select("organisation_id,role").eq("user_id", userId),
    readinessDb.from("readiness_domain_assessments")
      .select("project_id,domain_id,score,evidence_verified,hard_stop,evidence_notes"),
  ]);
  const error = projects.error ?? portfolios.error ?? memberships.error ?? assessments.error;
  if (error) throw error;
  return {
    projects: (projects.data ?? []) as Project[],
    portfolios: (portfolios.data ?? []) as Portfolio[],
    memberships: (memberships.data ?? []) as Membership[],
    assessments: (assessments.data ?? []) as Assessment[],
  };
}

function DomainEditor({ projectId, domain, record, canEdit, onSaved }: {
  projectId: string; domain: (typeof DOMAINS)[number]; record?: Assessment;
  canEdit: boolean; onSaved: () => Promise<unknown>;
}) {
  const [score, setScore] = useState(record?.score == null ? "" : String(record.score));
  const [verified, setVerified] = useState(record?.evidence_verified ?? false);
  const [hardStop, setHardStop] = useState(record?.hard_stop ?? false);
  const [notes, setNotes] = useState(record?.evidence_notes ?? "");
  const [saving, setSaving] = useState(false);
  async function save() {
    const parsed = score === "" ? null : Number(score);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 5 || parsed * 2 % 1 !== 0)) {
      toast.error("Score must be between 0 and 5, in 0.5 steps.");
      return;
    }
    if (notes.length > 4000) { toast.error("Notes must be 4,000 characters or fewer."); return; }
    if (verified && !notes.trim()) { toast.error("Document the evidence reference before marking it verified."); return; }
    setSaving(true);
    try {
      const { error } = await readinessDb.rpc("rpos_save_readiness_domain", {
        p_project_id: projectId, p_domain_id: domain.id, p_score: parsed,
        p_evidence_verified: verified, p_hard_stop: hardStop, p_evidence_notes: notes,
      });
      if (error) throw error;
      await onSaved();
      toast.success(`${domain.id} saved and audited`);
    } catch (error) {
      toast.error(mapRpcError(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="grid gap-2 border-b py-3 md:grid-cols-[minmax(0,1fr)_7rem_1fr_auto] md:items-start">
      <div>
        <div className="text-sm font-semibold">{domain.id} · {domain.name}</div>
        <div className="text-xs text-muted-foreground">Weight {domain.weight}%</div>
      </div>
      <label className="text-xs">Score (0–5)
        <Input type="number" min={0} max={5} step={0.5} value={score}
          disabled={!canEdit || saving} onChange={(e) => setScore(e.target.value)} />
      </label>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={verified} disabled={!canEdit || saving} onCheckedChange={(v) => setVerified(v === true)} />
          Evidence verified
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={hardStop} disabled={!canEdit || saving} onCheckedChange={(v) => setHardStop(v === true)} />
          Mandatory hard stop
        </label>
        <Textarea aria-label={`Evidence notes for ${domain.name}`} placeholder="Evidence references, reviewer and rationale"
          rows={2} maxLength={4000} value={notes} disabled={!canEdit || saving}
          onChange={(e) => setNotes(e.target.value)} />
      </div>
      {canEdit && <Button size="sm" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</Button>}
    </div>
  );
}

function LiveReadiness() {
  const { user } = Route.useRouteContext();
  const signOut = useSignOut();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["readiness-live", user.id], queryFn: () => load(user.id) });
  const data = query.data;
  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader email={user.email} onSignOut={signOut} />
      <main className="mx-auto max-w-6xl space-y-5 px-5 py-6">
        <h1 className="font-display text-2xl font-semibold">Project readiness</h1>
        <p className="text-sm text-muted-foreground">
          Persistent domain assessments with audited edits. Recommendations are not stage-gate approvals.
          Evidence verification must be supported by reviewed source records.
        </p>
        {query.isLoading && <p className="text-sm">Loading assessments…</p>}
        {query.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          Could not load assessments. The readiness database migration may not yet be applied.
        </p>}
        {data && data.projects.length === 0 && <p className="rounded-md border p-4 text-sm">No accessible projects.</p>}
        {data?.projects.map((project) => {
          const orgId = data.portfolios.find((p) => p.id === project.portfolio_id)?.org_id;
          const canEdit = data.memberships.some((m) => m.organisation_id === orgId && canWriteOrg(m.role));
          const records = data.assessments.filter((a) => a.project_id === project.id);
          const assessment = evaluateReadiness(DOMAINS.map((domain) => {
            const found = records.find((a) => a.domain_id === domain.id);
            return { id: domain.id, weight: domain.weight, score: found?.score ?? null,
              evidenceVerified: found?.evidence_verified ?? false, hardStop: found?.hard_stop ?? false };
          }));
          return (
            <section key={project.id} className="rounded-lg border bg-card p-4">
              <h2 className="font-display text-lg font-semibold">{project.name}</h2>
              <p className="text-xs text-muted-foreground">Stage: {project.stage} · {canEdit ? "Editor" : "Read-only"}</p>
              <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                <strong>Recommendation: {assessment.result}</strong>
                <span className="ml-3">Weighted score: {assessment.overall === null ? "Incomplete" : `${assessment.overall}%`}</span>
                {assessment.reasons.map((reason) => <p key={reason} className="mt-1 text-xs text-muted-foreground">{reason}</p>)}
                <p className="mt-1 text-xs font-semibold">Human stage-gate approval is always required.</p>
              </div>
              <div className="mt-3">
                {DOMAINS.map((domain) => (
                  <DomainEditor key={`${project.id}:${domain.id}:${JSON.stringify(records.find((a) => a.domain_id === domain.id) ?? null)}`}
                    projectId={project.id} domain={domain}
                    record={records.find((a) => a.domain_id === domain.id)}
                    canEdit={canEdit}
                    onSaved={() => qc.invalidateQueries({ queryKey: ["readiness-live", user.id] })} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
