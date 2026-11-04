import { describe, expect, it } from "vitest";
import { fundsView } from "./funds";

const o = { originChain: "base", destChain: "near" };
const states = (s: string, extra = {}) => fundsView(s, { ...o, ...extra }).steps.map((x) => `${x.id}:${x.state}`);

describe("funds tracker", () => {
  it("pending deposit keeps funds in the wallet", () => {
    expect(states("PENDING_DEPOSIT")).toEqual(["wallet:current", "deposit:upcoming", "swap:upcoming", "delivered:upcoming"]);
  });
  it("known deposit tx puts funds at the deposit address", () => {
    expect(states("KNOWN_DEPOSIT_TX")).toEqual(["wallet:done", "deposit:current", "swap:upcoming", "delivered:upcoming"]);
  });
  it("incomplete deposit flags the deposit step", () => {
    expect(states("INCOMPLETE_DEPOSIT")[1]).toBe("deposit:failed");
  });
  it("processing means being swapped", () => {
    expect(states("PROCESSING")).toEqual(["wallet:done", "deposit:done", "swap:current", "delivered:upcoming"]);
  });
  it("success is delivered and final", () => {
    const v = fundsView("SUCCESS", o);
    expect(v.final).toBe(true);
    expect(v.steps.every((s) => s.state === "done")).toBe(true);
  });
  it("refunded ends at the refund address with the API reason", () => {
    const v = fundsView("REFUNDED", { ...o, details: { refundReason: "slippage" } });
    expect(v.steps.map((s) => s.id)).toEqual(["wallet", "deposit", "swap", "refunded"]);
    expect(v.steps[2].state).toBe("skipped");
    expect(v.steps[3].detail).toContain("slippage");
    expect(v.final).toBe(true);
  });
  it("failed ends in a failed step", () => {
    const v = fundsView("FAILED", o);
    expect(v.steps.at(-1)).toMatchObject({ id: "failed", state: "failed" });
  });
  it("unknown status claims nothing", () => {
    const v = fundsView(undefined, o);
    expect(v.steps.every((s) => s.state === "upcoming")).toBe(true);
  });
  it("attaches only real tx hashes", () => {
    const v = fundsView("SUCCESS", { ...o, details: { originChainTxHashes: [{ hash: "0xa", explorerUrl: "https://basescan.org/tx/0xa" }], destinationChainTxHashes: [{ hash: "b" }] } });
    expect(v.steps[1].txs).toEqual([{ hash: "0xa", explorerUrl: "https://basescan.org/tx/0xa" }]);
    expect(v.steps[3].txs).toEqual([{ hash: "b" }]);
    expect(fundsView("SUCCESS", o).steps.flatMap((s) => s.txs)).toEqual([]);
  });
  it("falls back to the wallet-sent tx hash before 1Click reports one", () => {
    expect(fundsView("KNOWN_DEPOSIT_TX", { ...o, depositTxHash: "0xbeef" }).steps[1].txs).toEqual([{ hash: "0xbeef" }]);
  });
});
