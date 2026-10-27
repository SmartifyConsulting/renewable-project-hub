import {useEffect,useState} from "react";
import {createFileRoute} from "@tanstack/react-router";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {supabase} from "@/integrations/supabase/client";
import {WorkspaceHeader,useSignOut} from "@/components/rpos/workspace-header";
export const Route=createFileRoute("/_authenticated/escalations")({component:EscalationsPage});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db=supabase as any;
type Policy={organisation_id:string;warning_days:number;critical_days:number};
type Overview={project_id:string;organisation_id:string;delivery_alerts:number;schedule_alerts:number;approvals_pending:number;critical_alerts:number};
function EscalationsPage(){
 const {user}=Route.useRouteContext();const signOut=useSignOut();const qc=useQueryClient();
 const [org,setOrg]=useState("");const [warning,setWarning]=useState(2);const [critical,setCritical]=useState(7);const [saving,setSaving]=useState(false);
 const q=useQuery({queryKey:["escalation-admin",user.id],queryFn:async()=>{
 const [memberships,policies,overview,projects]=await Promise.all([
 supabase.from("organisation_memberships").select("organisation_id,role").eq("user_id",user.id),
 db.from("rpos_escalation_policies").select("organisation_id,warning_days,critical_days"),
 db.from("rpos_escalation_overview").select("project_id,organisation_id,delivery_alerts,schedule_alerts,approvals_pending,critical_alerts"),
 supabase.from("projects").select("id,name")]);
 const error=memberships.error??policies.error??overview.error??projects.error;if(error)throw error;
 return {memberships:memberships.data??[],policies:policies.data as Policy[],overview:overview.data as Overview[],projects:projects.data??[]};
 }});
 const selected=org||q.data?.memberships[0]?.organisation_id||"";
 const policy=q.data?.policies.find(p=>p.organisation_id===selected);
 useEffect(()=>{setWarning(policy?.warning_days??2);setCritical(policy?.critical_days??7);},[selected,policy?.warning_days,policy?.critical_days]);
 const canManage=q.data?.memberships.some(m=>m.organisation_id===selected&&["admin","director"].includes(m.role))??false;
 async function save(){setSaving(true);try{const r=await db.rpc("rpos_set_escalation_policy",{p_org:selected,p_warning:warning,p_critical:critical});if(r.error)throw r.error;await qc.invalidateQueries({queryKey:["escalation-admin",user.id]});toast.success("Escalation policy saved");}catch(e){toast.error(e instanceof Error?e.message:"Could not save policy");}finally{setSaving(false);}}
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/><main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
 <h1 className="text-2xl font-semibold">Escalation Administration</h1><p className="text-sm text-muted-foreground">Set organisation escalation thresholds and review active project alert counts. Threshold configuration is recorded in the audit history; automated escalation delivery is not enabled yet.</p>
 {q.isLoading&&<p>Loading escalation settings…</p>}{q.error&&<p role="alert" className="text-destructive">Unable to load settings. Apply migration 0030.</p>}
 {q.data&&<><label className="text-sm">Organisation<select className="ml-2 rounded border bg-background p-2" value={selected} onChange={e=>setOrg(e.target.value)}>{q.data.memberships.map(m=><option key={m.organisation_id} value={m.organisation_id}>{m.organisation_id}</option>)}</select></label>
 <section className="space-y-3 rounded border p-4"><h2 className="font-semibold">Escalation thresholds</h2><p className="text-xs text-muted-foreground">Warning and critical thresholds are stored for future automated escalation processing. The existing notification inbox currently uses its own critical/overdue indicators.</p>
 <div className="flex flex-wrap gap-4"><label className="text-sm">Warning after days<Input type="number" min={0} max={90} value={warning} onChange={e=>setWarning(Number(e.target.value))} disabled={!canManage}/></label><label className="text-sm">Critical after days<Input type="number" min={1} max={180} value={critical} onChange={e=>setCritical(Number(e.target.value))} disabled={!canManage}/></label></div>
 {canManage&&<Button disabled={saving||warning<0||critical<=warning||critical>180} onClick={save}>{saving?"Saving…":"Save policy"}</Button>}</section>
 <section className="space-y-2"><h2 className="font-semibold">Project escalation overview</h2>{q.data.overview.filter(o=>o.organisation_id===selected).map(o=><div key={o.project_id} className="rounded border p-3 text-sm"><strong>{q.data?.projects.find(p=>p.id===o.project_id)?.name??o.project_id}</strong><p>Delivery: {o.delivery_alerts} · Schedule: {o.schedule_alerts} · Approvals: {o.approvals_pending} · Critical: {o.critical_alerts}</p></div>)}</section></>}
 </main></div>;
}
