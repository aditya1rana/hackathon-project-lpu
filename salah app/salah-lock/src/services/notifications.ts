import * as Notifications from 'expo-notifications';
import { PrayerTimes } from '../types';

/**
 * Configure how notifications should be handled when the app is in the foreground.
 */
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/**
 * Request notification permissions.
 */
export async function requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === 'granted';
}

/**
 * Parse prayer time string into { hours, minutes } in 24-hour format.
 * Handles: "05:30", "5:30 AM", "3:45 PM", "15:45"
 */
function parsePrayerTime(timeStr: string): { hours: number; minutes: number } | null {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) {
        console.warn('[Notifications] Could not parse:', timeStr);
        return null;
    }
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3]?.toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    else if (modifier === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
}

/**
 * Given an hour and minute, returns a Date object for the NEXT future occurrence.
 * If the time has already passed today, it returns tomorrow at that time.
 * This prevents all "past" notifications from firing immediately.
 */
function getNextOccurrence(hours: number, minutes: number): Date {
    const now = new Date();
    const candidate = new Date();
    candidate.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (candidate.getTime() <= now.getTime()) {
        candidate.setDate(candidate.getDate() + 1);
    }

    return candidate;
}

/**
 * Schedules exactly TWO notifications per prayer:
 *   1) WARNING — 5 minutes BEFORE prayer time
 *   2) ALARM   — exactly AT prayer time
 *
 * Each is scheduled for the NEXT future occurrence of that time.
 * Does NOT fire immediately. Cancels all previous notifications first.
 */
export async function schedulePrayerNotifications(prayerTimes: PrayerTimes) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] Cleared all old notifications.');

    const prayers = [
        { name: 'Fajr', time: prayerTimes.fajr },
        { name: 'Dhuhr', time: prayerTimes.dhuhr },
        { name: 'Asr', time: prayerTimes.asr },
        { name: 'Maghrib', time: prayerTimes.maghrib },
        { name: 'Isha', time: prayerTimes.isha },
    ];

    let count = 0;

    for (const prayer of prayers) {
        const parsed = parsePrayerTime(prayer.time);
        if (!parsed) continue;

        const { hours, minutes } = parsed;

        // ── WARNING: 5 minutes before ──────────────────────────────────
        let warnMin = minutes - 5;
        let warnHour = hours;
        if (warnMin < 0) { warnMin += 60; warnHour -= 1; }
        if (warnHour < 0) warnHour = 23;

        const warnDate = getNextOccurrence(warnHour, warnMin);
        console.log(`[Notifications] ${prayer.name} WARNING → ${warnDate.toLocaleTimeString()}`);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `⏰ ${prayer.name} in 5 Minutes`,
                body: `Get ready! ${prayer.name} starts in 5 minutes. Prepare for Salah. 🙏`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: { prayerName: prayer.name, type: 'warning' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: warnDate,
            },
        });

        // ── ALARM: exactly at prayer time ─────────────────────────────
        const alarmDate = getNextOccurrence(hours, minutes);
        console.log(`[Notifications] ${prayer.name} ALARM   → ${alarmDate.toLocaleTimeString()}`);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `🕌 ${prayer.name} Time!`,
                body: `It's time for ${prayer.name}! Apps are now BLOCKED. Focus on your Salah. 🤲`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
                data: { prayerName: prayer.name, type: 'alarm', isAlarm: true },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: alarmDate,
            },
        });

        count++;
    }

    console.log(`[Notifications] ✅ Scheduled ${count * 2} notifications for future times only.`);
}
