import { describe, expect, it } from "vitest";
import { parseCandidateFacts } from "./knowledge-extraction";

describe("knowledge evidence parsing", () => {
  it("parses a valid evidence fact", () => {
    expect(parseCandidateFacts("Capacity: 50 MW")).toEqual([
      { key: "Capacity", value: "50 MW", excerpt: "Capacity: 50 MW" },
    ]);
  });
  it("removes duplicate evidence facts", () => {
    expect(parseCandidateFacts("Capacity: 50 MW\ncapacity: 50 mw")).toHaveLength(1);
  });
  it("keeps contradictory values as separate candidates", () => {
    expect(parseCandidateFacts("Capacity: 50 MW\nCapacity: 60 MW")).toHaveLength(2);
  });
  it("rejects invalid lines", () => {
    expect(parseCandidateFacts("invalid\nX: value")).toHaveLength(0);
  });
  it("honours a zero limit", () => {
    expect(parseCandidateFacts("Capacity: 50 MW", 0)).toHaveLength(0);
  });
});
