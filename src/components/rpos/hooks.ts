import { useMemo } from "react";
import { readinessFor, scopedProjects, useRpos } from "@/lib/rpos/store";

export function useScope() {
  const s = useRpos();
  return useMemo(() => {
    const projects = scopedProjects(s);
    const ids = new Set(projects.map((p) => p.id));
    const records = s.records.filter((r) => ids.has(r.projectId) && !r.archived);
    const of = (t: string) => records.filter((r) => r.type === t);
    const readiness = Object.fromEntries(projects.map((p) => [p.id, readinessFor(s, p.id)]));
    return { s, projects, records, of, readiness };
  }, [s]);
}
