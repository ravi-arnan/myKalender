import {
  Briefcase,
  Car,
  Coffee,
  Dumbbell,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  HelpingHand,
  House,
  MoreHorizontal,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
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
 * A user-defined category stored in Firestore (`users/{uid}/categories`).
 * `icon` is a key into {@link CATEGORY_ICONS}; Android ignores it (it renders
 * categories by color only) so a missing/unknown key falls back to a tag.
 */
export interface CustomCategory {
  id: string;
  label: string;
  kind: TransactionType;
  color: string;
  icon: string;
}

/** Curated icon set offered when creating a custom category (web only). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  utensils: Utensils,
  cart: ShoppingCart,
  car: Car,
  home: House,
  coffee: Coffee,
  film: Film,
  plane: Plane,
  heart: HeartPulse,
  gift: Gift,
  briefcase: Briefcase,
  wallet: Wallet,
  piggy: PiggyBank,
  phone: Smartphone,
  dumbbell: Dumbbell,
  pet: PawPrint,
  study: GraduationCap,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export function iconForKey(key?: string): LucideIcon {
  return CATEGORY_ICONS[key ?? ""] ?? Tag;
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

function toCategory(c: CustomCategory): Category {
  return {
    id: c.id,
    label: c.label,
    kind: c.kind,
    color: c.color,
    icon: iconForKey(c.icon),
  };
}

/**
 * Built-in categories for [kind] plus the user's custom ones, with the generic
 * "Lainnya" built-in kept last so it stays the natural fallback at the end.
 */
export function categoriesForWith(
  kind: TransactionType,
  custom: CustomCategory[],
): Category[] {
  const builtins = categoriesFor(kind);
  const customCats = custom.filter((c) => c.kind === kind).map(toCategory);
  return [...builtins.slice(0, -1), ...customCats, builtins.at(-1)!];
}

/** Resolve a category id against both built-ins and the custom list. */
export function resolveCategory(
  id: string,
  kind: TransactionType,
  custom: CustomCategory[],
): Category {
  const builtin = getCategory(id);
  if (builtin) return builtin;
  const c = custom.find((x) => x.id === id);
  return c ? toCategory(c) : getCategoryOrFallback(id, kind);
}
