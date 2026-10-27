import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Archive, ExternalLink, Paperclip, Pencil, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PEOPLE, REGISTERS } from "@/lib/rpos/config";
import { actions, currentUser, projectName, useRpos } from "@/lib/rpos/store";
import type { RecordItem } from "@/lib/rpos/types";
import { RiskBadge, StatusBadge } from "./status";
import { Field } from "./page";
import { RecordForm } from "./record-form";

export function RecordSheet({ id, onOpenChange, onNavigate }: { id: string | null; onOpenChange: (o: boolean) => void; onNavigate?: (id: string) => void }) {
  const s = useRpos();
  const r = s.records.find((x) => x.id === id);
  return (
    <Sheet open={!!r} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {r && (
          <>
            <SheetHeader className="px-0">
              <SheetDescription className="font-mono text-xs">{r.id} · {REGISTERS[r.type]?.singular}</SheetDescription>
              <SheetTitle className="font-display text-lg leading-snug">{r.title}</SheetTitle>
              <div className="mt-1">
                <Link to="/records/$id" params={{ id: r.id }} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  Open full record <ExternalLink className="size-3" />
                </Link>
              </div>
            </SheetHeader>
            <RecordDetailBody record={r} onNavigate={onNavigate} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function RecordDetailBody({ record: r, onNavigate }: { record: RecordItem; onNavigate?: (id: string) => void }) {
  const s = useRpos();
  const def = REGISTERS[r.type];
  const user = currentUser(s);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [linkType, setLinkType] = useState<string | null>(null);
  const linked = s.records.filter((x) => r.links.includes(x.id));
  const groups = Object.entries(
    linked.reduce<Record<string, RecordItem[]>>((acc, x) => {
      (acc[x.type] ??= []).push(x);
      return acc;
    }, {}),
  );
  const reviewStatus = def.statuses.find((x) => ["Pending approval", "Under review", "Submitted", "In review"].includes(x));
  const approveStatus = def.statuses.find((x) => ["Approved", "Accepted", "Validated", "Verified"].includes(x));
  const rejectStatus = def.statuses.find((x) => x === "Rejected");

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={r.status} disabled={!user.canEdit} onValueChange={(v) => { actions.updateRecord(r.id, { status: v }, `Status changed to ${v}`); toast.success(`Status → ${v}`); }}>
          <SelectTrigger aria-label="Change status" className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{def.statuses.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={r.owner} disabled={!user.canEdit} onValueChange={(v) => { actions.updateRecord(r.id, { owner: v }, `Assigned to ${v}`); toast.success(`Assigned to ${v}`); }}>
          <SelectTrigger aria-label="Assign owner" className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{PEOPLE.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
        </Select>
        {user.canEdit && (
          <>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setEditing(true)}><Pencil className="size-3.5" /> Edit</Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setArchiving(true)}><Archive className="size-3.5" /> {r.archived ? "Restore" : "Archive"}</Button>
          </>
        )}
      </div>

      {(reviewStatus || approveStatus) && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2.5 text-xs">
          <span className="font-semibold">Workflow</span>
          {reviewStatus && r.status !== reviewStatus && user.canEdit && (
            <Button size="sm" variant="outline" className="h-7" onClick={() => { actions.updateRecord(r.id, { status: reviewStatus }, "Submitted for review"); actions.notify(`${r.id} submitted for review`); toast.success("Submitted for review"); }}>
              <Send className="size-3" /> Submit for review
            </Button>
          )}
          {approveStatus && r.status === reviewStatus && (
            user.canApprove ? (
              <>
                <Button size="sm" className="h-7" onClick={() => { actions.updateRecord(r.id, { status: approveStatus }, `${approveStatus} by ${user.person}`); toast.success(`${approveStatus}`); }}>Approve</Button>
                {rejectStatus && <Button size="sm" variant="destructive" className="h-7" onClick={() => { actions.updateRecord(r.id, { status: rejectStatus }, `Rejected by ${user.person}`); toast("Rejected"); }}>Reject</Button>}
              </>
            ) : (
              <span className="text-muted-foreground">Awaiting approver — your role ({user.name}) cannot approve.</span>
            )
          )}
          {r.type !== "action" && user.canEdit && (
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setLinkType("action")}><Plus className="size-3" /> Create linked action</Button>
          )}
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="relationships">Relationships ({linked.length})</TabsTrigger>
          <TabsTrigger value="comments">Comments ({r.comments.length})</TabsTrigger>
          <TabsTrigger value="attachments">Files ({r.attachments.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">{r.description || "No description."}</p>
          <dl className="grid grid-cols-2 gap-3">
            <Field label="Project">{projectName(s, r.projectId)}</Field>
            <Field label="Classification">{def.singular}</Field>
            <Field label="Status"><StatusBadge status={r.status} /></Field>
            <Field label="Owner">{r.owner}</Field>
            {def.severity && <Field label="Rating"><RiskBadge band={r.severity} /></Field>}
            <Field label="Created">{r.created}</Field>
            <Field label="Due">{r.due}</Field>
            {(def.extra ?? []).map((ex) => <Field key={ex.key} label={ex.label}>{r.fields[ex.key] || "—"}</Field>)}
          </dl>
        </TabsContent>
        <TabsContent value="relationships" className="space-y-3 pt-2">
          {groups.length === 0 && <p className="text-sm text-muted-foreground">No linked objects.</p>}
          {groups.map(([t, items]) => (
            <div key={t}>
              <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Linked {REGISTERS[t]?.label.toLowerCase()}</h4>
              <ul className="divide-y rounded-md border">
                {items.map((x) => (
                  <li key={x.id}>
                    {onNavigate ? (
                      <button onClick={() => onNavigate(x.id)} className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-accent">
                        <span><span className="font-mono text-muted-foreground">{x.id}</span> {x.title}</span>
                        <StatusBadge status={x.status} />
                      </button>
                    ) : (
                      <Link to="/records/$id" params={{ id: x.id }} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs hover:bg-accent">
                        <span><span className="font-mono text-muted-foreground">{x.id}</span> {x.title}</span>
                        <StatusBadge status={x.status} />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {user.canEdit && (
            <div className="flex flex-wrap gap-1.5">
              {["evidence", "risk", "decision", "action", "requirement"].map((t) => (
                <Button key={t} size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLinkType(t)}><Plus className="size-3" /> {REGISTERS[t].singular}</Button>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="comments" className="space-y-3 pt-2">
          {r.comments.map((c) => (
            <div key={c.id} className="rounded-md border p-2.5 text-sm">
              <div className="mb-0.5 text-xs text-muted-foreground"><b className="text-foreground">{c.author}</b> · {c.at}</div>
              {c.text}
            </div>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (!comment.trim()) return; actions.addComment(r.id, comment.trim()); setComment(""); }} className="space-y-2">
            <Textarea aria-label="Add comment" placeholder="Add a comment… use @name to mention" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button size="sm" type="submit" disabled={!comment.trim()}>Post comment</Button>
          </form>
        </TabsContent>
        <TabsContent value="attachments" className="space-y-2 pt-2">
          {r.attachments.map((a) => (
            <div key={a} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"><Paperclip className="size-3.5" /> {a}</div>
          ))}
          <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed p-4 text-xs text-muted-foreground hover:border-primary hover:text-primary">
            <input type="file" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { actions.addAttachment(r.id, f.name); toast.success(`Attached ${f.name}`, { description: "Simulated — file not uploaded" }); } e.target.value = ""; }} />
            <Paperclip className="mr-1 size-3.5" /> Attach file (simulated)
          </label>
        </TabsContent>
        <TabsContent value="history" className="pt-2">
          <ol className="space-y-2 border-l pl-4">
            {r.history.map((h) => (
              <li key={h.id} className="relative text-xs">
                <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary" />
                <b>{h.action}</b> <span className="text-muted-foreground">by {h.actor} · {h.at}</span>
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>

      <RecordForm type={r.type} open={editing} onOpenChange={setEditing} record={r} />
      {linkType && (
        <RecordForm
          type={linkType}
          open
          onOpenChange={(o) => !o && setLinkType(null)}
          defaults={{ projectId: r.projectId, links: [r.id], title: linkType === "action" ? `Action: ${r.title}` : "" }}
        />
      )}
      <AlertDialog open={archiving} onOpenChange={setArchiving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{r.archived ? "Restore" : "Archive"} {r.id}?</AlertDialogTitle>
            <AlertDialogDescription>{r.archived ? "The record returns to the active register." : "Archived records are hidden from registers but kept in the audit trail."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { actions.updateRecord(r.id, { archived: !r.archived }, r.archived ? "Restored" : "Archived"); toast.success(r.archived ? "Restored" : "Archived"); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
