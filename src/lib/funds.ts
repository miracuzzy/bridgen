// Maps a real 1Click status to where the user's funds are right now.
// Input is only what the API returned. Nothing here is guessed or simulated.
import type { StatusResponse, TxDetails } from "./types";

export type StepState = "done" | "current" | "upcoming" | "failed" | "skipped";
export type FundsStepId = "wallet" | "deposit" | "swap" | "delivered" | "refunded" | "failed";
export type FundsStep = { id: FundsStepId; label: string; detail: string; state: StepState; txs: TxDetails[] };
export type FundsView = { steps: FundsStep[]; location: string; final: boolean };

export function fundsView(status: string | undefined, opts: { originChain: string; destChain: string; details?: StatusResponse["swapDetails"]; depositTxHash?: string }): FundsView {
  const d = opts.details;
  const inTx: TxDetails[] = d?.originChainTxHashes?.length ? d.originChainTxHashes : opts.depositTxHash ? [{ hash: opts.depositTxHash }] : [];
  const outTx: TxDetails[] = d?.destinationChainTxHashes ?? [];
  const nearTx: TxDetails[] = (d?.nearTxHashes ?? []).map((hash) => ({ hash, explorerUrl: `https://nearblocks.io/txns/${hash}` }));
  const S = (id: FundsStepId, label: string, detail: string, state: StepState, txs: TxDetails[] = []): FundsStep => ({ id, label, detail, state, txs });
  const wallet = (st: StepState) => S("wallet", "In your wallet", `Funds stay with you on ${opts.originChain} until you send the deposit`, st);
  const deposit = (st: StepState, extra = "") => S("deposit", "At the one-time deposit address", `On ${opts.originChain}${extra}`, st, inTx);
  const swap = (st: StepState) => S("swap", "Being swapped via NEAR Intents", "Solvers fill the intent at the quoted terms", st, nearTx);
  const delivered = (st: StepState) => S("delivered", "Delivered to recipient", `On ${opts.destChain}`, st, outTx);

  switch (status) {
    case "PENDING_DEPOSIT":
      return { steps: [wallet("current"), deposit("upcoming"), swap("upcoming"), delivered("upcoming")], location: "In your wallet. No deposit seen yet.", final: false };
    case "KNOWN_DEPOSIT_TX":
      return { steps: [wallet("done"), deposit("current", ". Deposit tx seen, waiting for confirmations"), swap("upcoming"), delivered("upcoming")], location: "At the deposit address", final: false };
    case "INCOMPLETE_DEPOSIT":
      return { steps: [wallet("done"), deposit("failed", ". Amount received is below what the quote needs. Top up or wait for a refund"), swap("upcoming"), delivered("upcoming")], location: "At the deposit address, deposit incomplete", final: false };
    case "PROCESSING":
      return { steps: [wallet("done"), deposit("done"), swap("current"), delivered("upcoming")], location: "Being swapped via NEAR Intents", final: false };
    case "SUCCESS":
      return { steps: [wallet("done"), deposit("done"), swap("done"), delivered("done")], location: `Delivered to the recipient on ${opts.destChain}`, final: true };
    case "REFUNDED":
      return {
        steps: [wallet("done"), deposit("done"), swap("skipped"), S("refunded", "Refunded to your refund address", `On ${opts.originChain}${d?.refundReason ? `. Reason: ${d.refundReason}` : ""}`, "done")],
        location: "Refunded to your refund address", final: true,
      };
    case "FAILED":
      return {
        steps: [wallet("done"), deposit("done"), swap("failed"), S("failed", "Swap failed", "1Click reported a failure. Check the deposit tx and contact support with the deposit address", "failed")],
        location: "Swap failed. Funds were not delivered", final: true,
      };
    default:
      return { steps: [wallet("upcoming"), deposit("upcoming"), swap("upcoming"), delivered("upcoming")], location: "Status unknown", final: false };
  }
}
