import { useActiveProject } from "@/lib/rpos/active-project";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceHeader, useSignOut } from "@/components/rpos/workspace-header";

export const Route=createFileRoute("/_authenticated/traceability")({component:TraceabilityPage});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db=supabase as any;
type LinkRow={id:string;project_id:string;source_type:string;source_id:string;target_type:string;target_id:string;created_by:string;created_at:string};
type Assessment={project_id:string;domain_id:string;score:number|null;hard_stop:boolean;evidence_verified:boolean};
type Activation={id:string;project_id:string;title:string;status:string;owner_user_id:string|null;day_number:number};
type Schedule={id:string;project_id:string;title:string;status:string;progress_percent:number;finish_date:string};
type Inspection={id:string;project_id:string;reference:string;title:string;result:string;inspection_date:string};
type Ncr={id:string;project_id:string;inspection_id:string;reference:string;status:string;severity:string;owner_user_id:string|null;due_date:string|null};
type Verification={ncr_id:string;verified_at:string;verified_by:string;verification_notes:string};
async function load(){
 const [projects,links,assessments,activation,schedules,inspections,ncrs,verifications]=await Promise.all([
  supabase.from("projects").select("id,name").order("name"),
  db.from("rpos_journey_links").select("id,project_id,source_type,source_id,target_type,target_id,created_by,created_at").order("created_at"),
  db.from("readiness_domain_assessments").select("project_id,domain_id,score,hard_stop,evidence_verified"),
  db.from("rpos_activation_items").select("id,project_id,title,status,owner_user_id,day_number"),
  db.from("rpos_delivery_schedule").select("id,project_id,title,status,progress_percent,finish_date"),
  db.from("rpos_assurance_inspections").select("id,project_id,reference,title,result,inspection_date"),
  db.from("rpos_assurance_ncrs").select("id,project_id,inspection_id,reference,status,severity,owner_user_id,due_date"),
  db.from("rpos_assurance_verifications").select("ncr_id,verified_at,verified_by,verification_notes")
 ]);
 const error=projects.error??links.error??assessments.error??activation.error??schedules.error??inspections.error??ncrs.error??verifications.error;
 if(error)throw error;
 return {projects:projects.data??[],links:(links.data??[]) as LinkRow[],assessments:(assessments.data??[]) as Assessment[],activation:(activation.data??[]) as Activation[],schedules:(schedules.data??[]) as Schedule[],inspections:(inspections.data??[]) as Inspection[],ncrs:(ncrs.data??[]) as Ncr[],verifications:(verifications.data??[]) as Verification[]};
}
function TraceabilityPage(){
 const {user}=Route.useRouteContext();const signOut=useSignOut();
 const [projectId,setProjectId]=useActiveProject();
 const query=useQuery({queryKey:["rpos-traceability",user.id],queryFn:load});
 const d=query.data;const project=d?.projects.find(p=>p.id===projectId)??d?.projects[0];
 const links=d?.links.filter(x=>x.project_id===project?.id)??[];
 const starts=links.filter(x=>x.source_type==="readiness_domain");
 const orphanActivation=d?.activation.filter(x=>x.project_id===project?.id&&!links.some(l=>l.target_type==="activation_item"&&l.target_id===x.id))??[];
 const openNcrs=d?.ncrs.filter(x=>x.project_id===project?.id&&x.status!=="closed")??[];
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/>
  <main className="mx-auto max-w-6xl space-y-5 px-5 py-6">
   <div><h1 className="text-2xl font-semibold">Project traceability</h1><p className="text-sm text-muted-foreground">Follow formal links from readiness gaps through activation, delivery and independent assurance. Linked records do not imply approval or verified closure.</p></div>
   {query.isLoading&&<p>Loading traceability…</p>}
   {query.error&&<p role="alert" className="text-destructive">Traceability unavailable. Confirm database migration 0032 and the earlier workflow migrations have been applied.</p>}
   {d&&d.projects.length===0&&<p>No accessible projects. <Link to="/workspace" className="underline">Open projects</Link></p>}
   {d&&project&&<>
    <label className="block text-sm">Project<select className="ml-2 rounded border bg-background p-2" value={project.id} onChange={e=>setProjectId(e.target.value)}>{d.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <div className="grid gap-3 sm:grid-cols-3">
     <div className="rounded border p-3"><strong>{links.length}</strong><p className="text-xs text-muted-foreground">Formal handoff links</p></div>
     <div className="rounded border p-3"><strong>{starts.length}</strong><p className="text-xs text-muted-foreground">Readiness-to-activation links</p></div>
     <div className="rounded border p-3"><strong>{openNcrs.length}</strong><p className="text-xs text-muted-foreground">Open assurance NCRs</p></div>
    </div>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Readiness-to-assurance chains</h2>
     {starts.length===0&&<p className="rounded border p-4 text-sm">No formally linked readiness handoffs yet. Existing records created before migration 0032 are not automatically linked.</p>}
     {starts.map(start=>{
      const assessment=d.assessments.find(x=>x.project_id===project.id&&x.domain_id===start.source_id);
      const item=d.activation.find(x=>x.id===start.target_id&&x.project_id===project.id);
      const deliveryLinks=links.filter(x=>x.source_type==="activation_item"&&x.source_id===start.target_id);
      return <article key={start.id} className="space-y-3 rounded-lg border p-4">
       <div className="flex flex-wrap justify-between gap-2"><div><p className="text-xs text-muted-foreground">Readiness domain</p><strong>{start.source_id}</strong><p className="text-xs">Score: {assessment?.score??"Not scored"} · {assessment?.hard_stop?"Hard stop · ":""}{assessment?.evidence_verified?"Evidence marked verified":"Evidence not verified"}</p></div><Link to="/readiness-live" className="text-sm text-primary underline">Readiness</Link></div>
       <div className="border-l-2 pl-4"><p className="text-xs text-muted-foreground">Activation</p><strong>{item?.title??"Linked activation record unavailable"}</strong><p className="text-xs">Status: {item?.status??"Unknown"} · Owner: {item?.owner_user_id??"Unassigned"} · Day {item?.day_number??"—"}</p><Link to="/activation-live" className="text-xs text-primary underline">Open activation</Link></div>
       {deliveryLinks.length===0&&<p className="rounded bg-muted p-2 text-xs">Next handoff: plan a delivery activity from Activation.</p>}
       {deliveryLinks.map(dl=>{
        const schedule=d.schedules.find(x=>x.id===dl.target_id&&x.project_id===project.id);
        const inspectionLinks=links.filter(x=>x.source_type==="delivery_schedule"&&x.source_id===dl.target_id);
        return <div key={dl.id} className="space-y-2 border-l-2 pl-4"><p className="text-xs text-muted-foreground">Delivery</p><strong>{schedule?.title??"Linked schedule record unavailable"}</strong><p className="text-xs">Status: {schedule?.status??"Unknown"} · Progress: {schedule?.progress_percent??"—"}% · Finish: {schedule?.finish_date??"—"}</p><Link to="/schedule" className="text-xs text-primary underline">Open schedule</Link>
         {inspectionLinks.length===0&&<p className="rounded bg-muted p-2 text-xs">Next handoff: complete delivery and initiate an assurance inspection.</p>}
         {inspectionLinks.map(il=>{
          const inspection=d.inspections.find(x=>x.id===il.target_id&&x.project_id===project.id);
          const ncrs=d.ncrs.filter(x=>x.inspection_id===il.target_id&&x.project_id===project.id);
          return <div key={il.id} className="space-y-1 border-l-2 pl-4"><p className="text-xs text-muted-foreground">Assurance inspection</p><strong>{inspection?.reference??"Unidentified"} · {inspection?.title??"Linked inspection unavailable"}</strong><p className="text-xs">Result: {inspection?.result??"Unknown"} · Inspected: {inspection?.inspection_date??"—"}</p>
           {ncrs.map(n=>{const verification=d.verifications.find(v=>v.ncr_id===n.id);return <div key={n.id} className="rounded border p-2 text-xs"><strong>NCR {n.reference}: {n.severity} · {n.status}</strong><p>Owner: {n.owner_user_id??"Unassigned"} · Due: {n.due_date??"—"}</p><p>{verification?`Independently verified ${verification.verified_at} by ${verification.verified_by}: ${verification.verification_notes}`:"No independent closure verification recorded"}</p></div>})}
           <Link to="/assurance-live" className="text-xs text-primary underline">Open assurance</Link>
          </div>;
         })}
        </div>;
       })}
       <p className="text-xs text-muted-foreground">First handoff recorded: {new Date(start.created_at).toLocaleDateString()} · By {start.created_by}</p>
      </article>;
     })}
    </section>
    {orphanActivation.length>0&&<section className="space-y-2"><h2 className="text-lg font-semibold">Activation items without formal readiness links</h2><p className="text-sm text-muted-foreground">These may be independent work or historical records. Do not assume they are readiness remediation.</p>{orphanActivation.slice(0,25).map(x=><div key={x.id} className="rounded border p-3 text-sm">{x.title} · {x.status}</div>)}{orphanActivation.length>25&&<p className="text-xs">Showing 25 of {orphanActivation.length} items.</p>}</section>}
   </>}
  </main></div>;
}
