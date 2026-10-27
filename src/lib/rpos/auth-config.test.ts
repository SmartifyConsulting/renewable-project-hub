import { describe, expect, it } from "vitest";
import { checkAuthConfig, mapAuthError, membershipState } from "./auth-config";

describe("auth config", () => {
  it("reports missing connection settings instead of inventing them", () => {
    expect(checkAuthConfig({})).toEqual({ ok: false, missing: ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] });
  });
  it("accepts complete settings", () => {
    expect(checkAuthConfig({ VITE_SUPABASE_URL: "u", VITE_SUPABASE_PUBLISHABLE_KEY: "k" })).toEqual({ ok: true });
  });
  it("collapses bad credentials into one message", () => {
    expect(mapAuthError({ message: "Invalid login credentials" })).toBe("Email or password is incorrect.");
  });
  it("treats a user with no org or project membership as no-membership", () => {
    expect(membershipState(0, 0)).toBe("no-membership");
    expect(membershipState(0, 1)).toBe("has-access");
  });
});

import { canWriteOrg, mapRpcError } from "./auth-config";
describe("write permissions", () => {
  it("allows only admin, director and manager org roles to write", () => {
    expect(["admin", "director", "manager"].every(canWriteOrg)).toBe(true);
    expect(canWriteOrg("member")).toBe(false);
    expect(canWriteOrg("viewer")).toBe(false);
    expect(canWriteOrg(undefined)).toBe(false);
  });
  it("shows database validation messages but hides unknown errors", () => {
    expect(mapRpcError({ code: "22023", message: "Name is required" })).toBe("Name is required");
    expect(mapRpcError({ code: "XX000", message: "internal detail" })).toBe("Could not save. Please try again.");
  });
});
