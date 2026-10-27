import {useState} from "react";
import {createFileRoute,Link} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {supabase} from "@/integrations/supabase/client";
import {WorkspaceHeader,useSignOut} from "@/components/rpos/workspace-header";
export const Route=createFileRoute("/_authenticated/executive")({component:ExecutivePage});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db=supabase as any;
type Kpi={project_id:string;project_name:string;portfolio_id:string;activation_total:number;activation_completed:number;activation_blocked:number;open_risks:number;open_issues:number;open_actions:number;pending_changes:number;schedule_total:number;schedule_completed:number;schedule_overdue:number;inspections_total:number;open_ncrs:number;critical_ncrs:number;closed_ncrs:number};
const metrics:[keyof Kpi,string][]=[
 ["activation_total","Activation items"],["activation_completed","Activation completed"],["activation_blocked","Activation blocked"],
 ["open_risks","Open risks"],["open_issues","Open issues"],["open_actions","Open actions"],
 ["pending_changes","Pending changes"],["schedule_total","Scheduled activities"],["schedule_completed","Schedule completed"],
 ["schedule_overdue","Schedule overdue"],["inspections_total","Inspections"],["open_ncrs","Open NCRs"],["critical_ncrs","Critical NCRs"],["closed_ncrs","Closed NCRs"]
];
function ExecutivePage(){
 const {user}=Route.useRouteContext();const signOut=useSignOut();
 const [portfolioId,setPortfolioId]=useState("all");const [projectId,setProjectId]=useState("all");
 const query=useQuery({queryKey:["executive",user.id],queryFn:async()=>{
  const [kpis,portfolios]=await Promise.all([
   db.from("rpos_executive_project_kpis").select("*").order("project_name"),
   supabase.from("portfolios").select("id,name,org_id").order("name")
  ]);
  if(kpis.error)throw kpis.error;if(portfolios.error)throw portfolios.error;
  return {kpis:(kpis.data??[]) as Kpi[],portfolios:portfolios.data??[]};
 }});
 const data=query.data;
 const portfolioProjects=data?.kpis.filter(k=>portfolioId==="all"||k.portfolio_id===portfolioId)??[];
 const visible=portfolioProjects.filter(k=>projectId==="all"||k.project_id===projectId);
 const sum=(key:keyof Kpi)=>visible.reduce((acc,k)=>acc+Number(k[key]??0),0);
 const activationTotal=sum("activation_total"),scheduleTotal=sum("schedule_total");
 const exceptions=visible.filter(k=>Number(k.critical_ncrs)>0||Number(k.schedule_overdue)>0||Number(k.activation_blocked)>0);
 const percent=(done:number,total:number)=>total?Math.round(done/total*100):null;
 function exportCsv(){
  const cols=["project_name","project_id",...metrics.map(([key])=>key)] as (keyof Kpi)[];
  const escape=(v:unknown)=>'"'+String(v??"").replaceAll('"','""')+'"';
  const csv=[cols.join(","),...visible.map(r=>cols.map(k=>escape(r[k])).join(","))].join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="rpos-executive-kpis.csv";a.click();URL.revokeObjectURL(url);
 }
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/>
 <main className="mx-auto max-w-6xl space-y-5 px-5 py-6">
  <h1 className="text-2xl font-semibold">Executive Intelligence</h1>
  <p className="text-sm text-muted-foreground">Live portfolio and project indicators from activation, delivery schedules, project controls and assurance. Counts reflect records visible to your account.</p>
  {query.isLoading&&<p>Loading executive metrics…</p>}
  {query.error&&<p role="alert" className="text-destructive">Metrics unavailable. Apply migration 0021.</p>}
  {data&&<>
   <div className="flex flex-wrap items-end gap-3">
    <label className="text-sm">Portfolio <select className="block rounded border bg-background p-2" value={portfolioId} onChange={e=>{setPortfolioId(e.target.value);setProjectId("all");}}>
     <option value="all">All portfolios</option>{data.portfolios.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className="text-sm">Project <select className="block rounded border bg-background p-2" value={projectId} onChange={e=>setProjectId(e.target.value)}>
     <option value="all">All projects</option>{portfolioProjects.map(p=><option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}</select></label>
    <Button variant="outline" disabled={visible.length===0} onClick={exportCsv}>Export CSV</Button>
   </div>
   <div className="grid gap-3 sm:grid-cols-3">
    <div className="rounded border p-4"><strong className="text-2xl">{visible.length}</strong><p className="text-sm">Projects</p></div>
    <div className="rounded border p-4"><strong className="text-2xl">{percent(sum("activation_completed"),activationTotal)??"—"}{activationTotal?"%":""}</strong><p className="text-sm">Activation completion</p></div>
    <div className="rounded border p-4"><strong className="text-2xl">{percent(sum("schedule_completed"),scheduleTotal)??"—"}{scheduleTotal?"%":""}</strong><p className="text-sm">Schedule completion</p></div>
   </div>
   <section className="space-y-3 rounded border p-4" aria-label="Portfolio exceptions">
    <h2 className="font-semibold">Projects requiring attention ({exceptions.length})</h2>
    <p className="text-xs text-muted-foreground">Indicators are based on existing records, not an approved risk rating. Verify underlying records before acting.</p>
    {exceptions.length===0&&<p className="text-sm text-muted-foreground">No blocked activation items, overdue schedule activities or critical NCRs in this selection.</p>}
    {exceptions.map(k=><div key={k.project_id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm"><div><strong>{k.project_name}</strong><p className="text-xs text-muted-foreground">Blocked activation: {k.activation_blocked} · Overdue schedule: {k.schedule_overdue} · Critical NCRs: {k.critical_ncrs}</p></div><div className="flex gap-3"><Link to="/activation-live" className="text-primary underline">Activation</Link><Link to="/schedule" className="text-primary underline">Schedule</Link><Link to="/assurance-live" className="text-primary underline">Assurance</Link></div></div>)}
   </section>
   <section className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
    {metrics.map(([key,label])=><div key={key} className="rounded border p-3"><strong className="text-xl tabular-nums">{sum(key)}</strong><p className="text-xs text-muted-foreground">{label}</p></div>)}
   </section>
   <section className="space-y-2"><h2 className="font-semibold">Project comparison</h2>
    {visible.length===0&&<p className="text-sm text-muted-foreground">No projects in this selection.</p>}
    <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm">
     <thead><tr className="border-b"><th className="p-2">Project</th><th className="p-2">Activation</th><th className="p-2">Schedule</th><th className="p-2">Risks</th><th className="p-2">Overdue</th><th className="p-2">Open NCRs</th><th className="p-2">Critical NCRs</th></tr></thead>
     <tbody>{visible.map(k=><tr key={k.project_id} className="border-b"><td className="p-2 font-medium">{k.project_name}</td>
      <td className="p-2">{k.activation_completed}/{k.activation_total}</td><td className="p-2">{k.schedule_completed}/{k.schedule_total}</td>
      <td className="p-2">{k.open_risks}</td><td className="p-2">{k.schedule_overdue}</td><td className="p-2">{k.open_ncrs}</td><td className="p-2">{k.critical_ncrs}</td></tr>)}</tbody>
    </table></div>
   </section>
  </>}
 </main></div>;
}
