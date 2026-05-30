package id.raviarnan.mykalender.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import id.raviarnan.mykalender.R
import id.raviarnan.mykalender.data.Event
import id.raviarnan.mykalender.permissions.PermissionStatusBanner
import kotlinx.coroutines.delay
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.IconButton
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.ui.graphics.Color
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Date
import java.util.Locale

enum class EventsView { List, Calendar }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventsScreen(
    userEmail: String?,
    events: List<Event>,
    pendingPermissionsCount: Int,
    onOpenPermissionsSheet: () -> Unit,
    onRefresh: () -> Unit,
    onEditEvent: (Event) -> Unit,
) {
    var isRefreshing by remember { mutableStateOf(false) }
    var viewMode by remember { mutableStateOf(EventsView.List) }
    LaunchedEffect(isRefreshing) {
        if (isRefreshing) {
            onRefresh()
            delay(500)
            isRefreshing = false
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        TopBar()
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)

        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { isRefreshing = true },
            modifier = Modifier.fillMaxSize(),
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                PermissionStatusBanner(
                    pendingCount = pendingPermissionsCount,
                    onOpenSheet = onOpenPermissionsSheet,
                )

                EventsHeader(
                    eventsCount = events.size,
                    viewMode = viewMode,
                    onViewModeChange = { viewMode = it },
                )

                when (viewMode) {
                    EventsView.List ->
                        if (events.isEmpty()) {
                            EmptyState()
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                items(events, key = { it.id }) { event ->
                                    EventCard(event = event, onClick = { onEditEvent(event) })
                                }
                                item { Spacer(Modifier.height(96.dp)) }
                            }
                        }

                    EventsView.Calendar ->
                        CalendarView(events = events, onEditEvent = onEditEvent)
                }
            }
        }
    }
}

@Composable
private fun TopBar() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(
            painter = painterResource(id = R.drawable.logo),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(28.dp)
                .clip(RoundedCornerShape(8.dp)),
        )
        Spacer(Modifier.size(10.dp))
        Text(
            text = "myKalender",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )
    }
}

@Composable
private fun EventsHeader(
    eventsCount: Int,
    viewMode: EventsView,
    onViewModeChange: (EventsView) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Text(
            text = stringResource(R.string.upcoming_events),
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
        if (eventsCount > 0) {
            Spacer(Modifier.height(2.dp))
            Text(
                text = "$eventsCount jadwal menunggu alarm",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.height(12.dp))
        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            SegmentedButton(
                selected = viewMode == EventsView.List,
                onClick = { onViewModeChange(EventsView.List) },
                shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
            ) { Text("List") }
            SegmentedButton(
                selected = viewMode == EventsView.Calendar,
                onClick = { onViewModeChange(EventsView.Calendar) },
                shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
            ) { Text("Kalender") }
        }
    }
}

/**
 * Month grid over the upcoming events. Days that have at least one event get a
 * dot; tapping a day lists that day's events below. Only upcoming events are
 * loaded (start >= now), so past days never carry markers — matching the
 * "Jadwal Mendatang" framing.
 */
