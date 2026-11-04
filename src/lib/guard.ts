import { checkAddressFormat } from "./address";
import type { QuoteResponse, Token } from "./types";
import { toBaseUnits } from "./units";

export type CheckStatus = "passed" | "failed" | "unverified";
export type Enforcer = "protocol" | "bridgen";

export type GuardCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  mandatory: boolean;
  // "protocol": the condition is part of the signed 1Click quote and is enforced on execution (refund if unmet).
  // "bridgen": checked by this interface only, before you send. Not enforced on chain.
  enforcedBy: Enforcer;
};

export type GuardRules = {
  minReceive?: string; // human units of destination asset
  maxCostUsd?: number;
  minValiditySec?: number;
  maxTimeSec?: number;
  expectedRecipient: string;
  expectedDestinationAsset: string;
  expectedOriginAsset: string;
  expectedAmount?: string; // base units of origin
};

export type GuardResult = { checks: GuardCheck[]; blocked: boolean };

export function evaluateGuard(q: QuoteResponse, rules: GuardRules, dest: Token, now = Date.now()): GuardResult {
  const checks: GuardCheck[] = [];
  const req = q.quoteRequest;

  // 1. Destination asset + chain match what the user picked.
  checks.push({
    id: "destination",
    label: "Destination asset and chain",
    mandatory: true,
    enforcedBy: "bridgen",
    ...(req.destinationAsset === undefined
      ? { status: "unverified", detail: "Quote did not echo the destination asset" }
      : req.destinationAsset === rules.expectedDestinationAsset
        ? { status: "passed", detail: `${dest.symbol} on ${dest.blockchain}` }
        : { status: "failed", detail: `Quote is for ${String(req.destinationAsset)}, not your selection` }),
  });

  // 2. Recipient matches what the user typed, and looks valid for the chain.
  const fmt = checkAddressFormat(dest.blockchain, rules.expectedRecipient);
  let recipient: Pick<GuardCheck, "status" | "detail">;
  if (!rules.expectedRecipient.trim()) recipient = { status: "unverified", detail: "Preview without a recipient. You must enter one before a deposit address is issued" };
  else if (req.recipient === undefined) recipient = { status: "unverified", detail: "Quote did not echo the recipient" };
  else if (req.recipient !== rules.expectedRecipient.trim()) recipient = { status: "failed", detail: "Quote recipient differs from the one you entered" };
  else if (fmt === false) recipient = { status: "failed", detail: `Not a valid ${dest.blockchain} address format` };
  else if (fmt === null) recipient = { status: "unverified", detail: `Matches your input. Bridgen has no format rule for ${dest.blockchain}` };
  else recipient = { status: "passed", detail: "Matches your input and the chain address format" };
  checks.push({ id: "recipient", label: "Recipient", mandatory: true, enforcedBy: "bridgen", ...recipient });

  // 3. Source asset and amount echo.
  const srcOk = req.originAsset === rules.expectedOriginAsset && (rules.expectedAmount === undefined || req.amount === rules.expectedAmount);
  checks.push({
    id: "source",
    label: "Source asset and amount",
    mandatory: true,
    enforcedBy: "bridgen",
    status: req.originAsset === undefined ? "unverified" : srcOk ? "passed" : "failed",
    detail: srcOk ? "Matches your input" : req.originAsset === undefined ? "Quote did not echo the source" : "Quote source or amount differs from your input",
  });

  // 4. Minimum received. minAmountOut is part of the quote and enforced by 1Click (refund if not met).
  if (rules.minReceive !== undefined && rules.minReceive !== "") {
    let want: bigint | null = null;
    try {
      want = BigInt(toBaseUnits(rules.minReceive, dest.decimals));
    } catch {
      want = null;
    }
    const floor = q.quote.minAmountOut;
    let r: Pick<GuardCheck, "status" | "detail">;
    if (want === null) r = { status: "failed", detail: "Your minimum is not a valid number" };
    else if (!floor || !/^\d+$/.test(floor)) r = { status: "unverified", detail: "Quote has no minimum output to compare" };
    else if (BigInt(floor) >= want) r = { status: "passed", detail: `Quote guarantees at least your minimum of ${rules.minReceive} ${dest.symbol} or refunds` };
    else r = { status: "failed", detail: `Quote minimum is below your ${rules.minReceive} ${dest.symbol}` };
    checks.push({ id: "minReceive", label: "Minimum received", mandatory: true, enforcedBy: "protocol", ...r });
  }

  // 5. Max total cost, from the USD values 1Click returns. Estimate only.
  if (rules.maxCostUsd !== undefined) {
    const inUsd = Number(q.quote.amountInUsd);
    const outUsd = Number(q.quote.amountOutUsd);
    let r: Pick<GuardCheck, "status" | "detail">;
    if (!q.quote.amountInUsd || !q.quote.amountOutUsd || !Number.isFinite(inUsd) || !Number.isFinite(outUsd))
      r = { status: "unverified", detail: "Quote has no USD values, so cost cannot be computed" };
    else {
      const cost = Math.max(0, inUsd - outUsd);
      r = cost <= rules.maxCostUsd
        ? { status: "passed", detail: `Estimated cost $${cost.toFixed(2)} is within $${rules.maxCostUsd.toFixed(2)}` }
        : { status: "failed", detail: `Estimated cost $${cost.toFixed(2)} is over $${rules.maxCostUsd.toFixed(2)}` };
    }
    checks.push({ id: "maxCost", label: "Maximum total cost (estimate)", mandatory: true, enforcedBy: "bridgen", ...r });
  }

  // 6. Quote validity window. Only live quotes carry a deadline.
  if (rules.minValiditySec !== undefined) {
    const end = q.quote.timeWhenInactive ?? q.quote.deadline;
    let r: Pick<GuardCheck, "status" | "detail">;
    if (!end) r = { status: "unverified", detail: "Preview quotes have no deadline. Checked again on the live quote" };
    else {
      const left = Math.floor((Date.parse(end) - now) / 1000);
      r = left >= rules.minValiditySec
        ? { status: "passed", detail: `Valid for about ${Math.floor(left / 60)} more minutes` }
        : { status: "failed", detail: left <= 0 ? "Quote has expired" : `Only ${left}s left, you asked for ${rules.minValiditySec}s` };
    }
    checks.push({ id: "validity", label: "Quote validity", mandatory: true, enforcedBy: "protocol", ...r });
  }

  // 7. Estimated time.
  if (rules.maxTimeSec !== undefined) {
    const t = q.quote.timeEstimate;
    checks.push({
      id: "time",
      label: "Estimated time",
      mandatory: false,
      enforcedBy: "bridgen",
      ...(typeof t !== "number"
        ? { status: "unverified" as const, detail: "Quote has no time estimate" }
        : t <= rules.maxTimeSec
          ? { status: "passed" as const, detail: `About ${t}s, within ${rules.maxTimeSec}s` }
          : { status: "failed" as const, detail: `About ${t}s, over your ${rules.maxTimeSec}s` }),
    });
  }

  return { checks, blocked: checks.some((c) => c.mandatory && c.status === "failed") };
}
