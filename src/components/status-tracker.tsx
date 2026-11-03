"use client";
import { useEffect, useState } from "react";
import { updateActivity } from "@/lib/activity";
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

export function StatusTracker({ depositAddress, depositMemo }: { depositAddress: string; depositMemo?: string }) {
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

  const d = s?.swapDetails;
  const txs = [...(d?.originChainTxHashes ?? []).map((t) => ["Deposit tx", t] as const), ...(d?.destinationChainTxHashes ?? []).map((t) => ["Delivery tx", t] as const)];
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50">Status</span>
        <span className="flex items-center gap-2">{s && !FINAL.has(s.status) && <Spinner />}<StatusBadge status={s?.status} /></span>
      </div>
      {err && <p className="mt-2 text-xs text-amber-300">{err}. Retrying.</p>}
      {s?.updatedAt && <Row k="Updated" v={new Date(s.updatedAt).toLocaleString()} />}
      {d?.depositedAmountFormatted && <Row k="Deposited" v={d.depositedAmountFormatted} />}
      {d?.amountOutFormatted && <Row k="Delivered" v={`${d.amountOutFormatted}${d.amountOutUsd ? ` ($${Number(d.amountOutUsd).toFixed(2)})` : ""}`} />}
      {d?.refundedAmountFormatted && Number(d.refundedAmountFormatted) > 0 && <Row k="Refunded" v={`${d.refundedAmountFormatted}${d.refundReason ? ` (${d.refundReason})` : ""}`} />}
      {txs.map(([k, t]) => (
        <Row key={t.hash} k={k} v={t.explorerUrl ? <a className="text-orange-400 underline" href={t.explorerUrl} target="_blank" rel="noreferrer">{t.hash.slice(0, 10)}...{t.hash.slice(-6)}</a> : t.hash} />
      ))}
    </div>
  );
}
