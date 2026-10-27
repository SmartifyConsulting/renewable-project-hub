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

type EvidenceSource = { id: string; project_id: string; title: string; status: string };
type EvidenceLink = { project_id: string; domain_id: string; source_id: string };
type GateDecision = { id: number; project_id: string; decision: string; rationale: string; decided_at: string; snapshot_updated_at: string };
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
  const [projects, portfolios, memberships, assessments, gates, sources, links] = await Promise.all([
    supabase.from("projects").select("id,name,stage,portfolio_id").order("name"),
    supabase.from("portfolios").select("id,org_id"),
    supabase.from("organisation_memberships").select("organisation_id,role").eq("user_id", userId),
    readinessDb.from("readiness_domain_assessments")
      .select("project_id,domain_id,score,evidence_verified,hard_stop,evidence_notes"),
    readinessDb.from("readiness_gate_decisions").select("id,project_id,decision,rationale,decided_at,snapshot_updated_at").order("decided_at", { ascending: false }),
    readinessDb.from("rpos_knowledge_sources").select("id,project_id,title,status"),
    readinessDb.from("rpos_readiness_source_links").select("project_id,domain_id,source_id"),
  ]);
  const error = projects.error ?? portfolios.error ?? memberships.error ?? assessments.error ?? gates.error ?? sources.error ?? links.error;
  if (error) throw error;
  return {
    projects: (projects.data ?? []) as Project[],
    portfolios: (portfolios.data ?? []) as Portfolio[],
    memberships: (memberships.data ?? []) as Membership[],
    assessments: (assessments.data ?? []) as Assessment[],
    gates: (gates.data ?? []) as GateDecision[],
    sources: (sources.data ?? []) as EvidenceSource[],
    links: (links.data ?? []) as EvidenceLink[],
  };
}

