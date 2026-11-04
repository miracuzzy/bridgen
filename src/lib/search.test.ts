import { describe, expect, it } from "vitest";
import { filterOptions } from "./search";

const opts = [
  { value: "a", label: "USDT" }, { value: "b", label: "USDC" }, { value: "c", label: "wNEAR", keywords: ["near"] }, { value: "d", label: "ETH", keywords: ["ethereum"] },
];
describe("filterOptions", () => {
  it("returns all for empty query", () => expect(filterOptions(opts, " ")).toHaveLength(4));
  it("ranks exact over prefix and matches keywords", () => {
    expect(filterOptions(opts, "usdc").map((o) => o.value)).toEqual(["b"]);
    expect(filterOptions(opts, "us").map((o) => o.value)).toEqual(["a", "b"]);
    expect(filterOptions(opts, "near")[0].value).toBe("c");
    expect(filterOptions(opts, "ther").map((o) => o.value)).toEqual(["d"]);
    expect(filterOptions(opts, "zzz")).toEqual([]);
  });
});
