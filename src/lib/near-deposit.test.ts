import { describe, expect, it } from "vitest";
import { buildNearDepositTx, nearTokenContract } from "./near-deposit";

const dep = "a".repeat(64);
describe("NEAR deposit tx", () => {
  it("only ft_transfer when the deposit address is registered", () => {
    const tx = buildNearDepositTx({ contract: "usdc.near", depositAddress: dep, amount: "1000000", sender: "me.near" });
    expect(tx.receiverId).toBe("usdc.near");
    expect(tx.actions).toHaveLength(1);
    expect(tx.actions[0].params).toMatchObject({ methodName: "ft_transfer", args: { receiver_id: dep, amount: "1000000" }, deposit: "1" });
  });
  it("adds storage_deposit for an unregistered deposit address first", () => {
    const tx = buildNearDepositTx({ contract: "usdc.near", depositAddress: dep, amount: "5", sender: "me.near", receiverStorageMin: "1250000000000000000000" });
    expect(tx.actions.map((a) => a.params.methodName)).toEqual(["storage_deposit", "ft_transfer"]);
    expect(tx.actions[0].params.args).toEqual({ account_id: dep, registration_only: true });
    expect(tx.actions[0].params.deposit).toBe("1250000000000000000000");
  });
  it("wraps native NEAR and registers the sender when needed", () => {
    const tx = buildNearDepositTx({ contract: "wrap.near", depositAddress: dep, amount: "10", sender: "me.near", wrapNative: true, senderStorageMin: "9", receiverStorageMin: "9" });
    expect(tx.actions.map((a) => a.params.methodName)).toEqual(["storage_deposit", "storage_deposit", "near_deposit", "ft_transfer"]);
    expect(tx.actions[2].params.deposit).toBe("10");
    const gas = tx.actions.reduce((g, a) => g + BigInt(a.params.gas), 0n);
    expect(gas <= 300n * 10n ** 12n).toBe(true);
  });
  it("rejects bad input", () => {
    expect(() => buildNearDepositTx({ contract: "x.near", depositAddress: dep, amount: "0", sender: "me.near" })).toThrow();
    expect(() => buildNearDepositTx({ contract: "x.near", depositAddress: dep, amount: "1", sender: "me.near", wrapNative: true })).toThrow();
  });
  it("finds NEAR-side token contracts", () => {
    expect(nearTokenContract("nep141:wrap.near")).toBe("wrap.near");
    expect(nearTokenContract("nep141:base-0x8335.omft.near")).toBeNull();
    expect(nearTokenContract("nep245:foo")).toBeNull();
  });
});
