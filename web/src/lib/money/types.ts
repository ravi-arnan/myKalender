import { Timestamp } from "firebase/firestore";

export type WalletType = "cash" | "bank" | "ewallet";

export const WALLET_TYPE_OPTIONS: { value: WalletType; label: string }[] = [
  { value: "cash", label: "Tunai" },
  { value: "bank", label: "Rekening Bank" },
  { value: "ewallet", label: "E-Wallet" },
];

/** Preset colors for wallets, drawn from the app theme palette. */
export const WALLET_COLORS = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#fb923c",
  "#111111",
] as const;

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  /** Balance before any recorded transactions (opening balance). */
  initialBalance: number;
  color: string;
  archived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type WalletInput = Omit<Wallet, "id" | "createdAt" | "updatedAt">;

export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Always a positive integer in rupiah; `type` carries the sign. */
  amount: number;
  /** Source wallet (for income/expense the only wallet; for transfer the "from"). */
  walletId: string;
  /** Destination wallet — set only for transfers. */
  toWalletId?: string;
  categoryId: string;
  date: Timestamp;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt"
>;
