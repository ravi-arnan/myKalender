package id.raviarnan.mykalender.ui.money

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import id.raviarnan.mykalender.MoneyViewModel
import id.raviarnan.mykalender.data.money.Bill
import id.raviarnan.mykalender.data.money.Transaction
import id.raviarnan.mykalender.data.money.Wallet
import id.raviarnan.mykalender.data.money.WALLET_TYPE_LABELS
import id.raviarnan.mykalender.data.money.categoryOrFallback
import id.raviarnan.mykalender.data.money.computeWalletBalances
import id.raviarnan.mykalender.data.money.currentYM
import id.raviarnan.mykalender.data.money.formatIDR
import id.raviarnan.mykalender.data.money.nextDueDateMillis
import id.raviarnan.mykalender.data.money.totalBalance
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private enum class MoneyTab(val label: String) {
    Transaksi("Transaksi"),
    Tagihan("Tagihan"),
    Dompet("Dompet"),
}

private fun startOfMonthMillis(now: Long = System.currentTimeMillis()): Long {
    val c = Calendar.getInstance().apply {
        timeInMillis = now
        set(Calendar.DAY_OF_MONTH, 1)
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    return c.timeInMillis
}

@Composable
fun MoneyScreen(
    uid: String,
    viewModel: MoneyViewModel = viewModel(),
) {
    LaunchedEffect(uid) { viewModel.start(uid) }
    val state by viewModel.state.collectAsStateWithLifecycle()

    var tab by remember { mutableStateOf(MoneyTab.Transaksi) }
    var viewMonth by remember { mutableStateOf(startOfMonthMillis()) }

    var editingTx by remember { mutableStateOf<Transaction?>(null) }
    var showTxDialog by remember { mutableStateOf(false) }
    var editingWallet by remember { mutableStateOf<Wallet?>(null) }
    var showWalletDialog by remember { mutableStateOf(false) }
    var editingBill by remember { mutableStateOf<Bill?>(null) }
    var showBillDialog by remember { mutableStateOf(false) }

    val balances = remember(state.wallets, state.transactions) {
        computeWalletBalances(state.wallets, state.transactions)
    }
    val hasWallets = state.wallets.isNotEmpty()

    fun openAddForCurrentTab() {
        when (tab) {
            MoneyTab.Transaksi -> { editingTx = null; showTxDialog = true }
            MoneyTab.Tagihan -> { editingBill = null; showBillDialog = true }
            MoneyTab.Dompet -> { editingWallet = null; showWalletDialog = true }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Top bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 8.dp, top = 12.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Keuangan",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.weight(1f),
            )
            if (hasWallets) {
                IconButton(onClick = { openAddForCurrentTab() }) {
                    Icon(Icons.Filled.Add, contentDescription = "Tambah")
                }
            }
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)

        // Sub-tabs
        Row(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            MoneyTab.entries.forEach { t ->
                TabChip(t.label, tab == t) { tab = t }
            }
        }

        when {
            !state.loaded -> Spacer(Modifier.fillMaxSize())
            !hasWallets -> EmptyWallets { editingWallet = null; showWalletDialog = true }
            tab == MoneyTab.Transaksi -> TransaksiTab(
                wallets = state.wallets,
                transactions = state.transactions,
                balances = balances,
                viewMonth = viewMonth,
                onPrevMonth = { viewMonth = addMonth(viewMonth, -1) },
                onNextMonth = { viewMonth = addMonth(viewMonth, 1) },
                onEdit = { editingTx = it; showTxDialog = true },
            )
            tab == MoneyTab.Tagihan -> TagihanTab(
                bills = state.bills,
                wallets = state.wallets,
                onEdit = { editingBill = it; showBillDialog = true },
                onPay = { viewModel.markBillPaid(it) },
                onAdd = { editingBill = null; showBillDialog = true },
            )
            else -> DompetTab(
                wallets = state.wallets,
                balances = balances,
                onEdit = { editingWallet = it; showWalletDialog = true },
                onAdd = { editingWallet = null; showWalletDialog = true },
            )
        }
    }

    if (showTxDialog) {
        TransactionDialog(
            wallets = state.wallets,
            existing = editingTx,
            initialDateMillis = System.currentTimeMillis(),
            onDismiss = { showTxDialog = false },
            onSave = {
                viewModel.saveTransaction(editingTx, it)
                showTxDialog = false; editingTx = null
            },
            onDelete = editingTx?.let { tx ->
                { viewModel.deleteTransaction(tx.id); showTxDialog = false; editingTx = null }
            },
        )
    }
    if (showWalletDialog) {
        WalletDialog(
            existing = editingWallet,
            onDismiss = { showWalletDialog = false },
            onSave = {
                viewModel.saveWallet(editingWallet, it)
                showWalletDialog = false; editingWallet = null
            },
            onDelete = editingWallet?.let { w ->
                { viewModel.deleteWallet(w.id); showWalletDialog = false; editingWallet = null }
            },
        )
    }
    if (showBillDialog) {
        BillDialog(
            wallets = state.wallets,
            existing = editingBill,
            onDismiss = { showBillDialog = false },
            onSave = {
                viewModel.saveBill(editingBill, it)
                showBillDialog = false; editingBill = null
            },
            onDelete = editingBill?.let { b ->
                { viewModel.deleteBill(b); showBillDialog = false; editingBill = null }
            },
        )
    }
}

