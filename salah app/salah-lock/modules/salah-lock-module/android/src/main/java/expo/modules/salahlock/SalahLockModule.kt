package expo.modules.salahlock

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.app.AppOpsManager
import android.net.Uri
import android.os.Build
import androidx.core.content.ContextCompat

class SalahLockModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SalahLock")

    Function("isUsageAccessPermissionGranted") {
      val context = appContext.reactContext ?: return@Function false
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        context.packageName
      )
      return@Function mode == AppOpsManager.MODE_ALLOWED
    }

    Function("isOverlayPermissionGranted") {
      val context = appContext.reactContext ?: return@Function false
      return@Function Settings.canDrawOverlays(context)
    }

    Function("getInstalledApps") {
      val context = appContext.reactContext ?: return@Function emptyList<Map<String, String>>()
      val pm = context.packageManager
      val packages = pm.getInstalledApplications(android.content.pm.PackageManager.GET_META_DATA)
      
      val appsList = packages.mapNotNull { appInfo ->
        val isSystem = (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0
        val isUpdatedSystem = (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
        
        if (!isSystem || isUpdatedSystem) {
          mapOf(
            "appName" to pm.getApplicationLabel(appInfo).toString(),
            "packageName" to appInfo.packageName
          )
        } else {
          null
        }
      }
      
      return@Function appsList.sortedBy { it["appName"]?.lowercase() }
    }

    Function("requestUsageAccessPermission") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      appContext.reactContext?.startActivity(intent)
    }

    Function("requestOverlayPermission") {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
      intent.data = Uri.parse("package:${appContext.reactContext?.packageName}")
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      appContext.reactContext?.startActivity(intent)
    }

    Function("startBlocking") { blockedApps: List<String>, durationMinutes: Int, prayerNames: List<String>, prayerTimes: List<String> ->
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(context, LockOverlayService::class.java).apply {
        putExtra("blockedApps", ArrayList(blockedApps))
        putExtra("durationMinutes", durationMinutes)
        putExtra("prayerNames", ArrayList(prayerNames))
        putExtra("prayerTimes", ArrayList(prayerTimes))
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ContextCompat.startForegroundService(context, intent)
      } else {
        context.startService(intent)
      }
    }

    Function("stopBlocking") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(context, LockOverlayService::class.java)
      context.stopService(intent)
    }
  }
}
