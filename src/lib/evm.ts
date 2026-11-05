// EIP-1193 helpers for paying a 1Click deposit address from an EVM wallet.
// Desktop: injected wallet (window.ethereum). Mobile browsers have no injected wallet, so Bridgen uses
// WalletConnect (@walletconnect/ethereum-provider) when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set.
import { EVM_CHAIN_IDS } from "./chains";

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown>; disconnect?: () => Promise<void> };
export const getEthereum = (): Eip1193 | null =>
  typeof window !== "undefined" ? ((window as unknown as { ethereum?: Eip1193 }).ethereum ?? null) : null;

// Public client id from cloud.reown.com. Not a secret.
export const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export type EvmConnectMode = "injected" | "walletconnect" | "none";
export function evmConnectMode(hasInjected: boolean, projectId: string): EvmConnectMode {
  if (hasInjected) return "injected";
  if (projectId.trim()) return "walletconnect";
  return "none";
}
export const currentEvmMode = (): EvmConnectMode => evmConnectMode(!!getEthereum(), WC_PROJECT_ID);

export const NO_EVM_WALLET_MSG =
  "No wallet connection is available in this browser. Scan the QR code or copy the deposit address and send from your wallet app.";

const pad = (hex: string) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");

export function erc20TransferData(to: string, amount: string): string {
  return "0xa9059cbb" + pad(to) + pad(BigInt(amount).toString(16));
}

let active: Eip1193 | null = null;

async function walletConnectProvider(): Promise<Eip1193> {
  const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
  const ids = Object.values(EVM_CHAIN_IDS);
  const p = await EthereumProvider.init({
    projectId: WC_PROJECT_ID,
    showQrModal: true,
    optionalChains: [8453, ...ids.filter((i) => i !== 8453)],
    metadata: { name: "Bridgen", description: "Cross-chain swaps, powered by NEAR Intents.", url: window.location.origin, icons: [`${window.location.origin}/brand/icon-512.png`] },
  });
  if (!p.connected) await p.connect();
  return p as unknown as Eip1193;
}

export async function connectEvm(): Promise<string> {
  const mode = currentEvmMode();
  if (mode === "none") throw new Error(NO_EVM_WALLET_MSG);
  const provider = mode === "injected" ? getEthereum()! : await walletConnectProvider();
  const accts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accts?.[0]) throw new Error("Wallet returned no account");
  active = provider;
  return accts[0];
}

export async function disconnectEvm() {
  const p = active;
  active = null;
  if (p && p !== getEthereum()) await p.disconnect?.().catch(() => {});
}

export async function sendDeposit(opts: { from: string; chainId: number; depositAddress: string; amount: string; tokenContract?: string }): Promise<string> {
  const eth = active ?? getEthereum();
  if (!eth) throw new Error(NO_EVM_WALLET_MSG);
  const hexId = "0x" + opts.chainId.toString(16);
  const current = (await eth.request({ method: "eth_chainId" })) as string | number;
  const cur = typeof current === "number" ? "0x" + current.toString(16) : String(current).toLowerCase();
  if (cur !== hexId) await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  const tx = opts.tokenContract
    ? { from: opts.from, to: opts.tokenContract, data: erc20TransferData(opts.depositAddress, opts.amount), value: "0x0" }
    : { from: opts.from, to: opts.depositAddress, value: "0x" + BigInt(opts.amount).toString(16) };
  return (await eth.request({ method: "eth_sendTransaction", params: [tx] })) as string;
}
