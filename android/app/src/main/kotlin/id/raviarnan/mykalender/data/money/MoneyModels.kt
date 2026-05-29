package id.raviarnan.mykalender.data.money

import com.google.firebase.Timestamp
import java.text.NumberFormat
import java.util.Calendar
import java.util.Locale

/**
 * myDuit data models. Field names mirror the web app exactly so the same
 * Firestore documents (under /users/{uid}/{wallets,transactions,bills}) work
 * on both platforms.
 */

// ---------------------------------------------------------------- Wallet ----

data class Wallet(
    val id: String = "",
    val name: String = "",
    val type: String = "cash", // cash | bank | ewallet
    val initialBalance: Long = 0,
    val color: String = "#3b82f6",
    val archived: Boolean = false,
    val createdAt: Timestamp? = null,
)

data class WalletInput(
    val name: String,
    val type: String,
    val initialBalance: Long,
    val color: String,
    val archived: Boolean = false,
)

val WALLET_TYPE_LABELS = linkedMapOf(
    "cash" to "Tunai",
    "bank" to "Rekening Bank",
    "ewallet" to "E-Wallet",
)

val WALLET_COLORS = listOf(
    "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#fb923c", "#111111",
)

// ----------------------------------------------------------- Transaction ----

data class Transaction(
    val id: String = "",
    val type: String = "expense", // income | expense | transfer
    val amount: Long = 0,
    val walletId: String = "",
    /** Destination wallet — set only for transfers (created on web). */
    val toWalletId: String? = null,
    val categoryId: String = "",
    val date: Timestamp = Timestamp.now(),
    val note: String? = null,
    val createdAt: Timestamp? = null,
)

data class TransactionInput(
    val type: String,
    val amount: Long,
    val walletId: String,
    val categoryId: String,
    val date: Timestamp,
    val note: String? = null,
)

// ------------------------------------------------------------------ Bill ----

data class Bill(
    val id: String = "",
    val name: String = "",
    val amount: Long = 0,
    val walletId: String = "",
    val categoryId: String = "bills",
    val dayOfMonth: Int = 1,
    val reminderOffsetMinutes: Long = 0,
    val alarmMode: String = "alarm",
    val eventId: String = "",
    val lastPaidYM: String? = null,
    val createdAt: Timestamp? = null,
)

data class BillInput(
    val name: String,
    val amount: Long,
    val walletId: String,
    val categoryId: String,
    val dayOfMonth: Int,
    val reminderOffsetMinutes: Long,
    val alarmMode: String,
)

// -------------------------------------------------------------- Category ----

data class TxCategory(
    val id: String,
    val label: String,
    val kind: String, // income | expense
    val color: String,
)

val EXPENSE_CATEGORIES = listOf(
    TxCategory("food", "Makan & Minum", "expense", "#fb923c"),
    TxCategory("transport", "Transport", "expense", "#3b82f6"),
    TxCategory("shopping", "Belanja", "expense", "#ec4899"),
    TxCategory("bills", "Tagihan", "expense", "#8b5cf6"),
    TxCategory("home", "Rumah", "expense", "#14b8a6"),
    TxCategory("health", "Kesehatan", "expense", "#ef4444"),
    TxCategory("entertainment", "Hiburan", "expense", "#f59e0b"),
    TxCategory("other-expense", "Lainnya", "expense", "#6b7280"),
)

val INCOME_CATEGORIES = listOf(
    TxCategory("salary", "Gaji", "income", "#10b981"),
    TxCategory("bonus", "Bonus", "income", "#34d399"),
    TxCategory("gift", "Hadiah", "income", "#ec4899"),
    TxCategory("other-income", "Lainnya", "income", "#6b7280"),
)

fun categoriesFor(kind: String): List<TxCategory> =
    if (kind == "income") INCOME_CATEGORIES else EXPENSE_CATEGORIES

fun categoryById(id: String): TxCategory? =
    (EXPENSE_CATEGORIES + INCOME_CATEGORIES).find { it.id == id }

fun categoryOrFallback(id: String, kind: String): TxCategory =
    categoryById(id) ?: categoriesFor(kind).last()

// ---------------------------------------------------------------- Money -----

private val idLocale = Locale("id", "ID")

fun formatThousands(amount: Long): String =
    NumberFormat.getNumberInstance(idLocale).format(amount)

fun formatIDR(amount: Long): String = "Rp" + formatThousands(amount)

fun parseIDR(input: String): Long =
    input.filter { it.isDigit() }.toLongOrNull() ?: 0L

/** Current balance per wallet id: opening balance +income −expense. */
fun computeWalletBalances(
    wallets: List<Wallet>,
    transactions: List<Transaction>,
): Map<String, Long> {
    val balances = HashMap<String, Long>()
    for (w in wallets) balances[w.id] = w.initialBalance
    for (t in transactions) {
        if (t.type == "transfer") {
            balances[t.walletId]?.let { balances[t.walletId] = it - t.amount }
            t.toWalletId?.let { to -> balances[to]?.let { balances[to] = it + t.amount } }
            continue
        }
        val current = balances[t.walletId] ?: continue // tx for a deleted wallet
        balances[t.walletId] = current + if (t.type == "income") t.amount else -t.amount
    }
    return balances
}

fun totalBalance(wallets: List<Wallet>, balances: Map<String, Long>): Long =
    wallets.sumOf { balances[it.id] ?: 0L }

// --------------------------------------------------------------- Bill due ----

/** Next future epoch-millis matching dayOfMonth at the given hour (default 09:00). */
fun nextDueDateMillis(
    dayOfMonth: Int,
    atHour: Int = 9,
    now: Long = System.currentTimeMillis(),
): Long {
    fun build(year: Int, month: Int): Long {
        val cal = Calendar.getInstance()
        cal.clear()
        cal.set(year, month, 1, atHour, 0, 0)
        val lastDay = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        cal.set(Calendar.DAY_OF_MONTH, minOf(dayOfMonth, lastDay))
        return cal.timeInMillis
    }
    val c = Calendar.getInstance().apply { timeInMillis = now }
    var due = build(c.get(Calendar.YEAR), c.get(Calendar.MONTH))
    if (due <= now) {
        val n = Calendar.getInstance().apply {
            timeInMillis = now
            add(Calendar.MONTH, 1)
        }
        due = build(n.get(Calendar.YEAR), n.get(Calendar.MONTH))
    }
    return due
}

/** "YYYY-MM" of the given time (default now). */
fun currentYM(now: Long = System.currentTimeMillis()): String {
    val c = Calendar.getInstance().apply { timeInMillis = now }
    return "%04d-%02d".format(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1)
}
