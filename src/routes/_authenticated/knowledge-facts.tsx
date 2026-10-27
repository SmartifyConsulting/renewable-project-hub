import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceHeader, useSignOut } from "@/components/rpos/workspace-header";
import { mapRpcError } from "@/lib/rpos/auth-config";
import { parseCandidateFacts } from "@/lib/rpos/knowledge-extraction";
import { extractPdfCandidates } from "@/lib/rpos/pdf-extract.functions";

export const Route = createFileRoute("/_authenticated/knowledge-facts")({component: FactsPage});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
type Fact={id:string;project_id:string;source_id:string;fact_key:string;fact_value:string;excerpt:string;review_status:string;created_by:string};
type Source={id:string;project_id:string;title:string;source_uri:string;status:string};
type Conflict={project_id:string;fact_key:string;value_a:string;value_b:string;source_a_id:string;source_b_id:string};
async function load(userId:string){
 const [projects,portfolios,memberships,sources,facts,conflicts]=await Promise.all([
  supabase.from("projects").select("id,name,portfolio_id").order("name"),
  supabase.from("portfolios").select("id,org_id"),
  supabase.from("organisation_memberships").select("organisation_id,role").eq("user_id",userId),
  db.from("rpos_knowledge_sources").select("id,project_id,title,source_uri,status"),
  db.from("rpos_source_facts").select("id,project_id,source_id,fact_key,fact_value,excerpt,review_status,created_by").order("created_at",{ascending:false}),
  db.from("rpos_fact_conflicts").select("project_id,fact_key,value_a,value_b,source_a_id,source_b_id"),
 ]);
 const error=projects.error??portfolios.error??memberships.error??sources.error??facts.error??conflicts.error;
 if(error) throw error;
 return {projects:projects.data??[],portfolios:portfolios.data??[],memberships:memberships.data??[],
 sources:(sources.data??[]) as Source[],facts:(facts.data??[]) as Fact[],conflicts:(conflicts.data??[]) as Conflict[]};
}
function FactsPage(){
 const {user}=Route.useRouteContext();
 const signOut=useSignOut();
 const qc=useQueryClient();
 const query=useQuery({queryKey:["knowledge-facts",user.id],queryFn:()=>load(user.id)});
 const [projectId,setProjectId]=useState("");
 const [sourceId,setSourceId]=useState("");
 const [key,setKey]=useState("");
 const [value,setValue]=useState("");
 const [excerpt,setExcerpt]=useState("");
 const [batch,setBatch]=useState("");
 const [importName,setImportName]=useState("");
 const [statusFilter,setStatusFilter]=useState("all");
 const [search,setSearch]=useState("");
 const [reviewId,setReviewId]=useState("");
 const [reviewNotes,setReviewNotes]=useState("");
 const [saving,setSaving]=useState(false);
 const [extracting,setExtracting]=useState(false);
 const data=query.data;
 const selected=projectId||data?.projects[0]?.id||"";
 const sources=data?.sources.filter(s=>s.project_id===selected)??[];
 const activeSource=sources.some(s=>s.id===sourceId)?sourceId:(sources[0]?.id??"");
 const selectedSource=sources.find(s=>s.id===activeSource);
 const org=data?.portfolios.find(p=>p.id===data.projects.find(x=>x.id===selected)?.portfolio_id)?.org_id;
 const roles=data?.memberships.filter(m=>m.organisation_id===org).map(m=>m.role)??[];
 const visibleFacts=(data?.facts??[]).filter(f=>f.project_id===selected&&(statusFilter==="all"||f.review_status===statusFilter)&&(!search.trim()||[f.fact_key,f.fact_value,f.excerpt,sources.find(x=>x.id===f.source_id)?.title??""].some(v=>v.toLowerCase().includes(search.toLowerCase().trim()))));
 const canWrite=roles.some(r=>["admin","director","manager"].includes(r));
 const canReview=roles.some(r=>["admin","director"].includes(r));
 const refresh=()=>qc.invalidateQueries({queryKey:["knowledge-facts",user.id]});
 async function saveFact(factKey:string,factValue:string,method:"manual"|"text_pattern",sourceExcerpt:string){
  const {error}=await db.rpc("rpos_record_source_fact",{p_source_id:activeSource,p_fact_key:factKey,p_fact_value:factValue,p_excerpt:sourceExcerpt,p_method:method});
  if(error) throw error;
 }
 async function readTextFile(file:File|null){
  if(!file)return;
  if(!/\.(txt|csv)$/i.test(file.name)||file.size>2097152){toast.error("Choose a TXT or CSV file under 2 MiB.");return;}
  try{
   const content=await file.text();
   const rows=parseCandidateFacts(content);
   if(!rows.length){toast.error("No valid Key: Value candidates found.");return;}
   setBatch(rows.map(row=>row.excerpt).join("\n"));setImportName(file.name);
   toast.info("Review the extracted text before submitting candidates.");
  }catch{toast.error("File could not be read.");}
 }
 async function extractPdf(){
  if(!selectedSource?.source_uri.toLowerCase().endsWith(".pdf")){toast.error("Select a registered PDF source.");return;}
  setExtracting(true);
  try{
   const {data:session}=await supabase.auth.getSession();
   if(!session.session?.access_token)throw new Error("Please sign in again.");
   const result=await extractPdfCandidates({data:{source_id:activeSource},headers:{Authorization:"Bearer "+session.session.access_token}});
   if(result.source_id!==activeSource)throw new Error("Source changed during extraction.");
   if(!result.candidates.length){toast.info("No supported factual candidates found.");return;}
   const rows=result.candidates.map(c=>c.key+": "+c.value);
   setBatch(rows.join("\n"));setImportName("AI draft from "+selectedSource.title);
   toast.info("AI suggestions require checking against the original PDF and independent review. Page and excerpt references are not yet saved with bulk candidates.");
  }catch(e){toast.error(mapRpcError(e));}finally{setExtracting(false);}
 }
 async function submit(){
  if(!activeSource){toast.error("Select a source first.");return;}
  setSaving(true);
  try{
   if(batch.trim()){
    const candidates=parseCandidateFacts(batch,51);
    if(candidates.length===0||candidates.length>50) throw new Error("Provide 1–50 lines in Key: Value format.");
    for(const c of candidates) await saveFact(c.key,c.value,"text_pattern",c.excerpt);
    setBatch("");
    toast.success(`${candidates.length} candidate facts saved for independent review`);
   }else{
    if(key.trim().length<2||!value.trim()) throw new Error("Provide a fact key and value.");
    await saveFact(key,value,"manual",excerpt);
    setKey("");setValue("");setExcerpt("");toast.success("Candidate fact recorded");
   }
   await refresh();
  }catch(e){toast.error(mapRpcError(e));}finally{setSaving(false);}
 }
 async function review(id:string,status:"accepted"|"rejected"){
  if(reviewNotes.trim().length<10){toast.error("Provide at least 10 characters of review rationale.");return;}
  setSaving(true);
  try{
   const {error}=await db.rpc("rpos_review_source_fact",{p_fact_id:id,p_status:status,p_notes:reviewNotes});
   if(error) throw error;
   setReviewId("");setReviewNotes("");await refresh();toast.success("Fact review recorded");
  }catch(e){toast.error(mapRpcError(e));}finally{setSaving(false);}
 }
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/>
  <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
   <h1 className="text-2xl font-semibold">Knowledge facts & contradictions</h1>
   <p className="text-sm text-muted-foreground">Capture evidence-backed facts manually or stage simple Key: Value lines from extracted text. These are untrusted candidates until independently accepted. Conflicts are potential contradictions, not automatic findings.</p>
   {query.isLoading&&<p>Loading facts…</p>}
   {query.error&&<p role="alert" className="text-destructive">Fact registry unavailable. Apply SQL migration 0011.</p>}
   {data&&<><label className="block text-sm">Project
    <select className="ml-2 rounded border bg-background p-2" value={selected} onChange={e=>{setProjectId(e.target.value);setSourceId("");}}>
     {data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select></label>
    <label className="block text-sm">Evidence source
     <select className="ml-2 max-w-full rounded border bg-background p-2" value={activeSource} onChange={e=>setSourceId(e.target.value)}>
      {sources.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
     </select></label>
    {selectedSource&&<div className="rounded border p-3 text-sm"><strong>Selected evidence:</strong> {selectedSource.title} · Source review: <strong>{selectedSource.status.replaceAll("_"," ")}</strong><p className="mt-1 break-all text-xs text-muted-foreground">{selectedSource.source_uri}</p><p className="mt-1 text-xs text-muted-foreground">Fact acceptance is independent of source verification. Both must be checked before relying on evidence.</p></div>}
    {canWrite&&<section className="space-y-2 rounded-lg border p-4">
     <h2 className="font-semibold">Stage facts for review</h2>
     {selectedSource?.source_uri.toLowerCase().endsWith(".pdf")&&<Button variant="outline" disabled={extracting||saving} onClick={extractPdf}>{extracting?"Extracting PDF…":"Suggest facts from registered PDF (AI)"}</Button>}
     <Input aria-label="Fact key" placeholder="Fact name (e.g. Grid connection capacity)" value={key} onChange={e=>setKey(e.target.value)}/>
     <Input aria-label="Fact value" placeholder="Fact value" value={value} onChange={e=>setValue(e.target.value)}/>
     <Textarea aria-label="Supporting excerpt" placeholder="Verbatim source excerpt and page reference" value={excerpt} maxLength={4000} onChange={e=>setExcerpt(e.target.value)}/>
     <p className="text-xs text-muted-foreground">Alternatively paste up to 50 lines of Key: Value text below. Only lines with a colon are staged. PDF and Word parsing are not yet supported.</p>
     <label className="block text-sm">Import text candidates (TXT/CSV, up to 2 MiB)<Input type="file" accept=".txt,.csv" onChange={e=>readTextFile(e.target.files?.[0]??null)}/></label>
     {importName&&<p className="text-xs text-muted-foreground">Draft extracted from {importName}. Verify against the registered source before saving.</p>}
     <Textarea aria-label="Bulk key value lines" placeholder={"Capacity: 150 MW\nConnection voltage: 132 kV"} value={batch} onChange={e=>setBatch(e.target.value)}/>
     <Button disabled={saving||!activeSource} onClick={submit}>{saving?"Saving…":"Save candidate facts"}</Button>
    </section>}
    <section className="space-y-2"><h2 className="font-semibold">Candidate and reviewed facts</h2>
     <div className="flex flex-wrap gap-3"><Input className="max-w-sm" aria-label="Search facts" placeholder="Search facts, values or sources" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter fact review status" className="rounded border bg-background p-2 text-sm" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending review</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select></div>
     <p className="text-xs text-muted-foreground">{visibleFacts.length} matching facts · {(data.facts??[]).filter(f=>f.project_id===selected&&f.review_status==="pending").length} awaiting independent review</p>
     {visibleFacts.map(f=><article key={f.id} className="space-y-2 rounded border p-3 text-sm">
      <div className="flex justify-between gap-2"><strong>{f.fact_key}: {f.fact_value}</strong><span className="text-xs">{f.review_status}</span></div>
      <p className="text-xs text-muted-foreground">Source: {sources.find(s=>s.id===f.source_id)?.title??f.source_id} · Source review: {sources.find(s=>s.id===f.source_id)?.status??"unknown"}</p>
      {f.excerpt&&<p className="text-xs">Excerpt: {f.excerpt}</p>}
      {canReview&&f.review_status==="pending"&&f.created_by!==user.id&&<div className="space-y-2">
       <Button size="sm" variant="outline" onClick={()=>setReviewId(reviewId===f.id?"":f.id)}>Review fact</Button>
       {reviewId===f.id&&<><Textarea aria-label="Fact review rationale" placeholder="Independent verification rationale" value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)}/>
        <div className="flex gap-2"><Button disabled={saving} onClick={()=>review(f.id,"accepted")}>Accept</Button><Button disabled={saving} variant="outline" onClick={()=>review(f.id,"rejected")}>Reject</Button></div></>}
      </div>}
     </article>)}
     {visibleFacts.length===0&&<p className="text-sm text-muted-foreground">No facts match the current filters.</p>}
    </section>
    <section className="space-y-2"><h2 className="font-semibold">Potential contradictions</h2>
     {data.conflicts.filter(c=>c.project_id===selected).length===0&&<p className="text-sm text-muted-foreground">No conflicting accepted values found.</p>}
     {data.conflicts.filter(c=>c.project_id===selected).map((c,i)=><article key={i} className="rounded border p-3 text-sm">
      <strong>{c.fact_key}</strong><p>{c.value_a} versus {c.value_b}</p>
      <p className="text-xs text-muted-foreground">{sources.find(s=>s.id===c.source_a_id)?.title??c.source_a_id} / {sources.find(s=>s.id===c.source_b_id)?.title??c.source_b_id}</p>
     </article>)}
    </section></>}
  </main></div>;
}
