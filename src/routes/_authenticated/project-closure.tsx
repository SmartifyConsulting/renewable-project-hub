import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkspaceHeader, useSignOut } from "@/components/rpos/workspace-header";
import { useActiveProject } from "@/lib/rpos/active-project";
import { supabase } from "@/integrations/supabase/client";
import { evaluateClosureReadiness } from "@/lib/rpos/closure-readiness";

export const Route = createFileRoute("/_authenticated/project-closure")({ component: ProjectClosure });
const db = supabase as any;

function ProjectClosure() {
 const { user } = Route.useRouteContext();
 const signOut = useSignOut();
 const [projectId, setProjectId] = useActiveProject();
 const [notes, setNotes] = useState("");
 const [evidence, setEvidence] = useState("");
 const [saving, setSaving] = useState(false);
 const [confirm, setConfirm] = useState(false);
 const qc = useQueryClient();
 const q = useQuery({ queryKey: ["rpos-closures", user.id], queryFn: async () => {
  const [projects, closures] = await Promise.all([
   supabase.from("projects").select("id,name").order("name"),
   db.from("rpos_project_closures").select("project_id,signed_at,signed_by,signoff_notes,evidence_reference")
  ]);
  if (projects.error || closures.error) throw projects.error ?? closures.error;
  return { projects: projects.data ?? [], closures: closures.data ?? [] };
 }});
 const project = q.data?.projects.find(p => p.id === projectId) ?? q.data?.projects[0];
 const closure = q.data?.closures.find((c: any) => c.project_id === project?.id);
 const checks = useQuery({
  queryKey: ["rpos-closure-preflight", project?.id],
  enabled: !!project?.id && !closure,
  queryFn: async () => {
   const id = project!.id;
   const [readiness, activation, delivery, inspections, ncrs, verifications, links] = await Promise.all([
    db.from("readiness_domain_assessments").select("score,hard_stop,evidence_verified").eq("project_id", id),
    db.from("rpos_activation_items").select("status").eq("project_id", id),
    db.from("rpos_delivery_schedule").select("id,status").eq("project_id", id),
    db.from("rpos_assurance_inspections").select("id,result").eq("project_id", id),
    db.from("rpos_assurance_ncrs").select("id,status").eq("project_id", id),
    db.from("rpos_assurance_verifications").select("ncr_id").eq("project_id", id),
    db.from("rpos_journey_links").select("source_type,source_id,target_type,target_id").eq("project_id", id)
   ]);
   const error = readiness.error ?? activation.error ?? delivery.error ?? inspections.error ?? ncrs.error ?? verifications.error ?? links.error;
   if (error) throw error;
   return evaluateClosureReadiness({
    assessments: readiness.data ?? [], activation: activation.data ?? [],
    delivery: delivery.data ?? [], inspections: inspections.data ?? [],
    ncrs: ncrs.data ?? [], verifications: verifications.data ?? [], links: links.data ?? []
   });
  }
 });
 async function signoff() {
  if (!project || saving || closure) return;
  setSaving(true);
  try {
   const { error } = await db.rpc("rpos_signoff_project_closure", {
    p_project_id: project.id, p_notes: notes.trim(), p_evidence_reference: evidence.trim()
   });
   if (error) throw error;
   await Promise.all([
    qc.invalidateQueries({ queryKey: ["rpos-closures", user.id] }),
    qc.invalidateQueries({ queryKey: ["rpos-project-journey", user.id] })
   ]);
   setConfirm(false);
   setNotes("");
   setEvidence("");
   toast.success("Project closure formally signed off.");
  } catch (e) {
   toast.error(e instanceof Error ? e.message : "Closure was not approved.");
  } finally { setSaving(false); }
 }
 return <div className="min-h-screen bg-background">
  <WorkspaceHeader email={user.email} onSignOut={signOut}/>
  <main className="mx-auto max-w-3xl space-y-6 px-5 py-6">
   <div><Link to="/project-overview" className="text-sm text-primary underline">Back to project overview</Link>
    <h1 className="mt-3 text-2xl font-semibold">Project closure & final sign-off</h1>
    <p className="text-sm text-muted-foreground">Formal closure is subject to database checks. Only an organisation administrator or director may approve it.</p>
   </div>
   {q.isLoading && <p>Loading closure records…</p>}
   {q.error && <p role="alert" className="text-destructive">Closure records unavailable. Check migration 0034 and your access.</p>}
   {q.data && <label className="block text-sm font-medium">Project
    <select className="mt-1 block w-full rounded-md border bg-background p-3" value={project?.id ?? ""} onChange={e => { setProjectId(e.target.value); setConfirm(false); setNotes(""); setEvidence(""); }}>
     {q.data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select></label>}
   {project && (closure ? <section className="space-y-3 rounded-lg border p-5">
    <h2 className="font-semibold">Closure signed off</h2>
    <p className="text-sm">Signed: {new Date(closure.signed_at).toLocaleString()}</p>
    <p className="text-sm">Evidence: {closure.evidence_reference}</p>
    <p className="whitespace-pre-wrap text-sm">{closure.signoff_notes}</p>
   </section> : <section className="space-y-4 rounded-lg border p-5">
    <h2 className="font-semibold">Request final sign-off</h2>
    <div className="space-y-2 rounded-md border p-4" aria-live="polite">
     <h3 className="font-medium">Closure readiness preview</h3>
     {checks.isLoading && <p className="text-sm">Checking project obligations…</p>}
     {checks.error && <p className="text-sm text-destructive">Unable to load readiness checks. Approval is disabled until checks can be reviewed.</p>}
     {checks.data && (checks.data.length ? <><p className="text-sm">{checks.data.length} potential blocker(s) identified:</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">{checks.data.map((issue, index) => <li key={index}>{issue.label} — <Link to={issue.to} className="text-primary underline">Resolve</Link></li>)}</ul></> :
      <p className="text-sm">No blockers found in the preliminary checks. Final approval remains subject to server-side governance rules.</p>)}
    </div>
    <p className="text-sm text-muted-foreground">The system checks incomplete activation and delivery activities, unresolved readiness gaps, inspection outcomes, assurance links and independent NCR verification. If any requirement fails, closure is refused and the reason is shown.</p>
    <label className="block space-y-1 text-sm font-medium">Evidence reference
     <input className="w-full rounded-md border bg-background p-3" value={evidence} onChange={e => setEvidence(e.target.value)} maxLength={1000} placeholder="Document ID, signed report reference or evidence URL"/>
    </label>
    <label className="block space-y-1 text-sm font-medium">Closure rationale
     <textarea className="min-h-32 w-full rounded-md border bg-background p-3" value={notes} onChange={e => setNotes(e.target.value)} maxLength={4000} placeholder="Explain the closure decision and evidence reviewed"/>
    </label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirm} onChange={e => setConfirm(e.target.checked)}/><span>I confirm I am authorised to sign off this project and have reviewed the supporting evidence. This action creates a formal, auditable closure record.</span></label>
    <Button disabled={saving || !confirm || checks.isLoading || !!checks.error || !checks.data || checks.data.length > 0 || evidence.trim().length < 5 || notes.trim().length < 20} onClick={signoff}>{saving ? "Checking…" : "Approve final project closure"}</Button>
   </section>)}
  </main>
 </div>;
}
