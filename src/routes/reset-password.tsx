import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { mapAuthError } from "@/lib/rpos/auth-config";
import { AuthCard, PasswordInput } from "@/components/rpos/auth-ui";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — RPOS Workspace" },
      { name: "description", content: "Choose a new password for your RPOS account." },
      { property: "og:title", content: "Set new password — RPOS Workspace" },
      { property: "og:description", content: "Choose a new password for your RPOS account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setReady(true); });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setError(mapAuthError(error));
    navigate({ to: "/workspace", replace: true });
  }
  return (
    <AuthCard title="Set a new password">
      {!ready ? (
        <p className="text-sm text-muted-foreground">This reset link is invalid or has expired. <Link to="/forgot-password" className="text-primary hover:underline">Request a new one</Link>.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Label htmlFor="password">New password</Label>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" />
          <p aria-live="polite" className="text-xs text-destructive">{error}</p>
          <Button type="submit" className="w-full">Update password</Button>
        </form>
      )}
    </AuthCard>
  );
}
