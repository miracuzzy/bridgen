"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { saveActivity, updateActivity } from "@/lib/activity";
import { chainName, DEFAULT_FROM, DEFAULT_TO, EVM_CHAIN_IDS, EXPLORERS } from "@/lib/chains";
import { connectEvm, sendDeposit } from "@/lib/evm";
import { evaluateGuard, type GuardResult, type GuardRules } from "@/lib/guard";
import type { SwapForm } from "@/lib/quote-input";
import type { QuoteResponse, Token } from "@/lib/types";
import { fromBaseUnits, toBaseUnits } from "@/lib/units";
import { GuardList } from "./guard-list";
import { FundsTracker, StatusTracker } from "./status-tracker";
import { fundsView } from "@/lib/funds";
import { TokenSelect } from "./token-select";
import { Alert, Button, Card, inputCls, Label, Row, Spinner } from "./ui";

type Phase = "edit" | "review" | "live";

async function fetchQuote(form: SwapForm, dry: boolean): Promise<QuoteResponse> {
  let r: Response;
  try {
    r = await fetch("/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ form, dry }) });
  } catch {
    throw new Error("Network error. Check your connection and try again.");
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Quote failed (${r.status})`);
  return d as QuoteResponse;
}

const usd = (v?: string) => (v && Number.isFinite(Number(v)) ? `$${Number(v).toFixed(2)}` : "Not provided");

export function SwapApp() {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [fromChain, setFromChain] = useState("base");
  const [toChain, setToChain] = useState("near");
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [refundTo, setRefundTo] = useState("");
  const [wallet, setWallet] = useState<string | null>(null);
  const [slippage, setSlippage] = useState("1");
  const [minReceive, setMinReceive] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [minValidity, setMinValidity] = useState("5");
  const [maxTime, setMaxTime] = useState("");

  const [phase, setPhase] = useState<Phase>("edit");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [guard, setGuard] = useState<GuardResult | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tokens")
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setTokens(d); })
      .catch((e) => setLoadErr(e.message || "Could not load supported tokens"));
  }, []);

  const fromTok = tokens?.find((t) => t.assetId === from);
  const toTok = tokens?.find((t) => t.assetId === to);
  const evmChainId = fromTok ? EVM_CHAIN_IDS[fromTok.blockchain] : undefined;

  const form: SwapForm = useMemo(
    () => ({ originAsset: from, destinationAsset: to, amount, recipient, refundTo, slippageBps: Math.round(Number(slippage) * 100) }),
    [from, to, amount, recipient, refundTo, slippage],
  );

  const rules = (amtBase?: string): GuardRules => ({
    expectedOriginAsset: from,
    expectedDestinationAsset: to,
    expectedRecipient: recipient,
    expectedAmount: amtBase,
    minReceive: minReceive || undefined,
    maxCostUsd: maxCost ? Number(maxCost) : undefined,
    minValiditySec: minValidity ? Number(minValidity) * 60 : undefined,
    maxTimeSec: maxTime ? Number(maxTime) : undefined,
  });

  const reset = () => { setPhase("edit"); setQuote(null); setGuard(null); setErr(null); setTxHash(null); };

  const pickChain = (side: "from" | "to", c: string) => {
    const first = tokens?.find((t) => t.blockchain === c && t.symbol === "USDC") ?? tokens?.find((t) => t.blockchain === c);
    if (side === "from") { setFromChain(c); if (first) setFrom(first.assetId); } else { setToChain(c); if (first) setTo(first.assetId); }
    reset();
  };

  const baseAmount = () => { try { return fromTok ? toBaseUnits(amount, fromTok.decimals) : undefined; } catch { return undefined; } };

  async function preview() {
    if (!toTok) return;
    setBusy(true); setErr(null);
    try {
      const q = await fetchQuote(form, true);
      setQuote(q);
      setGuard(evaluateGuard(q, rules(baseAmount()), toTok));
      setPhase("review");
    } catch (e) { setErr((e as Error).message); setQuote(null); setGuard(null); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!toTok || !fromTok) return;
    setBusy(true); setErr(null);
    try {
      // Fresh live quote, then Swap Guard runs again before any deposit address is shown.
      const q = await fetchQuote(form, false);
      const g = evaluateGuard(q, rules(baseAmount()), toTok);
      setQuote(q); setGuard(g);
      if (g.blocked) { setErr("The live quote failed a required Swap Guard check, so Bridgen stopped here. No deposit address is shown."); setPhase("review"); return; }
      if (!q.quote.depositAddress) throw new Error("Live quote came back without a deposit address");
      saveActivity({
        depositAddress: q.quote.depositAddress, depositMemo: q.quote.depositMemo, createdAt: q.timestamp ?? new Date().toISOString(),
        fromLabel: `${fromTok.symbol} on ${chainName(fromTok.blockchain)}`, toLabel: `${toTok.symbol} on ${chainName(toTok.blockchain)}`,
        amountIn: q.quote.amountInFormatted ?? fromBaseUnits(q.quote.amountIn, fromTok.decimals),
        expectedOut: q.quote.amountOutFormatted ?? fromBaseUnits(q.quote.amountOut, toTok.decimals),
        minOut: q.quote.minAmountOut ? fromBaseUnits(q.quote.minAmountOut, toTok.decimals) : undefined,
        recipient, originChain: fromTok.blockchain, destChain: toTok.blockchain, deadline: q.quote.deadline,
      });
      setPhase("live");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function connect() {
    setErr(null);
    try { const a = await connectEvm(); setWallet(a); if (!refundTo) setRefundTo(a); } catch (e) { setErr((e as Error).message); }
  }

  async function payWithWallet() {
    if (!quote?.quote.depositAddress || !wallet || !evmChainId || !fromTok) return;
    setBusy(true); setErr(null);
    try {
      const native = !fromTok.contractAddress;
      const h = await sendDeposit({ from: wallet, chainId: evmChainId, depositAddress: quote.quote.depositAddress, amount: quote.quote.amountIn, tokenContract: native ? undefined : fromTok.contractAddress });
      setTxHash(h);
      updateActivity(quote.quote.depositAddress, { depositTxHash: h });
    } catch (e) {
      const m = (e as { code?: number; message?: string });
      setErr(m.code === 4001 ? "You rejected the request in your wallet. Nothing was sent." : m.message || "Wallet send failed");
    } finally { setBusy(false); }
  }

  if (loadErr) return <Alert>{loadErr}. Refresh to try again.</Alert>;
  if (!tokens) return <Card className="flex items-center gap-3 text-white/60"><Spinner /> Loading supported assets from NEAR Intents</Card>;

  const q = quote?.quote;
  const live = phase === "live";
  const canGoLive = !!recipient.trim() && !!refundTo.trim();
  const locked = phase !== "edit";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Swap</h1>
          {wallet ? <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
            : evmChainId ? <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={connect}>Connect wallet</Button>
            : <span className="text-xs text-white/40">Wallet send not supported for {chainName(fromChain)} yet</span>}
        </div>
        <fieldset disabled={locked} className="space-y-5 disabled:opacity-60">
          <TokenSelect label="You send" tokens={tokens} chain={fromChain} asset={from} onChain={(c) => pickChain("from", c)} onAsset={(a) => { setFrom(a); reset(); }} />
          <div>
            <Label>Amount{fromTok ? ` (${fromTok.symbol})` : ""}</Label>
            <input className={inputCls} inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {fromTok?.price && amount && Number(amount) > 0 && <div className="mt-1 text-xs text-white/40">About ${(Number(amount) * fromTok.price).toFixed(2)} at the 1Click listed price</div>}
          </div>
          <TokenSelect label="You receive" tokens={tokens} chain={toChain} asset={to} onChain={(c) => pickChain("to", c)} onAsset={(a) => { setTo(a); reset(); }} />
          <div>
            <Label>Recipient on {chainName(toChain)} <span className="text-white/40">(optional for a preview)</span></Label>
            <input className={inputCls} placeholder={toChain === "near" ? "name.near" : "Address"} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          </div>
          <div>
            <Label>Refund address on {chainName(fromChain)} <span className="text-white/40">(optional for a preview)</span></Label>
            <input className={inputCls} placeholder="Where funds go back if the swap cannot complete" value={refundTo} onChange={(e) => setRefundTo(e.target.value)} />
          </div>
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-4">
            <div className="mb-3 text-sm font-semibold text-orange-300">Swap Guard conditions</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min received{toTok ? ` (${toTok.symbol})` : ""}</Label><input className={inputCls} inputMode="decimal" placeholder="Optional" value={minReceive} onChange={(e) => setMinReceive(e.target.value)} /></div>
              <div><Label>Max cost (USD)</Label><input className={inputCls} inputMode="decimal" placeholder="Optional" value={maxCost} onChange={(e) => setMaxCost(e.target.value)} /></div>
              <div><Label>Quote valid for (min)</Label><input className={inputCls} inputMode="numeric" value={minValidity} onChange={(e) => setMinValidity(e.target.value)} /></div>
              <div><Label>Max time (sec)</Label><input className={inputCls} inputMode="numeric" placeholder="Optional" value={maxTime} onChange={(e) => setMaxTime(e.target.value)} /></div>
              <div className="col-span-2"><Label>Slippage tolerance (%)</Label><input className={inputCls} inputMode="decimal" value={slippage} onChange={(e) => setSlippage(e.target.value)} /></div>
            </div>
          </div>
        </fieldset>
        {err && <Alert>{err}</Alert>}
        {phase === "edit" && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={preview} disabled={busy || !amount}>{busy ? <><Spinner /> Getting quote</> : "Preview quote"}</Button>
            <Button onClick={confirm} disabled={busy || !amount || !canGoLive}>Get deposit address</Button>
          </div>
        )}
        {phase !== "live" && (
          <p className="text-xs text-white/40">Preview quote needs no wallet or funds. It returns a real quote and full Swap Guard check, with no deposit address. Get deposit address needs a recipient and refund address.</p>
        )}
        {phase === "review" && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={reset} disabled={busy}>Edit</Button>
            <Button onClick={confirm} disabled={busy || !!guard?.blocked || !canGoLive}>{busy ? <><Spinner /> Re-checking</> : "Get deposit address"}</Button>
          </div>
        )}
        {live && <Button variant="outline" className="w-full" onClick={reset}>New swap</Button>}
      </Card>

      <div className="space-y-6">
        {!quote && <Card className="text-sm text-white/50">Fill in the swap and your conditions. Bridgen will get a real quote from NEAR Intents and check it before anything is sent.</Card>}
        {q && toTok && fromTok && (
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">{live ? "Live quote" : "Preview"}</h2>
              <span className={live ? "text-xs text-white/40" : "rounded-full border border-orange-500/40 px-2 py-0.5 text-xs text-orange-300"}>{live ? "Deposit address issued" : "Preview quote. No deposit address, nothing can be sent"}</span>
            </div>
            <div className="divide-y divide-white/5">
              <Row k="You send" v={`${q.amountInFormatted ?? fromBaseUnits(q.amountIn, fromTok.decimals)} ${fromTok.symbol} on ${chainName(fromTok.blockchain)}`} />
              <Row k="Expected to receive" v={`${q.amountOutFormatted ?? fromBaseUnits(q.amountOut, toTok.decimals)} ${toTok.symbol} on ${chainName(toTok.blockchain)}`} />
              <Row k="Minimum received" v={q.minAmountOut ? `${fromBaseUnits(q.minAmountOut, toTok.decimals)} ${toTok.symbol}` : "Not provided"} />
              <Row k="Value in / out" v={`${usd(q.amountInUsd)} / ${usd(q.amountOutUsd)}`} />
              <Row k="Estimated cost" v={q.amountInUsd && q.amountOutUsd ? `$${Math.max(0, Number(q.amountInUsd) - Number(q.amountOutUsd)).toFixed(2)}` : "Not provided"} />
              {q.withdrawFee && <Row k="Withdraw fee (included)" v={`${fromBaseUnits(q.withdrawFee, toTok.decimals)} ${toTok.symbol}`} />}
              <Row k="Estimated time" v={typeof q.timeEstimate === "number" ? `${q.timeEstimate}s` : "Not provided"} />
              <Row k="Recipient" v={recipient.trim() || "Not entered (preview only)"} />
              <Row k="Quote valid until" v={q.deadline ? new Date(q.deadline).toLocaleString() : "Set when you confirm"} />
            </div>
          </Card>
        )}
        {guard && (
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Swap Guard</h2>
              {guard.blocked ? <span className="text-xs text-red-300">Blocked by a failed check</span> : <span className="text-xs text-emerald-300">No required check failed</span>}
            </div>
            <GuardList checks={guard.checks} />
            <p className="mt-3 text-xs text-white/40">Checks marked Bridgen only run in this app. They do not change what the protocol will do with your deposit.</p>
          </Card>
        )}
        {!live && q && fromTok && toTok && (
          <FundsTracker view={fundsView("PENDING_DEPOSIT", { originChain: chainName(fromTok.blockchain), destChain: chainName(toTok.blockchain) })} note="In your wallet. Preview only, nothing sent" />
        )}
        {live && q?.depositAddress && fromTok && toTok && (
          <Card className="space-y-4 border-orange-500/30">
            <h2 className="font-semibold">Send your deposit</h2>
            <p className="text-sm text-white/60">Send exactly <b className="text-white">{q.amountInFormatted} {fromTok.symbol}</b> on {chainName(fromTok.blockchain)} to this one-time address before the quote expires.</p>
            <div className="break-all rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-sm">{q.depositAddress}</div>
            {q.depositMemo && <Alert tone="warn">Memo required: <b>{q.depositMemo}</b></Alert>}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(q.depositAddress!)}>Copy address</Button>
              {evmChainId && wallet && !txHash && <Button onClick={payWithWallet} disabled={busy}>{busy ? <><Spinner /> Waiting for wallet</> : "Send with wallet"}</Button>}
              {EXPLORERS[fromTok.blockchain] && <a className="self-center text-sm text-orange-400 underline" href={EXPLORERS[fromTok.blockchain](q.depositAddress)} target="_blank" rel="noreferrer">View address</a>}
            </div>
            {txHash && <Row k="Your deposit tx" v={txHash} />}
            <StatusTracker depositAddress={q.depositAddress} depositMemo={q.depositMemo} originChain={fromTok.blockchain} destChain={toTok!.blockchain} depositTxHash={txHash ?? undefined} />
            <Link href="/activity" className="block text-sm text-white/50 hover:text-white">See all activity</Link>
          </Card>
        )}
      </div>
    </div>
  );
}
