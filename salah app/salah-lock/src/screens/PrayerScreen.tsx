import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const PRAYER_LABELS: Record<string, string> = {
    fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};

const QUOTES = [
    { text: '"Successful indeed are the believers, those who are humble in their prayers."', ref: 'Quran 23:1-2' },
    { text: '"Indeed, prayer has been decreed upon the believers a decree of specified times."', ref: 'Quran 4:103' },
    { text: '"Establish prayer and give zakah and bow with those who bow [in worship and obedience]."', ref: 'Quran 2:43' },
];

export default function PrayerScreen() {
    const user = useAppStore((s) => s.user);
    const prayerTimes = useAppStore((s) => s.prayerTimes);
    const todayLogs = useAppStore((s) => s.todayLogs);
    const markPrayerCompleted = useAppStore((s) => s.markPrayerCompleted);
    const prayersCompletedToday = useAppStore((s) => s.prayersCompletedToday);

    const completedSet = new Set(
        todayLogs.filter((l) => l.completed).map((l) => l.prayerName)
    );
    const nextPrayer = PRAYER_ORDER.find((p) => !completedSet.has(PRAYER_LABELS[p]));
    const currentLabel = nextPrayer ? PRAYER_LABELS[nextPrayer] : 'All Done';
    const currentTime = nextPrayer && prayerTimes
        ? (prayerTimes as any)[nextPrayer]
        : '--:--';

    // Pick a quote based on the day
    const quote = QUOTES[new Date().getDay() % QUOTES.length];

    return (
        <ScreenWrapper safeAreaEdges={['top']} bgClass="bg-background">
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
                className="px-6"
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-3xl font-bold text-white mt-6 mb-8">Prayer Time</Text>

                {/* Hero Section */}
                <View
                    className="items-center rounded-[32px] p-8 mb-6"
                    style={{
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.15,
                        shadowRadius: 20,
                        elevation: 6,
                    }}
                >
                    <View
                        className="w-28 h-28 rounded-full justify-center items-center mb-6"
                        style={{ backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.border }}
                    >
                        <Ionicons name="shield-checkmark" size={54} color={colors.primary} />
                    </View>
                    <Text style={{ color: colors.textSecondary }} className="text-sm font-medium mb-1 uppercase tracking-wider">
                        It's time for
                    </Text>
                    <Text className="text-5xl font-bold text-white mb-3">{currentLabel}</Text>
                    <Text className="text-2xl font-bold" style={{ color: colors.gold }}>{currentTime}</Text>

                    {/* Progress: prayers completed today */}
                    <View className="w-full mt-6">
                        <View className="flex-row justify-between mb-2">
                            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold uppercase tracking-wider">Today's Progress</Text>
                            <Text style={{ color: colors.gold }} className="text-xs font-bold">{prayersCompletedToday} / 5</Text>
                        </View>
                        <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                            <View
                                className="h-full rounded-full"
                                style={{ width: `${(prayersCompletedToday / 5) * 100}%`, backgroundColor: colors.primary }}
                            />
                        </View>
                    </View>
                </View>

                {/* Quranic Quote */}
                <View
                    className="p-6 rounded-3xl mb-6"
                    style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                >
                    <View className="flex-row items-center mb-3">
                        <Ionicons name="book-outline" size={16} color={colors.gold} />
                        <Text className="font-bold text-xs ml-2 uppercase tracking-wider" style={{ color: colors.gold }}>
                            Daily Inspiration
                        </Text>
                    </View>
                    <Text className="text-white text-center italic text-[15px] leading-relaxed">{quote.text}</Text>
                    <Text style={{ color: colors.textSecondary }} className="text-center mt-3 font-semibold text-sm">
                        {quote.ref}
                    </Text>
                </View>

                {/* Action Button */}
                {nextPrayer && user ? (
                    <TouchableOpacity
                        onPress={() => markPrayerCompleted(user.id, currentLabel)}
                        className="w-full items-center justify-center py-4 rounded-full"
                        style={{ backgroundColor: colors.primary }}
                        activeOpacity={0.85}
                    >
                        <Text className="text-white font-bold text-base">✓ I Prayed {currentLabel}</Text>
                    </TouchableOpacity>
                ) : (
                    <View
                        className="p-5 rounded-3xl items-center"
                        style={{ backgroundColor: `${colors.success}18`, borderWidth: 1, borderColor: `${colors.success}30` }}
                    >
                        <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                        <Text className="font-bold text-base mt-2" style={{ color: colors.success }}>
                            Mashallah! All 5 prayers done today 🕌
                        </Text>
                    </View>
                )}

                <Text style={{ color: colors.textSecondary }} className="text-center text-xs mt-5 leading-relaxed">
                    Your apps will stay locked until the prayer window is over.{'\n'}Focus on your connection with Allah.
                </Text>
            </ScrollView>
        </ScreenWrapper>
    );
}
