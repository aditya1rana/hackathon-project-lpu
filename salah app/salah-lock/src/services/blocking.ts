import { PrayerTimes, BlockingSettings } from '../types';

/**
 * Parses a prayer time string into total minutes since midnight (24h).
 * Handles: "05:30", "5:30 AM", "3:45 PM", "15:45"
 */
function parseTimeToMinutes(timeStr: string): number | null {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3]?.toUpperCase();

    if (modifier === 'PM' && hours < 12) hours += 12;
    else if (modifier === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

/**
 * Checks if the current time is within a locked prayer window.
 *
 * @param prayerTimes Today's calculated prayer times
 * @param settings User's blocking settings
 * @returns boolean - true if currently locked
 */
export function isCurrentlyLocked(
    prayerTimes: PrayerTimes | null,
    settings: BlockingSettings | null
): boolean {
    if (!prayerTimes || !settings || !settings.blockingEnabled) {
        return false;
    }

    const now = new Date();
    const nowTime = now.getHours() * 60 + now.getMinutes();
    const lockDuration = settings.lockDuration || 20;

    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    for (const p of prayers) {
        const timeStr = (prayerTimes as any)[p];
        const startTime = parseTimeToMinutes(timeStr);
        if (startTime === null) continue;

        const endTime = startTime + lockDuration;
        if (nowTime >= startTime && nowTime <= endTime) {
            return true;
        }
    }

    return false;
}
