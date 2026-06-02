package id.raviarnan.mykalender.update

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import id.raviarnan.mykalender.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/** A newer release found on GitHub. */
data class UpdateInfo(
    val versionName: String,
    val notes: String,
    val apkUrl: String,
)

/**
 * Self-update for the sideloaded APK (it isn't on Play Store, so the Play
 * In-App Update API can't be used). Checks the repo's latest GitHub release,
 * compares its tag against the installed version, then downloads + launches the
 * system installer. The final install still needs one user tap — unavoidable
 * for sideloaded apps without device-owner privileges.
 */
object AppUpdater {

    private const val LATEST_RELEASE_URL =
        "https://api.github.com/repos/ravi-arnan/myKalender/releases/latest"

    /**
     * Returns the latest release if it's newer than the installed version, or
     * null if already up to date. Throws on network/parse errors.
     */
    suspend fun check(): UpdateInfo? = withContext(Dispatchers.IO) {
        val json = httpGet(LATEST_RELEASE_URL)
        val obj = JSONObject(json)
        val tag = obj.optString("tag_name").trim()
        val notes = obj.optString("body").trim()
        val assets = obj.optJSONArray("assets")
        var apkUrl: String? = null
        if (assets != null) {
            for (i in 0 until assets.length()) {
                val a = assets.getJSONObject(i)
                if (a.optString("name").endsWith(".apk", ignoreCase = true)) {
                    apkUrl = a.optString("browser_download_url")
                    break
                }
            }
        }
        val remote = tag.removePrefix("v").trim()
        if (apkUrl.isNullOrBlank() || remote.isBlank()) return@withContext null
        if (!isNewer(remote, BuildConfig.VERSION_NAME)) return@withContext null
        UpdateInfo(versionName = remote, notes = notes, apkUrl = apkUrl)
    }

    /**
     * Downloads the APK to app-specific external storage, reporting progress in
     * 0f..1f (or -1f when the total size is unknown). Returns the saved file.
     */
    suspend fun download(
        context: Context,
        url: String,
        onProgress: (Float) -> Unit,
    ): File = withContext(Dispatchers.IO) {
        val dir = File(context.getExternalFilesDir(null), "updates").apply { mkdirs() }
        val out = File(dir, "update.apk")
        if (out.exists()) out.delete()

        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            instanceFollowRedirects = true
            connectTimeout = 30_000
            readTimeout = 30_000
            setRequestProperty("User-Agent", "myKalender")
        }
        conn.connect()
        val total = conn.contentLength.toLong() // -1 if unknown
        conn.inputStream.use { input ->
            out.outputStream().use { output ->
                val buf = ByteArray(64 * 1024)
                var read: Int
                var downloaded = 0L
                while (input.read(buf).also { read = it } != -1) {
                    output.write(buf, 0, read)
                    downloaded += read
                    onProgress(if (total > 0) downloaded.toFloat() / total else -1f)
                }
            }
        }
        conn.disconnect()
        out
    }

    /** Launches the system package installer for the downloaded APK. */
    fun install(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file,
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    private fun httpGet(url: String): String {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            instanceFollowRedirects = true
            connectTimeout = 20_000
            readTimeout = 20_000
            setRequestProperty("User-Agent", "myKalender")
            setRequestProperty("Accept", "application/vnd.github+json")
        }
        try {
            if (conn.responseCode !in 200..299) {
                throw RuntimeException("HTTP ${conn.responseCode}")
            }
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }

    /** True if version string [a] is greater than [b] (dot-separated numbers). */
    private fun isNewer(a: String, b: String): Boolean {
        val pa = a.split(".").map { it.toIntOrNull() ?: 0 }
        val pb = b.split(".").map { it.toIntOrNull() ?: 0 }
        val n = maxOf(pa.size, pb.size)
        for (i in 0 until n) {
            val x = pa.getOrElse(i) { 0 }
            val y = pb.getOrElse(i) { 0 }
            if (x != y) return x > y
        }
        return false
    }
}
