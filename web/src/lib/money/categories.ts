import {
  Briefcase,
  Car,
  Film,
  Gift,
  HeartPulse,
  HelpingHand,
  House,
  MoreHorizontal,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { TransactionType } from "./types";

export interface Category {
  id: string;
  label: string;
  kind: TransactionType;
  icon: LucideIcon;
  color: string;
}

/**
 * MVP uses a fixed set of categories defined in code. Custom user-defined
 * categories (stored in Firestore) are a planned v2 addition.
 */
export const EXPENSE_CATEGORIES: Category[] = [
  { id: "food", label: "Makan & Minum", kind: "expense", icon: Utensils, color: "#fb923c" },
  { id: "transport", label: "Transport", kind: "expense", icon: Car, color: "#3b82f6" },
  { id: "shopping", label: "Belanja", kind: "expense", icon: ShoppingBag, color: "#ec4899" },
  { id: "bills", label: "Tagihan", kind: "expense", icon: Receipt, color: "#8b5cf6" },
  { id: "home", label: "Rumah", kind: "expense", icon: House, color: "#14b8a6" },
  { id: "health", label: "Kesehatan", kind: "expense", icon: HeartPulse, color: "#ef4444" },
  { id: "entertainment", label: "Hiburan", kind: "expense", icon: Film, color: "#f59e0b" },
  { id: "other-expense", label: "Lainnya", kind: "expense", icon: MoreHorizontal, color: "#6b7280" },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: "salary", label: "Gaji", kind: "income", icon: Briefcase, color: "#10b981" },
  { id: "bonus", label: "Bonus", kind: "income", icon: TrendingUp, color: "#34d399" },
  { id: "gift", label: "Hadiah", kind: "income", icon: Gift, color: "#ec4899" },
  { id: "other-income", label: "Lainnya", kind: "income", icon: HelpingHand, color: "#6b7280" },
];

const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function categoriesFor(kind: TransactionType): Category[] {
  return kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getCategory(id: string): Category | undefined {
  return ALL_CATEGORIES.find((c) => c.id === id);
}

/** Safe fallback so a transaction with an unknown category still renders. */
export function getCategoryOrFallback(id: string, kind: TransactionType): Category {
  return (
    getCategory(id) ??
    (kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).at(-1)!
  );
}
