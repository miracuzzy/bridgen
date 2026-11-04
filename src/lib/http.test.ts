import { describe, expect, it, beforeEach } from "vitest";
import { rateLimit, _resetRateLimits, readJson, safeUpstreamMessage, exposedStatus, clientIp, DEPOSIT_ADDRESS, DEPOSIT_MEMO } from "./http";

describe("rateLimit", () => {
  beforeEach(() => _resetRateLimits());
  it("allows up to the limit then blocks until the window resets", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, 0).ok).toBe(true);
    const r = rateLimit("k", 3, 1000, 10);
    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBe(1);
    expect(rateLimit("k", 3, 1000, 1001).ok).toBe(true);
  });
  it("keys are independent", () => {
    rateLimit("a", 1, 1000, 0);
    expect(rateLimit("b", 1, 1000, 0).ok).toBe(true);
  });
});

describe("readJson", () => {
  const req = (body: string, ct = "application/json", len?: string) =>
    new Request("http://x/api", { method: "POST", body, headers: { "content-type": ct, ...(len ? { "content-length": len } : {}) } });
  it("parses small JSON", async () => expect(await readJson(req('{"a":1}'))).toEqual({ ok: true, value: { a: 1 } }));
  it("rejects oversized bodies", async () => expect((await readJson(req("x".repeat(5000)))).ok).toBe(false));
  it("rejects declared oversize", async () => expect(await readJson(req("{}", "application/json", "99999"))).toMatchObject({ status: 413 }));
  it("rejects wrong content type", async () => expect(await readJson(req("{}", "text/plain"))).toMatchObject({ status: 415 }));
  it("rejects malformed JSON", async () => expect(await readJson(req("{"))).toMatchObject({ status: 400 }));
});

describe("safeUpstreamMessage", () => {
  it("passes short plain messages", () => expect(safeUpstreamMessage("Amount is too low for bridge", "x")).toBe("Amount is too low for bridge"));
  it("hides stacks, urls and long text", () => {
    expect(safeUpstreamMessage("TypeError: boom\n at foo (/app/x.js:1)", "fb")).toBe("fb");
    expect(safeUpstreamMessage("see https://internal.host/x", "fb")).toBe("fb");
    expect(safeUpstreamMessage("a".repeat(300), "fb")).toBe("fb");
    expect(safeUpstreamMessage(undefined, "fb")).toBe("fb");
  });
});

describe("misc", () => {
  it("maps auth and server errors to 502", () => {
    expect(exposedStatus(401)).toBe(502);
    expect(exposedStatus(500)).toBe(502);
    expect(exposedStatus(404)).toBe(404);
  });
  it("reads the first forwarded ip", () => expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4"));
  it("validates deposit addresses and memos", () => {
    expect(DEPOSIT_ADDRESS.test("0x16e1864E80B0B278CeCE6EC7F72EF214138AcB2A")).toBe(true);
    expect(DEPOSIT_ADDRESS.test("69942c52ae2d14e876b43935524c9079b64819475076d3d1bf99ff39a86f7457")).toBe(true);
    expect(DEPOSIT_ADDRESS.test("abc&x=1")).toBe(false);
    expect(DEPOSIT_MEMO.test("123")).toBe(true);
    expect(DEPOSIT_MEMO.test("a b")).toBe(false);
  });
});
