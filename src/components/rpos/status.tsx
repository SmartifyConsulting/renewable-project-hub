import { cn } from "@/lib/utils";
import type { Band } from "@/lib/rpos/config";

const BAND_CLS: Record<Band, string> = {
  Low: "bg-risk-low-soft text-risk-low-foreground border-risk-low/40",
  "Slightly elevated": "bg-risk-slightly-elevated-soft text-risk-slightly-elevated-foreground border-risk-slightly-elevated/40",
  Moderate: "bg-risk-moderate-soft text-risk-moderate-foreground border-risk-moderate/40",
  High: "bg-risk-high-soft text-risk-high-foreground border-risk-high/40",
  "Very high": "bg-risk-very-high text-risk-very-high-foreground border-risk-very-high",
};
const DOT: Record<Band, string> = {
  Low: "bg-risk-low",
  "Slightly elevated": "bg-risk-slightly-elevated",
  Moderate: "bg-risk-moderate",
  High: "bg-risk-high",
  "Very high": "bg-risk-very-high",
};

export function RiskBadge({ band, className }: { band?: Band; className?: string }) {
  if (!band) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", BAND_CLS[band], className)}>
      <span className={cn("size-1.5 rounded-full", band === "Very high" ? "bg-risk-very-high-foreground" : DOT[band])} />
      {band}
    </span>
  );
}

export function bandFromScore(pct: number): Band {
  if (pct >= 80) return "Low";
  if (pct >= 65) return "Slightly elevated";
  if (pct >= 50) return "Moderate";
  if (pct >= 35) return "High";
  return "Very high";
}

const GOOD = ["Approved", "Completed", "Closed", "Verified", "Accepted", "Resolved", "Achieved", "Validated", "Effective", "Passed", "Implemented", "Complete", "On track", "Minutes approved", "Baselined", "Active", "GO", "Held"];
const WARN = ["Pending approval", "Under review", "Submitted", "In review", "Proposed", "Mitigating", "At risk", "Partially effective", "Conditional", "Assessed", "Reviewed", "Pending", "Pending review", "CONDITIONAL GO", "Retest", "Under investigation", "Corrective action", "Concern raised"];
const BAD = ["Overdue", "Rejected", "Failed", "Missed", "Ineffective", "NO-GO", "Open"];
const AI = ["AI observation", "AI recommendation"];

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cls = AI.includes(status)
    ? "bg-ai-soft text-ai border-ai/30"
    : GOOD.includes(status)
      ? "bg-success-soft text-success border-success/30"
      : WARN.includes(status)
        ? "bg-warning-soft text-foreground border-warning/40"
        : BAD.includes(status)
          ? "bg-risk-very-high-soft text-destructive border-destructive/30"
          : "bg-muted text-muted-foreground border-border";
  return <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", cls, className)}>{status}</span>;
}

export function ResultBadge({ result, large }: { result: "GO" | "CONDITIONAL GO" | "NO-GO"; large?: boolean }) {
  const cls = result === "GO" ? "bg-risk-low text-risk-low-foreground" : result === "CONDITIONAL GO" ? "bg-risk-moderate text-risk-moderate-foreground" : "bg-risk-very-high text-risk-very-high-foreground";
  return <span className={cn("inline-flex rounded-md font-display font-bold tracking-tight", large ? "px-3 py-1.5 text-lg" : "px-2 py-0.5 text-[11px]", cls)}>{result}</span>;
}

export function Meter({ value, className }: { value: number; className?: string }) {
  const band = bandFromScore(value);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-full min-w-12 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", DOT[band])} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{Math.round(value)}%</span>
    </div>
  );
}

export function SourceTag({ kind }: { kind: "AI observation" | "AI recommendation" | "Human-approved" | "System control" }) {
  const cls =
    kind === "Human-approved"
      ? "bg-success-soft text-success border-success/30"
      : kind === "System control"
        ? "bg-navy text-navy-foreground border-navy"
        : "bg-ai-soft text-ai border-ai/30";
  return <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", cls)}>{kind}</span>;
}
