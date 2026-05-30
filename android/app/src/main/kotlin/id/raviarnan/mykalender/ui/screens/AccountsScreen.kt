package id.raviarnan.mykalender.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.android.gms.auth.api.signin.GoogleSignIn
import id.raviarnan.mykalender.AccountsViewModel
import id.raviarnan.mykalender.data.ConnectedAccount
import id.raviarnan.mykalender.gcal.GoogleCalendar
import java.text.SimpleDateFormat
import java.util.Locale

@Composable
fun AccountsScreen(
    uid: String,
    userEmail: String?,
    userName: String?,
    viewModel: AccountsViewModel = viewModel(),
) {
    val context = LocalContext.current
    LaunchedEffect(uid) { viewModel.start(uid) }
    val state by viewModel.ui.collectAsStateWithLifecycle()

    val signInClient = remember { GoogleSignIn.getClient(context, GoogleCalendar.signInOptions()) }
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        viewModel.onAddAccountResult(result.data)
    }

    var pendingDisconnect by remember { mutableStateOf<ConnectedAccount?>(null) }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Akun terhubung",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Text(
                text = "Sambungkan beberapa akun Google supaya jadwal dari semua kalendermu jadi satu tampilan.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            state.message?.let { msg -> MessageBanner(msg.ok, msg.text) }

            SectionTitle("Akun utama")
            PrimaryAccountCard(userEmail = userEmail, userName = userName)

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SectionTitle("Akun tambahan")
                Spacer(Modifier.weight(1f))
                if (state.adding) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                    )
                }
            }

            OutlinedButton(
                onClick = {
                    viewModel.clearMessage()
                    // GoogleSignIn caches the last-used account and would silently
                    // return it (skipping the picker), so sign out first to force
                    // the account chooser every time and allow picking any account.
                    signInClient.signOut().addOnCompleteListener {
                        launcher.launch(signInClient.signInIntent)
                    }
                },
                enabled = !state.adding,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            ) {
                Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.size(8.dp))
                Text(
                    "Sambungkan akun Google lain",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }

            if (state.accounts.isEmpty()) {
                Text(
                    text = "Belum ada akun tambahan. Tap tombol di atas untuk sambungkan kalendar dari akun Google lain.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF898989),
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    state.accounts.forEach { account ->
                        ConnectedAccountCard(
                            account = account,
                            busy = state.busyEmail == account.email,
                            onSync = { viewModel.syncAccount(account) },
                            onDisconnect = { pendingDisconnect = account },
                        )
                    }
                }
            }

            Text(
                text = "Tiap sync, kamu pilih akun Google di pop-up. Token akses tidak disimpan permanen — " +
                    "hanya email, nama, dan foto yang tersimpan. Putus koneksi akan hapus semua jadwal " +
                    "yang di-import dari akun itu.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(48.dp))
        }
    }

    pendingDisconnect?.let { account ->
        AlertDialog(
            onDismissRequest = { pendingDisconnect = null },
            title = { Text("Putus koneksi?") },
            text = {
                Text("Putus koneksi ${account.email}? Semua jadwal yang di-import dari akun ini akan dihapus.")
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.disconnect(account)
                    pendingDisconnect = null
                }) {
                    Text("Putus", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingDisconnect = null }) { Text("Batal") }
            },
        )
    }
}

@Composable
private fun MessageBanner(ok: Boolean, text: String) {
    val bg = if (ok) Color(0xFFD1FAE5) else Color(0xFFFEE2E2)
    val fg = if (ok) Color(0xFF065F46) else Color(0xFF991B1B)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(bg, RoundedCornerShape(8.dp))
            .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Text(text = text, style = MaterialTheme.typography.bodySmall, color = fg)
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontWeight = FontWeight.SemiBold,
    )
}

@Composable
private fun PrimaryAccountCard(userEmail: String?, userName: String?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Avatar((userName ?: userEmail ?: "?").first().uppercaseChar().toString())
            Spacer(Modifier.size(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = userName ?: userEmail ?: "",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                if (userEmail != null && userName != null) {
                    Text(
                        text = userEmail,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            UtamaBadge()
        }
    }
}

@Composable
private fun ConnectedAccountCard(
    account: ConnectedAccount,
    busy: Boolean,
    onSync: () -> Unit,
    onDisconnect: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val label = account.name?.takeIf { it.isNotBlank() } ?: account.email
            Avatar((label.ifBlank { "?" }).first().uppercaseChar().toString())
            Spacer(Modifier.size(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    text = account.email + (account.lastSyncedAt?.let {
                        " · sync " + SYNC_FMT.format(it.toDate())
                    } ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (busy) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                )
            } else {
                IconButton(onClick = onSync) {
                    Icon(
                        Icons.Filled.Refresh,
                        contentDescription = "Sync sekarang",
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = onDisconnect) {
                    Icon(
                        Icons.Filled.Delete,
                        contentDescription = "Putus koneksi",
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
    }
}

@Composable
private fun Avatar(initial: String) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .background(MaterialTheme.colorScheme.primary, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initial,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onPrimary,
        )
    }
}

@Composable
private fun UtamaBadge() {
    Row(
        modifier = Modifier
            .background(Color(0xFFD1FAE5), CircleShape)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Filled.Check,
            contentDescription = null,
            tint = Color(0xFF065F46),
            modifier = Modifier.size(10.dp),
        )
        Spacer(Modifier.size(4.dp))
        Text(
            text = "Utama",
            style = MaterialTheme.typography.labelSmall,
            color = Color(0xFF065F46),
            fontWeight = FontWeight.SemiBold,
        )
    }
}

private val SYNC_FMT = SimpleDateFormat("d MMM, HH:mm", Locale("id"))
