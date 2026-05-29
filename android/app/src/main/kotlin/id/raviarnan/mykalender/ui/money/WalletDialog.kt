package id.raviarnan.mykalender.ui.money

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.fillMaxWidth
import id.raviarnan.mykalender.data.money.WALLET_COLORS
import id.raviarnan.mykalender.data.money.WALLET_TYPE_LABELS
import id.raviarnan.mykalender.data.money.Wallet
import id.raviarnan.mykalender.data.money.WalletInput
import id.raviarnan.mykalender.data.money.formatThousands
import id.raviarnan.mykalender.data.money.parseIDR

@Composable
fun WalletDialog(
    existing: Wallet?,
    onDismiss: () -> Unit,
    onSave: (WalletInput) -> Unit,
    onDelete: (() -> Unit)? = null,
) {
    var name by remember { mutableStateOf(existing?.name ?: "") }
    var type by remember { mutableStateOf(existing?.type ?: "cash") }
    var balanceStr by remember {
        mutableStateOf(existing?.let { formatThousands(it.initialBalance) } ?: "")
    }
    var color by remember { mutableStateOf(existing?.color ?: WALLET_COLORS.first()) }
    var error by remember { mutableStateOf<String?>(null) }

    fun submit() {
        if (name.isBlank()) { error = "Nama dompet wajib diisi"; return }
        onSave(
            WalletInput(
                name = name.trim(),
                type = type,
                initialBalance = parseIDR(balanceStr),
                color = color,
                archived = existing?.archived ?: false,
            ),
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (existing == null) "Dompet baru" else "Edit dompet",
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
                    placeholder = { Text("Nama (mis. Cash, BCA, GoPay)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                MoneyField("Jenis") {
                    SelectField(
                        selected = type,
                        options = WALLET_TYPE_LABELS.keys.toList(),
                        label = { WALLET_TYPE_LABELS[it] ?: it },
                        onSelect = { type = it },
                    )
                }

                MoneyField("Saldo awal") {
                    AmountField(value = balanceStr, onValueChange = { balanceStr = it })
                }

                MoneyField("Warna") {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        WALLET_COLORS.forEach { c ->
                            val selected = c == color
                            Row(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(colorFromHex(c))
                                    .then(
                                        if (selected) Modifier.border(
                                            2.dp,
                                            MaterialTheme.colorScheme.onBackground,
                                            CircleShape,
                                        ) else Modifier,
                                    )
                                    .clickable { color = c },
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                if (selected) {
                                    Icon(
                                        Icons.Filled.Check,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp),
                                    )
                                }
                            }
                        }
                    }
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
}
