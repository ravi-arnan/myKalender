package id.raviarnan.mykalender.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Ink,
    onPrimary = Canvas,
    secondary = Body,
    background = Canvas,
    onBackground = Ink,
    surface = Canvas,
    onSurface = Ink,
    surfaceVariant = SurfaceCard,
    onSurfaceVariant = Muted,
    outline = Hairline,
    outlineVariant = Hairline,
)

private val DarkColors = darkColorScheme(
    primary = Canvas,
    onPrimary = Ink,
    secondary = Muted,
    background = SurfaceDark,
    onBackground = Canvas,
    surface = SurfaceDark,
    onSurface = Canvas,
    surfaceVariant = Color(0xFF1A1A1A),
    onSurfaceVariant = Color(0xFFA1A1AA),
    outline = Color(0xFF27272A),
    outlineVariant = Color(0xFF27272A),
)

@Composable
fun MyKalenderTheme(
    preference: ThemePreference = ThemePreference.System,
    content: @Composable () -> Unit,
) {
    val darkTheme = when (preference) {
        ThemePreference.Light -> false
        ThemePreference.Dark -> true
        ThemePreference.System -> isSystemInDarkTheme()
    }
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colorScheme,
        typography = MyKalenderTypography,
        content = content,
    )
}
