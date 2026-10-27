/** Pure readiness recommendation engine. Never authorises a stage-gate decision. */
export type ReadinessDomainInput = {
  id: string;
  weight: number;
  score: number | null;
  evidenceVerified: boolean;
  hardStop: boolean;
};

export type ReadinessRecommendation = {
  overall: number | null;
  result: "GO" | "CONDITIONAL GO" | "NO-GO" | "INCOMPLETE";
  reasons: string[];
  requiresHumanApproval: true;
};

export function evaluateReadiness(domains: ReadinessDomainInput[]): ReadinessRecommendation {
  const reasons: string[] = [];
  if (domains.length !== 14 || new Set(domains.map((d) => d.id)).size !== 14) {
    reasons.push("All fourteen unique domains must be assessed.");
  }
  if (domains.some((d) => !/^D(0[1-9]|1[0-4])$/.test(d.id))) {
    reasons.push("Domain identifiers must be D01 through D14.");
  }
  if (domains.some((d) => !Number.isFinite(d.weight) || d.weight <= 0) ||
      Math.abs(domains.reduce((sum, d) => sum + d.weight, 0) - 100) > 0.0001) {
    reasons.push("Domain weights must be positive and total 100%.");
  }
  if (domains.some((d) => d.score === null || !Number.isFinite(d.score) || d.score < 0 || d.score > 5)) {
    reasons.push("Every domain requires a valid score between 0 and 5.");
  }
  if (reasons.length) return { overall: null, result: "INCOMPLETE", reasons, requiresHumanApproval: true };

  const overall = Math.round(domains.reduce((sum, d) => sum + (d.score! / 5) * d.weight, 0) * 10) / 10;
  const minScore = Math.min(...domains.map((d) => d.score!));
  if (domains.some((d) => d.hardStop)) reasons.push("One or more mandatory hard stops remain open.");
  if (domains.some((d) => !d.evidenceVerified)) reasons.push("One or more domains lack verified evidence.");
  if (reasons.length) return { overall, result: "NO-GO", reasons, requiresHumanApproval: true };

  const result = overall >= 75 && minScore >= 2 ? "GO" :
    overall >= 55 && minScore >= 1 ? "CONDITIONAL GO" : "NO-GO";
  if (result !== "GO") reasons.push("Readiness thresholds are not fully satisfied.");
  return { overall, result, reasons, requiresHumanApproval: true };
}
