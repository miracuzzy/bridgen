import { describe, expect, it } from "vitest";
import { buildQuoteRequest, parseForm, parseQuoteResponse } from "./quote-input";
import type { Token } from "./types";
import { fromBaseUnits, toBaseUnits } from "./units";

const tokens: Token[] = [
  { assetId: "a:base-usdc", decimals: 6, blockchain: "base", symbol: "USDC" },
  { assetId: "a:near-usdc", decimals: 6, blockchain: "near", symbol: "USDC" },
];
const form = { originAsset: "a:base-usdc", destinationAsset: "a:near-usdc", amount: "1.5", recipient: "alice.near", refundTo: "0x2527D02599Ba641c19FEa793cD0F167589a0f10D", slippageBps: 100 };

describe("units", () => {
  it("round trips", () => {
    expect(toBaseUnits("1.5", 6)).toBe("1500000");
    expect(fromBaseUnits("1500000", 6)).toBe("1.5");
    expect(fromBaseUnits("5", 6)).toBe("0.000005");
  });
  it("rejects bad input", () => {
    expect(() => toBaseUnits("1e5", 6)).toThrow();
    expect(() => toBaseUnits("0.0000001", 6)).toThrow(/decimal/);
  });
});

describe("buildQuoteRequest", () => {
  it("builds an EXACT_INPUT body", () => {
    const r = buildQuoteRequest(form, tokens, true, 0);
    expect(r.ok && r.body.amount).toBe("1500000");
    expect(r.ok && r.body.swapType).toBe("EXACT_INPUT");
  });
  it.each([
    [{ originAsset: "nope" }, /Source asset/],
    [{ destinationAsset: "a:base-usdc" }, /same asset/],
    [{ amount: "0" }, /greater than zero/],
    [{ amount: "abc" }, /plain number/],
    [{ slippageBps: 900 }, /Slippage/],
    [{ recipient: "Not A Name!" }, /Recipient/],
    [{ refundTo: "alice.near" }, /Refund/],
  ])("rejects %o", (over, msg) => {
    const r = buildQuoteRequest({ ...form, ...over }, tokens, true);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(msg);
  });
});

describe("parseQuoteResponse", () => {
  it("accepts a real-shaped quote", () => {
    expect(parseQuoteResponse({ quote: { amountIn: "1", amountOut: "2" }, quoteRequest: {} }).ok).toBe(true);
  });
  it("surfaces API error messages", () => {
    const r = parseQuoteResponse({ message: "Amount is too low for bridge" });
    expect(!r.ok && r.error).toBe("Amount is too low for bridge");
  });
  it("rejects malformed responses", () => {
    expect(parseQuoteResponse(null).ok).toBe(false);
    expect(parseQuoteResponse({ quote: { amountIn: 1, amountOut: "2" }, quoteRequest: {} }).ok).toBe(false);
    expect(parseQuoteResponse({ quote: { amountIn: "1.2", amountOut: "2" }, quoteRequest: {} }).ok).toBe(false);
  });
});

describe("preview without recipient or refund", () => {
  const toks = [
    { assetId: "a:base-usdc", decimals: 6, blockchain: "base", symbol: "USDC" },
    { assetId: "a:near-usdc", decimals: 6, blockchain: "near", symbol: "USDC" },
  ];
  const f = { originAsset: "a:base-usdc", destinationAsset: "a:near-usdc", amount: "1", recipient: "", refundTo: "", slippageBps: 100 };
  it("dry quotes use stand-in addresses", () => {
    const r = buildQuoteRequest(f, toks, true);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.body.recipient).toBe("0".repeat(64)); expect(r.body.refundTo).toMatch(/^0x0{39}1$/); }
  });
  it("live quotes require both fields", () => {
    const r = buildQuoteRequest(f, toks, false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/recipient/i);
    const r2 = buildQuoteRequest({ ...f, recipient: "alice.near" }, toks, false);
    expect(!r2.ok && r2.error).toMatch(/refund/i);
  });
});

describe("parseForm", () => {
  const ok = { originAsset: "a", destinationAsset: "b", amount: "1.5", recipient: "", refundTo: "", slippageBps: 100 };
  it("accepts a well formed form", () => expect(parseForm(ok)).toEqual(ok));
  it("rejects wrong types, long strings and bad amounts", () => {
    expect(parseForm(null)).toBeNull();
    expect(parseForm({ ...ok, amount: 1 })).toBeNull();
    expect(parseForm({ ...ok, amount: "1e9" })).toBeNull();
    expect(parseForm({ ...ok, amount: "-1" })).toBeNull();
    expect(parseForm({ ...ok, recipient: "x".repeat(200) })).toBeNull();
    expect(parseForm({ ...ok, slippageBps: "abc" })).toBeNull();
  });
});
