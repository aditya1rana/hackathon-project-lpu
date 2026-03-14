import { requireOptionalNativeModule } from 'expo-modules-core';

interface SalahLockModule {
    isUsageAccessPermissionGranted(): boolean;
    isOverlayPermissionGranted(): boolean;
    requestUsageAccessPermission(): void;
    requestOverlayPermission(): void;
    startBlocking(blockedApps: string[], durationMinutes: number, prayerNames: string[], prayerTimes: string[]): void;
    stopBlocking(): void;
    /**
     * Returns a list of installed apps on the device.
     * Note: Requires native module access, will return undefined if not available.
     */
    getInstalledApps(): { appName: string; packageName: string }[];
}

/**
 * In standard Expo Go the native 'SalahLock' module does not exist.
 * requireOptionalNativeModule returns null instead of throwing, so the
 * app won't crash. Every call-site already wraps usage in try/catch.
 */
const SalahLock = requireOptionalNativeModule<SalahLockModule>('SalahLock');

export default SalahLock;
