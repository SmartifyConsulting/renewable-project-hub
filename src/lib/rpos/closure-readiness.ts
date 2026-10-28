export type ClosureRoute = "/readiness-live" | "/activation-live" | "/schedule" | "/assurance-live" | "/traceability";
export type ClosureIssue = { label: string; to: ClosureRoute };
type Status = { status: string };
type Assessment = { score: number | null; hard_stop: boolean; evidence_verified: boolean };
type Delivery = Status & { id: string };
type Inspection = { id: string; result: string };
type Ncr = Status & { id: string };
type Verification = { ncr_id: string };
type Link = { source_type: string; source_id: string; target_type: string; target_id: string };

export function evaluateClosureReadiness(data: {
 assessments: Assessment[]; activation: Status[]; delivery: Delivery[];
 inspections: Inspection[]; ncrs: Ncr[]; verifications: Verification[]; links: Link[];
}): ClosureIssue[] {
 const { assessments, activation, delivery, inspections, ncrs, verifications, links } = data;
 const issues: ClosureIssue[] = [];
 if (!assessments.length || assessments.some(x => x.hard_stop || x.score == null || x.score < 3 || !x.evidence_verified))
  issues.push({ label: "Readiness assessment incomplete or unresolved", to: "/readiness-live" });
 if (activation.some(x => !["completed", "cancelled"].includes(x.status)))
  issues.push({ label: "Activation items remain open", to: "/activation-live" });
 if (delivery.some(x => !["completed", "cancelled"].includes(x.status)))
  issues.push({ label: "Delivery activities remain open", to: "/schedule" });
 if (inspections.some(x => x.result !== "pass"))
  issues.push({ label: "Inspections require passing outcomes", to: "/assurance-live" });
 if (ncrs.some(x => x.status !== "closed" || !verifications.some(v => v.ncr_id === x.id)))
  issues.push({ label: "NCR closure or verification outstanding", to: "/assurance-live" });
 if (delivery.some(x => x.status === "completed" && !links.some(l =>
   l.source_type === "delivery_schedule" && l.source_id === x.id &&
   l.target_type === "assurance_inspection" &&
   inspections.some(i => i.id === l.target_id && i.result === "pass"))))
  issues.push({ label: "Completed delivery work lacks linked passing inspection", to: "/traceability" });
 return issues;
}
