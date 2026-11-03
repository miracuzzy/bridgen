import Link from "next/link";
import { Badge, Card } from "@/components/ui";

const steps = [
  ["Pick a route", "Choose what you send and what you want back, from assets the NEAR Intents 1Click API lists as supported right now."],
  ["Set your conditions", "Tell Swap Guard your floor: minimum received, maximum cost, how long the quote must stay valid."],
  ["Check the quote", "Bridgen gets a real quote and marks every condition Passed, Failed or Unable to verify. A failed required check stops the flow."],
  ["Send and track", "Confirm, get a fresh quote with a one-time deposit address, send from your wallet and watch the status live."],
];

const features = [
  ["Cross-chain routing", "Routes come from the 1Click API, where market makers compete to fill your swap across the chains NEAR Intents supports."],
  ["Swap conditions", "Swap Guard turns your limits into explicit checks against the quote, so you see exactly what you are agreeing to."],
  ["Transaction transparency", "Expected output, minimum out, fees in USD, quote expiry, deposit address and status come straight from the API. Nothing is estimated by Bridgen."],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="relative pb-20 pt-20 sm:pt-28">
        <div className="pointer-events-none absolute inset-x-0 -top-10 mx-auto h-72 max-w-3xl rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <Badge tone="brand">Powered by NEAR Intents</Badge>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Move assets <span className="text-orange-500">with confidence.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/60">
            Swap across chains through NEAR Intents, and set the conditions a quote has to meet before you send a single token.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/swap" className="rounded-xl bg-orange-500 px-6 py-3.5 font-semibold text-black hover:bg-orange-400">Start swapping</Link>
            <Link href="#swap-guard" className="rounded-xl border border-white/15 px-6 py-3.5 font-semibold hover:border-orange-500/60">What is Swap Guard?</Link>
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 py-12">
        <h2 className="text-3xl font-semibold tracking-tight">How Bridgen works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([t, d], i) => (
            <Card key={t}>
              <div className="text-sm font-semibold text-orange-500">0{i + 1}</div>
              <div className="mt-3 font-semibold">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="swap-guard" className="scroll-mt-20 py-12">
        <Card className="grid gap-10 p-8 sm:p-10 lg:grid-cols-2">
          <div>
            <Badge tone="brand">Swap Guard</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Your rules, checked before you send.</h2>
            <p className="mt-4 text-white/60">
              Swap Guard compares each quote with the limits you set. Every check gets a clear result, and Bridgen re-checks a fresh quote right before it gives you a deposit address.
            </p>
            <p className="mt-4 text-sm text-white/45">
              Some checks are enforced by the protocol: a 1Click quote carries a minimum output, and if it cannot be met your deposit is refunded. Other checks run only in Bridgen and are marked that way. Neither removes solver, wallet, smart contract or market risk.
            </p>
          </div>
          <div className="space-y-2.5">
            {[
              ["Minimum received", "Protocol enforced", "ok"],
              ["Maximum total cost", "Checked by Bridgen", "ok"],
              ["Quote validity", "Protocol enforced", "ok"],
              ["Destination and recipient", "Checked by Bridgen", "ok"],
              ["Estimated time", "Advisory", "muted"],
            ].map(([k, w, tone]) => (
              <div key={k} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
                <span>{k}</span>
                <Badge tone={tone as "ok" | "muted"}>{w}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map(([t, d]) => (
            <Card key={t}>
              <div className="font-semibold">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-12">
        <h2 className="text-3xl font-semibold tracking-tight">How NEAR Intents powers it</h2>
        <div className="mt-6 grid gap-6 text-white/60 md:grid-cols-2">
          <p>
            With intents, you state the outcome you want, like &quot;send 10 USDC on Base, receive USDC on NEAR&quot;, and market makers compete to fill it. Settlement happens through the NEAR Intents verifier contract, so Bridgen never holds your funds and does not run a bridge.
          </p>
          <p>
            Bridgen uses the 1Click Swap API. It returns a signed quote with a one-time deposit address on the chain you send from. Once your deposit lands, the swap executes and the result goes to your recipient, or the deposit is refunded to you if the quote terms cannot be met.
          </p>
        </div>
      </section>
    </div>
  );
}
