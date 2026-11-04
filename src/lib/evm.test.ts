import { describe, expect, it } from "vitest";
import { erc20TransferData, evmConnectMode } from "./evm";

describe("evm connect mode", () => {
  it("prefers an injected wallet", () => expect(evmConnectMode(true, "abc")).toBe("injected"));
  it("uses WalletConnect on mobile when a project id is set", () => expect(evmConnectMode(false, "abc")).toBe("walletconnect"));
  it("falls back to manual send without either", () => {
    expect(evmConnectMode(false, "")).toBe("none");
    expect(evmConnectMode(false, "  ")).toBe("none");
  });
});

describe("erc20 transfer data", () => {
  it("encodes transfer(to, amount)", () => {
    const d = erc20TransferData("0x16e1864E80B0B278CeCE6EC7F72EF214138AcB2A", "1000000");
    expect(d).toBe("0xa9059cbb00000000000000000000000016e1864e80b0b278cece6ec7f72ef214138acb2a00000000000000000000000000000000000000000000000000000000000f4240");
  });
});
