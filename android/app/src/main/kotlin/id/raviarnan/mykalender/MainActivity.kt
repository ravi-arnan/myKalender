package id.raviarnan.mykalender

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import id.raviarnan.mykalender.data.Event
import id.raviarnan.mykalender.permissions.PermissionsSheet
import id.raviarnan.mykalender.permissions.rememberPermissionItems
import id.raviarnan.mykalender.ui.screens.AccountsScreen
import id.raviarnan.mykalender.ui.screens.EventDialog
import id.raviarnan.mykalender.ui.screens.EventsScreen
import id.raviarnan.mykalender.ui.screens.SettingsScreen
import id.raviarnan.mykalender.ui.screens.SignInScreen
import androidx.compose.runtime.collectAsState
import id.raviarnan.mykalender.ui.theme.MyKalenderTheme
import id.raviarnan.mykalender.ui.theme.ThemeManager
import id.raviarnan.mykalender.ui.theme.ThemePreference

private enum class Tab(val label: String, val icon: ImageVector) {
    Events("Kalender", Icons.Outlined.CalendarMonth),
    Accounts("Akun", Icons.Outlined.Link),
    Settings("Pengaturan", Icons.Outlined.Settings),
}

class MainActivity : ComponentActivity() {

    private val requestNotificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* state re-checked on next composition */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        val themeManager = ThemeManager(this)
        setContent {
            val preference by themeManager.observe()
                .collectAsState(initial = themeManager.get())
            MyKalenderTheme(preference = preference) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppRoot(themeManager = themeManager)
                }
            }
        }
    }
}

@Composable
private fun AppRoot(
    themeManager: ThemeManager,
    viewModel: AppViewModel = viewModel(),
) {
    val context = LocalContext.current
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    var permissionsRefreshKey by remember { mutableStateOf(0) }
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) permissionsRefreshKey++
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    var showPermissionsSheet by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Event?>(null) }
    var showEventDialog by remember { mutableStateOf(false) }
    var currentTab by remember { mutableStateOf(Tab.Events) }

    // Pull theme preference from Firestore the first time we see a signed-in
    // user, so a preference picked on the web shows up here too.
    val currentUid = state.user?.uid
    LaunchedEffect(currentUid) {
        if (currentUid != null) themeManager.hydrateFromFirestore()
    }

    val permissions = rememberPermissionItems(refreshKey = permissionsRefreshKey)
    val pendingCount = permissions.count { !it.isGranted && !it.manualSetup }

    val prefs = remember {
        context.getSharedPreferences("mykalender_prefs", Context.MODE_PRIVATE)
    }

    val user = state.user

    // On first launch after sign-in, auto-show permissions sheet so a new user
    // is guided through the setup. After dismissing once we never re-prompt.
    LaunchedEffect(user?.uid, pendingCount) {
        val uid = user?.uid ?: return@LaunchedEffect
        val key = "onboarded_$uid"
        if (!prefs.getBoolean(key, false) && pendingCount > 0) {
            showPermissionsSheet = true
            prefs.edit().putBoolean(key, true).apply()
        }
    }
    if (user == null) {
        SignInScreen(
            signingIn = state.signingIn,
            error = state.error,
            onSignIn = { viewModel.signIn(context) },
        )
        return
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = currentTab == tab,
                        onClick = { currentTab = tab },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(tab.label) },
                        colors = NavigationBarItemDefaults.colors(),
                    )
                }
            }
        },
        floatingActionButton = {
            if (currentTab == Tab.Events) {
                androidx.compose.material3.FloatingActionButton(
                    onClick = {
                        editing = null
                        showEventDialog = true
                    },
                    containerColor = androidx.compose.material3.MaterialTheme.colorScheme.primary,
                    contentColor = androidx.compose.material3.MaterialTheme.colorScheme.onPrimary,
                ) {
                    Icon(
                        Icons.Filled.Add,
                        contentDescription = "Tambah jadwal",
                    )
                }
            }
        },
    ) { innerPadding ->
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            when (currentTab) {
                Tab.Events -> EventsScreen(
                    userEmail = user.email,
                    events = state.events,
                    pendingPermissionsCount = pendingCount,
                    onOpenPermissionsSheet = { showPermissionsSheet = true },
                    onRefresh = { permissionsRefreshKey++ },
                    onEditEvent = { event ->
                        editing = event
                        showEventDialog = true
                    },
                )

                Tab.Accounts -> AccountsScreen(
                    userEmail = user.email,
                    userName = user.displayName,
                )

                Tab.Settings -> SettingsScreen(
                    themeManager = themeManager,
                    onSignOut = { viewModel.signOut(context) },
                )
            }
        }
    }

    if (showPermissionsSheet) {
        PermissionsSheet(
            permissions = permissions,
            onRefresh = { permissionsRefreshKey++ },
            onDismiss = { showPermissionsSheet = false },
        )
    }
    if (showEventDialog) {
        EventDialog(
            existing = editing,
            onDismiss = { showEventDialog = false },
            onSave = { input ->
                viewModel.saveEvent(editing, input) {
                    showEventDialog = false
                    editing = null
                }
            },
            onDelete = editing?.let { ev ->
                {
                    viewModel.deleteEvent(ev.id) {
                        showEventDialog = false
                        editing = null
                    }
                }
            },
        )
    }
}
