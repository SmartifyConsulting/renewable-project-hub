import { describe, expect, it } from "vitest";
import { evaluateReadiness, type ReadinessDomainInput } from "./readiness-engine";
const base = (score = 4): ReadinessDomainInput[] =>
  Array.from({ length: 14 }, (_, i) => ({
    id: `D${String(i + 1).padStart(2, "0")}`,
    weight: i < 2 ? 8 : 7,
    score,
    evidenceVerified: true,
    hardStop: false,
  }));

describe("readiness recommendations", () => {
  it("recommends GO for fully verified high scores but requires approval", () => {
    const result = evaluateReadiness(base());
    expect(result).toMatchObject({ overall: 80, result: "GO", requiresHumanApproval: true });
  });
  it("recommends conditional GO for moderate verified scores", () => {
    expect(evaluateReadiness(base(3)).result).toBe("CONDITIONAL GO");
  });
  it("blocks GO when a hard stop exists", () => {
    const domains = base();
    domains[0].hardStop = true;
    expect(evaluateReadiness(domains).result).toBe("NO-GO");
  });
  it("blocks GO when evidence is not verified", () => {
    const domains = base();
    domains[0].evidenceVerified = false;
    expect(evaluateReadiness(domains).result).toBe("NO-GO");
  });
  it("returns incomplete for missing, invalid or duplicate domains", () => {
    expect(evaluateReadiness(base().slice(1)).result).toBe("INCOMPLETE");
    const invalid = base();
    invalid[0].score = 6;
    expect(evaluateReadiness(invalid).result).toBe("INCOMPLETE");
    const duplicates = base();
    duplicates[0].id = duplicates[1].id;
    expect(evaluateReadiness(duplicates).result).toBe("INCOMPLETE");
  });
  it("rejects unrecognised domain identifiers", () => {
    const domains = base();
    domains[0].id = "D99";
    expect(evaluateReadiness(domains).result).toBe("INCOMPLETE");
  });
  it("does not recommend GO with a low-scoring critical domain", () => {
    const domains = base();
    domains[0].score = 1;
    expect(evaluateReadiness(domains).result).toBe("CONDITIONAL GO");
  });
  it("does not treat an unscored domain as zero", () => {
    const domains = base();
    domains[0].score = null;
    expect(evaluateReadiness(domains)).toMatchObject({ result: "INCOMPLETE", overall: null });
  });
  it("does not approve a gate automatically", () => {
    expect(evaluateReadiness(base()).requiresHumanApproval).toBe(true);
  });
});
