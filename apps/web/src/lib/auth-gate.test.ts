import { describe, expect, it } from "vitest";

import { authGateRedirect } from "./auth-gate";

const user = { role: "USER" };
const staff = { role: "STATION_STAFF" };
const admin = { role: "ADMIN" };

describe("authGateRedirect", () => {
  it("sends signed-out visitors from protected pages to login with a return path", () => {
    expect(authGateRedirect("/reports", null)).toBe("/login?next=%2Freports");
    expect(authGateRedirect("/report/lost", null)).toBe("/login?next=%2Freport%2Flost");
    expect(authGateRedirect("/staff/matches/1", null)).toBe(
      "/login?next=%2Fstaff%2Fmatches%2F1",
    );
  });

  it("leaves public pages alone for signed-out visitors", () => {
    for (const path of ["/", "/login", "/signup", "/help", "/status/abc"]) {
      expect(authGateRedirect(path, null)).toBeNull();
    }
  });

  it("moves signed-in visitors off the landing and auth pages", () => {
    for (const path of ["/", "/login", "/signup"]) {
      expect(authGateRedirect(path, user)).toBe("/reports");
    }
  });

  it("keeps signed-in users on pages they may use", () => {
    expect(authGateRedirect("/reports", user)).toBeNull();
    expect(authGateRedirect("/report/found", user)).toBeNull();
    expect(authGateRedirect("/status/abc", user)).toBeNull();
  });

  it("allows only staff and admins into the staff console", () => {
    expect(authGateRedirect("/staff", user)).toBe("/reports");
    expect(authGateRedirect("/staff", staff)).toBeNull();
    expect(authGateRedirect("/staff", admin)).toBeNull();
  });
});
