import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const LINKS = [
  { to: "/workspace", label: "Projects" },
  { to: "/members", label: "Members" },
  { to: "/audit", label: "Audit history" },
] as const;

export function WorkspaceHeader({ email, onSignOut }: { email?: string | undefined; onSignOut: () => void }) {
  return (
    <header className="flex h-14 items-center gap-3 border-b bg-card px-5">
      <span className="grid size-8 place-items-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">R</span>
      <span className="font-display text-sm font-bold">RPOS Workspace</span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">Live data</span>
      <nav aria-label="Workspace" className="ml-4 flex gap-1">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted" activeProps={{ className: "bg-muted text-foreground" }}>{l.label}</Link>
        ))}
      </nav>
      <span className="ml-auto text-xs text-muted-foreground">{email}</span>
      <Button size="sm" variant="outline" onClick={onSignOut}><LogOut className="size-4" /> Sign out</Button>
    </header>
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
