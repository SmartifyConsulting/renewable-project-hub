import { useActiveProject } from "@/lib/rpos/active-project";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { mapRpcError } from "@/lib/rpos/auth-config";
import { WorkspaceHeader, useSignOut } from "@/components/rpos/workspace-header";
import { KnowledgeSubnav } from "@/components/rpos/knowledge-subnav";

export const Route = createFileRoute("/_authenticated/knowledge-live")({ component: KnowledgePage });
// Database types must be regenerated after migration 0008.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
type Source = { id: string; project_id: string; title: string; source_type: string; source_uri: string; status: string; description: string; review_notes: string; created_by: string; created_at: string };
type Project = { id: string; name: string; portfolio_id: string | null };
type Membership = { organisation_id: string; role: string };
async function load(userId: string) {
  const [projects, portfolios, memberships, sources] = await Promise.all([
    supabase.from("projects").select("id,name,portfolio_id").order("name"),
    supabase.from("portfolios").select("id,org_id"),
    supabase.from("organisation_memberships").select("organisation_id,role").eq("user_id",userId),
    db.from("rpos_knowledge_sources").select("id,project_id,title,source_type,source_uri,status,description,review_notes,created_by,created_at").order("created_at",{ascending:false}),
  ]);
  const error = projects.error ?? portfolios.error ?? memberships.error ?? sources.error;
  if(error) throw error;
  return { projects:(projects.data??[]) as Project[], portfolios:(portfolios.data??[]) as {id:string;org_id:string}[], memberships:(memberships.data??[]) as Membership[], sources:(sources.data??[]) as Source[] };
}
function KnowledgePage() {
  const { user } = Route.useRouteContext();
  const signOut = useSignOut();
  const qc = useQueryClient();
  const query = useQuery({queryKey:["knowledge",user.id],queryFn:()=>load(user.id)});
  const [projectId,setProjectId]=useActiveProject();
  const [title,setTitle] = useState("");
  const [type,setType] = useState("document");
  const [uri,setUri] = useState("");
  const [description,setDescription] = useState("");
  const [document,setDocument] = useState<File|null>(null);
  const [saving,setSaving] = useState(false);
  const [reviewing,setReviewing] = useState<string|null>(null);
  const [reviewNotes,setReviewNotes] = useState("");
  const [reviewStatus,setReviewStatus] = useState("verified");
  const data = query.data;
  const selected = projectId || data?.projects[0]?.id || "";
  const org = data?.portfolios.find(p=>p.id===data.projects.find(x=>x.id===selected)?.portfolio_id)?.org_id;
  const roles = data?.memberships.filter(m=>m.organisation_id===org).map(m=>m.role)??[];
  const canWrite = roles.some(r=>["admin","director","manager"].includes(r));
  const canReview = roles.some(r=>["admin","director"].includes(r));
  const refresh = ()=>qc.invalidateQueries({queryKey:["knowledge",user.id]});
  async function register() {
    if(!selected || title.trim().length<3 || (!uri.trim() && !document)) {toast.error("Select a project, title and source reference or file.");return;}
    if(document && (document.size>26214400 || !["application/pdf","text/plain","text/csv","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(document.type))) {toast.error("Unsupported document format or file larger than 25 MiB.");return;}
    setSaving(true);
    try {
      let sourceUri=uri.trim();
      if(document){
        const extension=document.name.split(".").pop()?.toLowerCase() ?? "bin";
        const objectPath=`${selected}/${user.id}/${crypto.randomUUID()}.${extension}`;
        const {error:uploadError}=await supabase.storage.from("rpos-knowledge").upload(objectPath,document,{contentType:document.type,upsert:false});
        if(uploadError) throw uploadError;
        sourceUri=`storage:rpos-knowledge/${objectPath}`;
      }
      const {error}=await db.rpc("rpos_register_knowledge_source",{p_project_id:selected,p_title:title,p_source_type:type,p_source_uri:sourceUri,p_description:description});
      if(error) throw error;
      setTitle("");setUri("");setDescription("");setDocument(null);await refresh();toast.success("Source registered");
    } catch(e) {toast.error(mapRpcError(e));} finally {setSaving(false);}
  }
  async function openSource(source:Source) {
    if(!source.source_uri.startsWith("storage:rpos-knowledge/")) {toast.info("External source reference: "+source.source_uri);return;}
    const objectPath=source.source_uri.slice("storage:rpos-knowledge/".length);
    const {data,error}=await supabase.storage.from("rpos-knowledge").createSignedUrl(objectPath,60);
    if(error || !data?.signedUrl){toast.error(mapRpcError(error));return;}
    window.open(data.signedUrl,"_blank","noopener,noreferrer");
  }
  async function review(id:string) {
    if(reviewNotes.trim().length<10){toast.error("Review rationale must contain at least 10 characters.");return;}
    setSaving(true);
    try {
      const {error}=await db.rpc("rpos_review_knowledge_source",{p_source_id:id,p_status:reviewStatus,p_notes:reviewNotes});
      if(error) throw error;
      setReviewing(null);setReviewNotes("");await refresh();toast.success("Evidence review recorded");
    } catch(e) {toast.error(mapRpcError(e));} finally {setSaving(false);}
  }
  return <div className="min-h-screen bg-background">
    <WorkspaceHeader email={user.email} onSignOut={signOut}/>
    <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
      <h1 className="font-display text-2xl font-semibold">Knowledge Intelligence</h1>
      <KnowledgeSubnav/>
      <p className="text-sm text-muted-foreground">Register project evidence, manage independent reviews and establish a traceable source inventory. Private document upload and evidence review are available. Automated extraction is not yet enabled.</p>
      {query.isLoading && <p>Loading knowledge sources…</p>}
      {query.error && <p role="alert" className="text-destructive">Knowledge registry unavailable. Apply migration 0008 to the database.</p>}
      {data && <><label className="block max-w-xl text-sm">Project
        <select className="mt-1 w-full rounded-md border bg-background p-2" value={selected} onChange={e=>setProjectId(e.target.value)}>
          {data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      {canWrite && <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Register a knowledge source</h2>
        <Input aria-label="Source title" placeholder="Document or source title" value={title} maxLength={300} onChange={e=>setTitle(e.target.value)}/>
        <select aria-label="Source type" className="rounded-md border bg-background p-2" value={type} onChange={e=>setType(e.target.value)}>
          {["document","permit","contract","report","dataset","correspondence","other"].map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <Input aria-label="Source reference" placeholder="Document ID, repository path or source URL" value={uri} maxLength={2000} disabled={!!document} onChange={e=>setUri(e.target.value)}/>
        <label className="block text-sm">Or upload a private document (PDF, TXT, CSV, DOCX, XLSX; maximum 25 MiB)
          <Input type="file" accept=".pdf,.txt,.csv,.docx,.xlsx" className="mt-1" onChange={e=>setDocument(e.target.files?.[0]??null)}/>
        </label>
        <Textarea aria-label="Source description" placeholder="Source context" value={description} maxLength={4000} onChange={e=>setDescription(e.target.value)}/>
        <Button disabled={saving || !selected} onClick={register}>{saving?"Saving…":"Register source"}</Button>
      </section>}
      <section className="space-y-3">
        <h2 className="font-semibold">Source inventory</h2>
        {data.sources.filter(s=>s.project_id===selected).length===0 && <p className="text-sm text-muted-foreground">No sources registered for this project.</p>}
        {data.sources.filter(s=>s.project_id===selected).map(s=><article key={s.id} className="space-y-2 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong>{s.title}</strong><span className="text-xs uppercase">{s.status.replaceAll("_"," ")}</span></div>
          <p className="text-xs text-muted-foreground">{s.source_type} · {s.source_uri}</p>
          {s.source_uri.startsWith("storage:rpos-knowledge/") && <Button size="sm" variant="outline" onClick={()=>openSource(s)}>Open private document</Button>}
          {s.description && <p className="text-sm">{s.description}</p>}
          {s.review_notes && <p className="text-xs">Review: {s.review_notes}</p>}
          {canReview && s.created_by!==user.id && <div className="space-y-2">
            <Button size="sm" variant="outline" onClick={()=>setReviewing(reviewing===s.id?null:s.id)}>Review evidence</Button>
            {reviewing===s.id && <div className="space-y-2">
              <select aria-label="Review status" className="rounded-md border bg-background p-2" value={reviewStatus} onChange={e=>setReviewStatus(e.target.value)}>
                {["in_review","verified","rejected","superseded"].map(t=><option key={t} value={t}>{t.replaceAll("_"," ")}</option>)}
              </select>
              <Textarea aria-label="Review rationale" value={reviewNotes} maxLength={4000} onChange={e=>setReviewNotes(e.target.value)} placeholder="Review findings and rationale"/>
              <Button disabled={saving} onClick={()=>review(s.id)}>Save review</Button>
            </div>}
          </div>}
        </article>)}
      </section></>}
    </main>
  </div>;
}
