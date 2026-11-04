# Bridgen

**Move assets with confidence.** Cross-chain swaps, powered by NEAR Intents.

Bridgen gets real swap quotes from the NEAR Intents 1Click Swap API and runs them through **Swap Guard**, a set of conditions you choose (minimum received, maximum cost, quote validity, destination and recipient, estimated time). Every check shows Passed, Failed or Unable to verify. A failed required check stops the flow before any deposit address is shown.

## Status

| Part | State |
| --- | --- |
| Supported asset list from 1Click `/v0/tokens` | Working |
| Preview quotes (`dry: true`) and live quotes with deposit address | Working, tested against the live API |
| Preview without recipient/refund (stand-in addresses for dry quotes only, see `src/lib/address.ts`) | Working |
| Funds location tracker driven by real 1Click statuses (`src/lib/funds.ts`) | Working, unit tested. Not yet seen on a real deposit |
| Swap Guard rules + unit tests | Working |
| Re-check on a fresh live quote before the deposit address is shown | Working |
| Status tracking via `/v0/status` | Working (tested on PENDING_DEPOSIT) |
| Send deposit from an EVM browser wallet (EIP-1193) | Built, not yet tested with real funds |
| End-to-end swap with real funds | Not yet done |

## Try it

```bash
npm install
cp .env.example .env.local   # key is optional
npm run dev                  # http://localhost:3000
npm test                     # Swap Guard and quote validation tests
```

Do X, see Y:

1. Open `/`. See the homepage with "Start swapping" and the Swap Guard section.
2. Open `/swap`. See chains and assets loaded live from the 1Click API (Base USDC to NEAR USDC is preselected).
3. Enter amount `1` and leave recipient and refund empty. Click **Preview quote**. No wallet or funds needed. See a real 1Click quote labelled "Preview quote. No deposit address, nothing can be sent" (expected out, minimum out, USD values, fee, time), the full Swap Guard list, and the **Where your funds are** tracker showing "In your wallet. Preview only, nothing sent". Recipient shows "Unable to verify" because none was entered, and **Get deposit address** stays disabled until recipient and refund are filled in.
4. Click **Edit**, set **Min received** to `5`, click **Preview quote**. See "Minimum received: Failed" and **Get deposit address** blocked.
5. Enter amount `0.01`. See the API error "Amount is too low for bridge".
6. With funds: fill recipient (e.g. `name.near`) and a refund address on Base, click **Get deposit address**. Bridgen fetches a fresh live quote, runs Swap Guard again, and only then shows the one-time deposit address. The funds tracker then follows real 1Click statuses: In your wallet (PENDING_DEPOSIT), At the one-time deposit address (KNOWN_DEPOSIT_TX, or INCOMPLETE_DEPOSIT flagged), Being swapped via NEAR Intents (PROCESSING), Delivered to recipient (SUCCESS), or Refunded to your refund address (REFUNDED) / Swap failed (FAILED), with tx hashes and explorer links when 1Click returns them.
7. Open `/activity`. See the confirmed swap with its deposit address, timestamps and live status.

## Architecture

```
src/
  lib/            business logic, no React
    oneclick.ts   server-only 1Click client (adds ONECLICK_API_KEY if set, timeouts)
    quote-input.ts  form validation, builds EXACT_INPUT request, validates responses
    guard.ts      Swap Guard rule engine
    units.ts      decimal <-> base units with BigInt
    address.ts    recipient/refund format checks per chain
    evm.ts        EIP-1193 deposit send (native or ERC-20 transfer)
    activity.ts   local history (browser localStorage), real API values only
  app/api/        tokens, quote, status (server routes, the browser never calls 1Click directly)
  app/            homepage, /swap, /activity
  components/     UI pieces (ui, swap-app, guard-list, status-tracker, token-select)
```

The quote route rebuilds and validates every request on the server against the live token list.

## How NEAR Intents is used

Bridgen uses the 1Click Swap API deposit-address flow:

1. `GET /v0/tokens` for supported assets.
2. `POST /v0/quote` with `swapType: EXACT_INPUT`, `depositType: ORIGIN_CHAIN`, `recipientType: DESTINATION_CHAIN`. Preview uses `dry: true`. Confirm uses `dry: false`, which returns a one-time `depositAddress` and `deadline`.
3. The user sends the quoted amount to the deposit address from their wallet.
4. `GET /v0/status?depositAddress=...` until `SUCCESS`, `REFUNDED` or `FAILED`.

Market makers fill the intent and settlement goes through the NEAR Intents verifier contract. Bridgen holds no funds and runs no bridge.

## What Swap Guard enforces, and what it does not

- **Enforced by the 1Click quote:** minimum output (`minAmountOut`, deposit refunded if it cannot be met) and the quote deadline.
- **Checked by Bridgen only:** destination asset, recipient match and format, source and amount match, estimated cost in USD (from the quote's USD values), estimated time (advisory, never blocks).
- Swap Guard does not remove solver, wallet, smart contract, bridge or market risk.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `ONECLICK_API_KEY` | No | JWT from partners.near-intents.org. Server-side only. Without it 1Click adds a higher fee. |

## Known limitations

- Wallet sending only for EVM chains with an injected wallet. Other chains show the deposit address to send manually.
- Activity history is stored in this browser only.
- Address format checks catch typos, not wrong-but-valid addresses.
- The minimum amount per route is set by 1Click and shown as an error when too low.
