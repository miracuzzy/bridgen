import { describe, expect, it } from "vitest";
import { buildCsp, securityHeaders } from "./csp";

describe("csp", () => {
  const csp = buildCsp();
  const dir = (n: string) => csp.split("; ").find((d) => d.startsWith(n + " ")) ?? "";
  it("blocks framing, plugins and base hijacking", () => {
    expect(dir("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(dir("object-src")).toBe("object-src 'none'");
    expect(dir("base-uri")).toBe("base-uri 'self'");
  });
  it("allows NEAR RPC, NEAR Connect and WalletConnect", () => {
    expect(dir("connect-src")).toContain("https://rpc.mainnet.near.org");
    expect(dir("connect-src")).toContain("https://raw.githubusercontent.com");
    expect(dir("connect-src")).toContain("wss://*.walletconnect.org");
  });
  it("never allows eval or ws in production", () => {
    expect(dir("script-src")).not.toContain("'unsafe-eval'");
    expect(dir("connect-src")).not.toMatch(/ ws:/);
    expect(csp).not.toMatch(/connect-src[^;]* https:( |;|$)/);
  });
  it("sends the basic hardening headers", () => {
    const keys = securityHeaders().map((h) => h.key);
    for (const k of ["X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options", "Permissions-Policy"]) expect(keys).toContain(k);
  });
});
