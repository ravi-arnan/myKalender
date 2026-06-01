package id.raviarnan.mykalender.alarm

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.content.getSystemService
import id.raviarnan.mykalender.R

/**
 * Foreground service that keeps the alarm ringing & vibrating until the user
 * dismisses it (or snoozes). Started by AlarmReceiver. The actual UI surface is
 * AlarmActivity; this service is what keeps the audio loop running even if the
 * activity is backgrounded.
 */
class AlarmRingingService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var wakeLock: PowerManager.WakeLock? = null

    // Events currently ringing in this one session, in arrival order. When two
    // events fire at the same time the service is started twice on the same
    // instance; we coalesce them into a single ring instead of starting a second
    // (orphaned) MediaPlayer, which is what caused doubled / overlapping audio.
    private val ringingEvents = LinkedHashMap<String, String>()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val eventId = intent?.getStringExtra(AlarmReceiver.EXTRA_EVENT_ID) ?: ""
        val title = intent?.getStringExtra(AlarmReceiver.EXTRA_TITLE) ?: ""
        val customUri = intent?.getStringExtra(AlarmReceiver.EXTRA_SOUND_URI)

        val alreadyRinging = mediaPlayer != null
        ringingEvents[eventId] = title

        // Only the first event in a session owns the audio/vibration/wake lock and
        // triggers the full-screen UI. Subsequent simultaneous events just refresh
        // the notification count (no second full-screen launch, no second sound).
        startInForeground(NOTIF_ID, buildNotification(withFullScreen = !alreadyRinging))
        if (!alreadyRinging) {
            acquireWakeLock()
            startRinging(customUri?.let { runCatching { Uri.parse(it) }.getOrNull() })
            startVibration()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        stopRinging()
        stopVibration()
        releaseWakeLock()
        ringingEvents.clear()
        super.onDestroy()
    }

    /** Event identity used by the full-screen activity (Snooze/Stop target). */
    private fun primaryEvent(): Map.Entry<String, String>? =
        ringingEvents.entries.firstOrNull()

    /** Notification/lock-screen text: first title, with "+N lainnya" if more. */
    private fun displayText(): String {
        val titles = ringingEvents.values.map { it.ifBlank { "Jadwal" } }
        val first = titles.firstOrNull() ?: "Jadwal"
        return if (titles.size > 1) "$first +${titles.size - 1} lainnya" else first
    }

    private fun buildNotification(withFullScreen: Boolean): Notification {
        val eventId = primaryEvent()?.key ?: ""
        val title = displayText()
        // Carry the event identity so AlarmActivity (launched via this
        // full-screen intent) shows the real title and Snooze targets the
        // right event — the receiver no longer starts the activity directly.
        val openAlarm = Intent(this, AlarmActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(AlarmReceiver.EXTRA_EVENT_ID, eventId)
            putExtra(AlarmReceiver.EXTRA_TITLE, title)
        }
        val pi = PendingIntent.getActivity(
            this, eventId.hashCode(), openAlarm,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(getString(R.string.alarm_ringing))
            .setContentText(title)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(pi)
            .apply { if (withFullScreen) setFullScreenIntent(pi, true) }
            .build()
    }

    private fun startInForeground(id: Int, notification: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(id, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(id, notification)
        }
    }

    private fun startRinging(customUri: Uri? = null) {
        val uri = customUri
            ?: RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_RINGTONE)
            ?: return

        mediaPlayer = MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            setDataSource(this@AlarmRingingService, uri)
            isLooping = true
            prepare()

            // Set volume to max on the alarm stream so DND-bypass actually rings loud.
            val audioManager = getSystemService<AudioManager>()
            val maxVol = audioManager?.getStreamMaxVolume(AudioManager.STREAM_ALARM) ?: 0
            if (maxVol > 0) {
                audioManager?.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0)
            }
            start()
        }
    }

    private fun stopRinging() {
        mediaPlayer?.runCatching { stop(); release() }
        mediaPlayer = null
    }

    private fun startVibration() {
        val v = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getSystemService<VibratorManager>()?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(VIBRATOR_SERVICE) as? Vibrator
        }
        vibrator = v
        val pattern = longArrayOf(0, 600, 400)
        v?.vibrate(VibrationEffect.createWaveform(pattern, 0))
    }

    private fun stopVibration() {
        vibrator?.cancel()
        vibrator = null
    }

    private fun acquireWakeLock() {
        val pm = getSystemService<PowerManager>() ?: return
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "myKalender:AlarmWakeLock",
        ).apply { acquire(WAKE_LOCK_TIMEOUT_MS) }
    }

    private fun releaseWakeLock() {
        wakeLock?.runCatching { if (isHeld) release() }
        wakeLock = null
    }

    companion object {
        const val CHANNEL_ID = "alarm_ringing"
        private const val NOTIF_ID = 4242
        private const val WAKE_LOCK_TIMEOUT_MS = 10 * 60 * 1000L
    }
}
