import { describe, expect, it } from "vitest";
import { evaluateClosureReadiness } from "./closure-readiness";

const passing = () => ({
 assessments: [{ score: 4, hard_stop: false, evidence_verified: true }],
 activation: [{ status: "completed" }],
 delivery: [{ id: "schedule-1", status: "completed" }],
 inspections: [{ id: "inspection-1", result: "pass" }],
 ncrs: [{ id: "ncr-1", status: "closed" }],
 verifications: [{ ncr_id: "ncr-1" }],
 links: [{ source_type: "delivery_schedule", source_id: "schedule-1", target_type: "assurance_inspection", target_id: "inspection-1" }]
});

describe("project closure readiness preview", () => {
 it("shows no blockers when all tracked obligations are satisfied", () => {
  expect(evaluateClosureReadiness(passing())).toEqual([]);
 });
 it("requires at least one readiness assessment", () => {
  expect(evaluateClosureReadiness({ ...passing(), assessments: [] }).map(x => x.to)).toContain("/readiness-live");
 });
 it("blocks unverified evidence and hard stops", () => {
  for (const assessment of [{ score: 4, hard_stop: true, evidence_verified: true }, { score: 4, hard_stop: false, evidence_verified: false }, { score: 2, hard_stop: false, evidence_verified: true }]) {
   expect(evaluateClosureReadiness({ ...passing(), assessments: [assessment] }).map(x => x.to)).toContain("/readiness-live");
  }
 });
 it("blocks outstanding activation and delivery work", () => {
  const issues = evaluateClosureReadiness({ ...passing(), activation: [{ status: "blocked" }], delivery: [{ id: "schedule-1", status: "in_progress" }] });
  expect(issues.map(x => x.to)).toEqual(expect.arrayContaining(["/activation-live", "/schedule"]));
 });
 it("blocks an adverse inspection", () => {
  const issues = evaluateClosureReadiness({ ...passing(), inspections: [{ id: "inspection-1", result: "fail" }] });
  expect(issues.map(x => x.to)).toContain("/assurance-live");
 });
 it("blocks unverified or open NCRs", () => {
  expect(evaluateClosureReadiness({ ...passing(), verifications: [] }).some(x => x.label.includes("NCR"))).toBe(true);
  expect(evaluateClosureReadiness({ ...passing(), ncrs: [{ id: "ncr-1", status: "open" }] }).some(x => x.label.includes("NCR"))).toBe(true);
 });
 it("requires a passing inspection linked to each completed schedule", () => {
  expect(evaluateClosureReadiness({ ...passing(), links: [] }).map(x => x.to)).toContain("/traceability");
  expect(evaluateClosureReadiness({ ...passing(), links: [{ source_type: "delivery_schedule", source_id: "wrong-id", target_type: "assurance_inspection", target_id: "inspection-1" }] }).map(x => x.to)).toContain("/traceability");
 });
 it("does not require an inspection for cancelled schedule work", () => {
  const data = passing();
  expect(evaluateClosureReadiness({ ...data, delivery: [{ id: "schedule-1", status: "cancelled" }], links: [] })).toEqual([]);
 });
});
