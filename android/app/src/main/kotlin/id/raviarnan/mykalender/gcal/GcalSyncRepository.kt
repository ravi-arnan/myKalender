package id.raviarnan.mykalender.gcal

import androidx.core.text.HtmlCompat
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.util.Date

/**
 * Imports Google Calendar events for one account into /users/{uid}/events,
 * mirroring the web's syncCalendarForAccount (gcal-sync.ts): deterministic doc
 * id "gcal_{email}_{eventId}" so re-syncing updates instead of duplicating, and
 * source="gcal" + accountEmail so disconnect can clean up later.
 */
class GcalSyncRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
) {

    data class SyncResult(val imported: Int, val skipped: Int)

    suspend fun syncAccount(
        uid: String,
        accessToken: String,
        accountEmail: String,
        daysAhead: Int,
    ): SyncResult {
        val email = accountEmail.lowercase()
        val raw = GoogleCalendar.fetchPrimaryEvents(accessToken, daysAhead)
        val eventsCol = firestore.collection("users").document(uid).collection("events")

        var imported = 0
        var skipped = 0
        var batch = firestore.batch()
        var ops = 0

        for (ev in raw) {
            if (ev.status == "cancelled") {
                skipped++
                continue
            }
            val start = toTimestamp(ev.start)
            val end = toTimestamp(ev.end)
            if (start == null || end == null) {
                skipped++
                continue
            }
            val docId = "gcal_${email}_${ev.id}"
            val data = mapOf(
                "title" to (ev.summary?.trim()?.ifBlank { null } ?: "(tanpa judul)"),
                "description" to htmlToPlainText(ev.description),
                "start" to start.ts,
                "end" to end.ts,
                "allDay" to start.allDay,
                "reminderOffsetMinutes" to 20L,
                "source" to "gcal",
                "gcalEventId" to ev.id,
                "accountEmail" to email,
                "updatedAt" to FieldValue.serverTimestamp(),
            )
            batch.set(eventsCol.document(docId), data, SetOptions.merge())
            ops++
            imported++
            if (ops >= BATCH_LIMIT) {
                batch.commit().await()
                batch = firestore.batch()
                ops = 0
            }
        }
        if (ops > 0) batch.commit().await()

        return SyncResult(imported, skipped)
    }

    /**
     * Google Calendar descriptions can contain HTML (<p>, <strong>, <br>,
     * entities like &amp;). Convert to plain text only when it actually looks
     * like HTML, so plain-text descriptions with real line breaks are kept.
     */
    private fun htmlToPlainText(raw: String?): String? {
        val trimmed = raw?.trim()?.ifEmpty { null } ?: return null
        if (!HTML_LIKE.containsMatchIn(trimmed)) return trimmed
        val text = HtmlCompat.fromHtml(trimmed, HtmlCompat.FROM_HTML_MODE_COMPACT)
            .toString()
            .replace(Regex("[ \t]+\n"), "\n")
            .replace(Regex("\n{3,}"), "\n\n")
            .trim()
        return text.ifEmpty { null }
    }

    private data class TsAllDay(val ts: Timestamp, val allDay: Boolean)

    private fun toTimestamp(field: GoogleCalendar.TimeField?): TsAllDay? {
        if (field == null) return null
        field.dateTime?.let {
            val instant = OffsetDateTime.parse(it).toInstant()
            return TsAllDay(Timestamp(Date.from(instant)), false)
        }
        field.date?.let {
            // All-day: anchor at local midnight, same as the web (`${date}T00:00:00`).
            val instant = LocalDate.parse(it).atStartOfDay(ZoneId.systemDefault()).toInstant()
            return TsAllDay(Timestamp(Date.from(instant)), true)
        }
        return null
    }

    companion object {
        private const val BATCH_LIMIT = 450
        private val HTML_LIKE = Regex("<[a-z/!][^>]*>|&[a-z#0-9]+;", RegexOption.IGNORE_CASE)
    }
}
