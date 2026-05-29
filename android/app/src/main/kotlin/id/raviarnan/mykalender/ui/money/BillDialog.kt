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
import id.raviarnan.mykalender.data.money.Bill
import id.raviarnan.mykalender.data.money.BillInput
import id.raviarnan.mykalender.data.money.EXPENSE_CATEGORIES
import id.raviarnan.mykalender.data.money.Wallet
import id.raviarnan.mykalender.data.money.formatThousands
import id.raviarnan.mykalender.data.money.parseIDR

private data class ReminderChoice(val minutes: Long, val label: String)

private val REMINDER_OPTIONS = listOf(
    ReminderChoice(0, "Tepat waktu"),
    ReminderChoice(60, "1 jam sebelum"),
    ReminderChoice(60 * 24, "1 hari sebelum"),
    ReminderChoice(60 * 24 * 2, "2 hari sebelum"),
)

@Composable
fun BillDialog(
    wallets: List<Wallet>,
    existing: Bill?,
    onDismiss: () -> Unit,
    onSave: (BillInput) -> Unit,
    onDelete: (() -> Unit)? = null,
) {
    var name by remember { mutableStateOf(existing?.name ?: "") }
    var amountStr by remember {
        mutableStateOf(existing?.let { formatThousands(it.amount) } ?: "")
    }
    var dayOfMonth by remember { mutableStateOf(existing?.dayOfMonth ?: 1) }
    var walletId by remember {
        mutableStateOf(existing?.walletId ?: wallets.firstOrNull()?.id ?: "")
    }
    var categoryId by remember { mutableStateOf(existing?.categoryId ?: "bills") }
    var reminderOffset by remember { mutableStateOf(existing?.reminderOffsetMinutes ?: 0L) }
    var alarmMode by remember { mutableStateOf(existing?.alarmMode ?: "alarm") }
    var error by remember { mutableStateOf<String?>(null) }

    fun submit() {
        if (name.isBlank()) { error = "Nama tagihan wajib diisi"; return }
        if (walletId.isBlank()) { error = "Pilih dompet dulu"; return }
        onSave(
            BillInput(
                name = name.trim(),
                amount = parseIDR(amountStr),
                walletId = walletId,
                categoryId = categoryId,
                dayOfMonth = dayOfMonth,
                reminderOffsetMinutes = reminderOffset,
                alarmMode = alarmMode,
            ),
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (existing == null) "Tagihan baru" else "Edit tagihan",
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
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = { Text("Nama (mis. Listrik, Internet)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                MoneyField("Jumlah") {
                    AmountField(value = amountStr, onValueChange = { amountStr = it })
                }

                MoneyField("Jatuh tempo tiap tanggal") {
                    SelectField(
                        selected = dayOfMonth,
                        options = (1..31).toList(),
                        label = { "Tanggal $it" },
                        onSelect = { dayOfMonth = it },
                    )
                }

                MoneyField("Dibayar dari") {
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
                        options = EXPENSE_CATEGORIES.map { it.id },
                        label = { id -> EXPENSE_CATEGORIES.find { it.id == id }?.label ?: id },
                        onSelect = { categoryId = it },
                    )
                }

                MoneyField("Pengingat") {
                    SelectField(
                        selected = reminderOffset,
                        options = REMINDER_OPTIONS.map { it.minutes },
                        label = { m -> REMINDER_OPTIONS.find { it.minutes == m }?.label ?: "$m menit" },
                        onSelect = { reminderOffset = it },
                    )
                }

                MoneyField("Mode pengingat") {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ModeToggle("Alarm beneran", alarmMode == "alarm", Modifier.weight(1f)) { alarmMode = "alarm" }
                        ModeToggle("Notifikasi", alarmMode == "notification", Modifier.weight(1f)) { alarmMode = "notification" }
                    }
                }

                Text(
                    text = "Tagihan tampil di kalender & berbunyi tiap bulan otomatis.",
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
private fun ModeToggle(
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
