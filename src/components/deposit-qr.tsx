"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

// QR of the deposit address only. Amount is shown next to it, wallets differ in how they read amount URIs.
export function DepositQR({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: 360, color: { dark: "#0a0a0b", light: "#ffffff" } }).then(setSrc).catch(() => setSrc(null));
  }, [value]);
  if (!src) return <div className="h-40 w-40 animate-pulse rounded-xl bg-white/10" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="QR code of the deposit address" className="h-40 w-40 rounded-xl bg-white p-1.5" />;
}

export function CopyButton({ value, label = "Copy address", className = "" }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold transition hover:border-orange-500/60 hover:bg-white/5 ${className}`}
      onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } }}>
      {done ? "Copied" : label}
    </button>
  );
}
