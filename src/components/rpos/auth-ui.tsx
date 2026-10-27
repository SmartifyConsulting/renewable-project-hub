import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { checkAuthConfig } from "@/lib/rpos/auth-config";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  const cfg = checkAuthConfig(import.meta.env as Record<string, string | undefined>);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">R</span>
          <div>
            <p className="font-display text-sm font-bold">RPOS Workspace</p>
            <p className="text-[11px] text-muted-foreground">Secure sign-in · real records</p>
          </div>
        </div>
        <h1 className="mb-4 font-display text-xl font-semibold">{title}</h1>
        {cfg.ok ? children : (
          <p role="alert" className="text-sm text-destructive">Sign-in is unavailable: the backend connection is not configured ({cfg.missing.join(", ")}).</p>
        )}
      </div>
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} required value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className="pr-9" />
      <button type="button" tabIndex={-1} aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 px-2.5 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
