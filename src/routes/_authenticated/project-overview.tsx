import { useActiveProject } from "@/lib/rpos/active-project";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DOMAINS } from "@/lib/rpos/config";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceHeader, useSignOut } from "@/components/rpos/workspace-header";

export const Route = createFileRoute("/_authenticated/project-overview")({ component: ProjectOverview });
const db = supabase as any;
type Project = { id: string; name: string; stage: string; status: string };
type Kpi = { project_id: string; activation_total: number; activation_completed: number; activation_blocked: number; schedule_overdue: number; critical_ncrs: number; open_risks: number; pending_changes: number };
type Fact = { project_id: string; review_status: string };
type Source = { project_id: string; status: string };
type Gate = { project_id: string; decision: string; decided_at: string };
type Assessment = { project_id:string;domain_id:string;score:number|null;evidence_verified:boolean;hard_stop:boolean;evidence_notes:string };
type Activation = {project_id:string;id:string;notes:string;status:string};
type Schedule={project_id:string;id:string;status:string};
type Inspection={project_id:string;id:string;result:string};
type Ncr={project_id:string;id:string;inspection_id:string;status:string};
type Verification={project_id:string;ncr_id:string};
type Action = { title: string; description: string; to: "/knowledge-live"|"/knowledge-facts"|"/readiness-live"|"/activation-live"|"/delivery-live"|"/schedule"|"/assurance-live"; level: "attention"|"next" };

async function load() {
 const [projects, kpis, sources, facts, gates, assessments, activation, links, schedules, inspections, ncrs, verifications] = await Promise.all([
  supabase.from("projects").select("id,name,stage,status").order("name"),
  db.from("rpos_executive_project_kpis").select("project_id,activation_total,activation_completed,activation_blocked,schedule_overdue,critical_ncrs,open_risks,pending_changes"),
  db.from("rpos_knowledge_sources").select("project_id,status"),
  db.from("rpos_source_facts").select("project_id,review_status"),
  db.from("readiness_gate_decisions").select("project_id,decision,decided_at").order("decided_at",{ascending:false}),
  db.from("readiness_domain_assessments").select("project_id,domain_id,score,evidence_verified,hard_stop,evidence_notes"),
  db.from("rpos_activation_items").select("project_id,id,notes,status"),
  db.from("rpos_journey_links").select("project_id,source_type,source_id,target_type,target_id"),
  db.from("rpos_delivery_schedule").select("project_id,id,status"),
  db.from("rpos_assurance_inspections").select("project_id,id,result"),
  db.from("rpos_assurance_ncrs").select("project_id,id,inspection_id,status"),
  db.from("rpos_assurance_verifications").select("project_id,ncr_id")
 ]);
 const error=projects.error??kpis.error??sources.error??facts.error??gates.error??assessments.error??activation.error??links.error??schedules.error??inspections.error??ncrs.error??verifications.error;
 if(error)throw error;
 return {projects:(projects.data??[]) as Project[],kpis:(kpis.data??[]) as Kpi[],sources:(sources.data??[]) as Source[],facts:(facts.data??[]) as Fact[],gates:(gates.data??[]) as Gate[],assessments:(assessments.data??[]) as Assessment[],activation:(activation.data??[]) as Activation[],links:(links.data??[]) as {project_id:string;source_type:string;source_id:string;target_type:string;target_id:string}[],schedules:(schedules.data??[]) as Schedule[],inspections:(inspections.data??[]) as Inspection[],ncrs:(ncrs.data??[]) as Ncr[],verifications:(verifications.data??[]) as Verification[]};
}