function DomainEditor({ projectId, domain, record, canEdit, sources, links, onSaved }: {
  sources: EvidenceSource[]; links: EvidenceLink[];
  projectId: string; domain: (typeof DOMAINS)[number]; record?: Assessment | undefined;
  canEdit: boolean; onSaved: () => Promise<unknown>;
}) {
  const [score, setScore] = useState(record?.score == null ? "" : String(record.score));
  const [verified, setVerified] = useState(record?.evidence_verified ?? false);
  const [hardStop, setHardStop] = useState(record?.hard_stop ?? false);
  const [notes, setNotes] = useState(record?.evidence_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [sourceId, setSourceId] = useState("");
  async function linkSource() {
    if (!sourceId) return;
    setSaving(true);
    try {
      const { error } = await readinessDb.rpc("rpos_link_readiness_source", {p_project_id: projectId, p_domain_id: domain.id, p_source_id: sourceId});
      if (error) throw error;
      setSourceId(""); await onSaved(); toast.success("Verified evidence linked");
    } catch (error) { toast.error(mapRpcError(error)); }
    finally { setSaving(false); }
  }
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
      <div className="space-y-2 text-xs">
        <p className="font-medium">Verified source links ({links.length})</p>
        {links.map(link => <p key={link.source_id} className="text-muted-foreground">{sources.find(s => s.id === link.source_id)?.title ?? link.source_id}</p>)}
        {canEdit && <><select aria-label={`Link verified source to ${domain.id}`} className="w-full rounded-md border bg-background p-2" value={sourceId} onChange={e => setSourceId(e.target.value)}>
          <option value="">Choose verified source</option>
          {sources.filter(s => s.status === "verified" && !links.some(l => l.source_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select><Button size="sm" variant="outline" disabled={!sourceId || saving || !record} onClick={linkSource}>Link evidence</Button></>}
      </div>
      {canEdit && <Button size="sm" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</Button>}
    </div>
  );
}

function GatePanel({ projectId, canDecide, decisions, onSaved }: {
  projectId: string; canDecide: boolean; decisions: GateDecision[]; onSaved: () => Promise<unknown>;
}) {
  const [decision, setDecision] = useState("rejected");
  const [rationale, setRationale] = useState("");
  const [saving, setSaving] = useState(false);
  const latest = decisions[0];
  async function submit() {
    if (rationale.trim().length < 10) { toast.error("Provide at least ten characters of rationale."); return; }
    setSaving(true);
    try {
      const { error } = await readinessDb.rpc("rpos_decide_readiness_gate", {
        p_project_id: projectId, p_decision: decision, p_rationale: rationale.trim(),
      });
      if (error) throw error;
      setRationale("");
      await onSaved();
      toast.success("Human gate decision recorded");
    } catch (error) { toast.error(mapRpcError(error)); }
    finally { setSaving(false); }
  }
  return <div className="mt-5 space-y-3 rounded-lg border p-4">
    <h3 className="font-semibold">Human stage-gate decisions</h3>
    {latest ? <div className="text-sm">
      <p><strong>Latest decision:</strong> {latest.decision.replaceAll("_", " ")}</p>
      <p className="text-xs text-muted-foreground">Recorded {new Date(latest.decided_at).toLocaleString()}</p>
      <p className="mt-1 whitespace-pre-wrap">{latest.rationale}</p>
      <p className="mt-1 text-xs text-muted-foreground">Historical snapshot — reassess after any domain changes.</p>
    </div> : <p className="text-sm text-muted-foreground">No authorised decision recorded.</p>}
    {canDecide && <div className="space-y-2 border-t pt-3">
      <p className="text-xs text-muted-foreground">Only an organisation admin or director can record a decision. The server enforces evidence and scoring rules.</p>
      <select aria-label="Gate decision" className="rounded-md border bg-background px-3 py-2 text-sm"
        value={decision} onChange={(e) => setDecision(e.target.value)}>
        <option value="rejected">Reject</option>
        <option value="conditionally_approved">Conditionally approve</option>
        <option value="approved">Approve</option>
      </select>
      <Textarea aria-label="Decision rationale" value={rationale} maxLength={4000}
        placeholder="Record the decision rationale and conditions" onChange={(e) => setRationale(e.target.value)} />
      <Button disabled={saving} onClick={submit}>{saving ? "Recording…" : "Record human decision"}</Button>
    </div>}
  </div>;
}

function LiveReadiness() {
  const { user } = Route.useRouteContext();
  const signOut = useSignOut();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["readiness-live", user.id], queryFn: () => load(user.id) });
  const data = query.data;
  const [selectedProject, setSelectedProject] = useState<string>("");
  const visibleProjects = data?.projects.filter((p) => !selectedProject || p.id === selectedProject) ?? [];
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
        {data && data.projects.length > 0 && (
          <label className="block max-w-lg text-sm font-medium">Project
            <select aria-label="Filter readiness by project" className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              <option value="">All accessible projects</option>
              {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}
        {visibleProjects.map((project) => {
          const orgId = data!.portfolios.find((p) => p.id === project.portfolio_id)?.org_id;
          const canEdit = data!.memberships.some((m) => m.organisation_id === orgId && canWriteOrg(m.role));
          const canDecide = data!.memberships.some((m) => m.organisation_id === orgId && ["admin", "director"].includes(m.role));
          const records = data!.assessments.filter((a) => a.project_id === project.id);
          const completedCount = DOMAINS.filter((domain) => records.some((a) => a.domain_id === domain.id && a.score !== null)).length;
          const verifiedCount = DOMAINS.filter((domain) => records.some((a) => a.domain_id === domain.id && a.evidence_verified)).length;
          const hardStopCount = records.filter((a) => a.hard_stop).length;
          const assessment = evaluateReadiness(DOMAINS.map((domain) => {
            const found = records.find((a) => a.domain_id === domain.id);
            return { id: domain.id, weight: domain.weight, score: found?.score ?? null,
              evidenceVerified: found?.evidence_verified ?? false, hardStop: found?.hard_stop ?? false };
          }));
          return (
            <section key={project.id} className="rounded-lg border bg-card p-4">
              <h2 className="font-display text-lg font-semibold">{project.name}</h2>
              <p className="text-xs text-muted-foreground">Stage: {project.stage} · {canEdit ? "Editor" : "Read-only"}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3" aria-label="Assessment progress">
                <div className="rounded-md border p-3 text-sm"><strong>{completedCount}/14</strong><p className="text-xs text-muted-foreground">Domains scored</p></div>
                <div className="rounded-md border p-3 text-sm"><strong>{verifiedCount}/14</strong><p className="text-xs text-muted-foreground">Evidence flags verified</p></div>
                <div className="rounded-md border p-3 text-sm"><strong>{hardStopCount}</strong><p className="text-xs text-muted-foreground">Open hard stops</p></div>
              </div>
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
                    sources={data!.sources.filter(s => s.project_id === project.id)}
                    links={data!.links.filter(l => l.project_id === project.id && l.domain_id === domain.id)}
                    canEdit={canEdit}
                    onSaved={() => qc.invalidateQueries({ queryKey: ["readiness-live", user.id] })} />
                ))}
              </div>
              <GatePanel projectId={project.id} canDecide={canDecide}
                decisions={data!.gates.filter((g) => g.project_id === project.id)}
                onSaved={() => qc.invalidateQueries({ queryKey: ["readiness-live", user.id] })} />
            </section>
          );
        })}
      </main>
    </div>
  );
}
