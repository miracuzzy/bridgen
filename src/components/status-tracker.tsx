"use client";
import { useEffect, useState } from "react";
import { updateActivity } from "@/lib/activity";
import { chainName } from "@/lib/chains";
import { fundsView, type FundsView } from "@/lib/funds";
import { txUrl } from "@/lib/explorer";
import { localTime } from "@/lib/time";
import type { StatusResponse } from "@/lib/types";
import { Badge, Row, Spinner } from "./ui";

const FINAL = new Set(["SUCCESS", "REFUNDED", "FAILED"]);
const TONE: Record<string, "ok" | "bad" | "warn" | "muted" | "brand"> = {
  SUCCESS: "ok", REFUNDED: "warn", FAILED: "bad", PROCESSING: "brand", KNOWN_DEPOSIT_TX: "brand", PENDING_DEPOSIT: "muted", INCOMPLETE_DEPOSIT: "warn",
};
const LABEL: Record<string, string> = {
  PENDING_DEPOSIT: "Waiting for deposit", KNOWN_DEPOSIT_TX: "Deposit seen", INCOMPLETE_DEPOSIT: "Deposit too small", PROCESSING: "Swapping",
  SUCCESS: "Complete", REFUNDED: "Refunded", FAILED: "Failed",
};

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return <Badge tone="muted">Unknown</Badge>;
  return <Badge tone={TONE[status] ?? "muted"}>{LABEL[status] ?? status}</Badge>;
}

const DOT: Record<string, string> = {
  done: "bg-emerald-400 border-emerald-400", current: "bg-orange-500 border-orange-400 animate-pulse", upcoming: "bg-transparent border-white/25",
  failed: "bg-red-500 border-red-400", skipped: "bg-transparent border-white/15",
};

export function FundsTracker({ view, note }: { view: FundsView; note?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Where your funds are</span>
        <span className="text-right text-xs text-orange-300">{note ?? view.location}</span>
      </div>
      <ol className="space-y-3">
        {view.steps.map((st, i) => (
          <li key={st.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`mt-1 h-3 w-3 rounded-full border-2 ${DOT[st.state]}`} />
              {i < view.steps.length - 1 && <span className="mt-1 w-px flex-1 bg-white/10" />}
            </div>
            <div className={`pb-1 ${st.state === "upcoming" || st.state === "skipped" ? "opacity-50" : ""}`}>
              <div className="text-sm font-medium">{st.label}{st.state === "skipped" && <span className="ml-2 text-xs text-white/40">skipped</span>}</div>
              <div className="text-xs text-white/50">{st.detail}</div>
              {st.txs.map((t) => (
                <div key={t.hash} className="text-xs">
                  {t.explorerUrl ? <a className="text-orange-400 underline" href={t.explorerUrl} target="_blank" rel="noreferrer">{t.hash.slice(0, 10)}...{t.hash.slice(-6)}</a> : <span className="font-mono text-white/60">{t.hash.slice(0, 10)}...{t.hash.slice(-6)}</span>}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function StatusTracker({ depositAddress, depositMemo, originChain, destChain, depositTxHash }: { depositAddress: string; depositMemo?: string; originChain: string; destChain: string; depositTxHash?: string }) {
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
        setS(d);
        setErr(null);
        updateActivity(depositAddress, { lastStatus: d.status });
        if (FINAL.has(d.status)) return;
      } catch (e) {
        if (!stop) setErr((e as Error).message);
      }
      if (!stop) timer = setTimeout(tick, 5000);
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [depositAddress, depositMemo]);

  const raw = s?.swapDetails;
  const d = raw && {
    ...raw,
    originChainTxHashes: raw.originChainTxHashes?.map((t) => ({ ...t, explorerUrl: txUrl(originChain, t.hash, t.explorerUrl || undefined) })),
    destinationChainTxHashes: raw.destinationChainTxHashes?.map((t) => ({ ...t, explorerUrl: txUrl(destChain, t.hash, t.explorerUrl || undefined) })),
  };
  const txs = [...(d?.originChainTxHashes ?? []).map((t) => ["Deposit tx", t] as const), ...(d?.destinationChainTxHashes ?? []).map((t) => ["Delivery tx", t] as const)];
  const view = fundsView(s?.status, { originChain: chainName(originChain), destChain: chainName(destChain), details: d, depositTxHash });
  return (
    <div className="space-y-3">
      <FundsTracker view={view} note={s ? undefined : "Checking status"} />
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50">Status</span>
        <span className="flex items-center gap-2">{s && !FINAL.has(s.status) && <Spinner />}<StatusBadge status={s?.status} /></span>
      </div>
      {err && <p className="mt-2 text-xs text-amber-300">{err}. Retrying.</p>}
      {s?.updatedAt && <Row k="Updated" v={localTime(s.updatedAt)} />}
      {d?.depositedAmountFormatted && <Row k="Deposited" v={d.depositedAmountFormatted} />}
      {d?.amountOutFormatted && <Row k="Delivered" v={`${d.amountOutFormatted}${d.amountOutUsd ? ` ($${Number(d.amountOutUsd).toFixed(2)})` : ""}`} />}
      {d?.refundedAmountFormatted && Number(d.refundedAmountFormatted) > 0 && <Row k="Refunded" v={`${d.refundedAmountFormatted}${d.refundReason ? ` (${d.refundReason})` : ""}`} />}
      {(s?.status === "REFUNDED" || s?.status === "FAILED") && <p className="text-xs text-amber-300">{s.status === "REFUNDED" ? "This swap was refunded to your refund address." : "1Click reported this swap as failed."}{d?.refundReason ? ` Reason: ${d.refundReason}.` : ""} Full details are on the Activity page.</p>}
      {txs.map(([k, t]) => (
        <Row key={t.hash} k={k} v={t.explorerUrl ? <a className="text-orange-400 underline" href={t.explorerUrl} target="_blank" rel="noreferrer">{t.hash.slice(0, 10)}...{t.hash.slice(-6)}</a> : t.hash} />
      ))}
    </div>
  );
}
