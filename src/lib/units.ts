// Decimal string <-> base unit integer string, without floating point.

export function toBaseUnits(amount: string, decimals: number): string {
  const s = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("Enter a plain number like 12.5");
  const [whole, frac = ""] = s.split(".");
  if (frac.length > decimals) throw new Error(`Too many decimal places (max ${decimals})`);
  const v = BigInt(whole + frac.padEnd(decimals, "0"));
  return v.toString();
}

export function fromBaseUnits(base: string, decimals: number): string {
  const neg = base.startsWith("-");
  const digits = (neg ? base.slice(1) : base).padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const frac = digits.slice(digits.length - decimals).replace(/0+$/, "");
  return (neg ? "-" : "") + whole + (frac ? "." + frac : "");
}
