import { Fragment, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceHeader, useSignOut } from "@/components/rpos/workspace-header";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit history — RPOS Workspace" },
      { name: "description", content: "Append-only history of changes to portfolios, projects and memberships." },
      { property: "og:title", content: "Audit history — RPOS Workspace" },
      { property: "og:description", content: "Append-only history of changes to portfolios, projects and memberships." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Audit,
});

const ENTITY = [["all", "All records"], ["portfolio", "Portfolios"], ["project", "Projects"], ["organisation_membership", "Organisation members"], ["project_membership", "Project members"]];
const ACTION = [["all", "All actions"], ["create", "Created"], ["update", "Updated"], ["add", "Member added"], ["change_role", "Role changed"], ["remove", "Removed"]];

type Filters = { entity: string; action: string; from: string; to: string };

const PAGE_SIZE = 50;

async function load(f: Filters, page: number) {
  let q = supabase.from("audit_events").select("id, organisation_id, project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state, occurred_at").order("occurred_at", { ascending: false }).order("id", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  if (f.entity !== "all") q = q.eq("entity_type", f.entity);
  if (f.action !== "all") q = q.eq("action", f.action);
  if (f.from) q = q.gte("occurred_at", f.from);
  if (f.to) q = q.lte("occurred_at", `${f.to}T23:59:59.999Z`);
  const { data, error } = await q;
  if (error) throw error;
  return { rows: (data ?? []).slice(0, PAGE_SIZE), hasNext: (data ?? []).length > PAGE_SIZE };
}

function csvCell(value: unknown): string {
  const raw = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  // Prevent spreadsheet formula execution when an audit export is opened in Excel.
  const safe = /^\s*[=+@-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function exportPage(rows: Awaited<ReturnType<typeof load>>["rows"]) {
  const columns = ["Timestamp (UTC)", "Entity type", "Action", "Entity ID", "Actor user ID", "Organisation ID", "Project ID", "Before (JSON)", "After (JSON)"];
  const records = rows.map((e) => [e.occurred_at, e.entity_type, e.action, e.entity_id, e.actor_user_id, e.organisation_id, e.project_id, e.before_state, e.after_state]);
  const csv = [columns, ...records].map((line) => line.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "rpos-audit-page-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Audit() {
  const { user } = Route.useRouteContext();
  const signOut = useSignOut();
  const [f, setF] = useState<Filters>({ entity: "all", action: "all", from: "", to: "" });
  const [page, setPage] = useState(0);
  const updateFilters = (next: Filters) => { setF(next); setPage(0); setOpen(null); };
  const q = useQuery({ queryKey: ["audit", f, page], queryFn: () => load(f, page) });
  const [open, setOpen] = useState<number | null>(null);
  const sel = "h-8 rounded-md border bg-background px-2 text-xs";

  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader email={user.email} onSignOut={signOut} />
      <main className="mx-auto max-w-6xl space-y-4 px-5 py-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Audit history</h1>
          <p className="text-sm text-muted-foreground">Project changes are visible to project members. Portfolio and organisation membership changes are visible to organisation admins, directors and managers. Entries cannot be edited or deleted.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Record type" className={sel} value={f.entity} onChange={(e) => updateFilters({ ...f, entity: e.target.value })}>{ENTITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select aria-label="Action" className={sel} value={f.action} onChange={(e) => updateFilters({ ...f, action: e.target.value })}>{ACTION.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <Input aria-label="From date" type="date" className="h-8 w-40 text-xs" value={f.from} onChange={(e) => updateFilters({ ...f, from: e.target.value })} />
          <Input aria-label="To date" type="date" className="h-8 w-40 text-xs" value={f.to} onChange={(e) => updateFilters({ ...f, to: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Showing up to {PAGE_SIZE} entries per page, newest first. Filters apply across the full audit history.</p>
          <button type="button" className="rounded border px-3 py-1.5 text-xs disabled:opacity-40" disabled={!q.data?.rows.length || q.isFetching} onClick={() => q.data && exportPage(q.data.rows)}>Export this page (CSV)</button>
        </div>
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {q.error && <p role="alert" className="text-sm text-destructive">Could not load audit history.</p>}
        {q.data && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr>{["When", "Record", "Action", "Record ID", "By", ""].map((h, i) => <th key={i} className="px-3 py-2">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {q.data.rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No audit entries match these filters.</td></tr>}
                {q.data.rows.map((e) => (
                  <Fragment key={e.id}>
                    <tr>
                      <td className="whitespace-nowrap px-3 py-2">{new Date(e.occurred_at).toLocaleString()}</td>
                      <td className="px-3 py-2">{ENTITY.find(([v]) => v === e.entity_type)?.[1] ?? e.entity_type}</td>
                      <td className="px-3 py-2">{ACTION.find(([v]) => v === e.action)?.[1] ?? e.action}</td>
                      <td className="px-3 py-2 font-mono">{e.entity_id}</td>
                      <td className="px-3 py-2 font-mono">{e.actor_user_id === user.id ? "you" : e.actor_user_id?.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-right"><button className="text-primary hover:underline" onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? "Hide" : "Details"}</button></td>
                    </tr>
                    {open === e.id && (
                      <tr key={`${e.id}-d`}><td colSpan={6} className="bg-muted/40 px-3 py-2">
                        <div className="grid gap-2 md:grid-cols-2">
                          <pre className="overflow-x-auto whitespace-pre-wrap text-[11px]"><b>Before</b>{"\n"}{JSON.stringify(e.before_state, null, 2) ?? "—"}</pre>
                          <pre className="overflow-x-auto whitespace-pre-wrap text-[11px]"><b>After</b>{"\n"}{JSON.stringify(e.after_state, null, 2) ?? "—"}</pre>
                        </div>
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {q.data && (page > 0 || q.data.hasNext) && (
          <div className="flex items-center justify-end gap-3">
            <button type="button" className="rounded border px-3 py-1.5 text-xs disabled:opacity-40" disabled={page === 0 || q.isFetching} onClick={() => { setPage((p) => Math.max(0, p - 1)); setOpen(null); }}>Previous</button>
            <span className="text-xs text-muted-foreground">Page {page + 1}</span>
            <button type="button" className="rounded border px-3 py-1.5 text-xs disabled:opacity-40" disabled={!q.data.hasNext || q.isFetching} onClick={() => { setPage((p) => p + 1); setOpen(null); }}>Next</button>
          </div>
        )}
      </main>
    </div>
  );
}
