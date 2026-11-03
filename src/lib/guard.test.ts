import { describe, expect, it } from "vitest";
import { evaluateGuard, type GuardRules } from "./guard";
import type { QuoteResponse, Token } from "./types";

const dest: Token = { assetId: "nep141:usdc.near", decimals: 6, blockchain: "near", symbol: "USDC" };
const now = Date.parse("2026-11-03T20:00:00Z");

function quote(over: Partial<QuoteResponse["quote"]> = {}, req: Record<string, unknown> = {}): QuoteResponse {
  return {
    quote: { amountIn: "1000000", amountInUsd: "1.00", amountOut: "990000", amountOutUsd: "0.99", minAmountOut: "980000", timeEstimate: 20, ...over },
    quoteRequest: { originAsset: "nep141:base-usdc", destinationAsset: dest.assetId, recipient: "alice.near", amount: "1000000", ...req },
  };
}
const rules: GuardRules = { expectedRecipient: "alice.near", expectedDestinationAsset: dest.assetId, expectedOriginAsset: "nep141:base-usdc", expectedAmount: "1000000" };
const get = (r: ReturnType<typeof evaluateGuard>, id: string) => r.checks.find((c) => c.id === id)!;

describe("Swap Guard", () => {
  it("passes identity checks on a matching quote", () => {
    const r = evaluateGuard(quote(), rules, dest, now);
    expect(get(r, "destination").status).toBe("passed");
    expect(get(r, "recipient").status).toBe("passed");
    expect(get(r, "source").status).toBe("passed");
    expect(r.blocked).toBe(false);
  });
  it("fails and blocks on recipient mismatch", () => {
    const r = evaluateGuard(quote({}, { recipient: "mallory.near" }), rules, dest, now);
    expect(get(r, "recipient").status).toBe("failed");
    expect(r.blocked).toBe(true);
  });
  it("fails on wrong destination asset", () => {
    const r = evaluateGuard(quote({}, { destinationAsset: "nep141:other" }), rules, dest, now);
    expect(get(r, "destination").status).toBe("failed");
  });
  it("min received uses protocol minAmountOut", () => {
    expect(get(evaluateGuard(quote(), { ...rules, minReceive: "0.98" }, dest, now), "minReceive").status).toBe("passed");
    const f = evaluateGuard(quote(), { ...rules, minReceive: "0.985" }, dest, now);
    expect(get(f, "minReceive").status).toBe("failed");
    expect(get(f, "minReceive").enforcedBy).toBe("protocol");
    expect(f.blocked).toBe(true);
  });
  it("min received is unverified without minAmountOut", () => {
    expect(get(evaluateGuard(quote({ minAmountOut: undefined }), { ...rules, minReceive: "0.5" }, dest, now), "minReceive").status).toBe("unverified");
  });
  it("max cost computed from USD values", () => {
    expect(get(evaluateGuard(quote(), { ...rules, maxCostUsd: 0.05 }, dest, now), "maxCost").status).toBe("passed");
    expect(get(evaluateGuard(quote(), { ...rules, maxCostUsd: 0.005 }, dest, now), "maxCost").status).toBe("failed");
    const u = evaluateGuard(quote({ amountInUsd: undefined }), { ...rules, maxCostUsd: 1 }, dest, now);
    expect(get(u, "maxCost").status).toBe("unverified");
    expect(u.blocked).toBe(false);
  });
  it("validity: unverified on preview, pass/fail on live", () => {
    expect(get(evaluateGuard(quote(), { ...rules, minValiditySec: 300 }, dest, now), "validity").status).toBe("unverified");
    const live = quote({ deadline: new Date(now + 600_000).toISOString() });
    expect(get(evaluateGuard(live, { ...rules, minValiditySec: 300 }, dest, now), "validity").status).toBe("passed");
    expect(get(evaluateGuard(live, { ...rules, minValiditySec: 900 }, dest, now), "validity").status).toBe("failed");
    const expired = quote({ deadline: new Date(now - 1000).toISOString() });
    expect(get(evaluateGuard(expired, { ...rules, minValiditySec: 1 }, dest, now), "validity").detail).toMatch(/expired/);
  });
  it("time check is advisory and never blocks", () => {
    const r = evaluateGuard(quote({ timeEstimate: 999 }), { ...rules, maxTimeSec: 60 }, dest, now);
    expect(get(r, "time").status).toBe("failed");
    expect(r.blocked).toBe(false);
  });
});
