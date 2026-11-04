// Turns a real /v0/status response into display values. Only fields the API returned are used.
import { chainFromAssetId, txUrl } from "./explorer";
import { fromBaseUnits } from "./units";
import type { StatusResponse, Token } from "./types";

export type TxLink = { hash: string; url?: string };
export type SwapSummary = {
  status: string;
  updatedAt?: string;
  from?: { symbol: string; chain: string; decimals: number };
  to?: { symbol: string; chain: string; decimals: number };
  amountIn?: string;
  amountInUsd?: string;
  amountOut?: string;
  amountOutUsd?: string;
  deposited?: string;
  refunded?: string;
  refundReason?: string;
  refundFee?: string;
  withdrawFee?: string;
  costUsd?: string;
  recipient?: string;
  refundTo?: string;
  originTxs: TxLink[];
  destTxs: TxLink[];
  nearTxs: TxLink[];
};

const tok = (t: Token | undefined, assetId: string | undefined) => {
  if (t) return { symbol: t.symbol, chain: t.blockchain, decimals: t.decimals };
  const chain = chainFromAssetId(assetId);
  return chain ? { symbol: "", chain, decimals: -1 } : undefined;
};
const fmt = (raw: string | null | undefined, decimals?: number) =>
  raw == null || raw === "" || decimals == null || decimals < 0 ? undefined : fromBaseUnits(raw, decimals);
const positive = (v?: string | null) => (v != null && v !== "" && Number(v) > 0 ? v : undefined);

export function summarize(s: StatusResponse, tokens: Token[] = []): SwapSummary {
  const d = s.swapDetails ?? {};
  const req = s.quoteResponse?.quoteRequest ?? {};
  const byId = (id?: string) => tokens.find((t) => t.assetId === id);
  const from = tok(byId(req.originAsset), req.originAsset);
  const to = tok(byId(req.destinationAsset), req.destinationAsset);
  const inUsd = d.amountInUsd ?? d.depositedAmountUsd;
  const cost = inUsd && d.amountOutUsd && s.status === "SUCCESS" ? Math.max(0, Number(inUsd) - Number(d.amountOutUsd)) : undefined;
  return {
    status: s.status,
    updatedAt: s.updatedAt,
    from, to,
    amountIn: d.amountInFormatted ?? fmt(d.amountIn, from?.decimals),
    amountInUsd: inUsd,
    amountOut: positive(d.amountOutFormatted ?? fmt(d.amountOut, to?.decimals)),
    amountOutUsd: d.amountOutUsd,
    deposited: positive(d.depositedAmountFormatted ?? fmt(d.depositedAmount, from?.decimals)),
    refunded: positive(d.refundedAmountFormatted ?? fmt(d.refundedAmount, from?.decimals)),
    refundReason: d.refundReason ?? undefined,
    refundFee: positive(d.refundFeeFormatted ?? fmt(d.refundFee, from?.decimals)),
    withdrawFee: positive(d.withdrawFeeFormatted ?? fmt(d.withdrawFee, to?.decimals)),
    costUsd: cost != null && Number.isFinite(cost) ? cost.toFixed(4) : undefined,
    recipient: typeof req.recipient === "string" ? req.recipient : undefined,
    refundTo: typeof req.refundTo === "string" ? req.refundTo : undefined,
    originTxs: (d.originChainTxHashes ?? []).map((t) => ({ hash: t.hash, url: txUrl(from?.chain, t.hash, t.explorerUrl || undefined) })),
    destTxs: (d.destinationChainTxHashes ?? []).map((t) => ({ hash: t.hash, url: txUrl(to?.chain, t.hash, t.explorerUrl || undefined) })),
    nearTxs: (d.nearTxHashes ?? []).map((h) => ({ hash: h, url: txUrl("near", h) })),
  };
}

// Plain-language reason for refunds and failures. Unknown reasons are shown as returned.
export function outcomeNote(s: SwapSummary): string | undefined {
  if (s.status === "REFUNDED") return `Your deposit was sent back to the refund address${s.refundTo ? ` (${s.refundTo})` : ""}.${s.refundReason ? ` Reason from 1Click: ${s.refundReason}.` : ""}`;
  if (s.status === "FAILED") return `1Click reported this swap as failed.${s.refundReason ? ` Reason: ${s.refundReason}.` : ""} If a deposit was made, check the refund address and the deposit tx below.`;
  if (s.status === "INCOMPLETE_DEPOSIT") return "Less than the quoted amount arrived. 1Click will refund it after the quote deadline unless the rest is sent.";
  return undefined;
}

export const isDepositAddress = (v: string) => /^[A-Za-z0-9._:-]{20,128}$/.test(v.trim());
