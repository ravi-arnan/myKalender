package id.raviarnan.mykalender.alarm

import java.util.Calendar
import java.util.Date

object RecurrenceHelper {

    /** Matches the web RecurrencePreset string union. */
    const val NONE = "none"
    const val DAILY = "daily"
    const val WEEKDAYS = "weekdays"
    const val WEEKLY = "weekly"
    const val MONTHLY = "monthly"

    /**
     * Walks the recurrence rule forward from [originalStart] until the result
     * is strictly after [from]. Returns null for non-recurring events.
     */
    fun nextOccurrenceStart(
        originalStart: Date,
        recurrence: String?,
        from: Date = Date(),
    ): Date? {
        if (recurrence.isNullOrBlank() || recurrence == NONE) return null

        val cal = Calendar.getInstance().apply { time = originalStart }
        var loopGuard = 0
        val cap = 365 * 5  // safety: never look more than 5 years ahead

        while (!cal.time.after(from)) {
            when (recurrence) {
                DAILY -> cal.add(Calendar.DAY_OF_MONTH, 1)
                WEEKLY -> cal.add(Calendar.WEEK_OF_YEAR, 1)
                MONTHLY -> cal.add(Calendar.MONTH, 1)
                WEEKDAYS -> {
                    do {
                        cal.add(Calendar.DAY_OF_MONTH, 1)
                    } while (
                        cal.get(Calendar.DAY_OF_WEEK) == Calendar.SATURDAY ||
                        cal.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY
                    )
                }
                else -> return null
            }
            loopGuard += 1
            if (loopGuard > cap) return null
        }
        return cal.time
    }
}
