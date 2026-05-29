package id.raviarnan.mykalender.permissions

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.raviarnan.mykalender.alarm.AlarmRingingService

data class PermissionItem(
    val title: String,
    val description: String,
    val isGranted: Boolean,
    val actionLabel: String,
    val onAction: () -> Unit,
    /**
     * True for OEM-specific items (e.g. MIUI Autostart) where Android has no
     * public API to read the state. We never count these in the "pending"
     * total, and the UI renders them as informational link rows.
     */
    val manualSetup: Boolean = false,
)

@Composable
fun PermissionStatusBanner(
    pendingCount: Int,
    onOpenSheet: () -> Unit,
) {
    if (pendingCount == 0) return
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Filled.WarningAmber,
                contentDescription = null,
                tint = Color(0xFFB45309),
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.size(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "$pendingCount izin perlu diaktifkan",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF78350F),
                )
                Text(
                    text = "Tanpa izin ini alarm bisa tidak berbunyi.",
                    fontSize = 12.sp,
                    color = Color(0xFF92400E),
                )
            }
            TextButton(onClick = onOpenSheet) {
                Text("Atur", color = Color(0xFF78350F), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PermissionsSheet(
    permissions: List<PermissionItem>,
    onRefresh: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.background,
    ) {
        Column(modifier = Modifier.padding(horizontal = 20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Aktifkan izin untuk alarm",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "HP Xiaomi/Redmi blokir alarm di background by default. Aktifkan semua biar alarm bunyi pas jadwalnya.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                TextButton(onClick = onRefresh) {
                    Text("Cek ulang", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
            }
            Spacer(Modifier.height(16.dp))
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                permissions.forEach { item -> PermissionRow(item) }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun PermissionRow(item: PermissionItem) {
    val iconTint: Color
    val iconVector = if (item.isGranted || item.manualSetup) {
        if (item.isGranted) {
            iconTint = Color(0xFF10B981)
            Icons.Filled.CheckCircle
        } else {
            iconTint = Color(0xFF6B7280)
            Icons.Filled.WarningAmber
        }
    } else {
        iconTint = Color(0xFFB45309)
        Icons.Filled.WarningAmber
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = iconVector,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.size(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    text = item.description,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (item.manualSetup) {
                    Spacer(Modifier.size(2.dp))
                    Text(
                        text = "Cek manual di Settings (Android tidak menyediakan API status).",
                        fontSize = 11.sp,
                        color = Color(0xFF898989),
                    )
                }
            }
            OutlinedButton(
                onClick = item.onAction,
                enabled = !item.isGranted,
            ) {
                Text(if (item.isGranted) "Aktif" else item.actionLabel, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun rememberPermissionItems(refreshKey: Int = 0): List<PermissionItem> {
    val context = LocalContext.current
    // Touch refreshKey so this composable re-runs when caller bumps it.
    @Suppress("UnusedExpression") refreshKey

    val items = mutableListOf<PermissionItem>()

    items += PermissionItem(
        title = "Notifikasi",
        description = "Wajib untuk menampilkan alarm di status bar + lock screen.",
        isGranted = PermissionsHelper.hasNotificationPermission(context),
        actionLabel = "Buka",
        onAction = { PermissionsHelper.openAppDetails(context) },
    )

    items += PermissionItem(
        title = "Alarm presisi (exact alarm)",
        description = "Wajib agar alarm bunyi tepat waktu, bukan delayed.",
        isGranted = PermissionsHelper.canScheduleExactAlarms(context),
        actionLabel = "Buka",
        onAction = { PermissionsHelper.openExactAlarmSettings(context) },
    )

    items += PermissionItem(
        title = "Tanpa optimisasi baterai",
        description = "Cegah sistem mematikan alarm di background.",
        isGranted = PermissionsHelper.isIgnoringBatteryOptimizations(context),
        actionLabel = "Buka",
        onAction = { PermissionsHelper.openBatteryOptimizationSettings(context) },
    )

    items += PermissionItem(
        title = "Channel notifikasi 'Alarm Jadwal'",
        description = "Set Importance: Urgent. (Override DND opsional, hanya perlu kalau HP-mu sering DND.)",
        isGranted = PermissionsHelper.isAlarmChannelUrgent(
            context,
            AlarmRingingService.CHANNEL_ID,
        ),
        actionLabel = "Buka",
        onAction = {
            PermissionsHelper.openNotificationChannelSettings(
                context,
                AlarmRingingService.CHANNEL_ID,
            )
        },
    )

    if (PermissionsHelper.isMiui()) {
        items += PermissionItem(
            title = "MIUI: Other permissions",
            description = "Aktifkan: Display pop-up in background + Show on lock screen + Start in background.",
            isGranted = false,
            manualSetup = true,
            actionLabel = "Buka",
            onAction = { PermissionsHelper.openMiuiOtherPermissions(context) },
        )
        items += PermissionItem(
            title = "MIUI: Autostart",
            description = "Izinkan myKalender autostart agar alarm muncul setelah reboot.",
            isGranted = false,
            manualSetup = true,
            actionLabel = "Buka",
            onAction = { PermissionsHelper.openMiuiAutostart(context) },
        )
    }

    return items
}
