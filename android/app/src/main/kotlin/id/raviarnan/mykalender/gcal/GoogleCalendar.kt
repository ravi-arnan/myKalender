package id.raviarnan.mykalender.gcal

import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.Scope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.time.format.DateTimeFormatter

/**
 * Talks to the Google Calendar REST API the same way the web (gcal-sync.ts)
 * does: read-only access to the user's primary calendar. Account picking and
 * OAuth consent happen through GoogleSignIn (account picker) + GoogleAuthUtil
 * (bearer token); this object only knows the scopes and the REST shape.
 */
object GoogleCalendar {

    const val CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"

    /** Scope string GoogleAuthUtil.getToken expects to mint a bearer token. */
    const val TOKEN_SCOPE = "oauth2:$CALENDAR_SCOPE"

    private const val API_BASE = "https://www.googleapis.com/calendar/v3"

    fun signInOptions(): GoogleSignInOptions =
        GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestScopes(Scope(CALENDAR_SCOPE))
            .build()

    data class TimeField(val dateTime: String?, val date: String?)

    data class RawEvent(
        val id: String,
        val summary: String?,
        val description: String?,
        val status: String?,
        val start: TimeField?,
        val end: TimeField?,
    )

    /**
     * Fetches all events on the primary calendar from now up to [daysAhead] days,
     * following pagination. Runs on the IO dispatcher.
     */
    suspend fun fetchPrimaryEvents(token: String, daysAhead: Int): List<RawEvent> =
        withContext(Dispatchers.IO) {
            val now = Instant.now()
            val max = now.plus(daysAhead.toLong(), ChronoUnit.DAYS)
            val timeMin = DateTimeFormatter.ISO_INSTANT.format(now)
            val timeMax = DateTimeFormatter.ISO_INSTANT.format(max)

            val all = mutableListOf<RawEvent>()
            var pageToken: String? = null
            do {
                val url = buildString {
                    append("$API_BASE/calendars/primary/events?")
                    append("timeMin=").append(enc(timeMin))
                    append("&timeMax=").append(enc(timeMax))
                    append("&singleEvents=true&orderBy=startTime&maxResults=250")
                    pageToken?.let { append("&pageToken=").append(enc(it)) }
                }
                val json = getJson(url, token)
                val items = json.optJSONArray("items")
                if (items != null) {
                    for (i in 0 until items.length()) {
                        all.add(parseEvent(items.getJSONObject(i)))
                    }
                }
                pageToken = if (json.has("nextPageToken")) json.getString("nextPageToken") else null
            } while (pageToken != null)
            all
        }

    private fun getJson(url: String, token: String): JSONObject {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            setRequestProperty("Authorization", "Bearer $token")
            connectTimeout = 15_000
            readTimeout = 20_000
        }
        try {
            val code = conn.responseCode
            if (code !in 200..299) {
                throw IOException("Google Calendar API error: $code")
            }
            return JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
        } finally {
            conn.disconnect()
        }
    }

    private fun parseEvent(o: JSONObject): RawEvent = RawEvent(
        id = o.optString("id"),
        summary = o.optString("summary").ifBlank { null },
        description = o.optString("description").ifBlank { null },
        status = o.optString("status").ifBlank { null },
        start = parseTimeField(o.optJSONObject("start")),
        end = parseTimeField(o.optJSONObject("end")),
    )

    private fun parseTimeField(o: JSONObject?): TimeField? {
        if (o == null) return null
        return TimeField(
            dateTime = o.optString("dateTime").ifBlank { null },
            date = o.optString("date").ifBlank { null },
        )
    }

    private fun enc(value: String): String = URLEncoder.encode(value, "UTF-8")
}
