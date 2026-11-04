"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadActivity, type ActivityItem } from "@/lib/activity";
import { EXPLORERS } from "@/lib/chains";
import { StatusTracker } from "@/components/status-tracker";
import { Card, Row } from "@/components/ui";

export default function Activity() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  useEffect(() => setItems(loadActivity()), []);
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-5 py-10">
      <h1 className="text-2xl font-semibold">Activity</h1>
      <p className="text-sm text-white/50">Swaps you confirmed in this browser. Status comes live from the 1Click API.</p>
      {items?.length === 0 && <Card className="text-sm text-white/50">No swaps yet. <Link className="text-orange-400 underline" href="/swap">Start one</Link>.</Card>}
      {items?.map((a) => (
        <Card key={a.depositAddress}>
          <div className="mb-2 font-semibold">{a.amountIn} {a.fromLabel} to {a.toLabel}</div>
          <Row k="Created" v={new Date(a.createdAt).toLocaleString()} />
          <Row k="Expected" v={a.expectedOut} />
          {a.minOut && <Row k="Minimum" v={a.minOut} />}
          <Row k="Recipient" v={a.recipient} />
          <Row k="Deposit address" v={EXPLORERS[a.originChain] ? <a className="text-orange-400 underline" href={EXPLORERS[a.originChain](a.depositAddress)} target="_blank" rel="noreferrer">{a.depositAddress}</a> : a.depositAddress} />
          {a.depositTxHash && <Row k="Deposit tx" v={a.depositTxHash} />}
          <div className="mt-2 border-t border-white/5 pt-2"><StatusTracker depositAddress={a.depositAddress} depositMemo={a.depositMemo} originChain={a.originChain} destChain={a.destChain ?? a.toLabel.split(" on ").pop() ?? ""} depositTxHash={a.depositTxHash} /></div>
        </Card>
      ))}
    </div>
  );
}
