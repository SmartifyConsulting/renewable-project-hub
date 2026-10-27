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

export function usePortfolioStats() {
  const s = useRpos();
  return s.portfolios
    .filter((p) => s.orgId === "all" || p.orgId === s.orgId)
    .map((pf) => {
      const projects = s.projects.filter((p) => p.portfolioId === pf.id);
      const rd = projects.map((p) => readinessFor(s, p.id).overall);
      const risks = s.records.filter((r) => r.type === "risk" && projects.some((p) => p.id === r.projectId) && r.status !== "Closed");
      const spi = projects.reduce((a, p) => a + p.spi, 0) / Math.max(1, projects.length);
      return {
        ...pf,
        projects,
        readiness: Math.round(rd.reduce((a, b) => a + b, 0) / Math.max(1, rd.length)),
        spi,
        health: spi >= 0.98 ? "On track" : spi >= 0.92 ? "At risk" : "Missed",
        critical: risks.filter((r) => r.severity === "Very high").length,
        milestones: s.records.filter((r) => r.type === "milestone" && projects.some((p) => p.id === r.projectId) && r.status !== "Achieved").slice(0, 3),
        risks,
      };
    });
}

