import Link from "next/link";
import { Badge, Card } from "@/components/ui";

const steps = [
  ["Pick a route", "Choose what you send and what you receive, from assets the 1Click API lists as supported right now."],
  ["Set your conditions", "Minimum received, maximum cost, how long the quote must stay valid, maximum time."],
  ["Check the quote", "Every condition is marked Passed, Failed or Unable to verify. A failed required check stops the swap."],
  ["Send and track", "Get a one-time deposit address, send from your wallet and follow your funds live until delivery."],
];

const features = [
  ["Cross-chain routing", "Market makers compete to fill your swap across the chains NEAR Intents supports. Bridgen never holds your funds."],
  ["Swap Guard", "Your limits become explicit checks against the quote, each labelled as protocol enforced or checked by Bridgen only."],
  ["Full transparency", "Amounts, fees, quote expiry, status and transaction links come straight from the API. Nothing is made up."],
];

// Real mainnet swaps made through Bridgen. Values from the 1Click status API.
const realSwaps = [
  { from: "1 USDC", fromChain: "Base", to: "0.994658 USDC", toChain: "NEAR", deposit: "0x16e1864E80B0B278CeCE6EC7F72EF214138AcB2A", tx: "https://nearblocks.io/txns/CkV1QxfQC1YGLBDiNNZZn5QDaoctnv4qn7hvy2oJ5oSe" },
  { from: "0.9 USDC", fromChain: "NEAR", to: "0.897418 USDC", toChain: "Base", deposit: "69942c52ae2d14e876b43935524c9079b64819475076d3d1bf99ff39a86f7457", tx: "https://basescan.org/tx/0x2f54520ee50c7ed65d7d6a40dc4943ecf13349551a89e4740d902ce558280889" },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-5">
      <section className="relative grid items-center gap-12 pb-16 pt-14 sm:pt-24 lg:grid-cols-[1.15fr_1fr] lg:pb-24">
        <div className="pointer-events-none absolute -top-24 left-0 h-80 w-full max-w-2xl rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative">
          <Badge tone="brand">Powered by NEAR Intents</Badge>
          <h1 className="mt-6 text-[2.75rem] font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            Move assets <span className="text-orange-500">with confidence.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
            Cross-chain swaps through NEAR Intents, with the conditions a quote has to meet checked before you send a single token.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/swap" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-6 font-semibold text-black transition hover:bg-orange-400">Start swapping</Link>
            <Link href="#how" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-6 font-semibold transition hover:border-orange-500/60">How it works</Link>
          </div>
        </div>
        <div className="relative space-y-3">
          <div className="text-xs font-medium uppercase tracking-wider text-white/40">Real swaps made with Bridgen</div>
          {realSwaps.map((s) => (
            <Card key={s.deposit} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-xs text-white/45">Sent on {s.fromChain}</div><div className="text-lg font-semibold">{s.from}</div></div>
                <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0 text-orange-400" aria-hidden><path d="M4 10h12m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div className="text-right"><div className="text-xs text-white/45">Received on {s.toChain}</div><div className="text-lg font-semibold">{s.to}</div></div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3 text-xs">
                <Badge tone="ok">Complete</Badge>
                <span className="flex gap-4">
                  <Link className="text-white/55 hover:text-white" href={`/activity?deposit=${s.deposit}`}>Details</Link>
                  <a className="text-orange-400 hover:text-orange-300" href={s.tx} target="_blank" rel="noreferrer">Delivery tx</a>
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-20 py-12 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
        <p className="mt-2 text-white/55">Four steps, no account needed.</p>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([t, d], i) => (
            <li key={t}>
              <Card className="h-full">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500/15 text-sm font-semibold text-orange-300">{i + 1}</div>
                <div className="mt-4 font-semibold">{t}</div>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{d}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section id="swap-guard" className="scroll-mt-20 py-12 sm:py-16">
        <Card className="grid gap-10 sm:p-10 lg:grid-cols-2">
          <div>
            <Badge tone="brand">Swap Guard</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Your rules, checked before you send.</h2>
            <p className="mt-4 leading-relaxed text-white/60">
              Swap Guard compares each quote with the limits you set. Every check gets a clear result, and Bridgen re-checks a fresh quote right before it gives you a deposit address.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Some checks are enforced by the protocol: a 1Click quote carries a minimum output, and if it cannot be met your deposit is refunded. Other checks run only in Bridgen and are marked that way. Neither removes solver, wallet, smart contract or market risk.
            </p>
          </div>
          <div className="space-y-2">
            {[
              ["Minimum received", "Protocol enforced", "brand"],
              ["Quote validity", "Protocol enforced", "brand"],
              ["Maximum total cost", "Checked by Bridgen", "muted"],
              ["Destination and recipient", "Checked by Bridgen", "muted"],
              ["Estimated time", "Advisory", "muted"],
            ].map(([k, w, tone]) => (
              <div key={k} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 text-sm">
                <span>{k}</span>
                <Badge tone={tone as "brand" | "muted"}>{w}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="py-12 sm:py-16">
        <div className="grid gap-3 md:grid-cols-3">
          {features.map(([t, d]) => (
            <Card key={t}>
              <div className="font-semibold">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How NEAR Intents powers it</h2>
        <div className="mt-6 grid gap-6 leading-relaxed text-white/60 md:grid-cols-2">
          <p>
            With intents, you state the outcome you want, like &quot;send 10 USDC on Base, receive USDC on NEAR&quot;, and market makers compete to fill it. Settlement happens through the NEAR Intents verifier contract, so Bridgen never holds your funds and does not run a bridge.
          </p>
          <p>
            Bridgen uses the 1Click Swap API. It returns a signed quote with a one-time deposit address on the chain you send from. Once your deposit lands, the swap executes and the result goes to your recipient, or the deposit is refunded if the quote terms cannot be met.
          </p>
        </div>
        <Link href="/swap" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-6 font-semibold text-black transition hover:bg-orange-400">Start swapping</Link>
      </section>
    </div>
  );
}
