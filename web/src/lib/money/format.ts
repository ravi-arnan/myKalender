/** Currency helpers for myDuit. Amounts are stored as integer rupiah. */

/** 50000 -> "Rp50.000" */
export function formatIDR(amount: number): string {
  return "Rp" + Math.round(amount).toLocaleString("id-ID");
}

/** 50000 -> "50.000" (no symbol, for inputs/compact display) */
export function formatThousands(amount: number): string {
  return Math.round(amount).toLocaleString("id-ID");
}

/** Parse free-form input ("Rp 50.000", "50000", "50.000") -> 50000 */
export function parseIDR(input: string): number {
  const digits = input.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/** Compact form for summaries: 1500000 -> "1,5jt", 50000 -> "50rb" */
export function formatCompactIDR(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const v = amount / 1_000_000;
    return `Rp${trimZero(v)}jt`;
  }
  if (abs >= 1_000) {
    const v = amount / 1_000;
    return `Rp${trimZero(v)}rb`;
  }
  return formatIDR(amount);
}

function trimZero(v: number): string {
  return v.toFixed(1).replace(/\.0$/, "").replace(".", ",");
}
