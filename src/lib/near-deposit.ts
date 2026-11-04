// Builds the NEAR transaction that pays a 1Click deposit address from a NEAR wallet.
// NEP-141 ft_transfer needs the receiver to be registered on the token (NEP-145 storage_deposit),
// and 1 yoctoNEAR attached. Native NEAR is wrapped with wrap.near's near_deposit first.
// Action shape follows @hot-labs/near-connect ConnectorAction (type FunctionCall, params methodName/args/gas/deposit).

export type FunctionCall = { type: "FunctionCall"; params: { methodName: string; args: Record<string, unknown>; gas: string; deposit: string } };
export type NearDepositTx = { receiverId: string; actions: FunctionCall[] };

export const WRAP_NEAR = "wrap.near";
const TGAS = (n: number) => (BigInt(n) * 10n ** 12n).toString();

export function nearTokenContract(assetId: string): string | null {
  const m = /^nep141:(.+)$/.exec(assetId);
  if (!m || m[1].endsWith(".omft.near")) return null; // omft tokens are bridged ids, not NEAR-side contracts users hold
  return m[1];
}

export function buildNearDepositTx(o: {
  contract: string;
  depositAddress: string;
  amount: string; // base units
  sender: string;
  receiverStorageMin?: string | null; // yoctoNEAR; set when the deposit address is not registered
  senderStorageMin?: string | null; // set when the sender is not registered (only needed for wrap)
  wrapNative?: boolean; // wrap this amount of native NEAR first (wrap.near only)
}): NearDepositTx {
  if (!/^\d+$/.test(o.amount) || BigInt(o.amount) <= 0n) throw new Error("Invalid amount");
  if (o.wrapNative && o.contract !== WRAP_NEAR) throw new Error("Only wrap.near can wrap native NEAR");
  const fc = (methodName: string, args: Record<string, unknown>, gas: number, deposit: string): FunctionCall => ({ type: "FunctionCall", params: { methodName, args, gas: TGAS(gas), deposit } });
  const actions: FunctionCall[] = [];
  if (o.receiverStorageMin) actions.push(fc("storage_deposit", { account_id: o.depositAddress, registration_only: true }, 30, o.receiverStorageMin));
  if (o.wrapNative) {
    if (o.senderStorageMin) actions.push(fc("storage_deposit", { account_id: o.sender, registration_only: true }, 30, o.senderStorageMin));
    actions.push(fc("near_deposit", {}, 30, o.amount));
  }
  actions.push(fc("ft_transfer", { receiver_id: o.depositAddress, amount: o.amount }, 50, "1"));
  return { receiverId: o.contract, actions };
}
