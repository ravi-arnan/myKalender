package id.raviarnan.mykalender.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import id.raviarnan.mykalender.BuildConfig
import id.raviarnan.mykalender.update.AppUpdater
import id.raviarnan.mykalender.update.UpdateInfo
import id.raviarnan.mykalender.ui.theme.ThemeManager
import id.raviarnan.mykalender.ui.theme.ThemePreference
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(themeManager: ThemeManager, onSignOut: () -> Unit) {
    val theme by themeManager.observe().collectAsState(initial = themeManager.get())
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Pengaturan",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Text(
                text = "Atur tampilan, default reminder, dan preferensi lainnya.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            SettingSection(icon = Icons.Filled.Palette, title = "Tampilan") {
                ThemePickerRow(
                    current = theme,
                    onSelect = { themeManager.set(it) },
                )
                SettingRow("Mulai minggu di", "Minggu")
                SettingRow("Bahasa", "Bahasa Indonesia")
            }

            SettingSection(icon = Icons.Filled.Notifications, title = "Default reminder") {
                SettingRow("Offset alarm bawaan", "20 menit sebelum")
                SettingRow("Suara alarm", "Default sistem")
            }

            SettingSection(icon = Icons.Filled.Public, title = "Waktu & lokasi") {
                SettingRow("Zona waktu", "Asia/Makassar (WITA)")
            }

            SettingSection(icon = Icons.Filled.Shield, title = "Privasi") {
                SettingRow("Data jadwal", "Tersimpan di Firestore akun pribadi")
            }

            UpdateSection()

            OutlinedButton(
                onClick = onSignOut,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            ) {
                Icon(
                    Icons.Filled.Logout,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.error,
                )
                Spacer(Modifier.size(8.dp))
                Text(
                    text = "Keluar dari akun",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.labelLarge,
                )
            }

            Text(
                text = "Form interaktif untuk ubah preferensi akan menyusul.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(48.dp))
        }
    }
}

@Composable
private fun SettingSection(
    icon: ImageVector,
    title: String,
    content: @Composable () -> Unit,
) {
    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 8.dp),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(14.dp),
            )
            Spacer(Modifier.size(6.dp))
            Text(
                text = title.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.SemiBold,
            )
        }
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        ) {
            Column { content() }
        }
    }
}

private sealed interface UpdateState {
    data object Idle : UpdateState
    data object Checking : UpdateState
    data object UpToDate : UpdateState
    data class Available(val info: UpdateInfo) : UpdateState
    data class Downloading(val progress: Float) : UpdateState
    data class Error(val message: String) : UpdateState
}

@Composable
private fun UpdateSection() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf<UpdateState>(UpdateState.Idle) }

    SettingSection(icon = Icons.Filled.SystemUpdate, title = "Aplikasi") {
        SettingRow("Versi", BuildConfig.VERSION_NAME)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            when (val s = state) {
                is UpdateState.Available -> {
                    Text(
                        text = "Versi baru ${s.info.versionName} tersedia",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (s.info.notes.isNotBlank()) {
                        Text(
                            text = s.info.notes,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Button(
                        onClick = {
                            state = UpdateState.Downloading(-1f)
                            scope.launch {
                                try {
                                    val file = AppUpdater.download(context, s.info.apkUrl) { p ->
                                        state = UpdateState.Downloading(p)
                                    }
                                    AppUpdater.install(context, file)
                                    state = UpdateState.Idle
                                } catch (t: Throwable) {
                                    state = UpdateState.Error(t.message ?: "Gagal mengunduh")
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Unduh & pasang") }
                }

                is UpdateState.Downloading -> {
                    if (s.progress < 0f) {
                        LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                    } else {
                        LinearProgressIndicator(
                            progress = { s.progress },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    Text(
                        text = "Mengunduh… " + if (s.progress >= 0f) "${(s.progress * 100).toInt()}%" else "",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                else -> {
                    OutlinedButton(
                        onClick = {
                            state = UpdateState.Checking
                            scope.launch {
                                state = try {
                                    val info = AppUpdater.check()
                                    if (info != null) UpdateState.Available(info)
                                    else UpdateState.UpToDate
                                } catch (t: Throwable) {
                                    UpdateState.Error(t.message ?: "Gagal mengecek")
                                }
                            }
                        },
                        enabled = s !is UpdateState.Checking,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    ) {
                        Text(if (s is UpdateState.Checking) "Mengecek…" else "Cek pembaruan")
                    }
                    when (s) {
                        is UpdateState.UpToDate -> Text(
                            text = "Kamu sudah pakai versi terbaru.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        is UpdateState.Error -> Text(
                            text = s.message,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                        else -> {}
                    }
                }
            }
        }
    }
}

@Composable
private fun ThemePickerRow(
    current: ThemePreference,
    onSelect: (ThemePreference) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Text(
            text = "Tema",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.size(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ThemeOption(
                label = "Terang",
                icon = Icons.Filled.LightMode,
                selected = current == ThemePreference.Light,
                onClick = { onSelect(ThemePreference.Light) },
                modifier = Modifier.weight(1f),
            )
            ThemeOption(
                label = "Gelap",
                icon = Icons.Filled.DarkMode,
                selected = current == ThemePreference.Dark,
                onClick = { onSelect(ThemePreference.Dark) },
                modifier = Modifier.weight(1f),
            )
            ThemeOption(
                label = "Sistem",
                icon = Icons.Filled.PhoneAndroid,
                selected = current == ThemePreference.System,
                onClick = { onSelect(ThemePreference.System) },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun ThemeOption(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val container = if (selected) MaterialTheme.colorScheme.primary
        else MaterialTheme.colorScheme.background
    val content = if (selected) MaterialTheme.colorScheme.onPrimary
        else MaterialTheme.colorScheme.onBackground
    OutlinedButton(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(
            1.dp,
            if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
        ),
        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
            containerColor = container,
            contentColor = content,
        ),
    ) {
        Icon(
            imageVector = if (selected) Icons.Filled.Check else icon,
            contentDescription = null,
            modifier = Modifier.size(14.dp),
        )
        Spacer(Modifier.size(6.dp))
        Text(label, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun SettingRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.Medium,
        )
    }
}
