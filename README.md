# Bridgen

**Move assets with confidence.**

Live app: _coming soon_
Video walkthrough: _coming soon_

## What it is

Bridgen is a web app for cross-chain swaps. It gets real quotes from the NEAR Intents 1Click Swap API and uses the deposit-address flow: you get a one-time deposit address, send your tokens there, and 1Click delivers the output to your recipient on the other chain. Bridgen holds no funds and runs no bridge.

On top of that it adds:

- **Swap Guard**: conditions you set, checked against every quote before you can send.
- **Preview quotes**: real quotes with no wallet, no funds and no deposit address.
- **Where your funds are**: a tracker that follows real 1Click statuses after you send.
- **Activity lookup**: paste any deposit address and see amounts, fees, refunds and explorer links.
- **Optional wallet connect**: NEAR Connect (HOT, Meteor and others) for NEAR tokens, an injected EVM wallet on desktop, or WalletConnect on mobile. The QR code and manual send always work without connecting anything.

## Why Swap Guard matters

A quote is just numbers on a screen. Before you send real money you want to know: will I get at least this much, is the quote still valid, is it going to the right asset and the right address, and what will it cost me?

Swap Guard turns those questions into checks. You can set **Min received** and **Max cost (USD)**, and Bridgen also checks destination, recipient, source and amount, quote validity and estimated time. Every check shows **Passed**, **Failed** or **Unable to verify**. A failed required check blocks **Get deposit address**, so you never see an address for a quote that breaks your rules.

Each check is also labelled honestly:

