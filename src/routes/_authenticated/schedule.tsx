import { useActiveProject } from "@/lib/rpos/active-project";
import {useState} from "react";
import {createFileRoute} from "@tanstack/react-router";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {supabase} from "@/integrations/supabase/client";
import {WorkspaceHeader,useSignOut} from "@/components/rpos/workspace-header";
import {canWriteOrg,mapRpcError} from "@/lib/rpos/auth-config";
export const Route=createFileRoute("/_authenticated/schedule")({component:SchedulePage});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db=supabase as any;
type Entry={id:string;project_id:string;title:string;start_date:string;finish_date:string;baseline_finish_date:string;status:string;progress_percent:number;depends_on:string|null};
type Escalation={project_id:string;item_type:string;item_id:string;title:string;reason:string};
async function load(userId:string){
 const [projects,portfolios,memberships,schedules,escalations]=await Promise.all([
 supabase.from("projects").select("id,name,portfolio_id").order("name"),
 supabase.from("portfolios").select("id,org_id"),
 supabase.from("organisation_memberships").select("organisation_id,role").eq("user_id",userId),
 db.from("rpos_delivery_schedule").select("id,project_id,title,start_date,finish_date,baseline_finish_date,status,progress_percent,depends_on").order("start_date"),
 db.from("rpos_delivery_escalations").select("project_id,item_type,item_id,title,reason")
 ]);
 const error=projects.error??portfolios.error??memberships.error??schedules.error??escalations.error;
 if(error)throw error;
 return {projects:projects.data??[],portfolios:portfolios.data??[],memberships:memberships.data??[],schedules:(schedules.data??[]) as Entry[],escalations:(escalations.data??[]) as Escalation[]};
}
const blank={title:"",start_date:"",finish_date:"",status:"planned",progress_percent:0,depends_on:""};
function SchedulePage(){
 const {user}=Route.useRouteContext();const signOut=useSignOut();const qc=useQueryClient();
 const query=useQuery({queryKey:["schedule",user.id],queryFn:()=>load(user.id)});
 const [projectId,setProjectId]=useActiveProject();const [editing,setEditing]=useState<string|null>(null);
 const [form,setForm]=useState(blank);const [saving,setSaving]=useState(false);
 const data=query.data;const selected=(data?.projects.some(p=>p.id===projectId)?projectId:data?.projects[0]?.id)||"";
 const entries=data?.schedules.filter(x=>x.project_id===selected)??[];
 const escalations=data?.escalations.filter(x=>x.project_id===selected)??[];
 const org=data?.portfolios.find(p=>p.id===data.projects.find(x=>x.id===selected)?.portfolio_id)?.org_id;
 const canEdit=data?.memberships.some(m=>m.organisation_id===org&&canWriteOrg(m.role))??false;
 function reset(){setEditing(null);setForm(blank);}
 function edit(x:Entry){setEditing(x.id);setForm({title:x.title,start_date:x.start_date,finish_date:x.finish_date,status:x.status,progress_percent:x.progress_percent,depends_on:x.depends_on??""});}
 async function save(){
  setSaving(true);
  try{
   const {error}=editing
    ?await db.rpc("rpos_update_delivery_schedule",{p_id:editing,p_title:form.title,p_start:form.start_date,p_finish:form.finish_date,p_status:form.status,p_progress:Number(form.progress_percent),p_dependency:form.depends_on||null})
    :await db.rpc("rpos_add_delivery_schedule",{p_project_id:selected,p_title:form.title,p_start:form.start_date,p_finish:form.finish_date});
   if(error)throw error;
   reset();await qc.invalidateQueries({queryKey:["schedule",user.id]});toast.success("Schedule saved");
  }catch(e){toast.error(mapRpcError(e));}finally{setSaving(false);}
 }
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/>
 <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
  <h1 className="text-2xl font-semibold">Delivery schedule</h1>
  <p className="text-sm text-muted-foreground">Baseline dates are preserved when schedules are updated. Overdue and blocked work appears in the escalation watchlist.</p>
  {query.isLoading&&<p>Loading schedule…</p>}
  {query.error&&<p role="alert" className="text-destructive">Schedule unavailable. Apply migrations 0015–0017.</p>}
  {data&&<>
   <label className="text-sm">Project <select className="rounded border bg-background p-2" value={selected} onChange={e=>{setProjectId(e.target.value);reset();}}>{data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <div className="grid gap-2 sm:grid-cols-3">
    <div className="rounded border p-3"><strong>{entries.length}</strong><p className="text-xs">Schedule activities</p></div>
    <div className="rounded border p-3"><strong>{entries.filter(e=>e.status==="completed").length}</strong><p className="text-xs">Completed</p></div>
    <div className="rounded border p-3"><strong>{escalations.length}</strong><p className="text-xs">Escalation indicators</p></div>
   </div>
   {canEdit&&<section className="space-y-3 rounded border p-4">
    <h2 className="font-semibold">{editing?"Edit activity":"New schedule activity"}</h2>
    <Input aria-label="Activity title" placeholder="Activity title" maxLength={250} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
    <div className="grid gap-2 sm:grid-cols-2">
     <label className="text-xs">Start<Input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></label>
     <label className="text-xs">Finish<Input type="date" value={form.finish_date} onChange={e=>setForm({...form,finish_date:e.target.value})}/></label>
    </div>
    {editing&&<div className="grid gap-2 sm:grid-cols-2">
     <label className="text-xs">Status<select className="block w-full rounded border bg-background p-2" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
      {["planned","in_progress","blocked","completed","cancelled"].map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label>
     <label className="text-xs">Progress %<Input type="number" min={0} max={100} value={form.progress_percent} onChange={e=>setForm({...form,progress_percent:Number(e.target.value)})}/></label>
     <label className="text-xs sm:col-span-2">Predecessor<select className="block w-full rounded border bg-background p-2" value={form.depends_on} onChange={e=>setForm({...form,depends_on:e.target.value})}>
      <option value="">None</option>{entries.filter(e=>e.id!==editing).map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
    </div>}
    <div className="flex gap-2"><Button disabled={saving||!selected||form.title.trim().length<3||!form.start_date||!form.finish_date} onClick={save}>{saving?"Saving…":"Save activity"}</Button>
    {editing&&<Button variant="outline" onClick={reset}>Cancel</Button>}</div>
   </section>}
   <section className="space-y-2"><h2 className="font-semibold">Schedule activities</h2>
    {entries.length===0&&<p className="text-sm text-muted-foreground">No schedule activities yet.</p>}
    {entries.map(e=><article key={e.id} className="flex justify-between gap-3 rounded border p-3 text-sm">
     <div><strong>{e.title}</strong><p className="text-xs">{e.start_date} → {e.finish_date} · {e.status.replaceAll("_"," ")} · {e.progress_percent}%</p>
      <p className="text-xs text-muted-foreground">Baseline finish: {e.baseline_finish_date}</p>
      {e.depends_on&&<p className="text-xs">Predecessor: {entries.find(d=>d.id===e.depends_on)?.title??e.depends_on}</p>}
     </div>{canEdit&&<Button size="sm" variant="outline" onClick={()=>edit(e)}>Edit</Button>}
    </article>)}
   </section>
   <section className="space-y-2"><h2 className="font-semibold">Escalation watchlist</h2>
    {escalations.length===0&&<p className="text-sm text-muted-foreground">No active escalation indicators.</p>}
    {escalations.map(e=><div key={e.item_type+e.item_id} className="rounded border p-3 text-sm"><strong>{e.title}</strong><p className="text-xs">{e.item_type} · {e.reason.replaceAll("_"," ")}</p></div>)}
   </section>
  </>}
 </main></div>;
}