private fun addMonth(millis: Long, delta: Int): Long =
    Calendar.getInstance().apply {
        timeInMillis = millis
        add(Calendar.MONTH, delta)
    }.timeInMillis

@Composable
private fun TabChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val bg = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface
    val fg = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
    val border = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .border(1.dp, border, RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 7.dp),
    ) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = fg)
    }
}

@Composable
private fun TransaksiTab(
    wallets: List<Wallet>,
    transactions: List<Transaction>,
    balances: Map<String, Long>,
    viewMonth: Long,
    onPrevMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onEdit: (Transaction) -> Unit,
) {
    val monthCal = remember(viewMonth) { Calendar.getInstance().apply { timeInMillis = viewMonth } }
    val monthTx = remember(transactions, viewMonth) {
        transactions.filter {
            val c = Calendar.getInstance().apply { timeInMillis = it.date.toDate().time }
            c.get(Calendar.MONTH) == monthCal.get(Calendar.MONTH) &&
                c.get(Calendar.YEAR) == monthCal.get(Calendar.YEAR)
        }
    }
    val income = monthTx.filter { it.type == "income" }.sumOf { it.amount }
    val expense = monthTx.filter { it.type == "expense" }.sumOf { it.amount }
    val total = totalBalance(wallets, balances)

    val monthFmt = remember { SimpleDateFormat("MMMM yyyy", Locale("id", "ID")) }
    val dayFmt = remember { SimpleDateFormat("EEEE, d MMMM", Locale("id", "ID")) }

    // Group date-desc transactions into day buckets.
    val groups = remember(monthTx) {
        val out = mutableListOf<Pair<Long, List<Transaction>>>()
        var currentKey: String? = null
        var bucket = mutableListOf<Transaction>()
        val keyFmt = SimpleDateFormat("yyyyMMdd", Locale.US)
        for (t in monthTx) {
            val k = keyFmt.format(t.date.toDate())
            if (k != currentKey) {
                if (bucket.isNotEmpty()) out.add(bucket.first().date.toDate().time to bucket.toList())
                bucket = mutableListOf(t)
                currentKey = k
            } else bucket.add(t)
        }
        if (bucket.isNotEmpty()) out.add(bucket.first().date.toDate().time to bucket.toList())
        out
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                elevation = CardDefaults.cardElevation(0.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text("Total saldo", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(formatIDR(total), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                        SummaryItem("Masuk", income, true)
                        SummaryItem("Keluar", expense, false)
                    }
                }
            }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = monthFmt.format(Date(viewMonth)).replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onPrevMonth) { Icon(Icons.Filled.ChevronLeft, "Bulan sebelumnya") }
                IconButton(onClick = onNextMonth) { Icon(Icons.Filled.ChevronRight, "Bulan berikutnya") }
            }
        }
        if (groups.isEmpty()) {
            item {
                Text(
                    text = "Belum ada transaksi bulan ini.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                )
            }
        } else {
            groups.forEach { (dayMillis, items) ->
                item {
                    Text(
                        text = dayFmt.format(Date(dayMillis)).replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                items.forEach { tx ->
                    item(key = tx.id) {
                        TransactionRow(
                            tx = tx,
                            walletName = wallets.find { it.id == tx.walletId }?.name ?: "—",
                            onClick = { onEdit(tx) },
                        )
                    }
                }
            }
        }
        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun SummaryItem(label: String, value: Long, income: Boolean) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            text = (if (income) "+" else "−") + formatIDR(value),
            style = MaterialTheme.typography.titleSmall,
            color = if (income) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onBackground,
        )
    }
}

