"use client";
import { useEffect, useState } from "react";
import { updateActivity } from "@/lib/activity";
import { chainName } from "@/lib/chains";
import { fundsView } from "@/lib/funds";
import { outcomeNote, summarize, type TxLink } from "@/lib/swap-summary";
import { localTime } from "@/lib/time";
import type { StatusResponse, Token } from "@/lib/types";
import { FundsTracker, StatusBadge } from "./status-tracker";
import { Alert, Card, Row, Spinner } from "./ui";

const FINAL = new Set(["SUCCESS", "REFUNDED", "FAILED"]);
const short = (h: string) => (h.length > 20 ? `${h.slice(0, 10)}...${h.slice(-6)}` : h);
const usd = (v?: string) => (v && Number.isFinite(Number(v)) ? ` ($${Number(v).toFixed(2)})` : "");

function Txs({ label, txs }: { label: string; txs: TxLink[] }) {
  if (!txs.length) return null;
  return <Row k={label} v={<span className="flex flex-col items-end">{txs.map((t) => t.url ? <a key={t.hash} className="font-mono text-orange-400 underline" href={t.url} target="_blank" rel="noreferrer">{short(t.hash)}</a> : <span key={t.hash} className="font-mono">{short(t.hash)}</span>)}</span>} />;
}

export function SwapCard({ depositAddress, depositMemo, tokens, createdAt, onRemove }: { depositAddress: string; depositMemo?: string; tokens: Token[]; createdAt?: string; onRemove?: () => void }) {
  const [s, setS] = useState<StatusResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const q = new URLSearchParams({ depositAddress, ...(depositMemo ? { depositMemo } : {}) });
        const r = await fetch(`/api/status?${q}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Status unavailable");
        if (stop) return;
        setS(d); setErr(null);
        updateActivity(depositAddress, { lastStatus: d.status });
        if (FINAL.has(d.status)) return;
      } catch (e) {
        if (!stop) setErr((e as Error).message);
      }
      if (!stop) timer = setTimeout(tick, 6000);
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [depositAddress, depositMemo]);

  if (!s) return <Card className="text-sm">{err ? <Alert>{err} for {short(depositAddress)}</Alert> : <span className="flex items-center gap-2 text-white/60"><Spinner /> Checking {short(depositAddress)}</span>}</Card>;

  const v = summarize(s, tokens);
  const note = outcomeNote(v);
  const fromL = v.from ? `${v.from.symbol} on ${chainName(v.from.chain)}`.trim() : "";
  const toL = v.to ? `${v.to.symbol} on ${chainName(v.to.chain)}`.trim() : "";
  const view = fundsView(s.status, { originChain: chainName(v.from?.chain ?? ""), destChain: chainName(v.to?.chain ?? ""), details: { ...s.swapDetails, originChainTxHashes: v.originTxs.map((t) => ({ hash: t.hash, explorerUrl: t.url })), destinationChainTxHashes: v.destTxs.map((t) => ({ hash: t.hash, explorerUrl: t.url })) } });

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">{v.amountIn ?? "?"} {fromL} <span className="text-white/40">to</span> {toL}</div>
        <span className="flex items-center gap-2">{!FINAL.has(s.status) && <Spinner />}<StatusBadge status={s.status} /></span>
      </div>
      {note && <Alert tone={s.status === "FAILED" ? undefined : "warn"}>{note}</Alert>}
      <div className="divide-y divide-white/5">
        <Row k="Sent" v={v.amountIn ? `${v.amountIn} ${v.from?.symbol ?? ""}${usd(v.amountInUsd)}` : "Not provided"} />
        {v.deposited && v.deposited !== v.amountIn && <Row k="Deposited" v={`${v.deposited} ${v.from?.symbol ?? ""}`} />}
        <Row k="Received" v={v.amountOut ? `${v.amountOut} ${v.to?.symbol ?? ""}${usd(v.amountOutUsd)}` : s.status === "SUCCESS" ? "Not provided" : "Nothing delivered"} />
        {v.refunded && <Row k="Refunded" v={`${v.refunded} ${v.from?.symbol ?? ""}`} />}
        {v.refundReason && <Row k="Refund reason" v={v.refundReason} />}
        {v.withdrawFee && <Row k="Withdraw fee (included)" v={`${v.withdrawFee} ${v.to?.symbol ?? ""}`} />}
        {v.refundFee && <Row k="Refund fee (if refunded)" v={`${v.refundFee} ${v.from?.symbol ?? ""}`} />}
        {v.costUsd && <Row k="Total cost" v={`$${v.costUsd} (value in minus value out)`} />}
        {v.recipient && <Row k="Recipient" v={<span className="break-all">{v.recipient}</span>} />}
        {v.refundTo && <Row k="Refund address" v={<span className="break-all">{v.refundTo}</span>} />}
        <Row k="Deposit address" v={<span className="break-all font-mono">{depositAddress}</span>} />
        {createdAt && <Row k="Created" v={localTime(createdAt)} />}
        <Row k="Last update" v={localTime(v.updatedAt)} />
        <Txs label={`Deposit tx${v.from ? ` (${chainName(v.from.chain)})` : ""}`} txs={v.originTxs} />
        <Txs label={`Delivery tx${v.to ? ` (${chainName(v.to.chain)})` : ""}`} txs={v.destTxs} />
      </div>
      <FundsTracker view={view} />
      <div className="flex justify-between text-xs">
        <a className="text-white/50 underline hover:text-white" href="https://explorer.near-intents.org" target="_blank" rel="noreferrer">Search this address on NEAR Intents Explorer</a>
        {onRemove && <button className="text-white/40 hover:text-white" onClick={onRemove}>Remove from this browser</button>}
      </div>
      {err && <p className="text-xs text-amber-300">{err}. Retrying.</p>}
    </Card>
  );
}
