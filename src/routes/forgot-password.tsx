import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { mapAuthError } from "@/lib/rpos/auth-config";
import { AuthCard } from "@/components/rpos/auth-ui";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — RPOS Workspace" },
      { name: "description", content: "Request a password reset link for your RPOS account." },
      { property: "og:title", content: "Reset password — RPOS Workspace" },
      { property: "og:description", content: "Request a password reset link for your RPOS account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setError(mapAuthError(error));
    else setSent(true);
  }
  return (
    <AuthCard title="Forgot password">
      {sent ? (
        <p className="text-sm">If an account exists for {email}, a reset link is on its way.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <p aria-live="polite" className="text-xs text-destructive">{error}</p>
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
      )}
      <Link to="/auth" className="mt-4 block text-xs text-primary hover:underline">Back to sign in</Link>
    </AuthCard>
  );
}
