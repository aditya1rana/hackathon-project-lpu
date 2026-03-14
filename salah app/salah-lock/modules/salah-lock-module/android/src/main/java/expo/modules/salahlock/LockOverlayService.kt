package expo.modules.salahlock

import android.app.Service
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.Context
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.app.usage.UsageStatsManager
import android.app.usage.UsageEvents
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.media.AudioAttributes
import android.media.AudioManager
import android.view.WindowManager
import android.view.Gravity
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Button
import java.util.Calendar

class LockOverlayService : Service() {
    companion object {
        const val CHANNEL_ID = "salahlock_blocking"
        const val ALARM_CHANNEL_ID = "salahlock_alarm"
        const val NOTIFICATION_ID = 101
        const val ALARM_NOTIFICATION_ID = 102
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var handler: Handler? = null
    private var blockedPackages: List<String> = emptyList()
    private var prayerTimesMap: Map<String, String> = emptyMap() // "Fajr" -> "05:30"
    private var durationMinutes: Int = 20
    private var isOverlayVisible = false
    private var mediaPlayer: MediaPlayer? = null
    private var currentBlockingPrayer: String? = null
    private var alarmPlayedForPrayers: MutableSet<String> = mutableSetOf()
    private var lastCheckedMinute: Int = -1

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        blockedPackages = intent?.getStringArrayListExtra("blockedApps") ?: blockedPackages
        durationMinutes = intent?.getIntExtra("durationMinutes", 20) ?: 20

        // Parse prayer times if provided
        val prayerTimesStr = intent?.getStringArrayListExtra("prayerTimes")
        val prayerNamesStr = intent?.getStringArrayListExtra("prayerNames")
        if (prayerTimesStr != null && prayerNamesStr != null) {
            val map = mutableMapOf<String, String>()
            for (i in prayerNamesStr.indices) {
                if (i < prayerTimesStr.size) {
                    map[prayerNamesStr[i]] = prayerTimesStr[i]
                }
            }
            prayerTimesMap = map
        }

        // Start as foreground service
        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)

        startMonitoring()
        return START_STICKY
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Regular blocking channel
            val blockChannel = NotificationChannel(
                CHANNEL_ID,
                "SalahLock App Blocking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps app blocking active during prayer time"
                setShowBadge(false)
            }

            // High-priority alarm channel
            val alarmChannel = NotificationChannel(
                ALARM_CHANNEL_ID,
                "Prayer Time Alarm",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Loud alarm when prayer time arrives"
                enableLights(true)
                lightColor = Color.GREEN
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
                setBypassDnd(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                // Set alarm sound
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(blockChannel)
            manager?.createNotificationChannel(alarmChannel)
        }
    }

    private fun buildNotification(): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        val statusText = if (currentBlockingPrayer != null) {
            "Blocking apps — $currentBlockingPrayer prayer time"
        } else {
            "Monitoring prayer times"
        }

