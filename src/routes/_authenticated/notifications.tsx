import {useQuery,useQueryClient} from "@tanstack/react-query";
import {createFileRoute,Link} from "@tanstack/react-router";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {supabase} from "@/integrations/supabase/client";
import {WorkspaceHeader,useSignOut} from "@/components/rpos/workspace-header";
export const Route=createFileRoute("/_authenticated/notifications")({component:NotificationsPage});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db=supabase as any;
type Notification={notification_key:string;project_id:string;category:string;title:string;message:string;severity:string;occurred_at:string;is_read:boolean};
function NotificationsPage(){
 const {user}=Route.useRouteContext();const signOut=useSignOut();const qc=useQueryClient();
 const query=useQuery({queryKey:["rpos-notifications",user.id],queryFn:async()=>{const r=await db.rpc("rpos_my_notifications");if(r.error)throw r.error;return r.data as Notification[];},refetchInterval:60000});
 const items=query.data??[];const unread=items.filter(n=>!n.is_read);
 async function mark(n:Notification){const r=await db.from("rpos_notification_reads").upsert({user_id:user.id,notification_key:n.notification_key});if(r.error){toast.error(r.error.message);return;}await qc.invalidateQueries({queryKey:["rpos-notifications",user.id]});}
 return <div className="min-h-screen bg-background"><WorkspaceHeader email={user.email} onSignOut={signOut}/>
 <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
 <h1 className="text-2xl font-semibold">Notifications</h1>
 <p className="text-sm text-muted-foreground">In-app alerts for critical or overdue delivery items, blocked schedules and AI recommendations awaiting review. Refreshed every minute.</p>
 <div className="rounded border p-3 text-sm"><strong>{unread.length}</strong> unread · {items.length} active notifications</div>
 {query.isLoading&&<p>Loading notifications…</p>}
 {query.error&&<p role="alert" className="text-destructive">Notifications unavailable. Check migration 0029.</p>}
 {query.isSuccess&&items.length===0&&<p>No active notifications.</p>}
 <div className="space-y-2">{items.map(n=><article key={n.notification_key} className="flex flex-wrap items-start justify-between gap-3 rounded border p-3 text-sm">
 <div className="space-y-1"><strong>{n.title}</strong><p>{n.message} · {n.severity}</p><p className="text-xs text-muted-foreground">Project {n.project_id} · {new Date(n.occurred_at).toLocaleDateString()}</p>
 <Link className="text-primary underline" to={n.category==="approval"?"/agents-live":n.category==="schedule"?"/schedule":"/delivery-live"}>Open workspace</Link></div>
 <Button size="sm" variant="outline" disabled={n.is_read} onClick={()=>mark(n)}>{n.is_read?"Read":"Mark read"}</Button>
 </article>)}</div>
 </main></div>;
}
