import Link from "next/link";

// Flip to true at launch, once the repo is public.
const SHOW_SOURCE_LINK = true;

export function Logo() {
  return (
    <Link href="/" aria-label="Bridgen home" className="flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/bridgen-lockup-dark.svg" alt="Bridgen" width={141} height={24} className="h-6 w-auto" />
    </Link>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-5">
        <Logo />
        <nav className="flex items-center gap-1 text-sm sm:gap-4">
          <Link href="/#swap-guard" className="hidden px-2 text-white/60 hover:text-white sm:block">Swap Guard</Link>
          <Link href="/#how" className="hidden px-2 text-white/60 hover:text-white sm:block">How it works</Link>
          <Link href="/activity" className="inline-flex min-h-11 items-center px-3 text-white/60 hover:text-white">Activity</Link>
          <Link href="/swap" className="inline-flex min-h-10 items-center rounded-xl bg-orange-500 px-4 font-semibold text-black hover:bg-orange-400">Swap</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/5 sm:mt-24">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3 sm:px-5">
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
          {SHOW_SOURCE_LINK && (
            <a className="block text-white/70 hover:text-white" href="https://github.com/miracuzzy/bridgen" target="_blank" rel="noreferrer">Source code</a>
          )}
          <a className="block text-white/70 hover:text-white" href="https://x.com/usebridgen" target="_blank" rel="noreferrer">X (@usebridgen)</a>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-8 text-xs text-white/30">Swaps carry risk. Bridgen checks quotes before you send but cannot guarantee outcomes.</div>
    </footer>
  );
}
