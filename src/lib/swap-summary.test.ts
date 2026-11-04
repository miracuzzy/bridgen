import { describe, expect, it } from "vitest";
import real from "./fixtures/status-success.json";
import { chainFromAssetId, txUrl } from "./explorer";
import { isDepositAddress, outcomeNote, summarize } from "./swap-summary";
import { localTime } from "./time";
import type { StatusResponse, Token } from "./types";

const tokens: Token[] = [
  { assetId: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near", symbol: "USDC", blockchain: "base", decimals: 6 },
  { assetId: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1", symbol: "USDC", blockchain: "near", decimals: 6 },
];

describe("summarize (real mainnet status response)", () => {
  const s = summarize(real as unknown as StatusResponse, tokens);
  it("reads amounts and fees from the API", () => {
    expect(s.status).toBe("SUCCESS");
    expect(s.amountIn).toBe("1.0");
    expect(s.amountOut).toBe("0.994658");
    expect(s.withdrawFee).toBe("0.00514");
    expect(s.refundFee).toBe("0.0024");
    expect(s.refunded).toBeUndefined();
    expect(s.recipient).toBe("miracuzzyy.near");
  });
  it("builds explorer links even though explorerUrl is empty", () => {
    expect(s.originTxs[0].url).toBe("https://basescan.org/tx/0x55bafd2c87ef2e779abbd12330d4bb1e2f5e007de7ee54ff901e6a8ea02e96f6");
    expect(s.destTxs[0].url).toBe("https://nearblocks.io/txns/CkV1QxfQC1YGLBDiNNZZn5QDaoctnv4qn7hvy2oJ5oSe");
  });
  it("works without the token list using asset ids", () => {
    const t = summarize(real as unknown as StatusResponse, []);
    expect(t.from?.chain).toBe("base");
    expect(t.to?.chain).toBe("near");
    expect(t.withdrawFee).toBeUndefined(); // no decimals, so no guessing
  });
});

describe("refunds and failures", () => {
  const refunded: StatusResponse = { status: "REFUNDED", swapDetails: { refundedAmount: "500000", refundReason: "PARTIAL_DEPOSIT", amountOut: "0" }, quoteResponse: { quoteRequest: { originAsset: tokens[0].assetId, destinationAsset: tokens[1].assetId, refundTo: "0xabc" } } };
  it("shows refunded amount and reason", () => {
    const s = summarize(refunded, tokens);
    expect(s.refunded).toBe("0.5");
    expect(s.refundReason).toBe("PARTIAL_DEPOSIT");
    expect(s.amountOut).toBeUndefined();
    expect(outcomeNote(s)).toContain("PARTIAL_DEPOSIT");
    expect(outcomeNote(s)).toContain("0xabc");
  });
  it("explains a failure", () => {
    expect(outcomeNote(summarize({ status: "FAILED" }, tokens))).toContain("failed");
    expect(outcomeNote(summarize({ status: "SUCCESS" }, tokens))).toBeUndefined();
  });
});

describe("explorer helpers", () => {
  it("maps chains to tx explorers", () => {
    expect(txUrl("eth", "0x1")).toBe("https://etherscan.io/tx/0x1");
    expect(txUrl("sol", "abc")).toBe("https://solscan.io/tx/abc");
    expect(txUrl("unknownchain", "abc")).toBeUndefined();
    expect(txUrl("base", "h", "https://given")).toBe("https://given");
  });
  it("reads chains from asset ids", () => {
    expect(chainFromAssetId("nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near")).toBe("arb");
    expect(chainFromAssetId("nep141:wrap.near")).toBe("near");
    expect(chainFromAssetId("nep245:v2_1.omni.hot.tg:56_x")).toBeUndefined();
  });
  it("validates deposit addresses and formats time with a zone", () => {
    expect(isDepositAddress("0x16e1864E80B0B278CeCE6EC7F72EF214138AcB2A")).toBe(true);
    expect(isDepositAddress("hi")).toBe(false);
    expect(localTime("2026-11-04T17:53:10.000Z", "en-US", "UTC")).toMatch(/5:53.*UTC/);
    expect(localTime(undefined)).toBe("Not provided");
  });
});
