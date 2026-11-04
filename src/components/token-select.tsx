"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { chainName } from "@/lib/chains";
import { filterOptions, type Option } from "@/lib/search";
import type { Token } from "@/lib/types";
import { cn } from "./ui";

function SearchSelect({ label, value, options, onChange, placeholder }: { label: string; value: string; options: Option[]; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useMemo(() => filterOptions(options, q), [options, q]);
  const cur = options.find((o) => o.value === value);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  const pick = (v: string) => { onChange(v); setOpen(false); setQ(""); };
  return (
    <div ref={box} className="relative min-w-0">
      <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-left text-sm font-medium transition hover:border-white/25 focus:border-orange-500/70 focus:outline-none disabled:opacity-60">
        <span className="truncate">{cur?.label ?? placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 text-white/40" aria-hidden><path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-40 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-white/10 bg-[#141416] shadow-2xl shadow-black/60">
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${placeholder.toLowerCase()}`}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); if (e.key === "Enter" && list[0]) { e.preventDefault(); pick(list[0].value); } }}
            className="w-full border-b border-white/10 bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-white/30" />
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {list.length === 0 && <li className="px-3.5 py-3 text-sm text-white/40">No match</li>}
            {list.map((o) => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button type="button" onClick={() => pick(o.value)} className={cn("flex min-h-11 w-full items-center justify-between gap-3 px-3.5 text-left text-sm hover:bg-white/5", o.value === value && "text-orange-300")}>
                  <span className="truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-xs text-white/35">{o.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TokenSelect({ label, tokens, chain, asset, onChain, onAsset, disabled }: {
  label: string; tokens: Token[]; chain: string; asset: string; onChain: (c: string) => void; onAsset: (a: string) => void; disabled?: boolean;
}) {
  const chains = useMemo(() => [...new Set(tokens.map((t) => t.blockchain))].sort((a, b) => chainName(a).localeCompare(chainName(b))).map((c) => ({ value: c, label: chainName(c), keywords: [c] })), [tokens]);
  const assets = useMemo(() => tokens.filter((t) => t.blockchain === chain).sort((a, b) => a.symbol.localeCompare(b.symbol))
    .map((t) => ({ value: t.assetId, label: t.symbol, hint: t.price ? `$${t.price < 1 ? t.price.toPrecision(3) : t.price.toFixed(2)}` : undefined })), [tokens, chain]);
  return (
    <fieldset disabled={disabled} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
      <SearchSelect label={`${label} asset`} value={asset} options={assets} onChange={onAsset} placeholder="Token" />
      <SearchSelect label={`${label} network`} value={chain} options={chains} onChange={onChain} placeholder="Network" />
    </fieldset>
  );
}
