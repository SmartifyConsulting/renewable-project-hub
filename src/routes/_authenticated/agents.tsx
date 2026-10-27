import {useState} from "react";
import {createFileRoute} from "@tanstack/react-router";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {supabase} from "@/integrations/supabase/client";
import {WorkspaceHeader,useSignOut} from "@/components/rpos/workspace-header";
import {canWriteOrg,mapRpcError} from "@/lib/rpos/auth-config";
export const Route=createFileRoute("/_authenticated/agents")({component:AgentsPage});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db=supabase as any;
type Agent={agent_key:string;name:string;domain:string;purpose:string;enabled:boolean};
type Recommendation={id:string;project_id:string;agent_key:string;title:string;recommendation:string;source_references:string;status:string;created_by:string;review_rationale:string|null};
async function load(userId:string){
 const [projects,portfolios,memberships,agents,recommendations]=await Promise.all([
 supabase.from("projects").select("id,name,portfolio_id").order("name"),
 supabase.from("portfolios").select("id,org_id"),
 supabase.from("organisation_memberships").select("organisation_id,role").eq("user_id",userId),
 db.from("rpos_ai_agents").select("agent_key,name,domain,purpose,enabled").order("name"),
 db.from("rpos_ai_recommendations").select("id,project_id,agent_key,title,recommendation,source_references,status,created_by,review_rationale").order("created_at",{ascending:false})
 ]);
 const error=projects.error??portfolios.error??memberships.error??agents.error??recommendations.error;
 if(error)throw error;
 return {projects:projects.data??[],portfolios:portfolios.data??[],memberships:memberships.data??[],agents:(agents.data??[]) as Agent[],recommendations:(recommendations.data??[]) as Recommendation[]};
}
function AgentsPage(){
 const {user}=Route.useRouteContext();const signOut=useSignOut();const qc=useQueryClient();
 const query=useQuery({queryKey:["agents",user.id],queryFn:()=>load(user.id)});
 const [projectId,setProjectId]=useState("");const [saving,setSaving]=useState(false);
 const [form,setForm]=useState({agent_key:"",title:"",recommendation:"",sources:""});
 const [reviewId,setReviewId]=useState<string|null>(null);const [rationale,setRationale]=useState("");
 const data=query.data;const selected=projectId||data?.projects[0]?.id||"";
 const org=data?.portfolios.find(p=>p.id===data.projects.find(x=>x.id===selected)?.portfolio_id)?.org_id;
 const canWrite=data?.memberships.some(m=>m.organisation_id===org&&canWriteOrg(m.role))??false;
 const canReview=data?.memberships.some(m=>m.organisation_id===org&&["admin","director"].includes(m.role))??false;
 const recommendations=data?.recommendations.filter(r=>r.project_id===selected)??[];
 const enabled=data?.agents.filter(a=>a.enabled)??[];
 async function execute(task:()=>Promise<void>){setSaving(true);try{await task();await qc.invalidateQueries({queryKey:["agents",user.id]});toast.success("Recommendation workflow updated");}catch(e){toast.error(mapRpcError(e));}finally{setSaving(false);}}
 async function submit(){await execute(async()=>{const {error}=await db.rpc("rpos_submit_ai_recommendation",{p_project_id:selected,p_agent_key:form.agent_key||enabled[0]?.agent_key,p_title:form.title,p_recommendation:form.recommendation,p_sources:form.sources});if(error)throw error;setForm({agent_key:"",title:"",recommendation:"",sources:""});});}
 async function review(id:string,decision:"approved"|"rejected"){await execute(async()=>{const {error}=await db.rpc("rpos_review_ai_recommendation",{p_id:id,p_decision:decision,p_rationale:rationale});if(error)throw error;setReviewId(null);setRationale("");});}
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/>
 <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
  <h1 className="text-2xl font-semibold">AI Agent Centre</h1>
  <p className="text-sm text-muted-foreground">Governed specialist agent catalogue and traceable, human-reviewed recommendations. AI execution is not connected yet; submissions are manually authored and must cite sources.</p>
  {query.isLoading&&<p>Loading agents…</p>}
  {query.error&&<p role="alert" className="text-destructive">Agent data unavailable. Apply migrations 0022–0023.</p>}
  {data&&<>
   <label className="text-sm">Project <select className="rounded border bg-background p-2" value={selected} onChange={e=>setProjectId(e.target.value)}>
    {data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <section className="space-y-2"><h2 className="font-semibold">Specialist agent catalogue ({data.agents.length})</h2>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.agents.map(a=><div key={a.agent_key} className="rounded border p-3">
     <strong className="text-sm">{a.name}</strong><p className="text-xs text-muted-foreground">{a.domain} · {a.enabled?"Enabled":"Disabled"}</p>
     <p className="mt-1 text-xs">{a.purpose}</p></div>)}</div>
   </section>
   {canWrite&&<section className="space-y-3 rounded border p-4"><h2 className="font-semibold">Submit sourced recommendation</h2>
    {enabled.length===0?<p className="text-sm text-muted-foreground">All agents are disabled by default. An administrator must enable an agent before recommendations can be submitted.</p>:<>
     <label className="text-xs">Specialist agent<select className="block w-full rounded border bg-background p-2" value={form.agent_key||enabled[0]?.agent_key} onChange={e=>setForm({...form,agent_key:e.target.value})}>
      {enabled.map(a=><option key={a.agent_key} value={a.agent_key}>{a.name}</option>)}</select></label>
     <Input aria-label="Recommendation title" placeholder="Recommendation title" maxLength={250} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
     <Textarea aria-label="Recommendation" placeholder="Draft recommendation and reasoning" maxLength={8000} value={form.recommendation} onChange={e=>setForm({...form,recommendation:e.target.value})}/>
     <Textarea aria-label="Source references" placeholder="Source IDs, document references, evidence links" maxLength={4000} value={form.sources} onChange={e=>setForm({...form,sources:e.target.value})}/>
     <Button disabled={saving||!selected||form.title.trim().length<3||form.recommendation.trim().length<10||form.sources.trim().length<3} onClick={submit}>Submit for human review</Button>
    </>}
   </section>}
   <section className="space-y-2"><h2 className="font-semibold">Recommendations ({recommendations.length})</h2>
    {recommendations.length===0&&<p className="text-sm text-muted-foreground">No recommendations recorded.</p>}
    {recommendations.map(r=><article key={r.id} className="space-y-2 rounded border p-3 text-sm">
     <strong>{r.title}</strong><p className="text-xs text-muted-foreground">{data.agents.find(a=>a.agent_key===r.agent_key)?.name??r.agent_key} · {r.status}</p>
     <p>{r.recommendation}</p><p className="text-xs"><strong>Sources:</strong> {r.source_references}</p>
     {r.review_rationale&&<p className="text-xs"><strong>Review:</strong> {r.review_rationale}</p>}
     {canReview&&r.status==="submitted"&&r.created_by!==user.id&&<div className="space-y-2">
      <Button size="sm" variant="outline" onClick={()=>setReviewId(reviewId===r.id?null:r.id)}>Review recommendation</Button>
      {reviewId===r.id&&<><Textarea aria-label="Review rationale" placeholder="Independent review rationale" maxLength={4000} value={rationale} onChange={e=>setRationale(e.target.value)}/>
       <div className="flex gap-2"><Button size="sm" disabled={saving||rationale.trim().length<10} onClick={()=>review(r.id,"approved")}>Approve</Button>
        <Button size="sm" variant="outline" disabled={saving||rationale.trim().length<10} onClick={()=>review(r.id,"rejected")}>Reject</Button></div></>}
     </div>}
    </article>)}
   </section>
  </>}
 </main></div>;
}
