import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { WorkspaceSubnav } from "@/components/rpos/workspace-subnav";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const LINKS = [
  { to: "/project-overview", label: "Overview" },
  { to: "/workspace", label: "Projects" },
  { to: "/members", label: "Members" },
  { to: "/readiness-live", label: "Readiness" },
  { to: "/knowledge-live", label: "Knowledge" },
  { to: "/activation-live", label: "Activation" },
  { to: "/delivery-live", label: "Delivery" },
  { to: "/assurance-live", label: "Assurance" },
  { to: "/executive", label: "Executive" },
  { to: "/traceability", label: "Traceability" },
  { to: "/project-closure", label: "Project closure" },
  { to: "/agents-live", label: "AI Agents" },
  { to: "/notifications", label: "Notifications" },
  { to: "/escalations", label: "Escalations" },
  { to: "/audit", label: "Audit history" },
] as const;

export function WorkspaceHeader({ email, onSignOut }: { email?: string | undefined; onSignOut: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: state => state.location.pathname });
  return (
    <><header className="flex min-h-14 flex-wrap items-center gap-3 border-b bg-card px-5 py-2">
      <span className="grid size-8 place-items-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">R</span>
      <span className="font-display text-sm font-bold">RPOS Workspace</span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">Live data</span>
      <Button size="sm" variant="outline" className="ml-auto xl:hidden" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Menu className="size-4" /></Button>
      <nav aria-label="Workspace" className={`${menuOpen ? "flex" : "hidden"} order-last w-full flex-wrap items-center gap-1 xl:order-none xl:ml-4 xl:flex xl:w-auto`}>
        {LINKS.filter(l=>["/project-overview","/workspace","/knowledge-live","/readiness-live","/activation-live","/delivery-live","/assurance-live"].includes(l.to)).map(l=><Link key={l.to} to={l.to} onClick={()=>setMenuOpen(false)} className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted" activeProps={{className:"bg-muted text-foreground"}}>{l.label}</Link>)}
        <details className="relative">
          <summary className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">Tools & governance</summary>
          <div className="z-20 mt-1 flex flex-wrap gap-1 rounded-lg border bg-card p-2 shadow-lg xl:absolute xl:right-0 xl:w-80">
            {LINKS.filter(l=>!["/project-overview","/workspace","/knowledge-live","/readiness-live","/activation-live","/delivery-live","/assurance-live"].includes(l.to)).map(l=><Link key={l.to} to={l.to} onClick={()=>setMenuOpen(false)} className="rounded-md px-2.5 py-2 text-xs text-muted-foreground hover:bg-muted" activeProps={{className:"bg-muted text-foreground"}}>{l.label}</Link>)}
          </div>
        </details>
      </nav>
      <span className="hidden max-w-40 truncate text-xs text-muted-foreground lg:inline" title={email}>{email}</span>
      <Button size="sm" variant="outline" onClick={onSignOut}><LogOut className="size-4" /> Sign out</Button>
    </header>
    {pathname === "/delivery-live" && <div className="mx-auto w-full max-w-6xl px-5 pt-4"><WorkspaceSubnav area="delivery"/></div>}
    </>
  );
}

export function UserIdBadge({ id }: { id: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
      <span className="text-[11px] text-muted-foreground">Your user ID</span>
      <code className="font-mono text-xs">{id}</code>
      <Button size="sm" variant="ghost" aria-label="Copy user ID" onClick={() => navigator.clipboard.writeText(id).then(() => toast.success("Copied"))}><Copy className="size-3.5" /></Button>
    </div>
  );
}

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}
