import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Button({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" }) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-orange-500 text-black hover:bg-orange-400",
        variant === "outline" && "border border-white/15 text-white hover:border-orange-500/60 hover:bg-white/5",
        variant === "ghost" && "text-white/70 hover:text-white",
        className,
      )}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] sm:p-6", className)}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white/50">{children}</div>;
}

export const inputCls =
  "h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-base text-white sm:text-sm placeholder:text-white/30 outline-none transition focus:border-orange-500/70";

export function Badge({ tone, children }: { tone: "ok" | "bad" | "warn" | "muted" | "brand"; children: ReactNode }) {
  const t = {
    ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    bad: "bg-red-500/15 text-red-300 border-red-500/30",
    warn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    muted: "bg-white/5 text-white/60 border-white/10",
    brand: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", t)}>{children}</span>;
}

export function Row({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-white/50">{k}</span>
      <span className="text-right font-medium text-white break-all">{v}</span>
    </div>
  );
}

export function Alert({ tone = "bad", children }: { tone?: "bad" | "warn" | "info"; children: ReactNode }) {
  const t = { bad: "border-red-500/30 bg-red-500/10 text-red-200", warn: "border-amber-500/30 bg-amber-500/10 text-amber-100", info: "border-white/10 bg-white/5 text-white/70" }[tone];
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", t)}>{children}</div>;
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}