- **Enforced by 1Click quote**: minimum received (`minAmountOut`, the deposit gets refunded if it can't be met) and quote validity (deadline).
- **Checked by Bridgen only**: destination asset and chain, recipient, source asset and amount, maximum total cost (estimate from the quote's USD values), estimated time (advisory, never blocks).

Swap Guard does not remove solver, wallet, smart contract, bridge or market risk. It tells you what is protected by the protocol and what is only a check in the interface.

## Judge walkthrough (do X, see Y)

Steps 1 to 6 need no wallet and no funds.

1. **Open `/`.** See the homepage with "Start swapping" and the Swap Guard section.
2. **Open `/swap`.** See chains and assets loaded live from 1Click `/v0/tokens`. Base USDC to NEAR USDC is preselected.
3. **Preview a quote.** Enter amount `1`, leave recipient and refund empty, click **Preview quote**. See a real 1Click quote labelled "Preview only, nothing can be sent" with expected out, minimum out, USD values, fee and time. See the full Swap Guard list, each check tagged "Enforced by 1Click quote" or "Checked by Bridgen only". Recipient shows **Unable to verify** because none was entered. The funds tracker shows "In your wallet. Preview only, nothing sent". **Get deposit address** stays disabled until recipient and refund are filled in.
4. **Make Swap Guard fail.** Click **Edit**, set **Min received** to `5`, click **Preview quote**. See "Minimum received: Failed" and **Get deposit address** blocked. The quote minimum for 1 USDC is about 0.99, so 5 always fails. (Max cost is a weak way to force a fail here: the estimated cost of this route is often a fraction of a cent.)
5. **Make it pass.** Set **Min received** to `0.9` (or clear it) and **Max cost (USD)** to `1`, preview again. See those checks go back to **Passed**.
6. **Too small amount.** Enter amount `0.01`. See the 1Click error "Amount is too low for bridge" with the minimum it accepts.
7. **Look up real swaps.** Open `/activity`, paste `0x16e1864E80B0B278CeCE6EC7F72EF214138AcB2A`, click **Look up**. See swap 1 below marked Complete: 1.0 USDC sent, 0.994658 USDC received, withdraw fee 0.00514 USDC, time shown in your own time zone, and links to the Base deposit tx on basescan.org and the NEAR delivery tx on nearblocks.io. Then paste `69942c52ae2d14e876b43935524c9079b64819475076d3d1bf99ff39a86f7457` and see swap 2 (NEAR to Base). `/activity?deposit=<address>` opens the same view directly.

With funds (optional):

8. **Get a deposit address.** Fill a recipient (for example `name.near`) and a refund address on the source chain, click **Get deposit address**. Bridgen fetches a fresh live quote, runs Swap Guard again, and only then shows the one-time deposit address with a QR code.
9. **Send.** Scan the QR or copy the address and send from any wallet. Or connect a wallet:
   - NEAR token as source: **Connect NEAR wallet**, then **Send from <account>**. Your wallet signs one transaction on the token contract: `storage_deposit` for the deposit address if needed, `near_deposit` to wrap NEAR (wNEAR only), then `ft_transfer` with 1 yoctoNEAR.
   - EVM chain as source: **Connect wallet** uses the browser wallet on desktop or WalletConnect on mobile. If neither is available you see "No wallet in this browser. Send with QR or address".
10. **Watch your funds.** The tracker follows real 1Click statuses: In your wallet (PENDING_DEPOSIT), At the one-time deposit address (KNOWN_DEPOSIT_TX, INCOMPLETE_DEPOSIT is flagged), Being swapped via NEAR Intents (PROCESSING), Delivered to recipient (SUCCESS), or Refunded (REFUNDED) / Swap failed (FAILED), with tx links when 1Click returns them.

## Real mainnet swaps

**1. Base to NEAR (manual send).** 1 USDC on Base to USDC on NEAR. Delivered 0.994658 USDC. Withdraw fee 0.00514 USDC (included in the output).

- Deposit address: `0x16e1864E80B0B278CeCE6EC7F72EF214138AcB2A`
- Base deposit tx: [0x55bafd2c...02e96f6](https://basescan.org/tx/0x55bafd2c87ef2e779abbd12330d4bb1e2f5e007de7ee54ff901e6a8ea02e96f6)
- NEAR delivery tx: [CkV1QxfQ...7hvy2oJ5oSe](https://nearblocks.io/txns/CkV1QxfQC1YGLBDiNNZZn5QDaoctnv4qn7hvy2oJ5oSe)

**2. NEAR to Base (sent from a NEAR wallet through NEAR Connect, HOT).** 0.9 USDC on NEAR to USDC on Base. Delivered 0.897418 USDC. Withdraw fee 0.0024 USDC (included in the output).

- Deposit address: `69942c52ae2d14e876b43935524c9079b64819475076d3d1bf99ff39a86f7457`
- NEAR deposit tx: [27R2Qn9s...4rUt](https://nearblocks.io/txns/27R2Qn9sMnNtjiLML1EHbULQUwaUdtp7LMNFfj2U4rUt)
- Base delivery tx: [0x2f54520e...558280889](https://basescan.org/tx/0x2f54520ee50c7ed65d7d6a40dc4943ecf13349551a89e4740d902ce558280889)

## How NEAR Intents is used

1. `GET /v0/tokens` for supported assets.
2. `POST /v0/quote` with `swapType: EXACT_INPUT`, `depositType: ORIGIN_CHAIN`, `recipientType: DESTINATION_CHAIN`. Preview uses `dry: true`. Confirm uses `dry: false`, which returns a one-time `depositAddress` and `deadline`.
3. The user sends the quoted amount to the deposit address.
4. `GET /v0/status?depositAddress=...` until `SUCCESS`, `REFUNDED` or `FAILED`.

Market makers fill the intent and settlement goes through the NEAR Intents verifier contract.

## Architecture

```
src/
  lib/               business logic, no React
    oneclick.ts      server-only 1Click client (adds ONECLICK_API_KEY if set, timeouts)
    quote-input.ts   form validation, builds the EXACT_INPUT request, validates responses
    guard.ts         Swap Guard rule engine (Passed / Failed / Unable to verify, protocol vs bridgen)
    funds.ts         maps 1Click statuses to "where your funds are"
    units.ts         decimal <-> base units with BigInt
    address.ts       recipient/refund format checks per chain
    chains.ts        chain metadata
    evm.ts           EIP-1193 deposit send (native or ERC-20 transfer), injected or WalletConnect
    near-deposit.ts  builds the NEAR deposit tx (storage_deposit, near_deposit, ft_transfer)
    near-wallet.ts   NEAR Connect wallet connection and send
    swap-summary.ts  status response to amounts, fees, refunds and explorer links
    explorer.ts      tx explorer links per chain (1Click explorerUrl can be empty)
    activity.ts      local history (browser localStorage), real API values only
    http.ts          JSON helpers, body limits, rate limits, safe error messages
    csp.ts           Content Security Policy and wallet host allowlist
  app/api/           server routes, the browser never calls 1Click directly
  app/               homepage, /swap, /activity
  components/        UI (swap-app, swap-card, guard-list, status-tracker, token-select, deposit-qr, ui, chrome)
```

## API routes

| Route | Method | What it does |
| --- | --- | --- |
| `/api/tokens` | GET | Supported assets from 1Click `/v0/tokens`, cached 5 minutes |
| `/api/quote` | POST | Validates the form, rebuilds the request against the live token list, calls 1Click `/v0/quote` (dry for preview, live for a deposit address) |
| `/api/status` | GET | `?depositAddress=` (optional `&depositMemo=`), proxies 1Click `/v0/status` |
| `/api/near-storage` | GET | `?contract=&accounts=`, checks NEP-145 storage registration on NEAR RPC before a NEAR send |

## Security

- **Secrets.** `ONECLICK_API_KEY` is read only in `src/lib/oneclick.ts` (`server-only`) and sent to 1Click as `Authorization: Bearer`. It never reaches the browser. `.env*` (except `.env.example`) and `.vercel` are gitignored. Bridgen never asks for seed phrases or private keys.
- **Input checks.** `/api/quote` caps bodies at 4 KB, requires JSON, checks field types and lengths, and rebuilds the upstream request from the live token list (asset ids, amount, slippage, per-chain address formats). `/api/status` only accepts deposit-address and memo formats. `/api/near-storage` only accepts NEAR account ids.
- **Timeouts and errors.** Upstream fetches time out (1Click 10 to 25 s, NEAR RPC 8 s). Errors are short messages; upstream stacks, URLs and auth failures are not passed through.
- **Caching.** Token list cached in memory for 5 minutes and served with `s-maxage=300, stale-while-revalidate=600`. Everything else is `no-store`.
- **Rate limits.** Per IP, per route, per minute: quote 20, status 120, tokens 60, near-storage 60. Counters are in memory, so on serverless each instance counts on its own. Best effort, not a hard quota.
- **Headers.** `next.config.ts` sets a CSP (`src/lib/csp.ts`), `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY` plus `frame-ancestors 'none'`, `Permissions-Policy` and HSTS. `script-src` keeps `'unsafe-inline'` because Next.js inline bootstrap scripts and NEAR Connect sandboxed wallet iframes need it. `connect-src` lists NEAR RPCs, NEAR Connect wallet backends and WalletConnect/Reown. New wallet backend hosts go in `WALLET_HOSTS`.

## Known limitations

- Wallet sending covers EVM chains and NEAR tokens. Other chains use the QR or manual send.
- Fees shown are the ones 1Click returns (`withdrawFee`, `refundFee`). Total cost is value in minus value out in USD.
- Activity history is stored in this browser only. Lookup by deposit address works from anywhere.
- Address format checks catch typos, not wrong-but-valid addresses.
- The minimum amount per route is set by 1Click.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

| Variable | Required | Notes |
| --- | --- | --- |
| `ONECLICK_API_KEY` | No | 1Click partner JWT. Server-side only. Without it quotes still work but 1Click adds a 0.25% fee. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | No | Public WalletConnect client id. Enables EVM wallet connect on mobile. Without it, mobile uses QR and manual send. |

## Tests

```bash
npm test           # vitest
npm run lint
npm run typecheck
npm run build
```

Unit tests cover Swap Guard rules, quote input validation, the funds tracker, status summaries (with a real SUCCESS fixture), NEAR deposit tx building, EVM send, token search, HTTP helpers and the CSP.
