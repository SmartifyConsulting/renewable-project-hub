import {analyzeWithOpenAI} from "@/lib/rpos/agent-analyze.functions";
import {useState} from "react";
import {createFileRoute} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {toast} from "sonner";
import {supabase} from "@/integrations/supabase/client";
import {WorkspaceHeader,useSignOut} from "@/components/rpos/workspace-header";
import {WorkspaceSubnav} from "@/components/rpos/workspace-subnav";
export const Route=createFileRoute("/_authenticated/agent-evidence")({component:AgentEvidencePage});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db=supabase as any;
type Fact={fact_id:string;source_id:string;fact_key:string;fact_value:string;excerpt:string;conflict_count:number};
function AgentEvidencePage(){
 const {user}=Route.useRouteContext();const signOut=useSignOut();
 const [project,setProject]=useState("");const [agent,setAgent]=useState("");const [running,setRunning]=useState(false);
 const projects=useQuery({queryKey:["agent-evidence-projects",user.id],queryFn:async()=>{const r=await supabase.from("projects").select("id,name").order("name");if(r.error)throw r.error;return r.data??[];}});
 const agents=useQuery({queryKey:["agent-evidence-agents",user.id],queryFn:async()=>{const r=await db.from("rpos_ai_agents").select("agent_key,name").order("name");if(r.error)throw r.error;return r.data as {agent_key:string;name:string}[];}});
 const projectId=project||projects.data?.[0]?.id||"";const agentKey=agent||agents.data?.[0]?.agent_key||"";
 const evidence=useQuery({queryKey:["agent-evidence",projectId,agentKey],enabled:!!projectId&&!!agentKey,queryFn:async()=>{const r=await db.rpc("rpos_agent_evidence_brief",{p_project_id:projectId,p_agent_key:agentKey});if(r.error)throw r.error;return r.data as Fact[];}});
 const facts=evidence.data??[];const contradictions=facts.filter(f=>Number(f.conflict_count)>0);
 async function analyze(){setRunning(true);try{await analyzeWithOpenAI({data:{project_id:projectId,agent_key:agentKey}});toast.success("AI recommendation submitted for independent review");}catch(e){toast.error(e instanceof Error?e.message:"AI analysis failed");}finally{setRunning(false);}}
 const copy=()=>{const content=["Evidence brief (human-reviewed facts only)",`Project: ${projectId}`,`Agent: ${agentKey}`,"",...facts.map(f=>`[${f.fact_id}] Source ${f.source_id}\n${f.fact_key}: ${f.fact_value}\nExcerpt: ${f.excerpt||"Not supplied"}\nPotential conflicts: ${f.conflict_count}`),"","Do not infer unsupported facts. Independently verify any conclusions."];navigator.clipboard.writeText(content.join("\n\n"));};
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/>
 <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
 <h1 className="text-2xl font-semibold">Agent Evidence Brief</h1>
 <WorkspaceSubnav area="agents"/>
 <p className="text-sm text-muted-foreground">Only independently accepted RPOS Knowledge facts are shown. Conflicting values are flagged; AI recommendations use the reviewed evidence and require independent human approval; no decisions are automated.</p>
 <div className="flex flex-wrap gap-3">
 <label className="text-sm">Project <select className="block rounded border bg-background p-2" value={projectId} onChange={e=>setProject(e.target.value)}>{projects.data?.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <label className="text-sm">Agent <select className="block rounded border bg-background p-2" value={agentKey} onChange={e=>setAgent(e.target.value)}>{agents.data?.map(a=><option key={a.agent_key} value={a.agent_key}>{a.name}</option>)}</select></label>
 </div>
 {evidence.isLoading&&<p>Loading reviewed evidence…</p>}
 {evidence.error&&<p role="alert" className="text-destructive">Unable to load evidence. Ensure migration 0027 is installed and this agent is enabled for the organisation.</p>}
 {evidence.isSuccess&&<>
 <div className="grid gap-2 sm:grid-cols-3"><div className="rounded border p-3"><strong>{facts.length}</strong><p className="text-xs">Accepted facts</p></div>
 <div className="rounded border p-3"><strong>{new Set(facts.map(f=>f.source_id)).size}</strong><p className="text-xs">Referenced sources</p></div>
 <div className="rounded border p-3"><strong>{contradictions.length}</strong><p className="text-xs">Facts with potential contradictions</p></div></div>
 <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!facts.length} onClick={copy}>Copy evidence brief</Button><Button disabled={!facts.length||running} onClick={analyze}>{running?"Analysing…":"Generate AI recommendation"}</Button></div>
 {facts.length===0&&<p className="text-sm text-muted-foreground">No independently accepted facts are available for this project.</p>}
 <section className="space-y-2">{facts.map(f=><article key={f.fact_id} className="rounded border p-3 text-sm">
 <strong>{f.fact_key}</strong><p>{f.fact_value}</p>
 {f.excerpt&&<p className="mt-1 text-xs text-muted-foreground">Excerpt: {f.excerpt}</p>}
 <p className="mt-1 break-all text-xs text-muted-foreground">Source: {f.source_id} · Fact: {f.fact_id}</p>
 {Number(f.conflict_count)>0&&<p className="text-xs font-medium text-destructive">Potential contradiction: {f.conflict_count} other accepted value(s)</p>}
 </article>)}</section>
 </>}
 </main></div>;
}
