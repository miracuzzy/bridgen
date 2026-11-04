// Explorer links built from tx hashes returned by 1Click. 1Click's explorerUrl field can come back empty,
// so Bridgen builds the link from the chain id. Chains without a known explorer show the raw hash.
const TX: Record<string, (h: string) => string> = {
  near: (h) => `https://nearblocks.io/txns/${h}`,
  base: (h) => `https://basescan.org/tx/${h}`,
  eth: (h) => `https://etherscan.io/tx/${h}`,
  arb: (h) => `https://arbiscan.io/tx/${h}`,
  op: (h) => `https://optimistic.etherscan.io/tx/${h}`,
  pol: (h) => `https://polygonscan.com/tx/${h}`,
  bsc: (h) => `https://bscscan.com/tx/${h}`,
  avax: (h) => `https://snowtrace.io/tx/${h}`,
  gnosis: (h) => `https://gnosisscan.io/tx/${h}`,
  scroll: (h) => `https://scrollscan.com/tx/${h}`,
  bera: (h) => `https://berascan.com/tx/${h}`,
  sol: (h) => `https://solscan.io/tx/${h}`,
  btc: (h) => `https://mempool.space/tx/${h}`,
  tron: (h) => `https://tronscan.org/#/transaction/${h}`,
  ton: (h) => `https://tonviewer.com/transaction/${h}`,
  sui: (h) => `https://suiscan.xyz/mainnet/tx/${h}`,
  aptos: (h) => `https://explorer.aptoslabs.com/txn/${h}?network=mainnet`,
  xrp: (h) => `https://livenet.xrpl.org/transactions/${h}`,
  doge: (h) => `https://blockchair.com/dogecoin/transaction/${h}`,
  ltc: (h) => `https://blockchair.com/litecoin/transaction/${h}`,
  bch: (h) => `https://blockchair.com/bitcoin-cash/transaction/${h}`,
  zec: (h) => `https://blockchair.com/zcash/transaction/${h}`,
};

export function txUrl(chain: string | undefined, hash: string, apiUrl?: string): string | undefined {
  if (apiUrl) return apiUrl;
  if (!chain || !hash) return undefined;
  return TX[chain]?.(hash);
}

// 1Click asset ids look like "nep141:base-0x....omft.near". The token list is the source of truth for the chain,
// this is only used when a token is not in the list.
export function chainFromAssetId(assetId: string | undefined): string | undefined {
  if (!assetId) return undefined;
  const m = /^nep141:([a-z]+)-.*\.omft\.near$/.exec(assetId);
  if (m) return m[1];
  if (/^nep141:[^:]+\.near$/.test(assetId) || /^nep141:[0-9a-f]{64}$/.test(assetId)) return "near";
  return undefined;
}