        return builder
            .setContentTitle("🕌 SalahLock Active")
            .setContentText(statusText)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .build()
    }

    private fun startMonitoring() {
        handler?.removeCallbacksAndMessages(null)
        handler = Handler(Looper.getMainLooper())
        handler?.post(object : Runnable {
            override fun run() {
                checkPrayerTimeAndBlock()
                handler?.postDelayed(this, 500)
            }
        })
    }

    /**
     * Main loop: checks if we're within a prayer time window,
     * starts/stops blocking, plays alarm, and sends notification.
     */
    private fun checkPrayerTimeAndBlock() {
        val now = Calendar.getInstance()
        val currentHour = now.get(Calendar.HOUR_OF_DAY)
        val currentMinute = now.get(Calendar.MINUTE)
        val nowMinutes = currentHour * 60 + currentMinute

        // Reset alarm tracking at midnight
        if (currentHour == 0 && currentMinute == 0) {
            alarmPlayedForPrayers.clear()
        }

        var isInPrayerWindow = false
        var activePrayer: String? = null

        for ((prayerName, timeStr) in prayerTimesMap) {
            val prayerMinutes = parseTimeToMinutes(timeStr) ?: continue
            val endMinutes = prayerMinutes + durationMinutes

            if (nowMinutes >= prayerMinutes && nowMinutes < endMinutes) {
                isInPrayerWindow = true
                activePrayer = prayerName

                // Play alarm + send notification ONCE when prayer time hits
                if (!alarmPlayedForPrayers.contains(prayerName)) {
                    alarmPlayedForPrayers.add(prayerName)
                    playAlarm()
                    sendPrayerNotification(prayerName, timeStr)
                    vibrateDevice()
                }
                break
            }
        }

        if (isInPrayerWindow && activePrayer != null) {
            currentBlockingPrayer = activePrayer
            // Update foreground notification
            val manager = getSystemService(NotificationManager::class.java)
            manager?.notify(NOTIFICATION_ID, buildNotification())

            // Check and block the foreground app
            checkAndBlockForegroundApp()
        } else {
            if (currentBlockingPrayer != null) {
                currentBlockingPrayer = null
                stopAlarm()
                hideOverlay()
                // Update notification
                val manager = getSystemService(NotificationManager::class.java)
                manager?.notify(NOTIFICATION_ID, buildNotification())
            }
        }
    }

    private fun parseTimeToMinutes(timeStr: String): Int? {
        return try {
            // Handle both "HH:mm" and "HH:mm AM/PM" formats
            val cleaned = timeStr.trim()
            if (cleaned.contains("AM") || cleaned.contains("PM")) {
                val parts = cleaned.split(" ")
                val timeParts = parts[0].split(":")
                var hours = timeParts[0].toInt()
                val minutes = timeParts[1].toInt()
                val modifier = parts[1].uppercase()
                if (modifier == "PM" && hours < 12) hours += 12
                if (modifier == "AM" && hours == 12) hours = 0
                hours * 60 + minutes
            } else {
                val parts = cleaned.split(":")
                val hours = parts[0].toInt()
                val minutes = parts[1].toInt()
                hours * 60 + minutes
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun checkAndBlockForegroundApp() {
        try {
            val usageStatsManager = getSystemService(Context.USAGE_STATS_MANAGER) as? UsageStatsManager
                ?: return

            val time = System.currentTimeMillis()
            val usageEvents = usageStatsManager.queryEvents(time - 5000, time)
            var topPackage: String? = null

            val event = UsageEvents.Event()
            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event)
                if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                    event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                    topPackage = event.packageName
                }
            }

            // Fallback to UsageStats
            if (topPackage == null) {
                val stats = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_DAILY, time - 10000, time
                )
                topPackage = stats?.maxByOrNull { it.lastTimeUsed }?.packageName
            }

            if (topPackage != null && blockedPackages.contains(topPackage)) {
                showOverlay()
            } else {
                hideOverlay()
            }
        } catch (e: Exception) {
            // SecurityException if permission not granted
        }
    }

    private fun playAlarm() {
        try {
            stopAlarm() // Stop any previous alarm

            // Try alarm sound first, fall back to notification, then ringtone
            var uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            if (uri == null) {
                uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            }
            if (uri == null) {
                uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            }

            mediaPlayer = MediaPlayer().apply {
                setDataSource(this@LockOverlayService, uri!!)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = false  // Play alarm once
                prepare()
                start()
            }

            // Auto-stop alarm after 30 seconds
            handler?.postDelayed({ stopAlarm() }, 30000)
        } catch (e: Exception) {
            // Alarm sound not available — try system beep fallback
            try {
                val toneGen = android.media.ToneGenerator(AudioManager.STREAM_ALARM, 100)
                toneGen.startTone(android.media.ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 5000)
            } catch (e2: Exception) {
                // Silently fail
            }
        }
    }

    private fun stopAlarm() {
        try {
            mediaPlayer?.apply {
                if (isPlaying) stop()
                release()
            }
        } catch (e: Exception) { }
        mediaPlayer = null
    }

    private fun vibrateDevice() {
        try {
            val vibrationPattern = longArrayOf(0, 800, 400, 800, 400, 800, 400, 1200)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                val vibrator = vibratorManager.defaultVibrator
                vibrator.vibrate(VibrationEffect.createWaveform(vibrationPattern, -1))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(vibrationPattern, -1))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(vibrationPattern, -1)
                }
            }
        } catch (e: Exception) {
            // Vibration not available
        }
    }

    private fun sendPrayerNotification(prayerName: String, timeStr: String) {
        try {
            val notificationManager = getSystemService(NotificationManager::class.java) ?: return

            // Create an intent to open the app
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            val pendingIntent = if (launchIntent != null) {
                PendingIntent.getActivity(
                    this, 0, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            } else null

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, ALARM_CHANNEL_ID)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this)
            }

            val notification = builder
                .setContentTitle("🕌 $prayerName Time!")
                .setContentText("It's time for $prayerName prayer ($timeStr). Apps are now blocked for $durationMinutes minutes.")
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setStyle(Notification.BigTextStyle()
                    .bigText("It's time for $prayerName prayer ($timeStr).\n\nDistracting apps are blocked for $durationMinutes minutes. Focus on your Salah. 🤲"))
                .build()

            notificationManager.notify(ALARM_NOTIFICATION_ID + prayerName.hashCode(), notification)
        } catch (e: Exception) {
            // Notification failed — continue blocking anyway
        }
    }

    private fun showOverlay() {
        if (isOverlayVisible) return

        try {
            windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            )

            // Build the overlay UI programmatically
            val container = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setBackgroundColor(0xF0064E3B.toInt()) // Deep emerald green
                setPadding(64, 64, 64, 64)
            }

            // Mosque emoji
            val emojiText = TextView(this).apply {
                text = "🕌"
                textSize = 72f
                gravity = Gravity.CENTER
            }
            container.addView(emojiText)

            // Prayer name
            val prayerText = TextView(this).apply {
                text = "${currentBlockingPrayer ?: "Salah"} Time"
                textSize = 32f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
                setPadding(0, 32, 0, 8)
            }
            container.addView(prayerText)

            // Title
            val titleText = TextView(this).apply {
                text = "Time for Salah"
                textSize = 20f
                setTextColor(Color.argb(220, 255, 255, 255))
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 16)
            }
            container.addView(titleText)

            // Subtitle
            val subtitleText = TextView(this).apply {
                text = "This app is blocked during prayer time.\nFocus on your prayer — apps unlock after $durationMinutes minutes."
                textSize = 15f
                setTextColor(Color.argb(180, 255, 255, 255))
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 48)
            }
            container.addView(subtitleText)

            // Stop alarm button
            val stopAlarmBtn = Button(this).apply {
                text = "🔇 Stop Alarm"
                textSize = 14f
                setTextColor(Color.WHITE)
                setBackgroundColor(Color.argb(60, 255, 255, 255))
                setPadding(48, 20, 48, 20)
                setOnClickListener { stopAlarm() }
            }
            container.addView(stopAlarmBtn)

            // Spacer
            val spacer = View(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, 24
                )
            }
            container.addView(spacer)

            // "Go Back" button
            val goBackButton = Button(this).apply {
                text = "Return to SalahLock"
                textSize = 14f
                setTextColor(0xFF064E3B.toInt())
                setBackgroundColor(Color.WHITE)
                setPadding(48, 24, 48, 24)
                setOnClickListener {
                    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                    launchIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    if (launchIntent != null) {
                        startActivity(launchIntent)
                    }
                }
            }
            container.addView(goBackButton)

            overlayView = container
            windowManager?.addView(overlayView, params)
            isOverlayVisible = true
        } catch (e: Exception) {
            // Permission not granted for overlay
        }
    }

    private fun hideOverlay() {
        if (!isOverlayVisible || overlayView == null) return
        try {
            windowManager?.removeView(overlayView)
        } catch (e: Exception) { }
        overlayView = null
        isOverlayVisible = false
    }

    override fun onDestroy() {
        super.onDestroy()
        handler?.removeCallbacksAndMessages(null)
        stopAlarm()
        hideOverlay()
        stopForeground(true)
    }
}
