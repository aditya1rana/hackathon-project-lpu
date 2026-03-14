import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const STEPS = [
    {
        icon: 'notifications-outline' as const,
        emoji: '🔔',
        title: 'Prayer Alerts',
        description: 'Get precise Adhan notifications 5 minutes before and exactly at each of the 5 daily prayers.',
    },
    {
        icon: 'lock-closed-outline' as const,
        emoji: '🔒',
        title: 'App Blocking',
        description: "Choose which apps distract you most. They'll be automatically locked during each prayer window.",
    },
    {
        icon: 'shield-checkmark-outline' as const,
        emoji: '✅',
        title: 'Quick Setup',
        description: 'We need Location, Notifications, and Usage Stats access to keep your prayers on time, every day.',
    },
];

export default function OnboardingScreen({ navigation }: Props) {
    const [step, setStep] = useState(0);

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            navigation.navigate('Login');
        }
    };

    const current = STEPS[step];

    return (
        <ScreenWrapper safeAreaEdges={['top', 'bottom']} bgClass="bg-background">
            <View className="flex-1 justify-center items-center px-10">
                {/* Glowing Icon Circle */}
                <View
                    className="w-40 h-40 rounded-full mb-12 justify-center items-center"
                    style={{
                        backgroundColor: colors.primaryLight,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 24,
                        elevation: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}
                >
                    <Text style={{ fontSize: 60 }}>{current.emoji}</Text>
                </View>

                {/* Text */}
                <View className="items-center">
                    <Text className="text-[32px] font-bold text-white text-center mb-4 leading-tight">
                        {current.title}
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="text-center text-[15px] leading-relaxed px-2">
                        {current.description}
                    </Text>
                </View>

                {/* Step Indicators */}
                <View className="flex-row mt-12">
                    {STEPS.map((_, i) => (
                        <View
                            key={i}
                            style={{
                                height: 4,
                                borderRadius: 4,
                                marginHorizontal: 4,
                                width: i === step ? 28 : 8,
                                backgroundColor: i === step ? colors.gold : colors.border,
                            }}
                        />
                    ))}
                </View>
            </View>

            {/* Bottom Actions */}
            <View className="px-8 pb-10 pt-4" style={{ gap: 12 }}>
                <TouchableOpacity
                    onPress={handleNext}
                    className="w-full items-center justify-center py-4 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                    activeOpacity={0.85}
                >
                    <Text className="text-white font-bold text-base tracking-wide">
                        {step === STEPS.length - 1 ? 'Get Started 🕌' : 'Continue →'}
                    </Text>
                </TouchableOpacity>

                {step < STEPS.length - 1 && (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Login')}
                        className="py-3 items-center"
                    >
                        <Text style={{ color: colors.textSecondary }} className="text-center font-semibold text-sm">
                            Skip for now
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScreenWrapper>
    );
}
