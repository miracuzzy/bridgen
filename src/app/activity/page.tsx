"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadActivity, removeActivity, type ActivityItem } from "@/lib/activity";
import { isDepositAddress } from "@/lib/swap-summary";
import type { Token } from "@/lib/types";
import { SwapCard } from "@/components/swap-card";
import { Alert, Button, Card, inputCls, Label } from "@/components/ui";

export default function Activity() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [input, setInput] = useState("");
  const [memo, setMemo] = useState("");
  const [lookup, setLookup] = useState<{ addr: string; memo?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadActivity());
    fetch("/api/tokens").then((r) => (r.ok ? r.json() : [])).then(setTokens).catch(() => {});
    const q = new URLSearchParams(window.location.search).get("deposit");
    if (q && isDepositAddress(q)) { setInput(q); setLookup({ addr: q.trim() }); }
  }, []);

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    const a = input.trim();
    if (!isDepositAddress(a)) { setErr("That does not look like a deposit address."); return; }
    setErr(null);
    setLookup({ addr: a, memo: memo.trim() || undefined });
    const u = new URL(window.location.href); u.searchParams.set("deposit", a); window.history.replaceState(null, "", u);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-5 py-10">
      <h1 className="text-2xl font-semibold">Activity</h1>
      <Card>
        <form onSubmit={find} className="space-y-3">
          <Label>Look up a swap by its deposit address</Label>
          <input className={inputCls} placeholder="Paste the one-time deposit address" value={input} onChange={(e) => setInput(e.target.value)} />
          <input className={inputCls} placeholder="Memo (only if the deposit needed one)" value={memo} onChange={(e) => setMemo(e.target.value)} />
          <Button type="submit" disabled={!input.trim()}>Look up</Button>
          {err && <Alert>{err}</Alert>}
          <p className="text-xs text-white/40">Status, amounts, fees and transactions come live from the 1Click API. Works for any 1Click swap, not only ones made here.</p>
        </form>
      </Card>
      {lookup && <SwapCard key={lookup.addr + (lookup.memo ?? "")} depositAddress={lookup.addr} depositMemo={lookup.memo} tokens={tokens} />}
      <h2 className="pt-2 text-lg font-semibold">Swaps from this browser</h2>
      {items?.length === 0 && <Card className="text-sm text-white/50">No swaps saved here yet. <Link className="text-orange-400 underline" href="/swap">Start one</Link> or look one up above.</Card>}
      {items?.filter((a) => a.depositAddress !== lookup?.addr).map((a) => (
        <SwapCard key={a.depositAddress} depositAddress={a.depositAddress} depositMemo={a.depositMemo} tokens={tokens} createdAt={a.createdAt}
          onRemove={() => { removeActivity(a.depositAddress); setItems(loadActivity()); }} />
      ))}
    </div>
  );
}
