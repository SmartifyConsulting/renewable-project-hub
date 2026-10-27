import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Columns3, Download, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BANDS, REGISTERS } from "@/lib/rpos/config";
import { currentUser, projectName, scopedProjects, useRpos } from "@/lib/rpos/store";
import type { RecordItem } from "@/lib/rpos/types";
import { RiskBadge, StatusBadge } from "./status";
import { RecordForm } from "./record-form";
import { RecordSheet } from "./record-sheet";
import { EmptyState } from "./page";

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return toast.error("Nothing to export");
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} rows`, { description: `${name}.csv` });
}

interface Col {
  key: string;
  label: string;
  get: (r: RecordItem) => string;
  render?: (r: RecordItem) => React.ReactNode;
}

export function Register({ type, filter, title, pageSize = 10, compact }: { type: string; filter?: (r: RecordItem) => boolean; title?: string; pageSize?: number; compact?: boolean }) {
  const s = useRpos();
  const def = REGISTERS[type];
  const user = currentUser(s);
  const scope = scopedProjects(s).map((p) => p.id);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sev, setSev] = useState("all");
  const [owner, setOwner] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "id", dir: 1 });
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const cols: Col[] = useMemo(() => {
    const c: Col[] = [
      { key: "id", label: "ID", get: (r) => r.id, render: (r) => <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span> },
      { key: "title", label: "Title", get: (r) => r.title, render: (r) => <span className="font-medium">{r.title}</span> },
      { key: "project", label: "Project", get: (r) => projectName(s, r.projectId) },
      { key: "owner", label: "Owner", get: (r) => r.owner },
      { key: "status", label: "Status", get: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    ];
    if (def.severity) c.push({ key: "severity", label: "Rating", get: (r) => String(BANDS.indexOf(r.severity!)), render: (r) => <RiskBadge band={r.severity} /> });
    for (const ex of def.extra ?? []) c.push({ key: ex.key, label: ex.label, get: (r) => r.fields[ex.key] ?? "" });
    c.push({ key: "due", label: "Due", get: (r) => r.due, render: (r) => <span className="tabular-nums">{r.due}</span> });
    c.push({ key: "links", label: "Links", get: (r) => String(r.links.length).padStart(3, "0"), render: (r) => <span className="tabular-nums text-muted-foreground">{r.links.length}</span> });
    return c;
  }, [def, s]);
  const [hidden, setHidden] = useState<string[]>(compact ? ["project", "links", ...(def.extra ?? []).map((e) => e.key)] : (def.extra ?? []).slice(1).map((e) => e.key));

  const rows = useMemo(() => {
    const ql = q.toLowerCase();
    const col = cols.find((c) => c.key === sort.key) ?? cols[0];
    return s.records
      .filter((r) => r.type === type && scope.includes(r.projectId))
      .filter((r) => (showArchived ? r.archived : !r.archived))
      .filter((r) => !filter || filter(r))
      .filter((r) => status === "all" || r.status === status)
      .filter((r) => sev === "all" || r.severity === sev)
      .filter((r) => owner === "all" || r.owner === owner)
      .filter((r) => !ql || `${r.id} ${r.title} ${r.owner} ${r.description}`.toLowerCase().includes(ql))
      .sort((a, b) => col.get(a).localeCompare(col.get(b)) * sort.dir);
  }, [s.records, type, scope.join(), filter, status, sev, owner, q, sort, cols, showArchived]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const p = Math.min(page, pages - 1);
  const view = rows.slice(p * pageSize, p * pageSize + pageSize);
  const owners = [...new Set(s.records.filter((r) => r.type === type).map((r) => r.owner))].sort();
  const visible = cols.filter((c) => !hidden.includes(c.key));

  return (
    <div className="panel min-w-0">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
        <h2 className="mr-auto font-display text-sm font-semibold">
          {title ?? `${def.label} register`} <span className="ml-1 text-xs font-normal text-muted-foreground">{rows.length}</span>
        </h2>
        <div className="relative">
          <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
          <Input aria-label={`Search ${def.label}`} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search…" className="h-8 w-44 pl-7 text-xs" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger aria-label="Filter status" className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {def.statuses.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
          </SelectContent>
        </Select>
        {def.severity && (
          <Select value={sev} onValueChange={(v) => { setSev(v); setPage(0); }}>
            <SelectTrigger aria-label="Filter rating" className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              {BANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {!compact && (
          <Select value={owner} onValueChange={(v) => { setOwner(v); setPage(0); }}>
            <SelectTrigger aria-label="Filter owner" className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {owners.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8" aria-label="Choose columns"><Columns3 className="size-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Columns</DropdownMenuLabel>
            {cols.map((c) => (
              <DropdownMenuCheckboxItem key={c.key} checked={!hidden.includes(c.key)} onCheckedChange={(v) => setHidden((h) => (v ? h.filter((x) => x !== c.key) : [...h, c.key]))} onSelect={(e) => e.preventDefault()}>
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} onSelect={(e) => e.preventDefault()}>Show archived only</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" className="h-8" onClick={() => downloadCsv(`${def.key}-register`, rows.map((r) => Object.fromEntries(cols.map((c) => [c.label, c.key === "severity" ? r.severity ?? "" : c.get(r)]))))}>
          <Download className="size-3.5" /> Export
        </Button>
        {user.canEdit && (
          <Button size="sm" className="h-8" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> New
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState title={`No ${def.label.toLowerCase()} match`} text="Adjust filters or the project selector, or create a new record." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {visible.map((c) => (
                  <th key={c.key} className="px-3 py-2 font-semibold whitespace-nowrap">
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((x) => ({ key: c.key, dir: x.key === c.key ? (-x.dir as 1 | -1) : 1 }))}>
                      {c.label}
                      {sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={r.id} tabIndex={0} onClick={() => setOpenId(r.id)} onKeyDown={(e) => e.key === "Enter" && setOpenId(r.id)} className="cursor-pointer border-t hover:bg-accent/60 focus-visible:bg-accent">
                  {visible.map((c) => (
                    <td key={c.key} className="max-w-72 truncate px-3 py-2">{c.render ? c.render(r) : c.get(r) || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
        <span>
          {rows.length ? p * pageSize + 1 : 0}–{Math.min(rows.length, (p + 1) * pageSize)} of {rows.length}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7" disabled={p === 0} onClick={() => setPage(p - 1)}>Previous</Button>
          <span className="tabular-nums">{p + 1} / {pages}</span>
          <Button variant="ghost" size="sm" className="h-7" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>Next</Button>
        </div>
      </div>
      <RecordSheet id={openId} onOpenChange={(o) => !o && setOpenId(null)} onNavigate={setOpenId} />
      <RecordForm type={type} open={creating} onOpenChange={setCreating} />
    </div>
  );
}
