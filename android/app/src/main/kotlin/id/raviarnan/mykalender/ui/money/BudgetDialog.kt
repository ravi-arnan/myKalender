package id.raviarnan.mykalender.ui.money

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import id.raviarnan.mykalender.data.money.formatThousands
import id.raviarnan.mykalender.data.money.parseIDR

/**
 * Sets the monthly spending limit for one expense category. Saving 0 (or empty)
 * removes the budget — mirrors the web BudgetDialog.
 */
@Composable
fun BudgetDialog(
    categoryLabel: String,
    currentAmount: Long,
    onDismiss: () -> Unit,
    /** amount <= 0 removes the budget. */
    onSave: (Long) -> Unit,
) {
    var amountStr by remember {
        mutableStateOf(if (currentAmount > 0) formatThousands(currentAmount) else "")
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Budget $categoryLabel", style = MaterialTheme.typography.headlineMedium) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                MoneyField("Batas pengeluaran per bulan") {
                    AmountField(value = amountStr, onValueChange = { amountStr = it })
                }
                Text(
                    text = "Kosongkan / isi 0 untuk menghapus budget kategori ini.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(parseIDR(amountStr)) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            ) { Text("Simpan", fontWeight = FontWeight.SemiBold) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Batal") }
        },
    )
}
