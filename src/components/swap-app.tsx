"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { saveActivity, updateActivity } from "@/lib/activity";
import { chainName, DEFAULT_FROM, DEFAULT_TO, EVM_CHAIN_IDS, EXPLORERS } from "@/lib/chains";
import { connectEvm, currentEvmMode, disconnectEvm, NO_EVM_WALLET_MSG, sendDeposit, type EvmConnectMode } from "@/lib/evm";
import { nearTokenContract, WRAP_NEAR } from "@/lib/near-deposit";
import { connectNear, currentNearAccount, disconnectNear, sendNearDeposit } from "@/lib/near-wallet";
import { evaluateGuard, type GuardResult, type GuardRules } from "@/lib/guard";
import type { SwapForm } from "@/lib/quote-input";
import type { QuoteResponse, Token } from "@/lib/types";
import { fromBaseUnits, toBaseUnits } from "@/lib/units";
import { GuardList } from "./guard-list";
import { FundsTracker, StatusTracker } from "./status-tracker";
import { fundsView } from "@/lib/funds";
import { TokenSelect } from "./token-select";
import { Alert, Badge, Button, Card, cn, inputCls, Label, Row, Spinner } from "./ui";
import { CopyButton, DepositQR } from "./deposit-qr";
import { txUrl } from "@/lib/explorer";
import { localTime } from "@/lib/time";

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
  const [nearAccount, setNearAccount] = useState<string | null>(null);
  const [wrapNative, setWrapNative] = useState(true);

  const [evmMode, setEvmMode] = useState<EvmConnectMode>("injected");
  useEffect(() => { currentNearAccount().then(setNearAccount); setEvmMode(currentEvmMode()); }, []);

  useEffect(() => {
    fetch("/api/tokens")
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setTokens(d); })
      .catch((e) => setLoadErr(e.message || "Could not load supported tokens"));
  }, []);

  const fromTok = tokens?.find((t) => t.assetId === from);
  const toTok = tokens?.find((t) => t.assetId === to);
  const evmChainId = fromTok ? EVM_CHAIN_IDS[fromTok.blockchain] : undefined;
  const nearContract = fromTok?.blockchain === "near" ? nearTokenContract(fromTok.assetId) : null;

  async function connectNearWallet() {
    setErr(null);
    try {
      const a = await connectNear();
      setNearAccount(a);
      if (!refundTo.trim()) setRefundTo(a);
    } catch (e) { setErr((e as Error).message || "Could not connect a NEAR wallet"); }
  }

  async function payWithNear() {
    if (!quote?.quote.depositAddress || !nearContract || !nearAccount) return;
    setBusy(true); setErr(null);
    try {
      const h = await sendNearDeposit({ contract: nearContract, depositAddress: quote.quote.depositAddress, amount: quote.quote.amountIn, sender: nearAccount, wrapNative: nearContract === WRAP_NEAR && wrapNative });
      setTxHash(h);
      updateActivity(quote.quote.depositAddress, { depositTxHash: h });
    } catch (e) {
      setErr((e as Error).message || "NEAR wallet send failed. Nothing was sent unless your wallet shows a transaction.");
    } finally { setBusy(false); }
  }

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
    if (evmMode === "none") { setErr(NO_EVM_WALLET_MSG); return; }
    try { const a = await connectEvm(); setWallet(a); if (!refundTo) setRefundTo(a); } catch (e) { setErr((e as Error).message || "Could not connect a wallet. You can still scan the QR or copy the deposit address."); }
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

  const flip = () => {
    setFromChain(toChain); setToChain(fromChain); setFrom(to); setTo(from); reset();
  };

  if (loadErr) return <div className="mx-auto max-w-lg"><Alert>{loadErr}. Refresh the page to try again.</Alert></div>;
  if (!tokens) return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card className="space-y-4"><div className="flex items-center gap-3 text-sm text-white/60"><Spinner /> Loading supported assets from NEAR Intents</div>{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />)}</Card>
      <Card className="hidden h-64 animate-pulse lg:block"><span className="sr-only">Loading</span></Card>
    </div>
  );

  const q = quote?.quote;
  const live = phase === "live";
  const canGoLive = !!recipient.trim() && !!refundTo.trim();
  const locked = phase !== "edit";
  const outShown = q && toTok ? (q.amountOutFormatted ?? fromBaseUnits(q.amountOut, toTok.decimals)) : null;
  const walletChip = (txt: string, onClick?: () => void) => <button type="button" onClick={onClick} title={onClick ? "Disconnect" : undefined} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-white/80 hover:border-orange-500/50"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{txt}</button>;
  const sideCls = "rounded-2xl border border-white/[0.07] bg-black/30 p-4 space-y-3";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Swap</h1>
          {wallet ? walletChip(`${wallet.slice(0, 6)}...${wallet.slice(-4)}`, () => { disconnectEvm(); setWallet(null); })
            : nearContract ? (nearAccount
              ? walletChip(nearAccount.length > 22 ? `${nearAccount.slice(0, 8)}...${nearAccount.slice(-6)}` : nearAccount, () => { disconnectNear(); setNearAccount(null); })
              : <Button variant="outline" className="min-h-9 px-3 py-1.5 text-xs" onClick={connectNearWallet}>Connect NEAR wallet</Button>)
            : evmChainId ? (evmMode === "none" ? <span className="max-w-[12rem] text-right text-xs text-white/45">No wallet in this browser. Send with QR or address</span> : <Button variant="outline" className="min-h-9 px-3 py-1.5 text-xs" onClick={connect}>Connect wallet</Button>)
            : <span className="text-right text-xs text-white/40">Manual send on {chainName(fromChain)}</span>}
        </div>

        <div className={sideCls}>
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-white/45"><span>You send</span>{fromTok?.price && amount && Number(amount) > 0 ? <span className="normal-case tracking-normal">about ${(Number(amount) * fromTok.price).toFixed(2)}</span> : null}</div>
          <input aria-label="Amount" disabled={locked} className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-white/20 disabled:opacity-60" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} />
          <TokenSelect disabled={locked} label="You send" tokens={tokens} chain={fromChain} asset={from} onChain={(c) => pickChain("from", c)} onAsset={(a) => { setFrom(a); reset(); }} />
        </div>

        <div className="relative -my-2 flex justify-center">
          <button type="button" aria-label="Switch direction" disabled={locked} onClick={flip} className="z-10 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#121214] text-white/70 transition hover:border-orange-500/60 hover:text-orange-300 disabled:opacity-40">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M5 2v11m0 0-3-3m3 3 3-3M11 14V3m0 0-3 3m3-3 3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        <div className={sideCls}>
          <div className="text-xs font-medium uppercase tracking-wider text-white/45">You receive</div>
          <div className={cn("text-3xl font-semibold tracking-tight", !outShown && "text-white/20")}>{outShown ?? "0.00"}</div>
          <TokenSelect disabled={locked} label="You receive" tokens={tokens} chain={toChain} asset={to} onChain={(c) => pickChain("to", c)} onAsset={(a) => { setTo(a); reset(); }} />
        </div>

        <fieldset disabled={locked} className="space-y-4 disabled:opacity-60">
          <div>
            <Label>Recipient on {chainName(toChain)}</Label>
            <input className={inputCls} placeholder={toChain === "near" ? "name.near" : "Recipient address"} value={recipient} onChange={(e) => setRecipient(e.target.value)} autoComplete="off" spellCheck={false} />
          </div>
          <div>
            <Label>Refund address on {chainName(fromChain)}</Label>
            <input className={inputCls} placeholder="Where funds go back if the swap cannot complete" value={refundTo} onChange={(e) => setRefundTo(e.target.value)} autoComplete="off" spellCheck={false} />
          </div>
          <p className="-mt-1 text-xs text-white/40">Both are optional for a preview and required for a deposit address.</p>
          <details open className="group rounded-2xl border border-orange-500/20 bg-orange-500/[0.04]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-orange-300">
              <span>Swap Guard conditions</span>
              <svg width="12" height="12" viewBox="0 0 12 12" className="text-orange-300/70 transition group-open:rotate-180" aria-hidden><path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
            </summary>
            <div className="grid grid-cols-2 gap-3 px-4 pb-4">
              <div><Label>Min received{toTok ? ` (${toTok.symbol})` : ""}</Label><input className={inputCls} inputMode="decimal" placeholder="Optional" value={minReceive} onChange={(e) => setMinReceive(e.target.value)} /></div>
              <div><Label>Max cost (USD)</Label><input className={inputCls} inputMode="decimal" placeholder="Optional" value={maxCost} onChange={(e) => setMaxCost(e.target.value)} /></div>
              <div><Label>Valid for (min)</Label><input className={inputCls} inputMode="numeric" value={minValidity} onChange={(e) => setMinValidity(e.target.value)} /></div>
              <div><Label>Max time (sec)</Label><input className={inputCls} inputMode="numeric" placeholder="Optional" value={maxTime} onChange={(e) => setMaxTime(e.target.value)} /></div>
              <div className="col-span-2"><Label>Slippage tolerance (%)</Label><input className={inputCls} inputMode="decimal" value={slippage} onChange={(e) => setSlippage(e.target.value)} /></div>
            </div>
          </details>
        </fieldset>

        {err && <Alert>{err}</Alert>}
        {phase === "edit" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="min-h-12" onClick={preview} disabled={busy || !amount}>{busy ? <><Spinner /> Getting quote</> : "Preview quote"}</Button>
            <Button className="min-h-12" onClick={confirm} disabled={busy || !amount || !canGoLive}>Get deposit address</Button>
          </div>
        )}
        {phase === "review" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="min-h-12" onClick={reset} disabled={busy}>Edit</Button>
            <Button className="min-h-12" onClick={confirm} disabled={busy || !!guard?.blocked || !canGoLive}>{busy ? <><Spinner /> Re-checking</> : "Get deposit address"}</Button>
          </div>
        )}
        {phase !== "live" && <p className="text-xs leading-relaxed text-white/40">Preview quote needs no wallet or funds and never returns a deposit address. Get deposit address fetches a fresh live quote and runs Swap Guard again first.</p>}
        {live && <Button variant="outline" className="min-h-12 w-full" onClick={reset}>Start a new swap</Button>}
      </Card>

      <div className="space-y-6">
        {!quote && (
          <Card className="space-y-4">
            <h2 className="font-semibold">Before you send</h2>
            <ol className="space-y-3 text-sm text-white/60">
              {["Pick what you send and receive, and an amount.", "Set your Swap Guard conditions.", "Preview a real quote. Every condition is checked.", "Get a one-time deposit address and send. Track it live."].map((t, i) => (
                <li key={t} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-orange-500/40 text-xs font-semibold text-orange-300">{i + 1}</span><span className="pt-0.5">{t}</span></li>
              ))}
            </ol>
          </Card>
        )}

        {live && q?.depositAddress && fromTok && toTok && (
          <Card className="space-y-5 border-orange-500/30 bg-orange-500/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Send your deposit</h2>
              {q.deadline && <span className="text-right text-xs text-white/45">Quote valid until {localTime(q.deadline)}</span>}
            </div>
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <DepositQR value={q.depositAddress} />
              <div className="w-full min-w-0 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/45">Send exactly</div>
                  <div className="text-2xl font-semibold">{q.amountInFormatted} {fromTok.symbol}</div>
                  <div className="text-sm text-white/50">on {chainName(fromTok.blockchain)}</div>
                </div>
                <div className="break-all rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed sm:text-sm">{q.depositAddress}</div>
              </div>
            </div>
            {q.depositMemo && <Alert tone="warn">Memo required: <b>{q.depositMemo}</b></Alert>}
            <div className="grid gap-2 sm:grid-cols-2">
              <CopyButton value={q.depositAddress} />
              {evmChainId && wallet && !txHash && <Button className="min-h-11" onClick={payWithWallet} disabled={busy}>{busy ? <><Spinner /> Waiting for wallet</> : "Send with wallet"}</Button>}
              {evmChainId && !wallet && !txHash && evmMode !== "none" && <Button className="min-h-11" variant="outline" onClick={connect}>Connect wallet to send</Button>}
              {nearContract && nearAccount && !txHash && <Button className="min-h-11" onClick={payWithNear} disabled={busy}>{busy ? <><Spinner /> Waiting for wallet</> : "Send with NEAR wallet"}</Button>}
              {nearContract && !nearAccount && !txHash && <Button className="min-h-11" variant="outline" onClick={connectNearWallet}>Connect NEAR wallet to send</Button>}
            </div>
            {nearContract === WRAP_NEAR && nearAccount && !txHash && (
              <label className="flex min-h-11 items-center gap-3 text-sm text-white/60"><input type="checkbox" className="h-4 w-4 accent-orange-500" checked={wrapNative} onChange={(e) => setWrapNative(e.target.checked)} /> Pay with native NEAR (wrapped to wNEAR in the same transaction)</label>
            )}
            {nearContract && nearAccount && !txHash && <p className="text-xs leading-relaxed text-white/40">Your wallet shows one transaction to the token contract. If the deposit address is not registered on the token yet, it includes a small NEAR storage deposit, as the token standard requires. The transfer attaches 1 yoctoNEAR.</p>}
            {evmChainId && !wallet && !txHash && evmMode === "none" && <p className="text-xs leading-relaxed text-white/45">This browser has no built-in wallet. Scan the QR with your wallet app, or copy the address and send exactly the amount above on {chainName(fromTok.blockchain)}. Or open this page in your wallet app&apos;s browser.</p>}
            {!evmChainId && !nearContract && <p className="text-xs text-white/45">Send from any wallet on {chainName(fromTok.blockchain)}. Scan the QR or copy the address.</p>}
            {txHash && <Row k="Your deposit tx" v={(() => { const u = txUrl(fromTok.blockchain, txHash); const t = `${txHash.slice(0, 10)}...${txHash.slice(-6)}`; return u ? <a className="text-orange-400 underline" href={u} target="_blank" rel="noreferrer">{t}</a> : t; })()} />}
            <div className="border-t border-white/5 pt-4">
              <StatusTracker depositAddress={q.depositAddress} depositMemo={q.depositMemo} originChain={fromTok.blockchain} destChain={toTok.blockchain} depositTxHash={txHash ?? undefined} />
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              {EXPLORERS[fromTok.blockchain] && <a className="text-orange-400 underline" href={EXPLORERS[fromTok.blockchain](q.depositAddress)} target="_blank" rel="noreferrer">View address on explorer</a>}
              <Link href={`/activity?deposit=${encodeURIComponent(q.depositAddress)}`} className="text-white/50 hover:text-white">Open in Activity</Link>
            </div>
          </Card>
        )}

        {q && toTok && fromTok && (
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{live ? "Live quote" : "Quote preview"}</h2>
              <Badge tone={live ? "ok" : "brand"}>{live ? "Deposit address issued" : "Preview only, nothing can be sent"}</Badge>
            </div>
            <div className="mb-3 rounded-xl bg-black/30 p-4">
              <div className="text-xs text-white/45">Expected to receive</div>
              <div className="text-2xl font-semibold">{outShown} {toTok.symbol}</div>
              <div className="text-xs text-white/45">on {chainName(toTok.blockchain)}{q.amountOutUsd ? `, ${usd(q.amountOutUsd)}` : ""}</div>
            </div>
            <div className="divide-y divide-white/5">
              <Row k="You send" v={`${q.amountInFormatted ?? fromBaseUnits(q.amountIn, fromTok.decimals)} ${fromTok.symbol} on ${chainName(fromTok.blockchain)}`} />
              <Row k="Minimum received" v={q.minAmountOut ? `${fromBaseUnits(q.minAmountOut, toTok.decimals)} ${toTok.symbol}` : "Not provided"} />
              <Row k="Value in / out" v={`${usd(q.amountInUsd)} / ${usd(q.amountOutUsd)}`} />
              <Row k="Estimated cost" v={q.amountInUsd && q.amountOutUsd ? `$${Math.max(0, Number(q.amountInUsd) - Number(q.amountOutUsd)).toFixed(2)}` : "Not provided"} />
              {q.withdrawFee && <Row k="Withdraw fee (included)" v={`${fromBaseUnits(q.withdrawFee, toTok.decimals)} ${toTok.symbol}`} />}
              <Row k="Estimated time" v={typeof q.timeEstimate === "number" ? `${q.timeEstimate}s` : "Not provided"} />
              <Row k="Recipient" v={recipient.trim() || "Not entered (preview only)"} />
              {!live && <Row k="Quote valid until" v={q.deadline ? localTime(q.deadline) : "Set when you confirm"} />}
            </div>
          </Card>
        )}

        {guard && (
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Swap Guard</h2>
              {guard.blocked ? <Badge tone="bad">Blocked by a failed check</Badge> : <Badge tone="ok">No required check failed</Badge>}
            </div>
            <GuardList checks={guard.checks} />
            <p className="mt-3 text-xs text-white/40">Checks marked Bridgen only run in this app. They do not change what the protocol does with your deposit.</p>
          </Card>
        )}

        {!live && q && fromTok && toTok && (
          <FundsTracker view={fundsView("PENDING_DEPOSIT", { originChain: chainName(fromTok.blockchain), destChain: chainName(toTok.blockchain) })} note="Preview only, nothing sent" />
        )}
      </div>
    </div>
  );
}
