import React, { useEffect } from 'react';
import { View, Text, Switch } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import PrayerCard from '../components/PrayerCard';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const PRAYER_LABELS: Record<string, string> = {
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
};

const PRAYER_ICONS: Record<string, string> = {
    fajr: 'sunny-outline',
    dhuhr: 'sunny',
    asr: 'partly-sunny-outline',
    maghrib: 'cloudy-night-outline',
    isha: 'moon-outline',
};

export default function HomeScreen() {
    const user = useAppStore((s) => s.user);
    const prayerTimes = useAppStore((s) => s.prayerTimes);
    const todayLogs = useAppStore((s) => s.todayLogs);
    const prayersCompletedToday = useAppStore((s) => s.prayersCompletedToday);
    const markPrayerCompleted = useAppStore((s) => s.markPrayerCompleted);
    const loadPrayerTimes = useAppStore((s) => s.loadPrayerTimes);
    const loadTodayLogs = useAppStore((s) => s.loadTodayLogs);
    const blockingSettings = useAppStore((s) => s.blockingSettings);
    const checkLockStatus = useAppStore((s) => s.checkLockStatus);
    const scheduleNotifications = useAppStore((s) => s.scheduleNotifications);
    const lockDuration = blockingSettings?.lockDuration || 20;

    useEffect(() => {
        if (user?.id) {
            loadPrayerTimes(user.id);
            loadTodayLogs(user.id);
        }
    }, [user?.id]);

    // Start blocking service and schedule notifications whenever prayer times update
    useEffect(() => {
        if (prayerTimes && blockingSettings) {
            // Start the native blocking service with prayer times
            checkLockStatus();
            // Schedule expo notifications (5 min before each prayer)
            scheduleNotifications();
        }
    }, [prayerTimes, blockingSettings?.blockingEnabled, blockingSettings?.lockDuration]);

    // Check lock status periodically (every 30 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            checkLockStatus();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const completedSet = new Set(
        todayLogs.filter((l) => l.completed).map((l) => l.prayerName)
    );

    const nextPrayer = PRAYER_ORDER.find((p) => !completedSet.has(PRAYER_LABELS[p]));

    const [timeRemaining, setTimeRemaining] = React.useState<string>('');

    useEffect(() => {
        if (!nextPrayer || !prayerTimes) {
            setTimeRemaining('');
            return;
        }

        const timeString = (prayerTimes as any)[nextPrayer];
        if (!timeString) return;

        const parseTime = (timeStr: string) => {
            const [time, modifier] = timeStr.trim().split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            const target = new Date();
            target.setHours(hours, minutes, 0, 0);
            return target.getTime();
        };

        const targetTime = parseTime(timeString);

        const updateTimer = () => {
            const now = Date.now();
            let diff = targetTime - now;

            if (diff < 0) {
                setTimeRemaining('Time for prayer!');
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            const pad = (n: number) => n.toString().padStart(2, '0');
            if (h > 0) {
                setTimeRemaining(`${h}h ${pad(m)}m ${pad(s)}s`);
            } else {
                setTimeRemaining(`${pad(m)}m ${pad(s)}s`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [nextPrayer, prayerTimes]);

    return (
        <ScreenWrapper safeAreaEdges={['top']} scrollable bgClass="bg-background">
            <View className="px-6 pt-6 pb-24">

                {/* Header */}
                <View className="flex-row justify-between items-center mb-8">
                    <View>
                        <Text className="text-white/60 text-sm font-medium mb-1 tracking-wide">ASSALAMU ALAIKUM,</Text>
                        <Text className="text-3xl font-bold text-white">{user?.name || 'User'}</Text>
                        {user?.city && (
                            <View className="flex-row items-center mt-2">
                                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.6)" />
                                <Text className="text-white/60 text-sm ml-1 font-medium">{user.city}</Text>
                            </View>
                        )}
                    </View>
                    <View
                        className="bg-cardElevated px-4 py-2.5 rounded-full flex-row items-center"
                        style={{ borderWidth: 1, borderColor: colors.border }}
                    >
                        <Ionicons name="flame" size={16} color={colors.gold} />
                        <Text style={{ color: colors.gold }} className="font-bold ml-1.5 text-sm">{user?.streak || 0} Days</Text>
                    </View>
                </View>

                {/* Next Prayer Glowing Timer Card */}
                <View
                    className="rounded-[36px] p-8 mb-6 relative overflow-hidden items-center justify-center border border-border"
                    style={{
                        backgroundColor: '#0B2919', // Dark glassy background
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.25,
                        shadowRadius: 30,
                        elevation: 12
                    }}
                >
                    <View className="absolute top-0 right-0 left-0 bottom-0 opacity-10" style={{ backgroundColor: colors.primary }} />

                    <Text className="text-white/60 font-medium text-sm mb-3 uppercase tracking-[0.2em] text-center">
                        {nextPrayer ? PRAYER_LABELS[nextPrayer] : 'ALL DONE ✓'}
                    </Text>

                    <Text className="text-white font-bold text-[56px] tracking-tight mb-4 text-center" style={{ textShadowColor: 'rgba(15,189,73,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 20 }}>
                        {timeRemaining || '--:--'}
                    </Text>

                    <View style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} className="rounded-full px-6 py-2.5 flex-row items-center justify-center border border-white/10">
                        <Ionicons name="time-outline" size={20} color={colors.gold} />
                        <Text className="text-white font-bold text-base ml-2.5">
                            {nextPrayer && prayerTimes ? (prayerTimes as any)[nextPrayer] : '--:--'}
                        </Text>
                    </View>
                </View>

                {/* App Blocking Toggle Card */}
                <View className="bg-card rounded-3xl p-5 mb-8 flex-row justify-between items-center border border-border shadow-sm">
                    <View className="flex-row items-center flex-1">
                        <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-4 border border-primary/20">
                            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                        </View>
                        <View className="flex-1 pr-4">
                            <Text className="text-white font-bold text-[17px] mb-1">App Blocking</Text>
                            <Text className="text-white/50 text-xs">Lock distracting apps during prayer</Text>
                        </View>
                    </View>
                    <Switch
                        value={blockingSettings?.blockingEnabled || false}
                        onValueChange={(val) => {
                            if (user?.id) {
                                useAppStore.getState().updateBlockingSettings(user.id, { blockingEnabled: val });
                            }
                        }}
                        trackColor={{ false: colors.border, true: colors.primaryLight }}
                        thumbColor={blockingSettings?.blockingEnabled ? colors.gold : colors.textSecondary}
                    />
                </View>

                <View className="mb-4 flex-row justify-between items-center">
                    <Text className="text-lg font-bold text-white">Today's Salah</Text>
                    <Text className="text-sm font-bold" style={{ color: colors.gold }}>
                        {prayersCompletedToday}/5
                    </Text>
                </View>

                {/* Progress Bar */}
                <View className="h-1.5 bg-border rounded-full mb-4 overflow-hidden">
                    <View
                        className="h-full rounded-full"
                        style={{ width: `${(prayersCompletedToday / 5) * 100}%`, backgroundColor: colors.primary }}
                    />
                </View>

                {/* Prayer Cards */}
                <View>
                    {PRAYER_ORDER.map((key) => {
                        const label = PRAYER_LABELS[key];
                        const time = prayerTimes ? (prayerTimes as any)[key] : '--:--';
                        const completed = completedSet.has(label);
                        const isNext = key === nextPrayer;

                        return (
                            <PrayerCard
                                key={key}
                                name={label}
                                time={time}
                                isNext={isNext}
                                isCompleted={completed}
                                onPressMark={
                                    !completed && user
                                        ? () => markPrayerCompleted(user.id, label)
                                        : undefined
                                }
                            />
                        );
                    })}
                </View>
            </View>
        </ScreenWrapper>
    );
}