@Composable
private fun CalendarView(
    events: List<Event>,
    onEditEvent: (Event) -> Unit,
) {
    val zone = remember { ZoneId.systemDefault() }
    val eventsByDay = remember(events) {
        events.groupBy { it.start.toDate().toInstant().atZone(zone).toLocalDate() }
    }
    val today = remember { LocalDate.now() }
    var month by remember { mutableStateOf(YearMonth.from(today)) }
    var selected by remember { mutableStateOf(today) }

    val monthFmt = remember { DateTimeFormatter.ofPattern("MMMM yyyy", Locale("id", "ID")) }
    val dayHeaderFmt = remember { DateTimeFormatter.ofPattern("EEEE, d MMMM", Locale("id", "ID")) }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = month.atDay(1).format(monthFmt)
                    .replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = { month = month.minusMonths(1) }) {
                Icon(Icons.Filled.KeyboardArrowLeft, contentDescription = "Bulan sebelumnya")
            }
            IconButton(onClick = { month = month.plusMonths(1) }) {
                Icon(Icons.Filled.KeyboardArrowRight, contentDescription = "Bulan berikutnya")
            }
        }

        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
            listOf("Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min").forEach { d ->
                Text(
                    text = d,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
            }
        }
        Spacer(Modifier.height(4.dp))

        val leadingBlanks = month.atDay(1).dayOfWeek.value - 1 // Mon = 0
        val daysInMonth = month.lengthOfMonth()
        val rows = (leadingBlanks + daysInMonth + 6) / 7
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
            for (row in 0 until rows) {
                Row(modifier = Modifier.fillMaxWidth()) {
                    for (col in 0 until 7) {
                        val dayNum = row * 7 + col - leadingBlanks + 1
                        if (dayNum in 1..daysInMonth) {
                            val date = month.atDay(dayNum)
                            DayCell(
                                day = dayNum,
                                isToday = date == today,
                                isSelected = date == selected,
                                hasEvents = eventsByDay.containsKey(date),
                                onClick = { selected = date },
                                modifier = Modifier.weight(1f),
                            )
                        } else {
                            Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
        }

        HorizontalDivider(
            color = MaterialTheme.colorScheme.outline,
            modifier = Modifier.padding(top = 8.dp),
        )

        Text(
            text = selected.format(dayHeaderFmt).replaceFirstChar { it.uppercase() },
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
        )

        val dayEvents = eventsByDay[selected].orEmpty()
        if (dayEvents.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxWidth().padding(24.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "Tidak ada jadwal di tanggal ini",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(dayEvents, key = { it.id }) { event ->
                    EventCard(event = event, onClick = { onEditEvent(event) })
                }
                item { Spacer(Modifier.height(96.dp)) }
            }
        }
    }
}

@Composable
private fun DayCell(
    day: Int,
    isToday: Boolean,
    isSelected: Boolean,
    hasEvents: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .height(46.dp)
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .size(30.dp)
                .clip(CircleShape)
                .background(
                    if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
                )
                .then(
                    if (isToday && !isSelected) {
                        Modifier.border(1.dp, MaterialTheme.colorScheme.primary, CircleShape)
                    } else {
                        Modifier
                    },
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = day.toString(),
                style = MaterialTheme.typography.bodyMedium,
                color = if (isSelected) {
                    MaterialTheme.colorScheme.onPrimary
                } else {
                    MaterialTheme.colorScheme.onBackground
                },
            )
        }
        Box(
            modifier = Modifier
                .padding(top = 3.dp)
                .size(5.dp)
                .clip(CircleShape)
                .background(
                    if (hasEvents) MaterialTheme.colorScheme.primary else Color.Transparent,
                ),
        )
    }
}

@Composable
private fun EmptyState() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = stringResource(R.string.no_events),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
private fun EventCard(event: Event, onClick: () -> Unit) {
    val dateFmt = remember { SimpleDateFormat("EEEE, d MMM", Locale("id", "ID")) }
    val timeFmt = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }
    val startDate: Date = event.start.toDate()
    val endDate: Date = event.end.toDate()

    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Row(modifier = Modifier.padding(16.dp)) {
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(64.dp)
                    .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(2.dp)),
            )
            Spacer(Modifier.size(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = event.title,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = dateFmt.format(startDate),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = if (event.allDay) "Sepanjang hari" else
                        "${timeFmt.format(startDate)} - ${timeFmt.format(endDate)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                if (!event.description.isNullOrBlank()) {
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = event.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Spacer(Modifier.height(10.dp))
                ReminderChip(event.effectiveOffsets)
            }
        }
    }
}

@Composable
private fun ReminderChip(offsets: List<Long>) {
    if (offsets.isEmpty()) return
    val sorted = offsets.distinct().sorted()
    val text = formatReminder(sorted.first()) +
        if (sorted.size > 1) " +${sorted.size - 1}" else ""
    Row(
        modifier = Modifier
            .border(
                width = 1.dp,
                color = MaterialTheme.colorScheme.outline,
                shape = CircleShape,
            )
            .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Filled.Notifications,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(12.dp),
        )
        Spacer(Modifier.size(6.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun formatReminder(minutes: Long): String = when (minutes) {
    0L -> "tepat waktu"
    in 1..59 -> "$minutes menit sebelum"
    in 60..1439 -> "${minutes / 60} jam sebelum"
    else -> "${minutes / 1440} hari sebelum"
}
