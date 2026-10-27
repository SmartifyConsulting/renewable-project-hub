// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BANDS, PEOPLE, REGISTERS, type Band } from "@/lib/rpos/config";
import { dayOffset } from "@/lib/rpos/data";
import { actions, currentUser, scopedProjects, useRpos } from "@/lib/rpos/store";
import type { RecordItem } from "@/lib/rpos/types";

export function RecordForm({ type, open, onOpenChange, record, defaults, onCreated }: { type: string; open: boolean; onOpenChange: (o: boolean) => void; record?: RecordItem; defaults?: Partial<RecordItem>; onCreated?: (r: RecordItem) => void }) {
  const s = useRpos();
  const def = REGISTERS[type];
  const projects = scopedProjects(s);
  const blank = () => ({
    title: "",
    description: "",
    projectId: projects[0]?.id ?? s.projects[0].id,
    owner: currentUser(s).person,
    status: def.statuses[0],
    severity: def.severity ? ("Moderate" as Band) : undefined,
    due: dayOffset(30),
    fields: {} as Record<string, string>,
    links: [] as string[],
    ...defaults,
  });
  const [f, setF] = useState(blank);
  useEffect(() => {
    if (open) setF(record ? { ...record } : blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record?.id]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return toast.error("Title is required");
    if (record) {
      actions.updateRecord(record.id, f, "Edited record");
      toast.success(`${record.id} updated`);
    } else {
      const r = actions.addRecord(type, f);
      toast.success(`${def.singular} ${r.id} created`, { description: `Owner: ${r.owner}` });
      onCreated?.(r);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={submit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{record ? `Edit ${record.id}` : `New ${def.singular.toLowerCase()}`}</DialogTitle>
            <DialogDescription>Saved to the local prototype register.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="rf-title">Title</Label>
            <Input id="rf-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rf-desc">Description</Label>
            <Textarea id="rf-desc" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Project" value={f.projectId} onChange={(v) => setF({ ...f, projectId: v })} options={s.projects.map((p) => [p.id, p.name])} />
            <Sel label="Owner" value={f.owner} onChange={(v) => setF({ ...f, owner: v })} options={PEOPLE.map((p) => [p, p])} />
            <Sel label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={def.statuses.map((x) => [x, x])} />
            {def.severity && <Sel label="Rating" value={f.severity ?? "Moderate"} onChange={(v) => setF({ ...f, severity: v as Band })} options={BANDS.map((x) => [x, x])} />}
            <div className="space-y-1">
              <Label htmlFor="rf-due">Due date</Label>
              <Input id="rf-due" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
            </div>
            {(def.extra ?? []).map((ex) =>
              ex.options ? (
                <Sel key={ex.key} label={ex.label} value={f.fields[ex.key] ?? ""} onChange={(v) => setF({ ...f, fields: { ...f.fields, [ex.key]: v } })} options={ex.options.map((o) => [o, o])} />
              ) : (
                <div key={ex.key} className="space-y-1">
                  <Label htmlFor={`rf-${ex.key}`}>{ex.label}</Label>
                  <Input id={`rf-${ex.key}`} value={f.fields[ex.key] ?? ""} onChange={(e) => setF({ ...f, fields: { ...f.fields, [ex.key]: e.target.value } })} />
                </div>
              ),
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{record ? "Save changes" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[][] }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger aria-label={label}><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
