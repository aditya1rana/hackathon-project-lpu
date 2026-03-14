import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAppStore } from '../store/useAppStore';
import { signOutUser } from '../services/firebase';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { CommonActions, useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
    const user = useAppStore((s) => s.user);
    const subscription = useAppStore((s) => s.subscription);
    const setUser = useAppStore((s) => s.setUser);
    const prayersCompletedToday = useAppStore((s) => s.prayersCompletedToday);
    const navigation = useNavigation();

    const handleLogout = () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOutUser();
                        setUser(null);
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'Login' as never }],
                            })
                        );
                    },
                },
            ]
        );
    };

    const handleHelpSupport = () => {
        Alert.alert(
            'Help & Support',
            'How can we help you?',
            [
                {
                    text: 'Email Us',
                    onPress: () => Linking.openURL('mailto:support@salahlock.app?subject=SalahLock%20Support'),
                },
                {
                    text: 'FAQ',
                    onPress: () =>
                        Alert.alert(
                            'Frequently Asked Questions',
                            '• How does app blocking work?\nSalahLock blocks selected apps during prayer times to help you focus.\n\n• How are prayer times calculated?\nWe use your GPS location for accurate local prayer times.\n\n• Is my data private?\nYes! All data stays on your device.\n\n• When do I get notifications?\n5 minutes before prayer and exactly at prayer time.'
                        ),
                },
                { text: 'Close', style: 'cancel' },
            ]
        );
    };

    type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

    const SettingsRow = ({
        icon,
        label,
        onPress,
        color,
        showChevron = true,
    }: {
        icon: IoniconsName;
        label: string;
        onPress?: () => void;
        color?: string;
        showChevron?: boolean;
    }) => (
        <TouchableOpacity
            className="flex-row items-center justify-between py-4"
            onPress={onPress}
            activeOpacity={0.6}
        >
            <View className="flex-row items-center">
                <View
                    className="w-9 h-9 rounded-xl justify-center items-center"
                    style={{
                        backgroundColor:
                            color === colors.danger ? 'rgba(248,81,73,0.15)' : colors.primaryLight,
                    }}
                >
                    <Ionicons name={icon} size={18} color={color || colors.primary} />
                </View>
                <Text
                    className="font-semibold ml-3 text-base"
                    style={{ color: color === colors.danger ? colors.danger : '#E6EDF3' }}
                >
                    {label}
                </Text>
            </View>
            {showChevron && <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper safeAreaEdges={['top']} bgClass="bg-background">
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
                className="px-6 py-6"
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-3xl font-bold text-white mb-8">Profile</Text>

                {/* User Info Card */}
                <View
                    className="rounded-[30px] p-8 items-center mb-8"
                    style={{
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.15,
                        shadowRadius: 16,
                        elevation: 4,
                    }}
                >
                    <View
                        className="w-24 h-24 rounded-full justify-center items-center mb-5"
                        style={{ backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.border }}
                    >
                        <Ionicons name="person" size={42} color={colors.primary} />
                    </View>
                    <Text className="text-xl font-bold text-white text-center">
                        {user?.name || user?.email || 'Guest User'}
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="text-sm mt-1">
                        {user?.email || 'No email set'}
                    </Text>
                    <View
                        className="px-5 py-2 rounded-full mt-4"
                        style={{ backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.border }}
                    >
                        <Text className="font-bold text-xs capitalize" style={{ color: colors.gold }}>
                            {subscription?.plan || user?.subscriptionStatus || 'Free'} Plan
                        </Text>
                    </View>
                </View>

                {/* Stats */}
                <Text className="text-lg font-bold text-white mb-4">Your Statistics</Text>
                <View className="flex-row justify-between mb-8" style={{ gap: 12 }}>
                    <View
                        className="flex-1 p-5 rounded-3xl items-center"
                        style={{
                            backgroundColor: colors.card,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Ionicons name="flame" size={26} color={colors.gold} />
                        <Text className="text-2xl font-bold text-white mt-2">{user?.streak || 0}</Text>
                        <Text style={{ color: colors.textSecondary }} className="text-xs mt-1">Day Streak</Text>
                    </View>
                    <View
                        className="flex-1 p-5 rounded-3xl items-center"
                        style={{
                            backgroundColor: colors.card,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                        <Text className="text-2xl font-bold text-white mt-2">{prayersCompletedToday}</Text>
                        <Text style={{ color: colors.textSecondary }} className="text-xs mt-1">Prayers Today</Text>
                    </View>
                </View>

                {/* Settings Links */}
                <View
                    className="rounded-3xl px-5"
                    style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                >
                    <SettingsRow
                        icon="star"
                        label="Upgrade to Premium"
                        onPress={() =>
                            Alert.alert(
                                'Coming Soon',
                                'Premium features will be available in a future update!'
                            )
                        }
                    />
                    <View className="h-px" style={{ backgroundColor: colors.border }} />
                    <SettingsRow icon="help-circle" label="Help & Support" onPress={handleHelpSupport} />
                    <View className="h-px" style={{ backgroundColor: colors.border }} />
                    <SettingsRow
                        icon="log-out"
                        label="Log Out"
                        onPress={handleLogout}
                        color={colors.danger}
                        showChevron={false}
                    />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}
