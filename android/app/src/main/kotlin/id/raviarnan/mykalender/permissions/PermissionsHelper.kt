package id.raviarnan.mykalender.permissions

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.core.content.getSystemService

/**
 * Detects + opens settings pages for permissions and OEM-specific knobs that
 * affect alarm reliability. MIUI gets first-class treatment because Redmi
 * devices are the most common target with the worst defaults.
 */
object PermissionsHelper {

    fun isMiui(): Boolean {
        val mfr = Build.MANUFACTURER.lowercase()
        if (mfr == "xiaomi" || mfr == "redmi" || mfr == "poco") return true
        return !getSystemProperty("ro.miui.ui.version.name").isNullOrBlank()
    }

    fun hasNotificationPermission(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun canScheduleExactAlarms(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val am: AlarmManager = context.getSystemService() ?: return false
        return am.canScheduleExactAlarms()
    }

    fun isIgnoringBatteryOptimizations(context: Context): Boolean {
        val pm: PowerManager = context.getSystemService() ?: return false
        return pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    /**
     * True if our alarm channel has importance >= HIGH (Android "Urgent" /
     * heads-up). DND-bypass is encouraged but not required — it only matters
     * when the user has Do Not Disturb actively on at alarm time, and on MIUI
     * the toggle is often buried, so we don't gate the indicator on it.
     */
    fun isAlarmChannelUrgent(context: Context, channelId: String): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
        val nm: NotificationManager = context.getSystemService() ?: return false
        val channel = nm.getNotificationChannel(channelId) ?: return false
        return channel.importance >= NotificationManager.IMPORTANCE_HIGH
    }

    fun openExactAlarmSettings(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        runCatching {
            context.startActivity(
                Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
        }.onFailure { openAppDetails(context) }
    }

    @SuppressLint("BatteryLife")
    fun openBatteryOptimizationSettings(context: Context) {
        runCatching {
            context.startActivity(
                Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
        }.onFailure { openAppDetails(context) }
    }

    /**
     * MIUI: opens "Other permissions" page for our package, which includes
     * "Display pop-up while running in background", "Show on Lock screen", and
     * "Start in background" — the trio that decides whether our alarms survive.
     */
    fun openMiuiOtherPermissions(context: Context): Boolean {
        val attempts = listOf(
            Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                setClassName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.permissions.PermissionsEditorActivity",
                )
                putExtra("extra_pkgname", context.packageName)
            },
            Intent().apply {
                component = ComponentName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.permissions.AppPermissionsEditorActivity",
                )
                putExtra("extra_pkgname", context.packageName)
            },
        )
        for (intent in attempts) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            runCatching { context.startActivity(intent); return true }
        }
        openAppDetails(context)
        return false
    }

    fun openMiuiAutostart(context: Context): Boolean {
        val intent = Intent().apply {
            component = ComponentName(
                "com.miui.securitycenter",
                "com.miui.permcenter.autostart.AutoStartManagementActivity",
            )
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return runCatching { context.startActivity(intent); true }
            .getOrElse { openAppDetails(context); false }
    }

    fun openAppDetails(context: Context) {
        context.startActivity(
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        )
    }

    fun openNotificationChannelSettings(context: Context, channelId: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            runCatching {
                context.startActivity(
                    Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).apply {
                        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                        putExtra(Settings.EXTRA_CHANNEL_ID, channelId)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                )
                return
            }
        }
        openAppDetails(context)
    }

    private fun getSystemProperty(key: String): String? {
        return runCatching {
            @SuppressLint("PrivateApi")
            val cls = Class.forName("android.os.SystemProperties")
            val get = cls.getMethod("get", String::class.java)
            get.invoke(null, key) as? String
        }.getOrNull()
    }
}
