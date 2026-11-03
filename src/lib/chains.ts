// Display names for chain ids used by the 1Click token list. Unknown ids fall back to upper case.
const NAMES: Record<string, string> = {
  near: "NEAR", eth: "Ethereum", base: "Base", arb: "Arbitrum", op: "Optimism", pol: "Polygon", bsc: "BNB Chain",
  avax: "Avalanche", sol: "Solana", btc: "Bitcoin", tron: "Tron", ton: "TON", sui: "Sui", aptos: "Aptos", xrp: "XRP Ledger",
  doge: "Dogecoin", ltc: "Litecoin", bch: "Bitcoin Cash", zec: "Zcash", gnosis: "Gnosis", bera: "Berachain", stellar: "Stellar",
  cardano: "Cardano", starknet: "Starknet", scroll: "Scroll", monad: "Monad",
};
export const chainName = (id: string) => NAMES[id] ?? id.toUpperCase();

// EVM chain ids for wallet sends (EIP-1193). Only chains listed here get a "send with wallet" button.
export const EVM_CHAIN_IDS: Record<string, number> = { eth: 1, base: 8453, arb: 42161, op: 10, pol: 137, bsc: 56, avax: 43114, gnosis: 100 };

export const EXPLORERS: Record<string, (addr: string) => string> = {
  base: (a) => `https://basescan.org/address/${a}`,
  eth: (a) => `https://etherscan.io/address/${a}`,
  arb: (a) => `https://arbiscan.io/address/${a}`,
  op: (a) => `https://optimistic.etherscan.io/address/${a}`,
  near: (a) => `https://nearblocks.io/address/${a}`,
  sol: (a) => `https://solscan.io/account/${a}`,
};

export const DEFAULT_FROM = "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near"; // USDC on Base
export const DEFAULT_TO = "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1"; // USDC on NEAR
