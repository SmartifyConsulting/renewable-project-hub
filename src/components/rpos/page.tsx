import { Link } from "@tanstack/react-router";
import { ChevronRight, HelpCircle, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function PageHeader({ crumbs, title, description, actions, help }: { crumbs: string[]; title: string; description?: string; actions?: ReactNode; help?: string }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">RPOS</Link>
          {crumbs.map((c) => (
            <span key={c} className="flex items-center gap-1">
              <ChevronRight className="size-3" />
              {c}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
          {help && (
            <Popover>
              <PopoverTrigger aria-label="Contextual help" className="text-muted-foreground hover:text-primary">
                <HelpCircle className="size-4" />
              </PopoverTrigger>
              <PopoverContent className="text-sm">{help}</PopoverContent>
            </Popover>
          )}
        </div>
        {description && <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className, bodyClass }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("panel min-w-0", className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <h2 className="font-display text-sm font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      <div className={cn("p-4", bodyClass)}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, sub, trend, onClick, tone }: { label: string; value: ReactNode; sub?: string; trend?: number; onClick?: () => void; tone?: "bad" | "good" }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={cn("panel flex flex-col items-start p-3.5 text-left", onClick && "transition hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring")}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("mt-1 font-display text-2xl font-semibold tabular-nums", tone === "bad" && "text-destructive", tone === "good" && "text-success")}>{value}</span>
      <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
        {trend !== undefined && (trend >= 0 ? <TrendingUp className="size-3 text-success" /> : <TrendingDown className="size-3 text-destructive" />)}
        {sub}
      </span>
    </Comp>
  );
}

export interface ViewDef {
  id: string;
  label: string;
  group?: string;
}
export function ViewTabs({ views, value, onChange }: { views: ViewDef[]; value: string; onChange: (id: string) => void }) {
  const groups: { name?: string; items: ViewDef[] }[] = [];
  for (const v of views) {
    const g = groups.find((x) => x.name === v.group);
    if (g) g.items.push(v);
    else groups.push({ name: v.group, items: [v] });
  }
  return (
    <div className="mb-5 -mx-1 overflow-x-auto pb-1">
      <div role="tablist" className="flex min-w-max items-center gap-3 px-1">
        {groups.map((g, gi) => (
          <div key={gi} className="flex items-center gap-1">
            {g.name && <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g.name}</span>}
            {g.items.map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={value === v.id}
                onClick={() => onChange(v.id)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition",
                  value === v.id ? "bg-navy text-navy-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {v.label}
              </button>
            ))}
            {gi < groups.length - 1 && <span className="ml-2 h-5 w-px bg-border" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
      <p className="font-display font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export const searchView = (s: Record<string, unknown>) => ({ view: typeof s.view === "string" ? s.view : undefined });
