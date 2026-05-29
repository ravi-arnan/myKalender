import type { Transaction, Wallet } from "./types";

/**
 * Current balance per wallet id: opening balance +income −expense.
 * Pure function (no Firestore dependency) so it stays easy to test.
 */
export function computeWalletBalances(
  wallets: Wallet[],
  transactions: Transaction[],
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const w of wallets) balances.set(w.id, w.initialBalance);
  for (const t of transactions) {
    if (t.type === "transfer") {
      const from = balances.get(t.walletId);
      if (from !== undefined) balances.set(t.walletId, from - t.amount);
      if (t.toWalletId !== undefined) {
        const to = balances.get(t.toWalletId);
        if (to !== undefined) balances.set(t.toWalletId, to + t.amount);
      }
      continue;
    }
    const current = balances.get(t.walletId);
    if (current === undefined) continue; // tx for a deleted wallet
    balances.set(t.walletId, current + (t.type === "income" ? t.amount : -t.amount));
  }
  return balances;
}
