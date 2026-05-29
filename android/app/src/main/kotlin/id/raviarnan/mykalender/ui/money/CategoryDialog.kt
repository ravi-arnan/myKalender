package id.raviarnan.mykalender.ui.money

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import id.raviarnan.mykalender.data.money.CATEGORY_COLORS
import id.raviarnan.mykalender.data.money.CustomCategory
import id.raviarnan.mykalender.data.money.CustomCategoryInput

/**
 * Create/edit a custom category. Android shows categories by color only, so
 * there is no icon picker — the `icon` field is preserved (or defaulted to
 * "tag") so a category created on Android still renders nicely on web.
 */
@Composable
fun CategoryDialog(
    existing: CustomCategory?,
    onDismiss: () -> Unit,
    onSave: (CustomCategoryInput) -> Unit,
    onDelete: (() -> Unit)? = null,
) {
    var label by remember { mutableStateOf(existing?.label ?: "") }
    var kind by remember { mutableStateOf(existing?.kind ?: "expense") }
    var color by remember { mutableStateOf(existing?.color ?: CATEGORY_COLORS.first()) }
    var error by remember { mutableStateOf<String?>(null) }

    fun submit() {
        if (label.isBlank()) { error = "Nama kategori wajib diisi"; return }
        onSave(
            CustomCategoryInput(
                label = label.trim(),
                kind = kind,
                color = color,
                icon = existing?.icon ?: "tag",
            ),
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (existing == null) "Kategori baru" else "Edit kategori",
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
                MoneyField("Nama") {
                    OutlinedTextField(
                        value = label,
                        onValueChange = { label = it },
                        placeholder = { Text("mis. Kopi, Investasi") },
                        singleLine = true,
                        modifier = Modifier,
                    )
                }

                MoneyField("Jenis") {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        KindToggle("Pengeluaran", kind == "expense", Modifier.weight(1f)) { kind = "expense" }
                        KindToggle("Pemasukan", kind == "income", Modifier.weight(1f)) { kind = "income" }
                    }
                }

                MoneyField("Warna") {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        CATEGORY_COLORS.forEach { hex ->
                            ColorSwatch(
                                selected = color == hex,
                                color = colorFromHex(hex),
                                onClick = { color = hex },
                            )
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

@Composable
private fun KindToggle(
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

@Composable
private fun ColorSwatch(selected: Boolean, color: Color, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(color)
            .border(
                width = if (selected) 2.dp else 0.dp,
                color = MaterialTheme.colorScheme.onBackground,
                shape = CircleShape,
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (selected) {
            Icon(
                Icons.Filled.Check,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(18.dp),
            )
        }
    }
}