@Composable
private fun TransactionRow(tx: Transaction, walletName: String, onClick: () -> Unit) {
    val cat = categoryOrFallback(tx.categoryId, tx.type)
    val income = tx.type == "income"
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(0.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(colorFromHex(cat.color).copy(alpha = 0.18f)),
            )
            Spacer(Modifier.size(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = tx.note?.ifBlank { null } ?: cat.label,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    text = "${cat.label} · $walletName",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                text = (if (income) "+" else "−") + formatIDR(tx.amount),
                style = MaterialTheme.typography.titleSmall,
                color = if (income) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onBackground,
            )
        }
    }
}

@Composable
private fun TagihanTab(
    bills: List<Bill>,
    wallets: List<Wallet>,
    onEdit: (Bill) -> Unit,
    onPay: (Bill) -> Unit,
    onAdd: () -> Unit,
) {
    val thisYM = remember { currentYM() }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (bills.isEmpty()) {
            item {
                Text(
                    text = "Belum ada tagihan. Tambah tagihan berulang (mis. listrik, internet) — berbunyi tiap bulan otomatis.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                )
            }
        } else {
            items(bills) { bill ->
                BillCard(
                    bill = bill,
                    walletName = wallets.find { it.id == bill.walletId }?.name ?: "—",
                    paidThisMonth = bill.lastPaidYM == thisYM,
                    onEdit = { onEdit(bill) },
                    onPay = { onPay(bill) },
                )
            }
        }
        item { AddRow("Tambah tagihan", onAdd) }
        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun BillCard(
    bill: Bill,
    walletName: String,
    paidThisMonth: Boolean,
    onEdit: () -> Unit,
    onPay: () -> Unit,
) {
    val dueFmt = remember { SimpleDateFormat("d MMM", Locale("id", "ID")) }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(0.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(bill.name, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
                    Text(
                        text = "Tiap tanggal ${bill.dayOfMonth} · $walletName",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(formatIDR(bill.amount), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onBackground)
                    Text(
                        text = "jatuh tempo " + dueFmt.format(Date(nextDueDateMillis(bill.dayOfMonth))),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = onEdit) { Icon(Icons.Filled.Edit, "Edit tagihan", modifier = Modifier.size(18.dp)) }
            }
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.outlineVariant)
            if (paidThisMonth) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.CheckCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.size(6.dp))
                    Text("Sudah dibayar bulan ini", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                }
            } else {
                TextButton(onClick = onPay, contentPadding = PaddingValues(0.dp)) {
                    Text("Tandai lunas → catat pengeluaran")
                }
            }
        }
    }
}

@Composable
private fun DompetTab(
    wallets: List<Wallet>,
    balances: Map<String, Long>,
    onEdit: (Wallet) -> Unit,
    onAdd: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        items(wallets) { w ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(0.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            ) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(colorFromHex(w.color)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.AccountBalanceWallet, null, tint = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(18.dp))
                    }
                    Spacer(Modifier.size(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(w.name, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
                        Text(
                            text = WALLET_TYPE_LABELS[w.type] ?: w.type,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(formatIDR(balances[w.id] ?: 0L), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onBackground)
                    IconButton(onClick = { onEdit(w) }) { Icon(Icons.Filled.Edit, "Edit dompet", modifier = Modifier.size(18.dp)) }
                }
            }
        }
        item { AddRow("Tambah dompet", onAdd) }
        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun AddRow(label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Add, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.size(6.dp))
            Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun EmptyWallets(onCreate: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Outlined.AccountBalanceWallet, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(40.dp))
            Spacer(Modifier.height(12.dp))
            Text("Belum ada dompet", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(4.dp))
            Text(
                text = "Buat dompet dulu (cash, bank, e-wallet) untuk mulai mencatat keuangan.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(16.dp))
            TextButton(onClick = onCreate) { Text("Buat dompet pertama") }
        }
    }
}
