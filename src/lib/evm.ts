// Minimal EIP-1193 helpers for paying a 1Click deposit address from a browser wallet.
type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
export const getEthereum = (): Eip1193 | null =>
  typeof window !== "undefined" ? ((window as unknown as { ethereum?: Eip1193 }).ethereum ?? null) : null;

const pad = (hex: string) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");

export function erc20TransferData(to: string, amount: string): string {
  return "0xa9059cbb" + pad(to) + pad(BigInt(amount).toString(16));
}

export async function connectEvm(): Promise<string> {
  const eth = getEthereum();
  if (!eth) throw new Error("No browser wallet found. Install an EVM wallet or paste your address.");
  const accts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!accts?.[0]) throw new Error("Wallet returned no account");
  return accts[0];
}

export async function sendDeposit(opts: { from: string; chainId: number; depositAddress: string; amount: string; tokenContract?: string }): Promise<string> {
  const eth = getEthereum();
  if (!eth) throw new Error("No browser wallet found");
  const hexId = "0x" + opts.chainId.toString(16);
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  if (current?.toLowerCase() !== hexId) await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  const tx = opts.tokenContract
    ? { from: opts.from, to: opts.tokenContract, data: erc20TransferData(opts.depositAddress, opts.amount), value: "0x0" }
    : { from: opts.from, to: opts.depositAddress, value: "0x" + BigInt(opts.amount).toString(16) };
  return (await eth.request({ method: "eth_sendTransaction", params: [tx] })) as string;
}
