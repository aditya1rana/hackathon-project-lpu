import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Switch,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Pressable,
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme/colors';
import { CustomPrayerTimes } from '../types';

// ── Lock duration options ────────────────────────────────────────
const DURATION_OPTIONS = [10, 20, 30, 45, 60];

// ── Per-app icon map ─────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
const APP_ICONS: Record<string, IoniconsName> = {
    Instagram: 'logo-instagram',
    TikTok: 'musical-notes-outline',
    'Twitter / X': 'logo-twitter',
    YouTube: 'logo-youtube',
    WhatsApp: 'logo-whatsapp',
    Snapchat: 'camera-outline',
    Facebook: 'logo-facebook',
    Reddit: 'logo-reddit',
    Telegram: 'paper-plane-outline',
    Discord: 'chatbubbles-outline',
};

const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const PRAYER_LABELS: Record<string, string> = {
    fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};

// Default app name → Android package name mapping
const DEFAULT_PACKAGES: Record<string, string> = {
    'Instagram': 'com.instagram.android',
    'TikTok': 'com.zhiliaoapp.musically',
    'Twitter / X': 'com.twitter.android',
    'YouTube': 'com.google.android.youtube',
    'WhatsApp': 'com.whatsapp',
    'Snapchat': 'com.snapchat.android',
    'Facebook': 'com.facebook.katana',
    'Reddit': 'com.reddit.frontpage',
    'Telegram': 'org.telegram.messenger',
    'Discord': 'com.discord',
};

