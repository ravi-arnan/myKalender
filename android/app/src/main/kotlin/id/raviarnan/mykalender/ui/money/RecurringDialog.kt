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
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import id.raviarnan.mykalender.data.money.CustomCategory
import id.raviarnan.mykalender.data.money.RecurringInput
import id.raviarnan.mykalender.data.money.RecurringTransaction
import id.raviarnan.mykalender.data.money.Wallet
import id.raviarnan.mykalender.data.money.categoriesForWith
import id.raviarnan.mykalender.data.money.formatThousands
import id.raviarnan.mykalender.data.money.parseIDR

@Composable
fun RecurringDialog(
    wallets: List<Wallet>,
    customCategories: List<CustomCategory>,
    existing: RecurringTransaction?,
    onDismiss: () -> Unit,
    onSave: (RecurringInput) -> Unit,
    onDelete: (() -> Unit)? = null,
) {
    var type by remember { mutableStateOf(existing?.type ?: "expense") }
    var name by remember { mutableStateOf(existing?.name ?: "") }
    var amountStr by remember {
        mutableStateOf(existing?.let { formatThousands(it.amount) } ?: "")
    }
    var dayOfMonth by remember { mutableStateOf(existing?.dayOfMonth ?: 1) }
    var walletId by remember {
        mutableStateOf(existing?.walletId ?: wallets.firstOrNull()?.id ?: "")
    }
    var categoryId by remember {
        mutableStateOf(
            existing?.categoryId
                ?: categoriesForWith("expense", customCategories).firstOrNull()?.id ?: "",
        )
    }
    var note by remember { mutableStateOf(existing?.note ?: "") }
    var active by remember { mutableStateOf(existing?.active ?: true) }
    var error by remember { mutableStateOf<String?>(null) }

    val categories = categoriesForWith(type, customCategories)

    fun onTypeChange(next: String) {
        if (type == next) return
        type = next
        val cats = categoriesForWith(next, customCategories)
        if (cats.none { it.id == categoryId }) categoryId = cats.firstOrNull()?.id ?: ""
    }

    fun submit() {
        if (name.isBlank()) { error = "Nama wajib diisi"; return }
        if (walletId.isBlank()) { error = "Pilih dompet dulu"; return }
        onSave(
            RecurringInput(
                name = name.trim(),
                type = type,
                amount = parseIDR(amountStr),
                walletId = walletId,
                categoryId = categoryId,
                dayOfMonth = dayOfMonth,
                note = note.trim().ifBlank { null },
                active = active,
            ),
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (existing == null) "Transaksi berulang baru" else "Edit transaksi berulang",
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
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TypeToggle("Pengeluaran", type == "expense", Modifier.weight(1f)) { onTypeChange("expense") }
                    TypeToggle("Pemasukan", type == "income", Modifier.weight(1f)) { onTypeChange("income") }
                }

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = { Text("Nama (mis. Gaji, Netflix)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                MoneyField("Jumlah") {
                    AmountField(value = amountStr, onValueChange = { amountStr = it })
                }

                MoneyField("Otomatis tiap tanggal") {
                    SelectField(
                        selected = dayOfMonth,
                        options = (1..31).toList(),
                        label = { "Tanggal $it" },
                        onSelect = { dayOfMonth = it },
                    )
                }

                MoneyField(if (type == "income") "Masuk ke" else "Dibayar dari") {
                    SelectField(
                        selected = walletId,
                        options = wallets.map { it.id },
                        label = { id -> wallets.find { it.id == id }?.name ?: "—" },
                        onSelect = { walletId = it },
                    )
                }

                MoneyField("Kategori") {
                    SelectField(
                        selected = categoryId,
                        options = categories.map { it.id },
                        label = { id -> categories.find { it.id == id }?.label ?: id },
                        onSelect = { categoryId = it },
                    )
                }

                MoneyField("Catatan (opsional)") {
                    OutlinedTextField(
                        value = note,
                        onValueChange = { note = it },
                        placeholder = { Text("Default: nama di atas") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "Aktif — otomatis dicatat tiap bulan",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f),
                    )
                    Switch(checked = active, onCheckedChange = { active = it })
                }

                Text(
                    text = "Dicatat otomatis saat tanggalnya tiba (tanpa alarm). Untuk pengingat berbunyi, pakai tab Tagihan.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

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
