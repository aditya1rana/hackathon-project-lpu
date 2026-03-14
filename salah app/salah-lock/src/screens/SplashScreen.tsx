import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { colors } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
    const user = useAppStore((s) => s.user);

    useEffect(() => {
        const timer = setTimeout(() => {
            // If user is already logged in, go directly to Main
            if (user) {
                navigation.replace('Main');
            } else {
                navigation.replace('Onboarding');
            }
        }, 1800);
        return () => clearTimeout(timer);
    }, [navigation, user]);

    return (
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.background }}>
            {/* Glowing Mosque Icon */}
            <View
                className="w-32 h-32 rounded-full justify-center items-center mb-8"
                style={{
                    backgroundColor: colors.primaryLight,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.4,
                    shadowRadius: 24,
                    elevation: 12
                }}
            >
                <Text style={{ fontSize: 60 }}>🕌</Text>
            </View>

            {/* App Name */}
            <Text
                className="text-5xl font-bold tracking-tight"
                style={{ color: colors.primary, textShadowColor: 'rgba(15,189,73,0.3)', textShadowRadius: 16 }}
            >
                SalahLock
            </Text>
            <Text className="text-base mt-3 font-medium" style={{ color: colors.textSecondary }}>
                Pray on time. Stay focused.
            </Text>

            {/* Gold divider */}
            <View className="w-16 h-0.5 mt-6 mb-2 rounded-full" style={{ backgroundColor: colors.gold }} />

            {/* Loading */}
            <View className="absolute bottom-16">
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        </View>
    );
}
