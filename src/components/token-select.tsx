"use client";
import { chainName } from "@/lib/chains";
import type { Token } from "@/lib/types";
import { inputCls, Label } from "./ui";

export function TokenSelect({ label, tokens, chain, asset, onChain, onAsset }: {
  label: string; tokens: Token[]; chain: string; asset: string; onChain: (c: string) => void; onAsset: (a: string) => void;
}) {
  const chains = [...new Set(tokens.map((t) => t.blockchain))].sort((a, b) => chainName(a).localeCompare(chainName(b)));
  const assets = tokens.filter((t) => t.blockchain === chain).sort((a, b) => a.symbol.localeCompare(b.symbol));
  return (
    <div>
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <select aria-label={`${label} chain`} className={inputCls} value={chain} onChange={(e) => onChain(e.target.value)}>
          {chains.map((c) => <option key={c} value={c}>{chainName(c)}</option>)}
        </select>
        <select aria-label={`${label} asset`} className={inputCls} value={asset} onChange={(e) => onAsset(e.target.value)}>
          {assets.map((t) => <option key={t.assetId} value={t.assetId}>{t.symbol}</option>)}
        </select>
      </div>
    </div>
  );
}
