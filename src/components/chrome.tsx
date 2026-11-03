import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#f97316" />
        <path d="M7 20c3-6 15-6 18 0M10 20v4M22 20v4M16 14v10" stroke="#0a0a0a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </svg>
      <span className="text-lg">Bridgen</span>
    </Link>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="flex items-center gap-1 text-sm sm:gap-4">
          <Link href="/#swap-guard" className="hidden px-2 text-white/60 hover:text-white sm:block">Swap Guard</Link>
          <Link href="/#how" className="hidden px-2 text-white/60 hover:text-white sm:block">How it works</Link>
          <Link href="/activity" className="px-2 text-white/60 hover:text-white">Activity</Link>
          <Link href="/swap" className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-black hover:bg-orange-400">Swap</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/5">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 text-sm sm:grid-cols-3">
        <div className="space-y-2">
          <Logo />
          <p className="text-white/50">Cross-chain swaps, powered by NEAR Intents.</p>
        </div>
        <div className="space-y-2">
          <div className="text-white/40">Product</div>
          <Link className="block text-white/70 hover:text-white" href="/swap">Swap</Link>
          <Link className="block text-white/70 hover:text-white" href="/activity">Activity</Link>
          <Link className="block text-white/70 hover:text-white" href="/#swap-guard">Swap Guard</Link>
        </div>
        <div className="space-y-2">
          <div className="text-white/40">Docs</div>
          <a className="block text-white/70 hover:text-white" href="https://docs.near-intents.org" target="_blank" rel="noreferrer">NEAR Intents docs</a>
          <a className="block text-white/70 hover:text-white" href="https://docs.near-intents.org/integration/distribution-channels/1click-api/about-1click-api" target="_blank" rel="noreferrer">1Click Swap API</a>
          <a className="block text-white/70 hover:text-white" href="https://github.com/miracuzzy/bridgen" target="_blank" rel="noreferrer">Source code</a>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-8 text-xs text-white/30">Swaps carry risk. Bridgen checks quotes before you send but cannot guarantee outcomes.</div>
    </footer>
  );
}