// ────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
    const user = useAppStore((s) => s.user);
    const prayerTimes = useAppStore((s) => s.prayerTimes);
    const blockingSettings = useAppStore((s) => s.blockingSettings);
    const loadBlockingSettings = useAppStore((s) => s.loadBlockingSettings);
    const updateBlockingSettings = useAppStore((s) => s.updateBlockingSettings);
    const refreshLocation = useAppStore((s) => s.refreshLocation);
    const loadPrayerTimes = useAppStore((s) => s.loadPrayerTimes);
    const isLoading = useAppStore((s) => s.isLoading);

    const [locationError, setLocationError] = useState<string | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [showDurationModal, setShowDurationModal] = useState(false);
    const [showAddAppModal, setShowAddAppModal] = useState(false);
    const [newAppName, setNewAppName] = useState('');
    const [showPrayerTimeModal, setShowPrayerTimeModal] = useState(false);
    const [editingPrayer, setEditingPrayer] = useState<string | null>(null);
    const [editingTime, setEditingTime] = useState('');

    useEffect(() => {
        if (user?.id) loadBlockingSettings(user.id);
    }, [user?.id]);

    const blockedApps = blockingSettings?.blockedApps || [];
    const blockedPackages = blockingSettings?.blockedPackages || [];
    const customApps = blockingSettings?.customApps || [];
    const customPackages = blockingSettings?.customPackages || [];
    const lockDuration = blockingSettings?.lockDuration || 20;
    const blockingEnabled = blockingSettings?.blockingEnabled ?? true;
    const customPrayerTimes = blockingSettings?.customPrayerTimes;
    const useCustomTimes = customPrayerTimes?.enabled ?? false;

    const defaultApps = ['Instagram', 'TikTok', 'Twitter / X', 'YouTube', 'WhatsApp'];
    const allApps = [...defaultApps, ...customApps];

    const toggleApp = (appName: string) => {
        if (!user) return;
        const isBlocked = blockedApps.includes(appName);
        const pkg = DEFAULT_PACKAGES[appName] || customPackages[customApps.indexOf(appName)] || appName;
        const updatedApps = isBlocked
            ? blockedApps.filter((a) => a !== appName)
            : [...blockedApps, appName];
        const updatedPackages = isBlocked
            ? blockedPackages.filter((p) => p !== pkg)
            : [...blockedPackages, pkg];
        updateBlockingSettings(user.id, { blockedApps: updatedApps, blockedPackages: updatedPackages });
        // Trigger native blocking update
        triggerNativeBlocking(updatedPackages, lockDuration, blockingEnabled);
    };

    const addCustomApp = () => {
        const trimmed = newAppName.trim();
        if (!trimmed || !user) return;
        if (allApps.includes(trimmed)) {
            Alert.alert('Already exists', `"${trimmed}" is already in the list.`);
            return;
        }
        const updatedCustom = [...customApps, trimmed];
        const updatedCustomPkgs = [...customPackages, trimmed]; // use name as fallback pkg
        const updatedBlocked = [...blockedApps, trimmed];
        const updatedBlockedPkgs = [...blockedPackages, trimmed];
        updateBlockingSettings(user.id, {
            customApps: updatedCustom,
            customPackages: updatedCustomPkgs,
            blockedApps: updatedBlocked,
            blockedPackages: updatedBlockedPkgs,
        });
        setNewAppName('');
        setShowAddAppModal(false);
        triggerNativeBlocking(updatedBlockedPkgs, lockDuration, blockingEnabled);
    };

    const removeCustomApp = (appName: string) => {
        if (!user) return;
        const idx = customApps.indexOf(appName);
        const pkg = idx >= 0 ? customPackages[idx] : appName;
        const updatedCustom = customApps.filter((a) => a !== appName);
        const updatedCustomPkgs = customPackages.filter((_, i) => i !== idx);
        const updatedBlocked = blockedApps.filter((a) => a !== appName);
        const updatedBlockedPkgs = blockedPackages.filter((p) => p !== pkg);
        updateBlockingSettings(user.id, {
            customApps: updatedCustom,
            customPackages: updatedCustomPkgs,
            blockedApps: updatedBlocked,
            blockedPackages: updatedBlockedPkgs,
        });
        triggerNativeBlocking(updatedBlockedPkgs, lockDuration, blockingEnabled);
    };

    const [installedApps, setInstalledApps] = useState<{ appName: string; packageName: string }[]>([]);
    const [installedAppsLoading, setInstalledAppsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const openAddAppModal = async () => {
        setSearchQuery('');
        setNewAppName('');
        setShowAddAppModal(true);
        setInstalledAppsLoading(true);
        setInstalledApps([]);

        try {
            const SalahLock = require('../native/SalahLock').default;
            if (SalahLock && SalahLock.getInstalledApps) {
                const apps = await SalahLock.getInstalledApps();
                if (apps && Array.isArray(apps)) {
                    setInstalledApps(apps);
                }
            }
        } catch (e) {
            console.log('Could not load installed apps (likely in Expo Go):', e);
        } finally {
            setInstalledAppsLoading(false);
        }
    };

    const addAppFromList = (appName: string, packageName?: string) => {
        if (!user) return;
        if (allApps.includes(appName)) {
            Alert.alert('Already exists', `"${appName}" is already in the list.`);
            return;
        }
        const pkg = packageName || DEFAULT_PACKAGES[appName] || appName;
        const updatedCustom = [...customApps, appName];
        const updatedCustomPkgs = [...customPackages, pkg];
        const updatedBlocked = [...blockedApps, appName];
        const updatedBlockedPkgs = [...blockedPackages, pkg];
        updateBlockingSettings(user.id, {
            customApps: updatedCustom,
            customPackages: updatedCustomPkgs,
            blockedApps: updatedBlocked,
            blockedPackages: updatedBlockedPkgs,
        });
        setShowAddAppModal(false);
        triggerNativeBlocking(updatedBlockedPkgs, lockDuration, blockingEnabled);
    };

    // Filter apps based on search query
    const filteredApps = installedApps.filter(app =>
        app.appName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ... existing handleRefreshLocation, etc.

    const handleRefreshLocation = async () => {
        if (!user) return;
        setLocationError(null);
        setLocationLoading(true);
        try {
            await refreshLocation(user.id);
        } catch (e: any) {
            setLocationError(e?.message || 'Could not fetch location. Try stepping outside or turning Wi-Fi on.');
        } finally {
            setLocationLoading(false);
        }
    };

    // ... keeping handleGrantPermission and others untouched

    const handleGrantPermission = async (type: 'usage' | 'overlay') => {
        if (Platform.OS !== 'android') return;

        // Try the native module first
        try {
            const SalahLock = require('../native/SalahLock').default;
            if (SalahLock) {
                if (type === 'usage') SalahLock.requestUsageAccessPermission();
                else SalahLock.requestOverlayPermission();
                return;
            }
        } catch (e) {
            console.log('Native module not found:', e);
        }

        // Fallback to Expo Intent Launcher
        try {
            const IntentLauncher = require('expo-intent-launcher');
            const action = type === 'usage'
                ? 'android.settings.USAGE_ACCESS_SETTINGS'
                : 'android.settings.action.MANAGE_OVERLAY_PERMISSION';

            await IntentLauncher.startActivityAsync(action);
        } catch (err) {
            console.error('Intent launcher failed:', err);
            setLocationError('Native permissions require a Dev Build. Run `npx expo run:android`.');
        }
    };

    const toggleCustomPrayerTimes = () => {
        if (!user) return;
        const current = blockingSettings?.customPrayerTimes || { enabled: false };
        updateBlockingSettings(user.id, {
            customPrayerTimes: { ...current, enabled: !current.enabled },
        });
        // Reload prayer times so Home screen picks up custom overrides
        loadPrayerTimes(user.id);
    };

    const saveCustomPrayerTime = () => {
        if (!user || !editingPrayer) return;
        // Validate HH:mm format
        const match = editingTime.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
        if (!match) {
            Alert.alert('Invalid time', 'Please enter time in HH:MM format (e.g. 05:30)');
            return;
        }
        const current = blockingSettings?.customPrayerTimes || { enabled: true };
        updateBlockingSettings(user.id, {
            customPrayerTimes: { ...current, enabled: true, [editingPrayer]: editingTime },
        });
        // Reload prayer times so Home screen picks up the change
        loadPrayerTimes(user.id);
        setEditingPrayer(null);
        setEditingTime('');
        setShowPrayerTimeModal(false);
    };

    // Helper: trigger native blocking immediately
    const triggerNativeBlocking = (packages: string[], duration: number, enabled: boolean) => {
        try {
            const SalahLock = require('../native/SalahLock').default;
            if (!SalahLock) return;
            if (enabled && packages.length > 0) {
                // Get prayer times from store
                const pt = useAppStore.getState().prayerTimes;
                const names = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
                const times = pt
                    ? [pt.fajr, pt.dhuhr, pt.asr, pt.maghrib, pt.isha]
                    : ['05:00', '12:30', '15:45', '18:15', '19:45'];
                SalahLock.startBlocking(packages, duration, names, times);
            } else {
                SalahLock.stopBlocking();
            }
        } catch (e) {
            // Native module not available
        }
    };

    // Get the effective prayer time for display
    const getEffectiveTime = (key: string): string => {
        if (useCustomTimes && customPrayerTimes && (customPrayerTimes as any)[key]) {
            return (customPrayerTimes as any)[key];
        }
        if (prayerTimes) return (prayerTimes as any)[key] || '--:--';
        return '--:--';
    };

    // ── Sub-components ───────────────────────────────────────────

    const SectionHeader = ({ icon, label }: { icon: IoniconsName; label: string }) => (
        <View className="flex-row items-center mb-3 mt-6">
            <Ionicons name={icon} size={18} color={colors.gold} style={{ marginRight: 8 }} />
            <Text className="text-sm font-bold text-gold tracking-widest uppercase" style={{ color: colors.gold }}>{label}</Text>
        </View>
    );

    const Card = ({ children, className: cn = '' }: { children: React.ReactNode; className?: string }) => (
        <View
            className={`bg-[#0B2919] rounded-[24px] overflow-hidden ${cn}`}
            style={{ borderWidth: 1, borderColor: colors.border, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 }}
        >
            {children}
        </View>
    );

    const PillButton = ({ label, onPress, loading: btnLoading }: { label: string; onPress: () => void; loading?: boolean }) => (
        <TouchableOpacity
            className="bg-primaryLight px-3.5 py-1.5 rounded-lg items-center"
            style={{ minWidth: 64 }}
            onPress={onPress}
            disabled={btnLoading}
            activeOpacity={0.7}
        >
            {btnLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
            ) : (
                <Text className="text-primary font-bold text-xs">{label}</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper safeAreaEdges={['top']} bgClass="bg-background">
            <View className="absolute top-0 right-[-50] w-[150%] h-[40%] opacity-15" style={{ backgroundColor: colors.primary, borderRadius: 1000, filter: 'blur(80px)' }} pointerEvents="none" />

            <ScrollView
                className="px-6"
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-3xl font-bold text-white mt-6 mb-2">Settings & Apps</Text>
                <Text className="text-white/50 text-sm mb-6">Manage your prayer alerts and blocked apps.</Text>

                {/* Error banner */}
                {locationError && (
                    <View
                        className="flex-row items-center bg-danger/10 rounded-2xl px-4 py-3 mb-4"
                        style={{ borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' }}
                    >
                        <Ionicons name="warning-outline" size={16} color={colors.danger} style={{ marginRight: 8 }} />
                        <Text className="flex-1 text-danger text-xs font-medium" numberOfLines={3}>{locationError}</Text>
                        <TouchableOpacity onPress={() => setLocationError(null)}>
                            <Ionicons name="close-circle" size={18} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* ══ LOCATION ══════════════════════════════════════════ */}
                <SectionHeader icon="location-outline" label="Your Location" />
                <Card className="mb-5">
                    <View className="flex-row items-center px-4 py-3.5">
                        <View className="w-9 h-9 rounded-xl bg-primaryLight justify-center items-center">
                            <Ionicons name="navigate-circle-outline" size={20} color={colors.primary} />
                        </View>
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-semibold text-white">Current City</Text>
                            <Text style={{ color: colors.textSecondary }} className="text-xs mt-0.5">{user?.city || 'Not set yet'}</Text>
                        </View>
                        <PillButton label="Refresh" onPress={handleRefreshLocation} loading={locationLoading || isLoading} />
                    </View>
                </Card>

                {/* ══ PRAYER TIMES ══════════════════════════════════════ */}
                <SectionHeader icon="time-outline" label="Prayer Times" />
                <Card className="mb-5">
                    {/* Toggle custom times */}
                    <View className="flex-row items-center px-4 py-3.5">
                        <View className="w-9 h-9 rounded-xl bg-primaryLight justify-center items-center">
                            <Ionicons name="create-outline" size={20} color={colors.primary} />
                        </View>
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-semibold text-white">Set Custom Times</Text>
                            <Text style={{ color: colors.textSecondary }} className="text-xs mt-0.5">Override auto-detected times</Text>
                        </View>
                        <Switch
                            value={useCustomTimes}
                            onValueChange={toggleCustomPrayerTimes}
                            trackColor={{ false: colors.border, true: colors.primaryLight }}
                            thumbColor={useCustomTimes ? colors.gold : colors.textSecondary}
                        />
                    </View>

                    {/* Prayer time rows */}
                    {PRAYER_ORDER.map((key, index) => (
                        <View key={key}>
                            <View className="h-px bg-border ml-16" />
                            <TouchableOpacity
                                className="flex-row items-center px-4 py-3"
                                onPress={() => {
                                    if (useCustomTimes) {
                                        setEditingPrayer(key);
                                        setEditingTime(getEffectiveTime(key));
                                        setShowPrayerTimeModal(true);
                                    }
                                }}
                                activeOpacity={useCustomTimes ? 0.6 : 1}
                            >
                                <View className="flex-1 ml-12">
                                    <Text className="text-sm font-medium text-white">{PRAYER_LABELS[key]}</Text>
                                </View>
                                <Text style={{ color: useCustomTimes && customPrayerTimes && (customPrayerTimes as any)[key] ? colors.primary : colors.textSecondary }} className="text-sm font-semibold">
                                    {getEffectiveTime(key)}
                                </Text>
                                {useCustomTimes && (
                                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                                )}
                            </TouchableOpacity>
                        </View>
                    ))}
                </Card>

                {/* ══ PERMISSIONS ═══════════════════════════════════════ */}
                <SectionHeader icon="shield-checkmark-outline" label="Permissions" />
                <Card className="mb-5">
                    <View className="flex-row items-center px-4 py-3.5">
                        <View className="w-9 h-9 rounded-xl bg-primaryLight justify-center items-center">
                            <Ionicons name="eye-outline" size={20} color={colors.primary} />
                        </View>
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-semibold text-white">Usage Access</Text>
                            <Text style={{ color: colors.textSecondary }} className="text-xs mt-0.5">Identify which apps are open</Text>
                        </View>
                        <PillButton label="Grant" onPress={() => handleGrantPermission('usage')} />
                    </View>
                    <View className="h-px bg-border ml-16" />
                    <View className="flex-row items-center px-4 py-3.5">
                        <View className="w-9 h-9 rounded-xl bg-primaryLight justify-center items-center">
                            <Ionicons name="layers-outline" size={20} color={colors.primary} />
                        </View>
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-semibold text-white">Display Over Apps</Text>
                            <Text style={{ color: colors.textSecondary }} className="text-xs mt-0.5">Show lock screen overlay</Text>
                        </View>
                        <PillButton label="Grant" onPress={() => handleGrantPermission('overlay')} />
                    </View>
                </Card>

                {/* ══ APP BLOCKING ══════════════════════════════════════ */}
                <SectionHeader icon="flash-outline" label="App Blocking" />
                <Card className="mb-5">
                    <View className="flex-row items-center px-4 py-3.5">
                        <View className="w-9 h-9 rounded-xl bg-primaryLight justify-center items-center">
                            <Ionicons name="toggle-outline" size={20} color={colors.primary} />
                        </View>
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-semibold text-white">Enable Blocking</Text>
                            <Text style={{ color: colors.textSecondary }} className="text-xs mt-0.5">Lock apps during prayer</Text>
                        </View>
                        <Switch
                            value={blockingEnabled}
                            onValueChange={(val) => {
                                if (user) {
                                    updateBlockingSettings(user.id, { blockingEnabled: val });
                                    triggerNativeBlocking(blockedPackages, lockDuration, val);
                                }
                            }}
                            trackColor={{ false: colors.border, true: colors.primaryLight }}
                            thumbColor={blockingEnabled ? colors.gold : colors.textSecondary}
                        />
                    </View>
                    <View className="h-px bg-border ml-16" />
                    <View className="flex-row items-center px-4 py-3.5">
                        <View className="w-9 h-9 rounded-xl bg-primaryLight justify-center items-center">
                            <Ionicons name="time-outline" size={20} color={colors.primary} />
                        </View>
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-semibold text-white">Lock Duration</Text>
                            <Text style={{ color: colors.textSecondary }} className="text-xs mt-0.5">After prayer starts</Text>
                        </View>
                        <PillButton label={`${lockDuration} mins`} onPress={() => setShowDurationModal(true)} />
                    </View>
                </Card>

                {/* ══ SELECT APPS ═══════════════════════════════════════ */}
                <SectionHeader icon="ban-outline" label="Apps to Block" />
                <Card className="mb-3">
                    {allApps.map((app, index) => {
                        const isCustom = customApps.includes(app);
                        return (
                            <View key={app}>
                                <View className="flex-row items-center px-4 py-3.5">
                                    <View className="w-9 h-9 rounded-xl bg-primaryLight justify-center items-center">
                                        <Ionicons
                                            name={APP_ICONS[app] ?? 'apps-outline'}
                                            size={20}
                                            color={colors.primary}
                                        />
                                    </View>
                                    <Text className="flex-1 ml-3 text-sm font-semibold text-white">{app}</Text>
                                    {isCustom && (
                                        <TouchableOpacity
                                            onPress={() => removeCustomApp(app)}
                                            className="mr-2 p-1"
                                            activeOpacity={0.6}
                                        >
                                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                        </TouchableOpacity>
                                    )}
                                    <Switch
                                        value={blockedApps.includes(app)}
                                        onValueChange={() => toggleApp(app)}
                                        trackColor={{ false: colors.border, true: colors.primaryLight }}
                                        thumbColor={blockedApps.includes(app) ? colors.gold : colors.textSecondary}
                                    />
                                </View>
                                {index < allApps.length - 1 && <View className="h-px bg-white/5 ml-16" />}
                            </View>
                        );
                    })}
                </Card>

                {/* Add Custom App Button */}
                <TouchableOpacity
                    className="flex-row items-center justify-center bg-primaryLight rounded-2xl py-3.5 mb-5"
                    style={{ borderWidth: 1, borderColor: colors.border }}
                    onPress={openAddAppModal}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    <Text className="text-primary font-bold text-sm ml-2">Add Custom App</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ══ LOCK DURATION MODAL ══════════════════════════════════ */}
            <Modal transparent animationType="fade" visible={showDurationModal} onRequestClose={() => setShowDurationModal(false)}>
                <Pressable className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setShowDurationModal(false)}>
                    <Pressable
                        className="bg-card rounded-3xl p-6 w-4/5"
                        style={{ borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="flex-row items-center mb-5">
                            <Ionicons name="time-outline" size={18} color={colors.primary} />
                            <Text className="text-lg font-bold text-white ml-2">Lock Duration</Text>
                        </View>
                        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                            {DURATION_OPTIONS.map((mins) => {
                                const active = lockDuration === mins;
                                return (
                                    <TouchableOpacity
                                        key={mins}
                                        className={`px-5 py-3 rounded-xl ${active ? 'bg-primary' : 'bg-primaryLight'}`}
                                        style={active ? {} : { borderWidth: 1, borderColor: colors.border }}
                                        onPress={() => {
                                            if (user) {
                                                updateBlockingSettings(user.id, { lockDuration: mins });
                                                triggerNativeBlocking(blockedPackages, mins, blockingEnabled);
                                            }
                                            setShowDurationModal(false);
                                        }}
                                    >
                                        <Text className={`font-semibold text-sm ${active ? 'text-white' : ''}`} style={!active ? { color: colors.white } : undefined}>{mins} mins</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity
                            className="items-center py-3 rounded-xl bg-background mt-5"
                            style={{ borderWidth: 1, borderColor: colors.border }}
                            onPress={() => setShowDurationModal(false)}
                        >
                            <Text className="text-textSecondary font-bold text-sm">Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ══ ADD CUSTOM APP MODAL ═══════════════════════════════ */}
            <Modal transparent animationType="fade" visible={showAddAppModal} onRequestClose={() => setShowAddAppModal(false)}>
                <Pressable className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setShowAddAppModal(false)}>
                    <Pressable
                        className="bg-card rounded-3xl overflow-hidden w-11/12 max-h-[80%]"
                        style={{ borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="p-5 border-b border-border bg-card">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center">
                                    <Ionicons name="apps-outline" size={20} color={colors.primary} />
                                    <Text className="text-lg font-bold text-white ml-2">Add App to Block</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowAddAppModal(false)} className="p-1">
                                    <Ionicons name="close-outline" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {installedApps.length > 0 && (
                                <View className="bg-background rounded-xl px-4 py-2.5 flex-row items-center" style={{ borderWidth: 1, borderColor: colors.border }}>
                                    <Ionicons name="search-outline" size={18} color={colors.textSecondary} className="mr-2" />
                                    <TextInput
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Search installed apps..."
                                        placeholderTextColor={colors.textSecondary}
                                        className="flex-1 text-sm text-white"
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                                            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>

                        <View className="flex-1 bg-background">
                            {installedAppsLoading ? (
                                <View className="p-10 items-center justify-center">
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text className="text-textSecondary mt-4 text-sm">Loading your apps...</Text>
                                </View>
                            ) : installedApps.length > 0 ? (
                                <ScrollView showsVerticalScrollIndicator={true} className="px-2">
                                    {filteredApps.length === 0 ? (
                                        <View className="p-10 items-center">
                                            <Text className="text-textSecondary text-center">No apps found matching "{searchQuery}"</Text>
                                        </View>
                                    ) : (
                                        filteredApps.map((app, index) => (
                                            <TouchableOpacity
                                                key={`${app.packageName}-${index}`}
                                                className="flex-row items-center px-4 py-4 border-b border-border bg-card mx-2 my-1 rounded-xl"
                                                onPress={() => addAppFromList(app.appName, app.packageName)}
                                                activeOpacity={0.7}
                                            >
                                                <View className="w-10 h-10 rounded-full bg-primaryLight justify-center items-center mr-3">
                                                    <Ionicons name="cube-outline" size={20} color={colors.primary} />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-base font-semibold text-white">{app.appName}</Text>
                                                    <Text style={{ color: colors.textSecondary }} className="text-xs" numberOfLines={1}>{app.packageName}</Text>
                                                </View>
                                                <Ionicons name="add-circle" size={24} color={colors.primary} />
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </ScrollView>
                            ) : (
                                <View className="p-6">
                                    <Text className="text-textSecondary text-xs mb-3 text-center">
                                        Could not load installed apps list. Please type the app name manually.
                                    </Text>
                                    <View
                                        className="bg-card rounded-xl px-4 py-3.5 mb-4"
                                        style={{ borderWidth: 1.5, borderColor: newAppName.length > 0 ? colors.primary : colors.border }}
                                    >
                                        <TextInput
                                            value={newAppName}
                                            onChangeText={setNewAppName}
                                            placeholder="e.g. Snapchat, Reddit..."
                                            placeholderTextColor={colors.textSecondary}
                                            autoFocus
                                            autoCapitalize="words"
                                            returnKeyType="done"
                                            onSubmitEditing={addCustomApp}
                                            style={{ fontSize: 15, color: colors.text, fontWeight: '500' }}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        className={`items-center py-3 rounded-xl ${newAppName.trim() ? 'bg-primary' : 'bg-border'}`}
                                        onPress={addCustomApp}
                                        disabled={!newAppName.trim()}
                                    >
                                        <Text className={`font-bold text-sm ${newAppName.trim() ? 'text-white' : 'text-textSecondary'}`}>Add App manually</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ══ EDIT PRAYER TIME MODAL ═══════════════════════════════ */}
            <Modal transparent animationType="fade" visible={showPrayerTimeModal} onRequestClose={() => setShowPrayerTimeModal(false)}>
                <Pressable className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setShowPrayerTimeModal(false)}>
                    <Pressable
                        className="bg-card rounded-3xl p-6 w-4/5"
                        style={{ borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="flex-row items-center mb-4">
                            <Ionicons name="time-outline" size={18} color={colors.primary} />
                            <Text className="text-lg font-bold text-white ml-2">
                                Set {editingPrayer ? PRAYER_LABELS[editingPrayer] : ''} Time
                            </Text>
                        </View>
                        <Text style={{ color: colors.textSecondary }} className="text-xs mb-3">Enter time in 24-hour format (HH:MM)</Text>
                        <View
                            className="bg-background rounded-xl px-4 py-3.5 mb-4"
                            style={{ borderWidth: 1.5, borderColor: colors.primary }}
                        >
                            <TextInput
                                value={editingTime}
                                onChangeText={setEditingTime}
                                placeholder="e.g. 05:30"
                                placeholderTextColor={colors.textSecondary}
                                autoFocus
                                keyboardType="numbers-and-punctuation"
                                maxLength={5}
                                returnKeyType="done"
                                onSubmitEditing={saveCustomPrayerTime}
                                style={{ fontSize: 24, color: colors.text, fontWeight: '700', textAlign: 'center' }}
                            />
                        </View>
                        <View className="flex-row" style={{ gap: 10 }}>
                            <TouchableOpacity
                                className="flex-1 items-center py-3 rounded-xl bg-background"
                                style={{ borderWidth: 1, borderColor: colors.border }}
                                onPress={() => setShowPrayerTimeModal(false)}
                            >
                                <Text className="text-textSecondary font-bold text-sm">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 items-center py-3 rounded-xl bg-primary"
                                onPress={saveCustomPrayerTime}
                            >
                                <Text className="text-white font-bold text-sm">Save</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </ScreenWrapper>
    );
}
