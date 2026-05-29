package id.raviarnan.mykalender

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import id.raviarnan.mykalender.alarm.AlarmRingingService

class MyKalenderApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        val alarmChannel = NotificationChannel(
            AlarmRingingService.CHANNEL_ID,
            getString(R.string.alarm_channel_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = getString(R.string.alarm_channel_description)
            setSound(null, null)
            enableVibration(false)
            setBypassDnd(true)
        }
        val previewChannel = NotificationChannel(
            id.raviarnan.mykalender.alarm.PreAlarmReceiver.CHANNEL_ID,
            getString(R.string.pre_alarm_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = getString(R.string.pre_alarm_channel_description)
        }
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(alarmChannel)
        nm.createNotificationChannel(previewChannel)
    }
}
