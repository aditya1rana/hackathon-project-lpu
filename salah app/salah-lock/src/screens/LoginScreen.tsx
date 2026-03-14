import React, { useState, useEffect } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import Button from '../components/Button';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInWithGoogle } from '../services/firebase';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
    const [loading, setLoading] = useState(false);
    const setUser = useAppStore((state) => state.setUser);
    const loadBlockingSettings = useAppStore((state) => state.loadBlockingSettings);
    const loadPrayerTimes = useAppStore((state) => state.loadPrayerTimes);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: '1005196809234-jt4jhtqtdi9kuvkt7de3qbj7ectgpr1d.apps.googleusercontent.com',
            offlineAccess: true,
        });
    }, []);

    const processLoginSuccess = async (idToken?: string) => {
        setLoading(true);
        await signInWithGoogle(idToken);

        setUser({
            id: 'demo-user',
            email: 'user@example.com',
            streak: 5,
            createdAt: new Date().toISOString(),
            subscriptionStatus: 'free',
        });

        try { await loadBlockingSettings('demo-user'); } catch (e) { }

        try { await loadPrayerTimes('demo-user'); } catch (e) { }

        // Fire off location without blocking navigation
        (async () => {
            try {
                const { getCurrentLocation } = await import('../services/location');
                const loc = await getCurrentLocation();
                if (loc) {
                    const currentUser = useAppStore.getState().user;
                    if (currentUser) {
                        useAppStore.getState().setUser({
                            ...currentUser,
                            latitude: loc.latitude,
                            longitude: loc.longitude,
                            city: loc.city,
                        });
                        // Reload prayer times now that we have accurate coordinates
                        useAppStore.getState().loadPrayerTimes('demo-user');
                    }
                }
            } catch (e) {
                console.warn('Location fetch on login failed:', e);
            }
        })();

        // Navigate immediately after required state is ready
        setLoading(false);
        navigation.replace('NameInput');
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const response = await GoogleSignin.signIn();
            const idToken = response.data?.idToken || undefined;
            await processLoginSuccess(idToken);
        } catch (error: any) {
            console.error('Google Sign-In Error:', error);
            if (error?.message?.includes('developer error') || error?.code === 'DEVELOPER_ERROR' || error?.message?.includes('webClientId')) {
                Alert.alert(
                    "Google Sign-In Setup Needed",
                    "Google Sign-In requires Firebase configuration. Would you like to continue as a guest for now?",
                    [
                        { text: "Continue as Guest", onPress: () => processLoginSuccess() },
                        { text: "Cancel", style: "cancel", onPress: () => setLoading(false) },
                    ]
                );
            } else {
                setLoading(false);
                Alert.alert("Login Failed", `Error: ${error?.code || 'unknown'}\n${error?.message || 'Could not complete Google Sign-In.'}`);
            }
        }
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        await processLoginSuccess();
    };

    return (
        <ScreenWrapper safeAreaEdges={['top', 'bottom']} bgClass="bg-background">
            <View className="flex-1 justify-center px-8 relative">

                {/* Background glowing silhouette effect */}
                <View className="absolute top-0 right-0 left-0 bottom-0 opacity-20 items-center justify-center">
                    <View className="w-[150%] h-[60%] rounded-full absolute bottom-1/4" style={{ backgroundColor: colors.primary, filter: 'blur(80px)' }} />
                    <Ionicons name="moon" size={120} color={colors.primaryLight} style={{ position: 'absolute', top: '10%', right: '10%', opacity: 0.1 }} />
                </View>

                {/* Hero / Icon */}
                <View className="mb-14 items-center z-10">
                    <Text className="text-gold tracking-[0.2em] text-xs font-bold mb-4 uppercase" style={{ color: colors.gold }}>Assalamu Alaikum</Text>
                    <Text className="text-[40px] font-bold text-white mb-4 text-center leading-tight">
                        Welcome to{'\n'}SalahLock
                    </Text>
                    <Text className="text-white/60 text-center text-[15px] leading-relaxed px-4">
                        Stay focused on your prayers by{'\n'}silencing the digital world.
                    </Text>
                </View>

                {/* Buttons (Glassmorphism) */}
                <View style={{ gap: 16 }} className="z-10">
                    <TouchableOpacity
                        onPress={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex-row items-center justify-center py-4 rounded-full bg-white/10"
                        style={{ borderWidth: 1, borderColor: colors.gold }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-google" size={20} color={colors.white} />
                        <Text className="text-white font-bold text-base ml-3">
                            {loading ? "Signing in..." : "Continue with Google"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleGuestLogin}
                        disabled={loading}
                        className="w-full flex-row items-center justify-center py-4 rounded-full bg-white/5"
                        style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="person-outline" size={20} color={colors.white} />
                        <Text className="text-white font-bold text-base ml-3">
                            Continue as Guest
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Terms */}
                <View className="mt-12 items-center z-10">
                    <Text className="text-white/40 text-[11px] text-center leading-relaxed">
                        By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy.
                    </Text>
                </View>
            </View>
        </ScreenWrapper>
    );
}
