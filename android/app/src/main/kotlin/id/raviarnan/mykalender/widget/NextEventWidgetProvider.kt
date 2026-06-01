package id.raviarnan.mykalender.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import id.raviarnan.mykalender.MainActivity
import id.raviarnan.mykalender.R
import id.raviarnan.mykalender.data.Event
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Home-screen widget showing the next upcoming event plus a quick-add button.
 *
 * On each update it does a one-shot Firestore read for the soonest upcoming
 * event (skipping all-day holiday markers). Updates are driven by:
 *   - the system's 30-min [updatePeriodMillis] (keeps the countdown fresh),
 *   - [requestUpdate], called by the app whenever its event list changes.
 *
 * Tapping the body opens the app; tapping the "+" opens the add-event dialog.
 */
class NextEventWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        render(context, appWidgetManager, appWidgetIds)
    }

    private fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
        if (ids.isEmpty()) return

        val uid = FirebaseAuth.getInstance().currentUser?.uid
        if (uid == null) {
            val views = messageViews(context, context.getString(R.string.widget_signed_out))
            for (id in ids) manager.updateAppWidget(id, views)
            return
        }

        // Firestore is async; keep the broadcast alive until the read completes.
        val pendingResult = goAsync()
        FirebaseFirestore.getInstance()
            .collection("users")
            .document(uid)
            .collection("events")
            .whereGreaterThanOrEqualTo("start", Timestamp.now())
            .orderBy("start", Query.Direction.ASCENDING)
            .limit(5)
            .get()
            .addOnSuccessListener { snapshot ->
                val event = snapshot.documents
                    .mapNotNull { doc -> doc.toObject(Event::class.java)?.copy(id = doc.id) }
                    .firstOrNull { it.source != "gcal-holiday" }
                val views = if (event != null) {
                    eventViews(context, event)
                } else {
                    messageViews(context, context.getString(R.string.widget_empty))
                }
                for (id in ids) manager.updateAppWidget(id, views)
                pendingResult.finish()
            }
            .addOnFailureListener {
                val views = messageViews(context, context.getString(R.string.widget_empty))
                for (id in ids) manager.updateAppWidget(id, views)
                pendingResult.finish()
            }
    }

    private fun baseViews(context: Context): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_next_event)
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context))
        views.setOnClickPendingIntent(R.id.widget_add, addEventIntent(context))
        return views
    }

    private fun eventViews(context: Context, event: Event): RemoteViews {
        val views = baseViews(context)
        views.setViewVisibility(R.id.widget_content, View.VISIBLE)
        views.setViewVisibility(R.id.widget_empty, View.GONE)
        views.setTextViewText(
            R.id.widget_title,
            event.title.ifBlank { "(Tanpa judul)" },
        )
        views.setTextViewText(R.id.widget_countdown, formatWhen(event))
        return views
    }

    private fun messageViews(context: Context, message: String): RemoteViews {
        val views = baseViews(context)
        views.setViewVisibility(R.id.widget_content, View.GONE)
        views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
        views.setTextViewText(R.id.widget_empty, message)
        return views
    }

    private fun openAppIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        return PendingIntent.getActivity(
            context,
            REQUEST_OPEN,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }

    private fun addEventIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = MainActivity.ACTION_ADD_EVENT
            putExtra(MainActivity.EXTRA_OPEN_ADD_EVENT, true)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        return PendingIntent.getActivity(
            context,
            REQUEST_ADD,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }

    /** Human-readable "when" line: date label + time + relative countdown. */
    private fun formatWhen(event: Event): String {
        val zone = ZoneId.systemDefault()
        val startMs = event.start.toDate().time
        val startDateTime = Instant.ofEpochMilli(startMs).atZone(zone)
        val today = LocalDate.now(zone)
        val startDate = startDateTime.toLocalDate()

        val dateLabel = when (val days = today.until(startDate).days) {
            0 -> "Hari ini"
            1 -> "Besok"
            else -> if (days in 2..6) {
                startDateTime.format(DAY_FMT)
            } else {
                startDateTime.format(DATE_FMT)
            }
        }

        if (event.allDay) return "$dateLabel · Seharian"

        val time = startDateTime.format(TIME_FMT)
        val relative = relativeText(startMs - System.currentTimeMillis())
        return if (relative != null) "$dateLabel $time · $relative" else "$dateLabel $time"
    }

    private fun relativeText(diffMs: Long): String? {
        if (diffMs < 0) return "sekarang"
        val minutes = diffMs / 60_000L
        return when {
            minutes < 1 -> "sebentar lagi"
            minutes < 60 -> "$minutes menit lagi"
            minutes < 60 * 24 -> "${minutes / 60} jam lagi"
            minutes < 60 * 24 * 7 -> "${minutes / (60 * 24)} hari lagi"
            else -> null
        }
    }

    companion object {
        private const val REQUEST_OPEN = 0
        private const val REQUEST_ADD = 1

        private val ID_LOCALE = Locale("id", "ID")
        private val TIME_FMT = DateTimeFormatter.ofPattern("HH:mm", ID_LOCALE)
        private val DAY_FMT = DateTimeFormatter.ofPattern("EEEE", ID_LOCALE)
        private val DATE_FMT = DateTimeFormatter.ofPattern("EEE, d MMM", ID_LOCALE)

        /**
         * Asks every placed instance of this widget to refresh. Cheap no-op when
         * no widget is on the home screen. Call when the event list changes.
         */
        fun requestUpdate(context: Context) {
            val manager = AppWidgetManager.getInstance(context) ?: return
            val component = ComponentName(context, NextEventWidgetProvider::class.java)
            val ids = manager.getAppWidgetIds(component)
            if (ids.isEmpty()) return
            val intent = Intent(context, NextEventWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            context.sendBroadcast(intent)
        }
    }
}
