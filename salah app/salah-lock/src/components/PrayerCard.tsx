import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface PrayerCardProps {
    name: string;
    time: string;
    isNext?: boolean;
    isCompleted?: boolean;
    onPressMark?: () => void;
}

export default function PrayerCard({ name, time, isNext, isCompleted, onPressMark }: PrayerCardProps) {
    return (
        <View
            className={`p-5 rounded-[24px] mb-4 flex-row justify-between items-center ${isNext ? 'bg-primary' : 'bg-card'}`}
            style={
                isNext
                    ? { shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 }
                    : { borderWidth: 1, borderColor: colors.border }
            }
        >
            <View className="flex-row items-center">
                <View className={`w-12 h-12 rounded-full justify-center items-center ${isNext ? 'bg-white/20' : 'bg-primaryLight'}`}>
                    <Ionicons
                        name="time-outline"
                        size={22}
                        color={isNext ? colors.white : colors.primary}
                    />
                </View>
                <View className="ml-4">
                    <Text style={{ color: isNext ? '#FFFFFF' : '#E6EDF3', fontWeight: '700', fontSize: 17 }}>{name}</Text>
                    <Text style={{ color: isNext ? 'rgba(255,255,255,0.75)' : colors.textSecondary, fontSize: 13, marginTop: 2 }}>{time}</Text>
                </View>
            </View>

            {isCompleted ? (
                <View className="bg-success/20 px-4 py-2 rounded-full flex-row items-center border border-success/30">
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text className="text-success font-bold ml-1.5 text-xs uppercase tracking-wider">Done</Text>
                </View>
            ) : onPressMark ? (
                <TouchableOpacity
                    onPress={onPressMark}
                    className={`px-5 py-2.5 rounded-full shadow-sm ${isNext ? 'bg-white' : 'bg-primaryLight border border-primary/30'}`}
                    activeOpacity={0.7}
                >
                    <Text className={`font-bold text-sm ${isNext ? 'text-primary' : 'text-primary'}`}>Mark prayed</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
