import { useActiveProject } from "@/lib/rpos/active-project";
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
export const Route=createFileRoute("/_authenticated/activation-live")({component:ActivationPage});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db=supabase as any;
type Acceptance={item_id:string;project_id:string;accepted_by:string;accepted_at:string;rationale:string};
type Item={id:string;project_id:string;title:string;workstream:string;item_type:string;status:string;day_number:number;owner_user_id:string|null;depends_on:string|null;notes:string;created_by:string};
async function load(userId:string){
 const [projects,portfolios,memberships,items,acceptances]=await Promise.all([
  supabase.from("projects").select("id,name,portfolio_id").order("name"),
  supabase.from("portfolios").select("id,org_id"),
  supabase.from("organisation_memberships").select("organisation_id,role").eq("user_id",userId),
  db.from("rpos_activation_items").select("id,project_id,title,workstream,item_type,status,day_number,owner_user_id,depends_on,notes,created_by").order("day_number"),
  db.from("rpos_activation_acceptances").select("item_id,project_id,accepted_by,accepted_at,rationale")
 ]);
 const error=projects.error??portfolios.error??memberships.error??items.error??acceptances.error;
 if(error)throw error;
 return {projects:projects.data??[],portfolios:portfolios.data??[],memberships:memberships.data??[],items:(items.data??[]) as Item[],acceptances:(acceptances.data??[]) as Acceptance[]};
}
const empty={title:"",workstream:"Governance",item_type:"task",status:"not_started",day_number:1,owner_user_id:"",depends_on:"",notes:""};
function ActivationPage(){
 const {user}=Route.useRouteContext();const signOut=useSignOut();const qc=useQueryClient();
 const query=useQuery({queryKey:["activation",user.id],queryFn:()=>load(user.id)});
 const [projectId,setProjectId]=useActiveProject();const [editing,setEditing]=useState<string|null>(null);
 const [form,setForm]=useState(empty);const [saving,setSaving]=useState(false);
 const [acceptId,setAcceptId]=useState<string|null>(null);const [acceptReason,setAcceptReason]=useState("");
 const data=query.data;const selected=(data?.projects.some(p=>p.id===projectId)?projectId:data?.projects[0]?.id)||"";
 const items=data?.items.filter(i=>i.project_id===selected)??[];
 const org=data?.portfolios.find(p=>p.id===data.projects.find(x=>x.id===selected)?.portfolio_id)?.org_id;
 const canEdit=data?.memberships.some(m=>m.organisation_id===org&&canWriteOrg(m.role))??false;
 const canAccept=data?.memberships.some(m=>m.organisation_id===org&&["admin","director"].includes(m.role))??false;
 const completed=items.filter(i=>i.status==="completed").length;
 const blocked=items.filter(i=>i.status==="blocked").length;
 function edit(item:Item){setEditing(item.id);setForm({title:item.title,workstream:item.workstream,item_type:item.item_type,status:item.status,day_number:item.day_number,owner_user_id:item.owner_user_id??"",depends_on:item.depends_on??"",notes:item.notes});}
 function reset(){setEditing(null);setForm(empty);}
 async function acceptMilestone(itemId:string){
  if(acceptReason.trim().length<10){toast.error("Provide an acceptance rationale of at least 10 characters.");return;}
  setSaving(true);
  try{const {error}=await db.rpc("rpos_accept_activation_milestone",{p_item_id:itemId,p_rationale:acceptReason.trim()});
   if(error)throw error;
   setAcceptId(null);setAcceptReason("");await qc.invalidateQueries({queryKey:["activation",user.id]});toast.success("Milestone independently accepted");
  }catch(e){toast.error(mapRpcError(e));}finally{setSaving(false);}
 }
 async function save(){
  setSaving(true);
  try{
   const {error}=await db.rpc("rpos_save_activation_item",{
    p_project_id:selected,p_title:form.title,p_workstream:form.workstream,p_type:form.item_type,
    p_day:Number(form.day_number),p_owner:form.owner_user_id||null,p_dependency:form.depends_on||null,
    p_notes:form.notes,p_item_id:editing,p_status:form.status
   });
   if(error)throw error;
   reset();await qc.invalidateQueries({queryKey:["activation",user.id]});toast.success("Activation item saved");
  }catch(e){toast.error(mapRpcError(e));}finally{setSaving(false);}
 }
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/>
  <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
   <h1 className="text-2xl font-semibold">60-Day Activation</h1>
   <p className="text-sm text-muted-foreground">Plan workstreams, accountable owners, milestones and dependencies for the first 60 days. All changes are audited.</p>
   {query.isLoading&&<p>Loading activation plan…</p>}
   {query.error&&<p role="alert" className="text-destructive">Activation data unavailable. Apply migration 0012.</p>}
   {data&&<><label className="block text-sm">Project <select className="rounded border bg-background p-2" value={selected} onChange={e=>{setProjectId(e.target.value);reset();}}>
    {data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <div className="grid gap-3 sm:grid-cols-3">
     <div className="rounded border p-3"><strong>{items.length}</strong><p className="text-xs">Planned items</p></div>
     <div className="rounded border p-3"><strong>{completed}</strong><p className="text-xs">Completed</p></div>
     <div className="rounded border p-3"><strong>{blocked}</strong><p className="text-xs">Blocked</p></div>
    </div>
    {canEdit&&<section className="space-y-3 rounded-lg border p-4">
     <h2 className="font-semibold">{editing?"Edit activation item":"Add activation item"}</h2>
     <Input aria-label="Activation item title" placeholder="Title" value={form.title} maxLength={250} onChange={e=>setForm({...form,title:e.target.value})}/>
     <Input aria-label="Workstream" placeholder="Workstream" value={form.workstream} maxLength={120} onChange={e=>setForm({...form,workstream:e.target.value})}/>
     <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs">Type<select className="block w-full rounded border bg-background p-2" value={form.item_type} onChange={e=>setForm({...form,item_type:e.target.value})}>
       {["task","milestone","decision","deliverable"].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <label className="text-xs">Status<select className="block w-full rounded border bg-background p-2" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
       {["not_started","in_progress","blocked","completed","cancelled"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></label>
      <label className="text-xs">Day (1–60)<Input type="number" min={1} max={60} value={form.day_number} onChange={e=>setForm({...form,day_number:Number(e.target.value)})}/></label>
     </div>
     <Input aria-label="Owner user ID" placeholder="Owner user UUID (optional)" value={form.owner_user_id} onChange={e=>setForm({...form,owner_user_id:e.target.value})}/>
     <label className="block text-xs">Dependency<select className="block w-full rounded border bg-background p-2" value={form.depends_on} onChange={e=>setForm({...form,depends_on:e.target.value})}>
      <option value="">None</option>{items.filter(i=>i.id!==editing).map(i=><option key={i.id} value={i.id}>{i.title}</option>)}</select></label>
     <Textarea aria-label="Activation notes" placeholder="Deliverables, acceptance criteria and notes" maxLength={4000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
     <div className="flex gap-2"><Button disabled={saving||!selected||form.title.trim().length<3} onClick={save}>{saving?"Saving…":"Save item"}</Button>
      {editing&&<Button variant="outline" onClick={reset}>Cancel edit</Button>}</div>
    </section>}
    <section className="space-y-2"><h2 className="font-semibold">Activation plan</h2>
     {items.length===0&&<p className="text-sm text-muted-foreground">No activation items yet.</p>}
     {items.map(i=><article key={i.id} className="flex items-start justify-between gap-3 rounded border p-3">
      <div><p className="text-xs text-muted-foreground">Day {i.day_number} · {i.workstream} · {i.item_type} · {i.status.replaceAll("_"," ")}</p>
       <strong>{i.title}</strong>{i.depends_on&&<p className="text-xs">Depends on: {items.find(d=>d.id===i.depends_on)?.title??"Another item"}</p>}
       {i.owner_user_id&&<p className="text-xs">Owner: {i.owner_user_id}</p>}
       {i.notes&&<p className="text-sm">{i.notes}</p>}</div>
      <div className="shrink-0 space-y-2">
       {data.acceptances.some(a=>a.item_id===i.id)&&<p className="text-xs font-medium">Accepted</p>}
       {canEdit&&!data.acceptances.some(a=>a.item_id===i.id)&&<Button size="sm" variant="outline" onClick={()=>edit(i)}>Edit</Button>}
       {canAccept&&i.item_type==="milestone"&&i.status!=="completed"&&i.created_by!==user.id&&i.owner_user_id!==user.id&&<>
        <Button size="sm" onClick={()=>setAcceptId(acceptId===i.id?null:i.id)}>Accept milestone</Button>
        {acceptId===i.id&&<div className="w-64 space-y-2"><Textarea aria-label="Milestone acceptance rationale" maxLength={4000} value={acceptReason} onChange={e=>setAcceptReason(e.target.value)} placeholder="Acceptance findings and evidence"/><Button disabled={saving} size="sm" onClick={()=>acceptMilestone(i.id)}>Confirm acceptance</Button></div>}
       </>}
      </div>
     </article>)}
    </section></>}
  </main></div>;
}