function ProjectOverview(){
 const {user}=Route.useRouteContext();
 const signOut=useSignOut();
 const qc=useQueryClient();
 const [creating,setCreating]=useState("");
 const [projectId,setProjectId]=useActiveProject();
 const q=useQuery({queryKey:["rpos-project-journey",user.id],queryFn:load});
 const d=q.data;
 const project=d?.projects.find(p=>p.id===projectId)??d?.projects[0];
 const k=d?.kpis.find(x=>x.project_id===project?.id);
 const sources=d?.sources.filter(x=>x.project_id===project?.id)??[];
 const facts=d?.facts.filter(x=>x.project_id===project?.id)??[];
 const gate=d?.gates.find(x=>x.project_id===project?.id);
 const pending=facts.filter(x=>x.review_status==="pending").length;
 const gaps=d?.assessments.filter(a=>a.project_id===project?.id&&(a.hard_stop||a.score===null||a.score<3||!a.evidence_verified))??[];
 const activation=d?.activation.filter(a=>a.project_id===project?.id)??[];
 async function createGapAction(a:Assessment){
  if(!project||creating)return;
  const marker=`[Readiness gap: ${a.domain_id}]`;
  if(activation.some(x=>x.notes.includes(marker)&&x.status!=="cancelled")||d?.links.some(x=>x.project_id===project.id&&x.source_type==="readiness_domain"&&x.source_id===a.domain_id&&x.target_type==="activation_item")){toast.info("An activation action already exists for this readiness gap.");return;}
  const domain=DOMAINS.find(x=>x.id===a.domain_id);
  setCreating(a.domain_id);
  try{
   const {data:created,error}=await db.rpc("rpos_save_activation_item",{p_project_id:project.id,p_title:`Resolve ${domain?.name??a.domain_id} readiness gap`,p_workstream:"Readiness remediation",p_type:"task",p_day:1,p_notes:`${marker} Origin: readiness assessment for project ${project.id}. ${a.hard_stop?"Hard stop. ":""}${a.evidence_verified?"":"Evidence not verified. "}${a.evidence_notes??""}`.slice(0,4000),p_status:"not_started"});
   if(error)throw error;
   const {error:linkError}=await db.rpc("rpos_link_journey",{p_project_id:project.id,p_source_type:"readiness_domain",p_source_id:a.domain_id,p_target_type:"activation_item",p_target_id:created.id});
   if(linkError){await qc.invalidateQueries({queryKey:["rpos-project-journey",user.id]});throw new Error(`Activation task created, but traceability link failed: ${linkError.message}`);}
   await qc.invalidateQueries({queryKey:["rpos-project-journey",user.id]});
   toast.success("Readiness gap transferred to the activation plan. Assign an owner and target day.");
  }catch(e){toast.error(e instanceof Error?e.message:"Could not create activation action");}finally{setCreating("");}
 }
 const actions:Action[]=[];
 if(project){
  if(sources.length===0)actions.push({title:"Start with project evidence",description:"Register documents so assessments and decisions have a traceable foundation.",to:"/knowledge-live",level:"next"});
  else if(pending>0)actions.push({title:"Review extracted evidence",description:`${pending} fact candidates still await independent review.`,to:"/knowledge-facts",level:"next"});
  if(!gate)actions.push({title:"Complete the readiness decision",description:"Assess the 14 domains and request an authorised gate decision when evidence is sufficient.",to:"/readiness-live",level:"next"});
  else if(gate.decision==="NO-GO")actions.push({title:"Resolve the readiness blockers",description:"Review the NO-GO decision and address the evidence or domain gaps.",to:"/readiness-live",level:"attention"});
  else if(gate.decision==="CONDITIONAL GO")actions.push({title:"Track conditional approval requirements",description:"Review conditions and reflect authorised work in the activation plan.",to:"/activation-live",level:"next"});
  if(gate&&Number(k?.activation_total??0)===0)actions.push({title:"Create the 60-day activation plan",description:"Translate the approved priorities into milestones, owners and dependencies.",to:"/activation-live",level:"next"});
  if(Number(k?.activation_blocked??0)>0)actions.push({title:"Resolve blocked activation items",description:`${k?.activation_blocked} activation items are blocked.`,to:"/activation-live",level:"attention"});
  if(Number(k?.schedule_overdue??0)>0)actions.push({title:"Address overdue schedule items",description:`${k?.schedule_overdue} scheduled activities are overdue.`,to:"/schedule",level:"attention"});
  if(Number(k?.critical_ncrs??0)>0)actions.push({title:"Resolve critical assurance findings",description:`${k?.critical_ncrs} critical nonconformances require attention.`,to:"/assurance-live",level:"attention"});
  if(Number(k?.pending_changes??0)>0)actions.push({title:"Review pending changes",description:`${k?.pending_changes} changes await a decision.`,to:"/delivery-live",level:"attention"});
 }
 const journey=[
  {name:"Understand",detail:`${sources.length} documents · ${facts.length} facts`,to:"/knowledge-live" as const,ready:sources.length>0},
  {name:"Assess readiness",detail:gate?`Latest decision: ${gate.decision}`:"No gate decision recorded",to:"/readiness-live" as const,ready:!!gate},
  {name:"Activate",detail:`${Number(k?.activation_completed??0)} of ${Number(k?.activation_total??0)} completed`,to:"/activation-live" as const,ready:Number(k?.activation_total??0)>0},
  {name:"Deliver",detail:`${Number(k?.schedule_overdue??0)} overdue schedule items · ${Number(k?.open_risks??0)} open risks`,to:"/delivery-live" as const,ready:Number(k?.activation_total??0)>0},
  {name:"Assure",detail:`${Number(k?.critical_ncrs??0)} critical nonconformances`,to:"/assurance-live" as const,ready:Number(k?.critical_ncrs??0)===0}
 ];
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/>
  <main className="mx-auto max-w-6xl space-y-6 px-5 py-6">
   <div><h1 className="text-2xl font-semibold">Project overview</h1><p className="text-sm text-muted-foreground">One project journey, from evidence and readiness through activation, delivery and assurance. Recommendations are guidance, not automatic gate approvals.</p></div>
   {q.isLoading&&<p>Loading project journey…</p>}
   {q.error&&<p role="alert" className="text-destructive">Project overview data unavailable. Check the knowledge, readiness and executive database migrations.</p>}
   {d&&d.projects.length===0&&<div className="rounded-lg border p-5">No accessible projects yet. <Link className="text-primary underline" to="/workspace">Create or join a project</Link>.</div>}
   {d&&project&&<>
    <label className="block text-sm font-medium">Current project <select className="mt-1 block w-full max-w-lg rounded-md border bg-background p-3" value={project.id} onChange={e=>setProjectId(e.target.value)}>{d.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <div className="grid gap-3 sm:grid-cols-3">
     <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Project stage</p><p className="text-lg font-semibold">{project.stage||"Not assigned"}</p></div>
     <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Readiness decision</p><p className="text-lg font-semibold">{gate?.decision??"Not decided"}</p></div>
     <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Outstanding exceptions</p><p className="text-lg font-semibold">{Number(k?.activation_blocked??0)+Number(k?.schedule_overdue??0)+Number(k?.critical_ncrs??0)}</p></div>
    </div>
    <section className="space-y-3"><h2 className="text-xl font-semibold">What needs attention next?</h2>
     {actions.length===0?<div className="rounded-lg border p-4 text-sm">No next-action rules triggered by the available records. Review the project workspaces for further activity.</div>:actions.map((a,i)=><article key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div className="space-y-1"><p className="text-sm font-semibold">{a.level==="attention"?"Needs attention · ":""}{a.title}</p><p className="text-sm text-muted-foreground">{a.description}</p></div><Link className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" to={a.to}>Open task</Link></article>)}
    </section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Readiness gaps → Activation actions</h2><p className="text-sm text-muted-foreground">Turn assessed readiness gaps into trackable activation tasks. Each new task includes a reference to its originating readiness domain. Review and assign ownership in Activation.</p>
     {gaps.length===0?<p className="rounded-lg border p-4 text-sm">No recorded readiness gaps matching the current rules. Unassessed domains may still need evaluation.</p>:gaps.map(a=>{const marker=`[Readiness gap: ${a.domain_id}]`;const linked=activation.find(x=>x.notes.includes(marker)&&x.status!=="cancelled"||d?.links.some(l=>l.project_id===project.id&&l.source_type==="readiness_domain"&&l.source_id===a.domain_id&&l.target_id===x.id));return <div key={a.domain_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{a.domain_id} · {DOMAINS.find(x=>x.id===a.domain_id)?.name??"Readiness domain"}</p><p className="text-xs text-muted-foreground">Score: {a.score??"Not scored"} · {a.hard_stop?"Hard stop · ":""}{a.evidence_verified?"Evidence marked verified":"Evidence not verified"}</p></div>{linked?<Link className="text-sm text-primary underline" to="/activation-live">View activation action</Link>:<Button size="sm" disabled={!!creating} onClick={()=>createGapAction(a)}>{creating===a.domain_id?"Creating…":"Create activation action"}</Button>}</div>})}
    </section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Your project journey</h2><div className="grid gap-3 md:grid-cols-5">{journey.map((step,i)=><Link key={step.name} to={step.to} className="space-y-2 rounded-lg border p-4 hover:bg-muted/40"><p className="text-xs text-muted-foreground">Step {i+1}</p><p className="font-semibold">{step.name}</p><p className="text-xs text-muted-foreground">{step.detail}</p><p className="text-xs font-medium text-primary">{step.ready?"View progress":"Open workspace"}</p></Link>)}</div><p className="text-xs text-muted-foreground">Journey indicators summarise available records; they are not formal stage completion or permission to proceed.</p></section>
    <div className="flex flex-wrap gap-4 text-sm"><Link className="text-primary underline" to="/traceability">Project traceability</Link><Link className="text-primary underline" to="/agents-live">AI assistance</Link><Link className="text-primary underline" to="/notifications">My notifications</Link><Link className="text-primary underline" to="/executive">Executive intelligence</Link><Link className="text-primary underline" to="/audit">Audit history</Link><Link className="text-primary underline" to="/workspace">Manage projects</Link></div>
   </>}
  </main>
 </div>;
}
