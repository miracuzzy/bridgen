import { checkAddressFormat } from "./address";
import type { QuoteRequestBody, Token } from "./types";
import { toBaseUnits } from "./units";

export type SwapForm = {
  originAsset: string;
  destinationAsset: string;
  amount: string; // human units of origin asset
  recipient: string;
  refundTo: string;
  slippageBps: number;
};

export type BuildResult = { ok: true; body: QuoteRequestBody } | { ok: false; error: string };

export const MAX_SLIPPAGE_BPS = 500;
export const QUOTE_DEADLINE_MS = 30 * 60 * 1000;

// Validates a swap form against the live token list and builds a 1Click EXACT_INPUT request.
export function buildQuoteRequest(form: SwapForm, tokens: Token[], dry: boolean, now = Date.now()): BuildResult {
  const from = tokens.find((t) => t.assetId === form.originAsset);
  const to = tokens.find((t) => t.assetId === form.destinationAsset);
  if (!from) return { ok: false, error: "Source asset is not in the supported token list" };
  if (!to) return { ok: false, error: "Destination asset is not in the supported token list" };
  if (from.assetId === to.assetId) return { ok: false, error: "Source and destination are the same asset" };
  let amount: string;
  try {
    amount = toBaseUnits(form.amount, from.decimals);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (BigInt(amount) <= 0n) return { ok: false, error: "Amount must be greater than zero" };
  if (!Number.isInteger(form.slippageBps) || form.slippageBps < 1 || form.slippageBps > MAX_SLIPPAGE_BPS)
    return { ok: false, error: `Slippage must be between 0.01% and ${MAX_SLIPPAGE_BPS / 100}%` };
  if (checkAddressFormat(to.blockchain, form.recipient) === false)
    return { ok: false, error: `Recipient does not look like a valid ${to.blockchain} address` };
  if (checkAddressFormat(from.blockchain, form.refundTo) === false)
    return { ok: false, error: `Refund address does not look like a valid ${from.blockchain} address` };
  return {
    ok: true,
    body: {
      dry,
      swapType: "EXACT_INPUT",
      slippageTolerance: form.slippageBps,
      originAsset: from.assetId,
      depositType: "ORIGIN_CHAIN",
      destinationAsset: to.assetId,
      amount,
      refundTo: form.refundTo.trim(),
      refundType: "ORIGIN_CHAIN",
      recipient: form.recipient.trim(),
      recipientType: "DESTINATION_CHAIN",
      deadline: new Date(now + QUOTE_DEADLINE_MS).toISOString(),
    },
  };
}

// Checks that an API response actually has the shape of a quote before the UI trusts it.
export function parseQuoteResponse(data: unknown): { ok: true; value: import("./types").QuoteResponse } | { ok: false; error: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "Empty response from quote service" };
  const d = data as Record<string, unknown>;
  if (typeof d.message === "string" && !d.quote) return { ok: false, error: d.message };
  const q = d.quote as Record<string, unknown> | undefined;
  if (!q || typeof q.amountIn !== "string" || typeof q.amountOut !== "string")
    return { ok: false, error: "Quote response is missing amounts" };
  if (!/^\d+$/.test(q.amountIn) || !/^\d+$/.test(q.amountOut)) return { ok: false, error: "Quote amounts are not valid integers" };
  if (!d.quoteRequest || typeof d.quoteRequest !== "object") return { ok: false, error: "Quote response is missing the request echo" };
  return { ok: true, value: d as unknown as import("./types").QuoteResponse };
}
