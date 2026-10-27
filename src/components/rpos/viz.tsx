// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { REGISTERS } from "@/lib/rpos/config";
import { projectName, useRpos } from "@/lib/rpos/store";
import type { AuditEvent, RecordItem } from "@/lib/rpos/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status";

export const C = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 } };

export function BarsChart({ data, keys, x = "name", height = 220, stacked, horizontal }: { data: Record<string, unknown>[]; keys: string[]; x?: string; height?: number; stacked?: boolean; horizontal?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: horizontal ? 20 : -10, right: 8, top: 4 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={!!horizontal} horizontal={!horizontal} />
        {horizontal ? <><XAxis type="number" tick={axis} /><YAxis type="category" dataKey={x} tick={axis} width={120} /></> : <><XAxis dataKey={x} tick={axis} interval={0} /><YAxis tick={axis} /></>}
        <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {keys.map((k, i) => <Bar key={k} dataKey={k} stackId={stacked ? "a" : undefined} fill={C[i % C.length]} radius={stacked ? 0 : 3} maxBarSize={28} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LinesChart({ data, keys, x = "name", height = 220 }: { data: Record<string, unknown>[]; keys: string[]; x?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: -10, right: 8, top: 4 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={x} tick={axis} />
        <YAxis tick={axis} />
        <Tooltip {...tip} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {keys.map((k, i) => <Line key={k} dataKey={k} stroke={C[i % C.length]} strokeWidth={2} dot={{ r: 2.5 }} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 200, colors }: { data: { name: string; value: number }[]; height?: number; colors?: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2}>
          {data.map((d, i) => <Cell key={d.name} fill={(colors ?? C)[i % (colors ?? C).length]} />)}
        </Pie>
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export const BAND_COLORS = ["var(--risk-low)", "var(--risk-slightly-elevated)", "var(--risk-moderate)", "var(--risk-high)", "var(--risk-very-high)"];

export function ActivityFeed({ events, limit = 8 }: { events: AuditEvent[]; limit?: number }) {
  const s = useRpos();
  return (
    <ol className="space-y-2.5">
      {events.slice(0, limit).map((e) => (
        <li key={e.id} className="flex gap-2.5 text-xs">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0">
            <b>{e.actor}</b> <span className="text-muted-foreground">{e.action.toLowerCase()}</span>{" "}
            {e.target && (s.records.some((r) => r.id === e.target) ? <Link to="/records/$id" params={{ id: e.target }} className="font-mono text-primary hover:underline">{e.target}</Link> : <span className="font-mono">{e.target}</span>)}
            <div className="text-[10px] text-muted-foreground">{e.at}{e.projectId && ` · ${projectName(s, e.projectId)}`}</div>
          </div>
        </li>
      ))}
      {events.length === 0 && <li className="text-xs text-muted-foreground">No activity yet.</li>}
    </ol>
  );
}

export function MiniList({ items, empty = "Nothing here." }: { items: RecordItem[]; empty?: string }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y">
      {items.map((r) => (
        <li key={r.id}>
          <Link to="/records/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 py-2 text-xs hover:text-primary">
            <span className="min-w-0 truncate"><span className="font-mono text-[10px] text-muted-foreground">{r.id}</span> {r.title}</span>
            <StatusBadge status={r.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Evidence lineage: Source → Evidence → Requirement/Risk/Finding → Recommendation/Decision → Action */
export function LineageGraph({ rootId }: { rootId: string }) {
  const s = useRpos();
  const byId = (id: string) => s.records.find((r) => r.id === id);
  const root = byId(rootId);
  if (!root) return null;
  const evidence = root.type === "evidence" ? [root] : s.records.filter((r) => r.type === "evidence" && r.links.includes(root.id));
  const linkedTo = (items: RecordItem[], types: string[]) => {
    const ids = new Set(items.flatMap((i) => i.links));
    return s.records.filter((r) => ids.has(r.id) && types.includes(r.type));
  };
  const sources = linkedTo(evidence, ["source"]);
  const mids = linkedTo(evidence, ["requirement", "risk", "finding"]);
  const recs = linkedTo([...evidence, ...mids], ["recommendation", "decision"]);
  const acts = linkedTo([...mids, ...recs], ["action", "test"]);
  const cols: [string, RecordItem[]][] = [["Source", sources], ["Evidence", evidence], ["Fact / requirement / risk / finding", mids], ["Recommendation / decision", recs], ["Action / verification", acts]];
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[900px] grid-cols-5 gap-3">
        {cols.map(([label, items], ci) => (
          <div key={label} className="relative">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{ci + 1}. {label}</div>
            <div className="space-y-2">
              {items.slice(0, 6).map((r) => (
                <Link key={r.id} to="/records/$id" params={{ id: r.id }} className={cn("block rounded-md border bg-card p-2 text-xs shadow-sm hover:border-primary", r.id === rootId && "border-primary ring-2 ring-primary/30")}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span>
                    <span className="text-[10px] text-muted-foreground">{REGISTERS[r.type]?.singular}</span>
                  </div>
                  <div className="mt-0.5 line-clamp-2 font-medium">{r.title}</div>
                  <div className="mt-1"><StatusBadge status={r.status} /></div>
                </Link>
              ))}
              {items.length === 0 && <div className="rounded-md border border-dashed p-2 text-[11px] text-muted-foreground">No linked items</div>}
            </div>
            {ci < 4 && <span className="absolute -right-2.5 top-8 text-muted-foreground">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Gantt({ rows, day, onSelect }: { rows: { id: string; label: string; sub?: string; start: number; duration: number; progress: number; milestone?: boolean }[]; day?: number; onSelect?: (id: string) => void }) {
  const W = 60;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="ml-56 flex border-b pb-1 text-[10px] text-muted-foreground">
          {[0, 10, 20, 30, 40, 50, 60].map((d) => <span key={d} className="flex-1">Day {d}</span>)}
        </div>
        <div className="relative">
          {day !== undefined && <div className="absolute bottom-0 top-0 z-10 w-px bg-destructive" style={{ left: `calc(14rem + (100% - 14rem) * ${day / W})` }} title={`Today: day ${day}`} />}
          {rows.map((r) => {
            const late = day !== undefined && day > r.start + r.duration && r.progress < 100;
            return (
              <button key={r.id} onClick={() => onSelect?.(r.id)} className="flex w-full items-center border-b py-1.5 text-left hover:bg-muted/50">
                <span className="w-56 shrink-0 truncate pr-2 text-xs">
                  {r.label}
                  {r.sub && <span className="block text-[10px] text-muted-foreground">{r.sub}</span>}
                </span>
                <span className="relative h-4 flex-1">
                  {r.milestone ? (
                    <span className={cn("absolute top-0 size-3.5 rotate-45 border-2", r.progress >= 100 ? "border-success bg-success" : "border-navy bg-card")} style={{ left: `calc(${(r.start / W) * 100}% - 7px)` }} />
                  ) : (
                    <span className={cn("absolute top-0 h-4 overflow-hidden rounded-sm", late ? "bg-risk-very-high-soft ring-1 ring-destructive" : "bg-primary-soft")} style={{ left: `${(r.start / W) * 100}%`, width: `${Math.max(1.5, (r.duration / W) * 100)}%` }}>
                      <span className={cn("block h-full", late ? "bg-destructive/70" : "bg-primary")} style={{ width: `${r.progress}%` }} />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Grid({ children, cols = 4, className }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 | 6; className?: string }) {
  const m = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6" }[cols];
  return <div className={cn("grid grid-cols-2 gap-3", m, className)}>{children}</div>;
}
