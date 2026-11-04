// Content Security Policy for Bridgen. Shared by next.config and tests.
//
// Notes on what is allowed and why:
// - script-src 'unsafe-inline': Next.js inlines bootstrap scripts without a nonce on static pages, and
//   NEAR Connect runs each wallet inside a sandboxed srcdoc iframe (sandbox="allow-scripts", opaque origin)
//   whose inline scripts inherit this policy. 'wasm-unsafe-eval' lets wallet SDKs use WebAssembly.
// - connect-src: the browser talks to our own /api routes, NEAR RPCs, the NEAR Connect wallet manifest and
//   executors, and WalletConnect/Reown relay and APIs. Sandboxed NEAR wallets also call their own backends,
//   which are listed in WALLET_HOSTS.
// - frame-ancestors 'none': Bridgen cannot be embedded, which blocks clickjacking.

export const NEAR_RPC = ["https://rpc.mainnet.near.org", "https://free.rpc.fastnear.com", "https://rpc.fastnear.com", "https://*.fastnear.com", "https://near.lava.build", "https://rpc.near.org"];
export const NEAR_CONNECT = ["https://raw.githubusercontent.com", "https://cdn.jsdelivr.net"];
export const WALLET_HOSTS = [
  "https://*.hot-labs.org", "https://*.herewallet.app", "https://*.hot.tg", "https://*.meteorwallet.app", "https://wallet.intear.tech", "https://*.intear.tech",
  "https://*.peersyst.tech", "https://trezu.app", "https://*.mynearwallet.com", "https://evm-on-near.dev", "https://*.okx.com", "https://*.nightly.app",
  "https://h4n.app", "https://*.h4n.app", "https://hot-labs.org", "https://meteorwallet.app", "https://*.meteorwallet.workers.dev", "wss://*.intear.tech",
  "https://*.mainnet.near.org", "https://*.aurora.dev", "https://nearmobile.app",
];
export const WALLETCONNECT = [
  "https://*.walletconnect.com", "https://*.walletconnect.org", "wss://*.walletconnect.com", "wss://*.walletconnect.org",
  "https://*.reown.com", "wss://*.reown.com", "https://*.web3modal.org", "https://*.web3modal.com",
];

export function buildCsp(dev = false): string {
  const d: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.cdnfonts.com", "https://rsms.me"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com", "https://fonts.reown.com", "https://fonts.cdnfonts.com", "https://rsms.me"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "connect-src": ["'self'", ...NEAR_RPC, ...NEAR_CONNECT, ...WALLET_HOSTS, ...WALLETCONNECT, ...(dev ? ["ws:"] : [])],
    "frame-src": ["'self'", "https://verify.walletconnect.com", "https://verify.walletconnect.org", "https://secure.walletconnect.com", "https://secure.walletconnect.org", "https://*.reown.com"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(d).map(([k, v]) => `${k} ${v.join(" ")}`).join("; ") + (dev ? "" : "; upgrade-insecure-requests");
}

export function securityHeaders(dev = false) {
  return [
    { key: "Content-Security-Policy", value: buildCsp(dev) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(self), hid=(self), bluetooth=(self), clipboard-write=(self)" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ];
}
