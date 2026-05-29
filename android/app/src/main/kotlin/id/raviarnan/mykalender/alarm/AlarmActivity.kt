package id.raviarnan.mykalender.alarm

import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.raviarnan.mykalender.R

/**
 * Full-screen alarm UI that shows on the lockscreen with the screen turned on.
 * Sound + vibration are owned by AlarmRingingService — this activity just shows
 * the Stop / Snooze buttons.
 */
class AlarmActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        val title = intent.getStringExtra(AlarmReceiver.EXTRA_TITLE) ?: ""
        val eventId = intent.getStringExtra(AlarmReceiver.EXTRA_EVENT_ID) ?: ""
        setContent {
            MaterialTheme {
                AlarmContent(
                    title = title,
                    onDismiss = { dismiss() },
                    onSnooze = { snooze(eventId, title) },
                )
            }
        }
    }

    private fun dismiss() {
        stopService(Intent(this, AlarmRingingService::class.java))
        finishAndRemoveTask()
    }

    private fun snooze(eventId: String, title: String) {
        if (eventId.isNotEmpty()) {
            AlarmScheduler(this).snooze(eventId, title, SNOOZE_MINUTES)
        }
        stopService(Intent(this, AlarmRingingService::class.java))
        finishAndRemoveTask()
    }

    companion object {
        private const val SNOOZE_MINUTES = 5L
    }
}

@Composable
private fun AlarmContent(
    title: String,
    onDismiss: () -> Unit,
    onSnooze: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF101010))
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Spacer(Modifier.height(48.dp))

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Filled.NotificationsActive,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(72.dp),
            )
            Spacer(Modifier.height(24.dp))
            Text(
                text = stringResource(R.string.alarm_ringing),
                color = Color(0xFFA1A1AA),
                fontSize = 14.sp,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = title.ifEmpty { "Jadwal" },
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }

        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Button(
                onClick = onDismiss,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = Color.Black,
                ),
            ) {
                Text(
                    text = stringResource(R.string.dismiss),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(vertical = 8.dp),
                )
            }
            OutlinedButton(
                onClick = onSnooze,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                shape = CircleShape,
            ) {
                Text(
                    text = stringResource(R.string.snooze_5min),
                    color = Color.White,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(vertical = 6.dp),
                )
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun stringResource(@androidx.annotation.StringRes id: Int): String =
    androidx.compose.ui.res.stringResource(id)
