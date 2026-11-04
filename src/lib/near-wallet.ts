"use client";
// NEAR wallet connection through @hot-labs/near-connect (HOT, Meteor, Intear, MyNearWallet and others).
// Bridgen never sees keys. The wallet signs inside its own sandbox.
import type { NearConnector } from "@hot-labs/near-connect";
import { buildNearDepositTx, WRAP_NEAR } from "./near-deposit";

let connector: Promise<NearConnector> | null = null;
export function getConnector(): Promise<NearConnector> {
  if (!connector) connector = import("@hot-labs/near-connect").then(({ NearConnector }) => new NearConnector({ network: "mainnet" }));
  return connector;
}

export async function currentNearAccount(): Promise<string | null> {
  try {
    const c = await getConnector();
    const { accounts } = await c.getConnectedWallet();
    return accounts[0]?.accountId ?? null;
  } catch { return null; }
}

export async function connectNear(): Promise<string> {
  const c = await getConnector();
  await c.whenManifestLoaded;
  await c.connect();
  const { accounts } = await c.getConnectedWallet();
  if (!accounts[0]?.accountId) throw new Error("Wallet returned no NEAR account");
  return accounts[0].accountId;
}

export async function disconnectNear() {
  const c = await getConnector();
  await c.disconnect().catch(() => {});
}

type Storage = { min: string | null; registered: Record<string, boolean> };
async function readStorage(contract: string, accounts: string[]): Promise<Storage> {
  const r = await fetch(`/api/near-storage?contract=${encodeURIComponent(contract)}&accounts=${accounts.map(encodeURIComponent).join(",")}`);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Could not check token storage");
  return d;
}

export async function sendNearDeposit(o: { contract: string; depositAddress: string; amount: string; sender: string; wrapNative: boolean }): Promise<string> {
  const accounts = o.wrapNative && o.contract === WRAP_NEAR ? [o.depositAddress, o.sender] : [o.depositAddress];
  const st = await readStorage(o.contract, accounts);
  const tx = buildNearDepositTx({
    ...o,
    receiverStorageMin: st.registered[o.depositAddress] ? null : st.min,
    senderStorageMin: o.wrapNative && !st.registered[o.sender] ? st.min : null,
  });
  const c = await getConnector();
  const wallet = await c.wallet();
  const res = await wallet.signAndSendTransaction({ signerId: o.sender, receiverId: tx.receiverId, actions: tx.actions });
  const hash = res?.transaction?.hash ?? res?.transaction_outcome?.id;
  if (!hash) throw new Error("Wallet did not return a transaction hash");
  return hash;
}
