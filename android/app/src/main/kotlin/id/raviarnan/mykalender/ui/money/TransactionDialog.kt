package id.raviarnan.mykalender.ui.money

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.google.firebase.Timestamp
import id.raviarnan.mykalender.data.money.CustomCategory
import id.raviarnan.mykalender.data.money.Transaction
import id.raviarnan.mykalender.data.money.TransactionInput
import id.raviarnan.mykalender.data.money.Wallet
import id.raviarnan.mykalender.data.money.categoriesForWith
import id.raviarnan.mykalender.data.money.formatThousands
import id.raviarnan.mykalender.data.money.parseIDR
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionDialog(
    wallets: List<Wallet>,
    customCategories: List<CustomCategory>,
    existing: Transaction?,
    initialDateMillis: Long,
    onDismiss: () -> Unit,
    onSave: (TransactionInput) -> Unit,
    onDelete: (() -> Unit)? = null,
) {
    var type by remember { mutableStateOf(existing?.type ?: "expense") }
    var amountStr by remember {
        mutableStateOf(existing?.let { formatThousands(it.amount) } ?: "")
    }
    var categoryId by remember {
        mutableStateOf(
            existing?.categoryId
                ?: categoriesForWith(existing?.type ?: "expense", customCategories).first().id,
        )
    }
    var walletId by remember {
        mutableStateOf(existing?.walletId ?: wallets.firstOrNull()?.id ?: "")
    }
    var toWalletId by remember {
        mutableStateOf(
            existing?.toWalletId
                ?: wallets.getOrNull(1)?.id
                ?: wallets.firstOrNull()?.id
                ?: "",
        )
    }
    var dateMillis by remember {
        mutableStateOf(existing?.date?.toDate()?.time ?: initialDateMillis)
    }
    var note by remember { mutableStateOf(existing?.note ?: "") }
    var error by remember { mutableStateOf<String?>(null) }
    var showDatePicker by remember { mutableStateOf(false) }

    val dateFmt = remember { SimpleDateFormat("EEEE, d MMM yyyy", Locale("id", "ID")) }
    val categories = categoriesForWith(type, customCategories)

    fun switchType(next: String) {
        type = next
        val valid = categoriesForWith(next, customCategories)
        if (valid.none { it.id == categoryId }) {
            categoryId = valid.first().id
        }
    }

    fun submit() {
        val amount = parseIDR(amountStr)
        if (amount <= 0) { error = "Jumlah harus lebih dari 0"; return }
        if (walletId.isBlank()) { error = "Pilih dompet dulu"; return }
        if (type == "transfer" && (toWalletId.isBlank() || toWalletId == walletId)) {
            error = "Pilih dompet tujuan yang berbeda"; return
        }
        onSave(
            TransactionInput(
                type = type,
                amount = amount,
                walletId = walletId,
                toWalletId = if (type == "transfer") toWalletId else null,
                categoryId = if (type == "transfer") "" else categoryId,
                date = Timestamp(Date(dateMillis)),
                note = note.trim().ifBlank { null },
            ),
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (existing == null) "Transaksi baru" else "Edit transaksi",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Filled.Close, contentDescription = "Tutup")
                }
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    TypeToggle("Keluar", type == "expense", Modifier.weight(1f)) { switchType("expense") }
                    TypeToggle("Masuk", type == "income", Modifier.weight(1f)) { switchType("income") }
                    TypeToggle("Transfer", type == "transfer", Modifier.weight(1f)) { switchType("transfer") }
                }

                MoneyField("Jumlah") {
                    AmountField(value = amountStr, onValueChange = { amountStr = it })
                }

                if (type != "transfer") {
                    MoneyField("Kategori") {
                        SelectField(
                            selected = categoryId,
                            options = categories.map { it.id },
                            label = { id -> categories.find { it.id == id }?.label ?: id },
                            onSelect = { categoryId = it },
                        )
                    }
                }

                MoneyField(if (type == "transfer") "Dari dompet" else "Dompet") {
                    SelectField(
                        selected = walletId,
                        options = wallets.map { it.id },
                        label = { id -> wallets.find { it.id == id }?.name ?: "—" },
                        onSelect = { walletId = it },
                    )
                }

                if (type == "transfer") {
                    MoneyField("Ke dompet") {
                        SelectField(
                            selected = toWalletId,
                            options = wallets.map { it.id },
                            label = { id -> wallets.find { it.id == id }?.name ?: "—" },
                            onSelect = { toWalletId = it },
                        )
                    }
                }

                MoneyField("Tanggal") {
                    OutlinedButton(
                        onClick = { showDatePicker = true },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(dateFmt.format(Date(dateMillis)), modifier = Modifier.fillMaxWidth())
                    }
                }

                MoneyField("Catatan") {
                    OutlinedTextField(
                        value = note,
                        onValueChange = { note = it },
                        placeholder = { Text("Opsional") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                if (error != null) {
                    Text(
                        text = error!!,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { submit() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            ) { Text("Simpan", fontWeight = FontWeight.SemiBold) }
        },
        dismissButton = {
            Row {
                if (existing != null && onDelete != null) {
                    TextButton(onClick = onDelete) {
                        Text("Hapus", color = MaterialTheme.colorScheme.error)
                    }
                }
                TextButton(onClick = onDismiss) { Text("Batal") }
            }
        },
    )

    if (showDatePicker) {
        val pickerState = rememberDatePickerState(initialSelectedDateMillis = dateMillis)
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { dateMillis = it }
                    showDatePicker = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text("Batal") }
            },
        ) { DatePicker(state = pickerState) }
    }
}

@Composable
private fun TypeToggle(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    if (selected) {
        Button(
            onClick = onClick,
            modifier = modifier,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            ),
        ) { Text(label) }
    } else {
        OutlinedButton(onClick = onClick, modifier = modifier) { Text(label) }
    }
}
