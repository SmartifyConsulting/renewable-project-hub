import { describe, expect, it } from "vitest";
import { auditCsv, auditCsvCell } from "./audit-export";

describe("audit CSV export", () => {
  it("escapes commas, quotes and newlines", () => {
    expect(auditCsvCell('Hello, "world"\nnext')).toBe('"Hello, ""world""\nnext"');
  });
  it("prevents formula execution in spreadsheet software", () => {
    for (const value of ["=SUM(1,2)", "+CMD", "-3+4", "@formula", "  =1+1"]) {
      expect(auditCsvCell(value).startsWith(String.fromCharCode(34, 39))).toBe(true);
      expect(auditCsvCell(value)).toContain("'"); 
    }
  });
  it("serialises objects and empty values", () => {
    expect(auditCsvCell({ action: "created" })).toBe('"{""action"":""created""}"');
    expect(auditCsvCell(null)).toBe('""');
  });
  it("exports rows with CRLF separators", () => {
    expect(auditCsv(["Action"], [["created"], ["updated"]])).toBe('"Action"\r\n"created"\r\n"updated"');
  });
});
