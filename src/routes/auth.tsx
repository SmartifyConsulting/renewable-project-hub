import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { mapAuthError } from "@/lib/rpos/auth-config";
import { AuthCard, PasswordInput } from "@/components/rpos/auth-ui";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — RPOS Workspace" },
      { name: "description", content: "Sign in to your organisation's RPOS workspace." },
      { property: "og:title", content: "Sign in — RPOS Workspace" },
      { property: "og:description", content: "Sign in to your organisation's RPOS workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(mapAuthError(error));
    navigate({ to: "/workspace", replace: true });
  }

  return (
    <AuthCard title="Sign in">
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <p aria-live="polite" className="min-h-4 text-xs text-destructive">{error}</p>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        <div className="flex justify-between text-xs">
          <Link to="/forgot-password" tabIndex={-1} className="text-primary hover:underline">Forgot password?</Link>
          <Link to="/" tabIndex={-1} className="text-muted-foreground hover:underline">Open demo instead</Link>
        </div>
        <p className="text-[11px] text-muted-foreground">Accounts and access are provisioned by your organisation administrator.</p>
      </form>
    </AuthCard>
  );
}
