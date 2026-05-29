package id.raviarnan.mykalender.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
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
import id.raviarnan.mykalender.data.Event
import id.raviarnan.mykalender.data.EventInput
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private data class ReminderChoice(val minutes: Long, val label: String)

private val REMINDER_OPTIONS = listOf(
    ReminderChoice(0, "Tepat waktu"),
    ReminderChoice(5, "5 menit sebelum"),
    ReminderChoice(10, "10 menit sebelum"),
    ReminderChoice(20, "20 menit sebelum"),
    ReminderChoice(30, "30 menit sebelum"),
    ReminderChoice(60, "1 jam sebelum"),
    ReminderChoice(60 * 24, "1 hari sebelum"),
)

private data class RecurrenceChoice(val value: String, val label: String)

private val RECURRENCE_OPTIONS = listOf(
    RecurrenceChoice("none", "Tidak berulang"),
    RecurrenceChoice("daily", "Setiap hari"),
    RecurrenceChoice("weekdays", "Hari kerja (Sen-Jum)"),
    RecurrenceChoice("weekly", "Setiap minggu"),
    RecurrenceChoice("monthly", "Setiap bulan"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventDialog(
    existing: Event?,
    onDismiss: () -> Unit,
    onSave: (EventInput) -> Unit,
    onDelete: (() -> Unit)? = null,
) {
    val now = Calendar.getInstance().apply {
        timeInMillis = (existing?.start?.toDate()?.time)
            ?: (System.currentTimeMillis() + 60 * 60_000L)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }
    val end = Calendar.getInstance().apply {
        timeInMillis = (existing?.end?.toDate()?.time)
            ?: (now.timeInMillis + 60 * 60_000L)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }

    val context = LocalContext.current
    var title by remember { mutableStateOf(existing?.title ?: "") }
    var description by remember { mutableStateOf(existing?.description ?: "") }
    var startMillis by remember { mutableStateOf(now.timeInMillis) }
    var endMillis by remember { mutableStateOf(end.timeInMillis) }
    var allDay by remember { mutableStateOf(existing?.allDay ?: false) }
    var reminderOffset by remember { mutableStateOf(existing?.reminderOffsetMinutes ?: 20L) }
    var soundUri by remember { mutableStateOf(existing?.alarmSoundUri) }
    var recurrence by remember { mutableStateOf(existing?.recurrence ?: "none") }
    var alarmMode by remember { mutableStateOf(existing?.alarmMode ?: "alarm") }
    var error by remember { mutableStateOf<String?>(null) }
    var recurrenceMenuOpen by remember { mutableStateOf(false) }

    val soundDisplayName = remember(soundUri) {
        if (soundUri == null) "Default sistem"
        else runCatching {
            RingtoneManager.getRingtone(context, Uri.parse(soundUri))
                ?.getTitle(context) ?: "Suara terpilih"
        }.getOrDefault("Suara terpilih")
    }

    val soundPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            val uri: Uri? = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                result.data?.getParcelableExtra(
                    RingtoneManager.EXTRA_RINGTONE_PICKED_URI,
                    Uri::class.java,
                )
            } else {
                @Suppress("DEPRECATION")
                result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
            }
            soundUri = uri?.toString()
        }
    }

    var showDatePicker by remember { mutableStateOf(false) }
    var showStartTimePicker by remember { mutableStateOf(false) }
    var showEndTimePicker by remember { mutableStateOf(false) }
    var reminderMenuOpen by remember { mutableStateOf(false) }

    val dateFmt = remember { SimpleDateFormat("EEEE, d MMM yyyy", Locale("id", "ID")) }
    val timeFmt = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }

    fun submit() {
        if (title.isBlank()) { error = "Judul wajib diisi"; return }
        if (endMillis < startMillis) { error = "Jam selesai harus setelah jam mulai"; return }
        val input = EventInput(
            title = title.trim(),
            description = description.trim().ifBlank { null },
            start = Timestamp(Date(startMillis)),
            end = Timestamp(Date(endMillis)),
            allDay = allDay,
            reminderOffsetMinutes = reminderOffset,
            source = existing?.source ?: "manual",
            gcalEventId = existing?.gcalEventId,
            alarmSoundUri = soundUri,
            recurrence = if (recurrence == "none") null else recurrence,
            alarmMode = alarmMode,
        )
        onSave(input)
    }

    fun openSoundPicker() {
        val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
            putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
            putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Pilih suara alarm")
            putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
            putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
            putExtra(
                RingtoneManager.EXTRA_RINGTONE_DEFAULT_URI,
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
            )
            putExtra(
                RingtoneManager.EXTRA_RINGTONE_EXISTING_URI,
                soundUri?.let { Uri.parse(it) },
            )
        }
        soundPickerLauncher.launch(intent)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (existing == null) "Jadwal baru" else "Edit jadwal",
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
                    value = title,
                    onValueChange = { title = it },
                    placeholder = { Text("Judul jadwal") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.titleMedium,
                )

                Field(icon = Icons.Filled.CalendarToday, label = "Tanggal") {
                    OutlinedButton(
                        onClick = { showDatePicker = true },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(dateFmt.format(Date(startMillis)), modifier = Modifier.weight(1f))
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(start = 28.dp),
                ) {
                    Switch(checked = allDay, onCheckedChange = { allDay = it })
                    Spacer(Modifier.width(8.dp))
                    Text("Sepanjang hari", style = MaterialTheme.typography.bodyMedium)
                }

                if (!allDay) {
                    Field(icon = Icons.Filled.Schedule, label = "Waktu") {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = { showStartTimePicker = true },
                                modifier = Modifier.weight(1f),
                            ) { Text(timeFmt.format(Date(startMillis))) }
                            OutlinedButton(
                                onClick = { showEndTimePicker = true },
                                modifier = Modifier.weight(1f),
                            ) { Text(timeFmt.format(Date(endMillis))) }
                        }
                    }
                }

                Field(icon = Icons.Filled.Notifications, label = "Alarm") {
                    Box {
                        OutlinedButton(
                            onClick = { reminderMenuOpen = true },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                text = REMINDER_OPTIONS.find { it.minutes == reminderOffset }?.label
                                    ?: "$reminderOffset menit sebelum",
                                modifier = Modifier.weight(1f),
                            )
                        }
                        DropdownMenu(
                            expanded = reminderMenuOpen,
                            onDismissRequest = { reminderMenuOpen = false },
                        ) {
                            REMINDER_OPTIONS.forEach { opt ->
                                DropdownMenuItem(
                                    text = { Text(opt.label) },
                                    onClick = {
                                        reminderOffset = opt.minutes
                                        reminderMenuOpen = false
                                    },
                                )
                            }
                        }
                    }
                }

                Field(icon = Icons.Filled.Repeat, label = "Pengulangan") {
                    Box {
                        OutlinedButton(
                            onClick = { recurrenceMenuOpen = true },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                text = RECURRENCE_OPTIONS.find { it.value == recurrence }?.label
                                    ?: "Tidak berulang",
                                modifier = Modifier.weight(1f),
                            )
                        }
                        DropdownMenu(
                            expanded = recurrenceMenuOpen,
                            onDismissRequest = { recurrenceMenuOpen = false },
                        ) {
                            RECURRENCE_OPTIONS.forEach { opt ->
                                DropdownMenuItem(
                                    text = { Text(opt.label) },
                                    onClick = {
                                        recurrence = opt.value
                                        recurrenceMenuOpen = false
                                    },
                                )
                            }
                        }
                    }
                }

                Field(icon = Icons.Filled.NotificationsActive, label = "Mode pengingat") {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        AlarmModeOption(
                            label = "Alarm beneran",
                            description = "Bunyi keras, full-screen, sampai dimatikan",
                            selected = alarmMode == "alarm",
                            onClick = { alarmMode = "alarm" },
                            modifier = Modifier.weight(1f),
                        )
                        AlarmModeOption(
                            label = "Notifikasi biasa",
                            description = "Heads-up notif standar, gak loud",
                            selected = alarmMode == "notification",
                            onClick = { alarmMode = "notification" },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                Field(icon = Icons.Filled.MusicNote, label = "Suara alarm") {
                    OutlinedButton(
                        onClick = { openSoundPicker() },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(soundDisplayName, modifier = Modifier.weight(1f))
                    }
                }

                Field(icon = Icons.Filled.Description, label = "Catatan") {
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        placeholder = { Text("Opsional") },
                        modifier = Modifier.fillMaxWidth().height(80.dp),
                        textStyle = MaterialTheme.typography.bodyMedium,
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
            ) {
                Text("Simpan", fontWeight = FontWeight.SemiBold)
            }
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
        val pickerState = rememberDatePickerState(initialSelectedDateMillis = startMillis)
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { picked ->
                        val cal = Calendar.getInstance().apply {
                            timeInMillis = picked
                            val startCal = Calendar.getInstance().apply { timeInMillis = startMillis }
                            set(Calendar.HOUR_OF_DAY, startCal.get(Calendar.HOUR_OF_DAY))
                            set(Calendar.MINUTE, startCal.get(Calendar.MINUTE))
                        }
                        val diff = endMillis - startMillis
                        startMillis = cal.timeInMillis
                        endMillis = startMillis + diff
                    }
                    showDatePicker = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text("Batal") }
            },
        ) { DatePicker(state = pickerState) }
    }

    if (showStartTimePicker) {
        val cal = Calendar.getInstance().apply { timeInMillis = startMillis }
        val state = rememberTimePickerState(
            initialHour = cal.get(Calendar.HOUR_OF_DAY),
            initialMinute = cal.get(Calendar.MINUTE),
            is24Hour = true,
        )
        AlertDialog(
            onDismissRequest = { showStartTimePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    val newCal = Calendar.getInstance().apply {
                        timeInMillis = startMillis
                        set(Calendar.HOUR_OF_DAY, state.hour)
                        set(Calendar.MINUTE, state.minute)
                    }
                    startMillis = newCal.timeInMillis
                    showStartTimePicker = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showStartTimePicker = false }) { Text("Batal") }
            },
            text = { TimePicker(state = state) },
        )
    }

    if (showEndTimePicker) {
        val cal = Calendar.getInstance().apply { timeInMillis = endMillis }
        val state = rememberTimePickerState(
            initialHour = cal.get(Calendar.HOUR_OF_DAY),
            initialMinute = cal.get(Calendar.MINUTE),
            is24Hour = true,
        )
        AlertDialog(
            onDismissRequest = { showEndTimePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    val newCal = Calendar.getInstance().apply {
                        timeInMillis = endMillis
                        set(Calendar.HOUR_OF_DAY, state.hour)
                        set(Calendar.MINUTE, state.minute)
                    }
                    endMillis = newCal.timeInMillis
                    showEndTimePicker = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showEndTimePicker = false }) { Text("Batal") }
            },
            text = { TimePicker(state = state) },
        )
    }
}

@Composable
private fun AlarmModeOption(
    label: String,
    description: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val bg = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface
    val fg = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
    val border = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .border(1.dp, border, RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = fg,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = description,
            style = MaterialTheme.typography.labelSmall,
            color = if (selected) fg.copy(alpha = 0.85f) else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 2.dp),
        )
    }
}

@Composable
private fun Field(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    content: @Composable () -> Unit,
) {
    Row(verticalAlignment = Alignment.Top) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp).padding(top = 10.dp),
        )
        Spacer(Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 4.dp),
            )
            content()
        }
    }
}
