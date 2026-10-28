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
export const Route=createFileRoute("/_authenticated/delivery-live")({component:DeliveryPage});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db=supabase as any;
type RecordItem={id:string;project_id:string;record_type:string;reference:string;title:string;description:string;status:string;priority:string;owner_user_id:string|null;due_date:string|null;impact:string;mitigation:string;created_by:string};
type Approval={record_id:string;decision:string;rationale:string;decided_by:string;decided_at:string};
async function load(userId:string){
 const [projects,portfolios,memberships,records,approvals]=await Promise.all([
  supabase.from("projects").select("id,name,portfolio_id").order("name"),
  supabase.from("portfolios").select("id,org_id"),
  supabase.from("organisation_memberships").select("organisation_id,role").eq("user_id",userId),
  db.from("rpos_delivery_records").select("id,project_id,record_type,reference,title,description,status,priority,owner_user_id,due_date,impact,mitigation,created_by").order("created_at",{ascending:false}),
  db.from("rpos_delivery_approvals").select("record_id,decision,rationale,decided_by,decided_at")
 ]);
 const error=projects.error??portfolios.error??memberships.error??records.error??approvals.error;
 if(error)throw error;
 return {projects:projects.data??[],portfolios:portfolios.data??[],memberships:memberships.data??[],records:(records.data??[]) as RecordItem[],approvals:(approvals.data??[]) as Approval[]};
}
const blank={record_type:"risk",reference:"",title:"",description:"",status:"open",priority:"medium",owner_user_id:"",due_date:"",impact:"",mitigation:""};
function DeliveryPage(){
 const {user}=Route.useRouteContext();const signOut=useSignOut();const qc=useQueryClient();
 const query=useQuery({queryKey:["delivery",user.id],queryFn:()=>load(user.id)});
 const [projectId,setProjectId]=useActiveProject();const [typeFilter,setTypeFilter]=useState("all");
 const [editing,setEditing]=useState<string|null>(null);const [form,setForm]=useState(blank);
 const [decisionId,setDecisionId]=useState<string|null>(null);const [rationale,setRationale]=useState("");const [saving,setSaving]=useState(false);
 const data=query.data;const selected=(data?.projects.some(p=>p.id===projectId)?projectId:data?.projects[0]?.id)||"";
 const records=data?.records.filter(r=>r.project_id===selected&&(typeFilter==="all"||r.record_type===typeFilter))??[];
 const org=data?.portfolios.find(p=>p.id===data.projects.find(x=>x.id===selected)?.portfolio_id)?.org_id;
 const canEdit=data?.memberships.some(m=>m.organisation_id===org&&canWriteOrg(m.role))??false;
 const canApprove=data?.memberships.some(m=>m.organisation_id===org&&["admin","director"].includes(m.role))??false;
 const refresh=()=>qc.invalidateQueries({queryKey:["delivery",user.id]});
 function reset(){setEditing(null);setForm(blank);}
 function edit(r:RecordItem){setEditing(r.id);setForm({record_type:r.record_type,reference:r.reference,title:r.title,description:r.description,status:r.status,priority:r.priority,owner_user_id:r.owner_user_id??"",due_date:r.due_date??"",impact:r.impact,mitigation:r.mitigation});}
 async function save(){
  setSaving(true);
  try{
   const {error}=await db.rpc("rpos_save_delivery_record",{p_project_id:selected,p_type:form.record_type,p_reference:form.reference,p_title:form.title,p_description:form.description,
    p_priority:form.priority,p_owner:form.owner_user_id||null,p_due_date:form.due_date||null,p_impact:form.impact,p_mitigation:form.mitigation,p_record_id:editing,p_status:form.status});
   if(error)throw error;
   reset();await refresh();toast.success("Delivery record saved");
  }catch(e){toast.error(mapRpcError(e));}finally{setSaving(false);}
 }
 async function decide(id:string,decision:"approved"|"rejected"){
  if(rationale.trim().length<10){toast.error("Decision rationale must be at least 10 characters.");return;}
  setSaving(true);
  try{const {error}=await db.rpc("rpos_decide_delivery_change",{p_record_id:id,p_decision:decision,p_rationale:rationale});
   if(error)throw error;setDecisionId(null);setRationale("");await refresh();toast.success("Change decision recorded");
  }catch(e){toast.error(mapRpcError(e));}finally{setSaving(false);}
 }
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/>
  <main className="mx-auto max-w-6xl space-y-5 px-5 py-6">
   <h1 className="text-2xl font-semibold">Delivery Operating System</h1>
   <p className="text-sm text-muted-foreground">Project risks, issues, actions, decisions and controlled change requests with auditable approvals.</p>
   {query.isLoading&&<p>Loading delivery registers…</p>}
   {query.error&&<p role="alert" className="text-destructive">Delivery registers unavailable. Apply migration 0014.</p>}
   {data&&<>
    <div className="flex flex-wrap gap-3">
     <label className="text-sm">Project <select className="rounded border bg-background p-2" value={selected} onChange={e=>{setProjectId(e.target.value);reset();}}>
      {data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
     <label className="text-sm">Register <select className="rounded border bg-background p-2" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
      {["all","risk","issue","action","decision","change"].map(t=><option key={t} value={t}>{t}</option>)}</select></label>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
     <div className="rounded border p-3"><strong>{records.length}</strong><p className="text-xs">Register entries</p></div>
     <div className="rounded border p-3"><strong>{records.filter(r=>r.priority==="critical"||r.priority==="high").length}</strong><p className="text-xs">High / critical</p></div>
     <div className="rounded border p-3"><strong>{records.filter(r=>r.status==="open"||r.status==="in_progress").length}</strong><p className="text-xs">Active</p></div>
     <div className="rounded border p-3"><strong>{records.filter(r=>r.status==="pending_approval").length}</strong><p className="text-xs">Awaiting approval</p></div>
    </div>
    {canEdit&&<section className="space-y-3 rounded-lg border p-4"><h2 className="font-semibold">{editing?"Edit register entry":"New register entry"}</h2>
     <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-xs">Register type<select disabled={!!editing} className="block w-full rounded border bg-background p-2" value={form.record_type} onChange={e=>setForm({...form,record_type:e.target.value,status:"open"})}>
       {["risk","issue","action","decision","change"].map(t=><option key={t} value={t}>{t}</option>)}</select></label>
      <label className="text-xs">Reference<Input disabled={!!editing} placeholder="RISK-001" value={form.reference} maxLength={40} onChange={e=>setForm({...form,reference:e.target.value})}/></label>
     </div>
     <Input aria-label="Delivery record title" placeholder="Title" value={form.title} maxLength={250} onChange={e=>setForm({...form,title:e.target.value})}/>
     <Textarea aria-label="Description" placeholder="Description" value={form.description} maxLength={4000} onChange={e=>setForm({...form,description:e.target.value})}/>
     <div className="grid gap-2 sm:grid-cols-3">
      <label className="text-xs">Priority<select className="block w-full rounded border bg-background p-2" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
       {["low","medium","high","critical"].map(t=><option key={t} value={t}>{t}</option>)}</select></label>
      <label className="text-xs">Status<select className="block w-full rounded border bg-background p-2" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
       {(form.record_type==="change"?["open","pending_approval","cancelled"]:["open","in_progress","mitigated","resolved","closed","cancelled"]).map(t=><option key={t} value={t}>{t.replaceAll("_"," ")}</option>)}</select></label>
      <label className="text-xs">Due date<Input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></label>
     </div>
     <Input aria-label="Owner user ID" placeholder="Owner user UUID (optional)" value={form.owner_user_id} onChange={e=>setForm({...form,owner_user_id:e.target.value})}/>
     <Textarea aria-label="Impact" placeholder="Impact / consequence" value={form.impact} maxLength={4000} onChange={e=>setForm({...form,impact:e.target.value})}/>
     <Textarea aria-label="Mitigation" placeholder="Mitigation / response / proposed change" value={form.mitigation} maxLength={4000} onChange={e=>setForm({...form,mitigation:e.target.value})}/>
     <div className="flex gap-2"><Button disabled={saving||!selected||form.reference.trim().length<2||form.title.trim().length<3} onClick={save}>{saving?"Saving…":"Save record"}</Button>
      {editing&&<Button variant="outline" onClick={reset}>Cancel edit</Button>}</div>
    </section>}
    <section className="space-y-2"><h2 className="font-semibold">Project register</h2>
     {records.length===0&&<p className="text-sm text-muted-foreground">No entries in this register.</p>}
     {records.map(r=><article key={r.id} className="rounded border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{r.reference} — {r.title}</strong>
       <p className="text-xs text-muted-foreground">{r.record_type} · {r.priority} · {r.status.replaceAll("_"," ")}{r.due_date?` · Due ${r.due_date}`:""}</p></div>
       {canEdit&&!data.approvals.some(a=>a.record_id===r.id)&&<Button variant="outline" size="sm" onClick={()=>edit(r)}>Edit</Button>}</div>
      {r.description&&<p className="mt-2">{r.description}</p>}
      {r.impact&&<p className="mt-1"><strong>Impact:</strong> {r.impact}</p>}
      {r.mitigation&&<p className="mt-1"><strong>Response:</strong> {r.mitigation}</p>}
      {data.approvals.filter(a=>a.record_id===r.id).map(a=><p key={a.record_id} className="mt-2 text-xs"><strong>Decision: {a.decision}</strong> — {a.rationale}</p>)}
      {canApprove&&r.record_type==="change"&&r.status==="pending_approval"&&r.created_by!==user.id&&r.owner_user_id!==user.id&&<div className="mt-3 space-y-2">
       <Button size="sm" variant="outline" onClick={()=>setDecisionId(decisionId===r.id?null:r.id)}>Review change</Button>
       {decisionId===r.id&&<><Textarea aria-label="Change decision rationale" placeholder="Approval / rejection rationale" value={rationale} maxLength={4000} onChange={e=>setRationale(e.target.value)}/>
        <div className="flex gap-2"><Button disabled={saving} size="sm" onClick={()=>decide(r.id,"approved")}>Approve</Button>
         <Button disabled={saving} size="sm" variant="outline" onClick={()=>decide(r.id,"rejected")}>Reject</Button></div></>}
      </div>}
     </article>)}
    </section>
   </>}
  </main></div>;
}
