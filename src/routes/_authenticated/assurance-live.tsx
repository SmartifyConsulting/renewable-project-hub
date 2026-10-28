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
export const Route=createFileRoute("/_authenticated/assurance-live")({component:AssurancePage});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db=supabase as any;
type Inspection={id:string;project_id:string;reference:string;title:string;inspection_date:string;discipline:string;result:string;findings:string};
type Ncr={id:string;project_id:string;inspection_id:string;reference:string;description:string;severity:string;status:string;corrective_action:string;due_date:string|null;created_by:string;owner_user_id:string|null};
type Verification={ncr_id:string;verified_at:string;verification_notes:string};
async function load(userId:string){
 const [projects,portfolios,memberships,inspections,ncrs,verifications]=await Promise.all([
  supabase.from("projects").select("id,name,portfolio_id").order("name"),
  supabase.from("portfolios").select("id,org_id"),
  supabase.from("organisation_memberships").select("organisation_id,role").eq("user_id",userId),
  db.from("rpos_assurance_inspections").select("id,project_id,reference,title,inspection_date,discipline,result,findings").order("inspection_date",{ascending:false}),
  db.from("rpos_assurance_ncrs").select("id,project_id,inspection_id,reference,description,severity,status,corrective_action,due_date,created_by,owner_user_id").order("created_at",{ascending:false}),
  db.from("rpos_assurance_verifications").select("ncr_id,verified_at,verification_notes")
 ]);
 const error=projects.error??portfolios.error??memberships.error??inspections.error??ncrs.error??verifications.error;
 if(error)throw error;
 return {projects:projects.data??[],portfolios:portfolios.data??[],memberships:memberships.data??[],
 inspections:(inspections.data??[]) as Inspection[],ncrs:(ncrs.data??[]) as Ncr[],verifications:(verifications.data??[]) as Verification[]};
}
function AssurancePage(){
 const {user}=Route.useRouteContext();const signOut=useSignOut();const qc=useQueryClient();
 const query=useQuery({queryKey:["assurance",user.id],queryFn:()=>load(user.id)});
 const [projectId,setProjectId]=useActiveProject();const [saving,setSaving]=useState(false);
 const [inspection,setInspection]=useState({reference:"",title:"",date:"",discipline:"",result:"pending",findings:""});
 const [ncr,setNcr]=useState({inspectionId:"",reference:"",description:"",severity:"minor",action:"",dueDate:"",owner:""});
 const [actionId,setActionId]=useState<string|null>(null);const [action,setAction]=useState("");const [actionDate,setActionDate]=useState("");const [actionStatus,setActionStatus]=useState("corrective_action");
 const [verifyId,setVerifyId]=useState<string|null>(null);const [verifyNotes,setVerifyNotes]=useState("");
 const data=query.data;const selected=(data?.projects.some(p=>p.id===projectId)?projectId:data?.projects[0]?.id)||"";
 const inspections=data?.inspections.filter(i=>i.project_id===selected)??[];
 const ncrs=data?.ncrs.filter(n=>n.project_id===selected)??[];
 const org=data?.portfolios.find(p=>p.id===data.projects.find(x=>x.id===selected)?.portfolio_id)?.org_id;
 const canWrite=data?.memberships.some(m=>m.organisation_id===org&&canWriteOrg(m.role))??false;
 const canVerify=data?.memberships.some(m=>m.organisation_id===org&&["admin","director"].includes(m.role))??false;
 const refresh=()=>qc.invalidateQueries({queryKey:["assurance",user.id]});
 async function run(task:()=>Promise<void>){setSaving(true);try{await task();await refresh();toast.success("Assurance record saved");}catch(e){toast.error(mapRpcError(e));}finally{setSaving(false);}}
 async function addInspection(){await run(async()=>{const {error}=await db.rpc("rpos_record_inspection",{p_project_id:selected,p_reference:inspection.reference,p_title:inspection.title,p_date:inspection.date,p_discipline:inspection.discipline,p_result:inspection.result,p_findings:inspection.findings});if(error)throw error;setInspection({reference:"",title:"",date:"",discipline:"",result:"pending",findings:""});});}
 async function addNcr(){await run(async()=>{const {error}=await db.rpc("rpos_record_ncr",{p_inspection_id:ncr.inspectionId||inspections[0]?.id,p_reference:ncr.reference,p_description:ncr.description,p_severity:ncr.severity,p_action:ncr.action,p_due_date:ncr.dueDate||null,p_owner:ncr.owner||null});if(error)throw error;setNcr({inspectionId:"",reference:"",description:"",severity:"minor",action:"",dueDate:"",owner:""});});}
 async function updateAction(id:string){await run(async()=>{const {error}=await db.rpc("rpos_update_ncr_action",{p_ncr_id:id,p_action:action,p_due_date:actionDate||null,p_status:actionStatus});if(error)throw error;setActionId(null);});}
 async function verify(id:string){await run(async()=>{const {error}=await db.rpc("rpos_verify_ncr",{p_ncr_id:id,p_notes:verifyNotes});if(error)throw error;setVerifyId(null);setVerifyNotes("");});}
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/>
 <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
  <h1 className="text-2xl font-semibold">Delivery Assurance</h1>
  <p className="text-sm text-muted-foreground">Inspection register, non-conformance reports, corrective actions and independent verification.</p>
  {query.isLoading&&<p>Loading assurance records…</p>}
  {query.error&&<p role="alert" className="text-destructive">Assurance data unavailable. Apply migrations 0018–0020.</p>}
  {data&&<>
   <label className="text-sm">Project <select className="rounded border bg-background p-2" value={selected} onChange={e=>setProjectId(e.target.value)}>
    {data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <div className="grid gap-2 sm:grid-cols-3">
    <div className="rounded border p-3"><strong>{inspections.length}</strong><p className="text-xs">Inspections</p></div>
    <div className="rounded border p-3"><strong>{ncrs.filter(n=>n.status!=="closed").length}</strong><p className="text-xs">Open NCRs</p></div>
    <div className="rounded border p-3"><strong>{ncrs.filter(n=>n.severity==="critical"&&n.status!=="closed").length}</strong><p className="text-xs">Critical NCRs</p></div>
   </div>
   {canWrite&&<section className="space-y-3 rounded border p-4"><h2 className="font-semibold">Record inspection</h2>
    <div className="grid gap-2 sm:grid-cols-2">
     <Input aria-label="Inspection reference" placeholder="Inspection reference" value={inspection.reference} onChange={e=>setInspection({...inspection,reference:e.target.value})}/>
     <Input aria-label="Inspection title" placeholder="Inspection title" value={inspection.title} onChange={e=>setInspection({...inspection,title:e.target.value})}/>
     <Input aria-label="Inspection discipline" placeholder="Discipline" value={inspection.discipline} onChange={e=>setInspection({...inspection,discipline:e.target.value})}/>
     <Input aria-label="Inspection date" type="date" value={inspection.date} onChange={e=>setInspection({...inspection,date:e.target.value})}/>
    </div>
    <label className="text-xs">Result <select className="rounded border bg-background p-2" value={inspection.result} onChange={e=>setInspection({...inspection,result:e.target.value})}>
     {["pending","pass","fail","conditional"].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <Textarea aria-label="Inspection findings" placeholder="Inspection findings" value={inspection.findings} onChange={e=>setInspection({...inspection,findings:e.target.value})}/>
    <Button disabled={saving||!selected||!inspection.date} onClick={addInspection}>Save inspection</Button>
   </section>}
   {canWrite&&inspections.length>0&&<section className="space-y-3 rounded border p-4"><h2 className="font-semibold">Raise non-conformance report</h2>
    <label className="block text-xs">Inspection <select className="w-full rounded border bg-background p-2" value={ncr.inspectionId||inspections[0]?.id} onChange={e=>setNcr({...ncr,inspectionId:e.target.value})}>
     {inspections.map(i=><option key={i.id} value={i.id}>{i.reference} — {i.title}</option>)}</select></label>
    <Input aria-label="NCR reference" placeholder="NCR reference" value={ncr.reference} onChange={e=>setNcr({...ncr,reference:e.target.value})}/>
    <Textarea aria-label="NCR description" placeholder="Non-conformance description" value={ncr.description} onChange={e=>setNcr({...ncr,description:e.target.value})}/>
    <label className="text-xs">Severity <select className="rounded border bg-background p-2" value={ncr.severity} onChange={e=>setNcr({...ncr,severity:e.target.value})}>
     {["minor","major","critical"].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <Textarea aria-label="Corrective action" placeholder="Proposed corrective action" value={ncr.action} onChange={e=>setNcr({...ncr,action:e.target.value})}/>
    <Input aria-label="NCR due date" type="date" value={ncr.dueDate} onChange={e=>setNcr({...ncr,dueDate:e.target.value})}/>
    <Input aria-label="NCR owner" placeholder="Owner user UUID (optional)" value={ncr.owner} onChange={e=>setNcr({...ncr,owner:e.target.value})}/>
    <Button disabled={saving||ncr.description.trim().length<10} onClick={addNcr}>Raise NCR</Button>
   </section>}
   <section className="space-y-2"><h2 className="font-semibold">Inspections</h2>
    {inspections.length===0&&<p className="text-sm text-muted-foreground">No inspections recorded.</p>}
    {inspections.map(i=><article key={i.id} className="rounded border p-3 text-sm"><strong>{i.reference} — {i.title}</strong>
     <p className="text-xs text-muted-foreground">{i.inspection_date} · {i.discipline} · {i.result}</p>{i.findings&&<p>{i.findings}</p>}</article>)}
   </section>
   <section className="space-y-2"><h2 className="font-semibold">Non-conformance reports</h2>
    {ncrs.length===0&&<p className="text-sm text-muted-foreground">No NCRs recorded.</p>}
    {ncrs.map(n=><article key={n.id} className="space-y-2 rounded border p-3 text-sm">
     <strong>{n.reference} · {n.severity} · {n.status.replaceAll("_"," ")}</strong><p>{n.description}</p>
     {n.corrective_action&&<p><strong>Corrective action:</strong> {n.corrective_action}</p>}
     {n.due_date&&<p className="text-xs">Due: {n.due_date}</p>}
     {data.verifications.filter(v=>v.ncr_id===n.id).map(v=><p key={v.ncr_id} className="text-xs"><strong>Verified:</strong> {v.verification_notes}</p>)}
     {canWrite&&n.status!=="closed"&&<><Button variant="outline" size="sm" onClick={()=>{setActionId(actionId===n.id?null:n.id);setAction(n.corrective_action);setActionDate(n.due_date??"");setActionStatus(n.status==="verification"?"verification":"corrective_action");}}>Update action</Button>
      {actionId===n.id&&<div className="space-y-2"><Textarea aria-label="Updated corrective action" value={action} onChange={e=>setAction(e.target.value)}/>
       <Input aria-label="Corrective action due date" type="date" value={actionDate} onChange={e=>setActionDate(e.target.value)}/>
       <select aria-label="Action status" className="rounded border bg-background p-2" value={actionStatus} onChange={e=>setActionStatus(e.target.value)}>
        {["open","corrective_action","verification"].map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select>
       <Button disabled={saving} size="sm" onClick={()=>updateAction(n.id)}>Save corrective action</Button></div>}</>}
     {canVerify&&n.status==="verification"&&n.created_by!==user.id&&n.owner_user_id!==user.id&&<><Button size="sm" onClick={()=>setVerifyId(verifyId===n.id?null:n.id)}>Verify and close</Button>
      {verifyId===n.id&&<div className="space-y-2"><Textarea aria-label="Verification rationale" placeholder="Independent verification evidence and rationale" value={verifyNotes} onChange={e=>setVerifyNotes(e.target.value)}/>
       <Button disabled={saving||verifyNotes.trim().length<10} onClick={()=>verify(n.id)}>Confirm verification</Button></div>}</>}
    </article>)}
   </section>
  </>}
 </main></div>;
}
