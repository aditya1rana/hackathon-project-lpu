import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'NameInput'>;

export default function NameInputScreen({ navigation }: Props) {
    const [name, setName] = useState('');
    const user = useAppStore((s) => s.user);
    const setUser = useAppStore((s) => s.setUser);

    const handleContinue = () => {
        if (user) {
            setUser({ ...user, name: name.trim() || 'User' });
        }
        navigation.replace('Main');
    };

    return (
        <ScreenWrapper safeAreaEdges={['top', 'bottom']} bgClass="bg-background">
            <View className="flex-1 justify-center px-8">
                {/* Icon */}
                <View className="mb-10 items-center">
                    <View
                        className="w-24 h-24 rounded-full justify-center items-center mb-6"
                        style={{
                            backgroundColor: colors.primaryLight,
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.3,
                            shadowRadius: 16,
                            elevation: 8,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Ionicons name="person-outline" size={44} color={colors.primary} />
                    </View>
                    <Text className="text-[28px] font-bold text-white text-center mb-3 leading-tight">
                        What's your name?
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="text-center text-sm">
                        We'll personalize your experience
                    </Text>
                </View>

                {/* Name Input */}
                <View
                    className="rounded-2xl px-5 py-4 mb-8"
                    style={{
                        backgroundColor: colors.card,
                        borderWidth: 1.5,
                        borderColor: name.length > 0 ? colors.primary : colors.border,
                    }}
                >
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter your name..."
                        placeholderTextColor={colors.textSecondary}
                        autoFocus
                        autoCapitalize="words"
                        returnKeyType="done"
                        onSubmitEditing={handleContinue}
                        style={{ fontSize: 18, color: '#E6EDF3', fontWeight: '500' }}
                    />
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={name.trim().length === 0}
                    className="w-full items-center justify-center py-4 rounded-full mb-4"
                    style={{
                        backgroundColor: name.trim().length > 0 ? colors.primary : colors.border,
                        opacity: name.trim().length === 0 ? 0.6 : 1,
                    }}
                    activeOpacity={0.85}
                >
                    <Text className="text-white font-bold text-base">Continue →</Text>
                </TouchableOpacity>

                {/* Skip */}
                <TouchableOpacity
                    onPress={() => {
                        if (user) setUser({ ...user, name: 'User' });
                        navigation.replace('Main');
                    }}
                    className="py-3 items-center"
                >
                    <Text style={{ color: colors.textSecondary }} className="text-center font-semibold text-sm">
                        Skip for now
                    </Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}
