import {
    Coordinates,
    CalculationMethod,
    PrayerTimes as AdhanPrayerTimes,
    SunnahTimes,
    Madhab,
} from 'adhan';
import { PrayerTimes } from '../types';

/**
 * Calculates local prayer times for a given set of coordinates and date.
 * Uses the Muslim World League calculation method as a default.
 */
export function calculateLocalPrayerTimes(
    latitude: number,
    longitude: number,
    date: Date = new Date()
): PrayerTimes {
    const coordinates = new Coordinates(latitude, longitude);
    const params = CalculationMethod.MuslimWorldLeague();
    params.madhab = Madhab.Shafi; // Default, can be configurable later

    const adhanTimes = new AdhanPrayerTimes(coordinates, date, params);

    // Format utility
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    const todayStr = date.toISOString().split('T')[0];

    return {
        userId: '', // To be filled by the caller
        fajr: formatTime(adhanTimes.fajr),
        dhuhr: formatTime(adhanTimes.dhuhr),
        asr: formatTime(adhanTimes.asr),
        maghrib: formatTime(adhanTimes.maghrib),
        isha: formatTime(adhanTimes.isha),
        date: todayStr,
    };
}
