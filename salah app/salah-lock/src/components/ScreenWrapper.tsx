import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
    children: React.ReactNode;
    scrollable?: boolean;
    style?: StyleProp<ViewStyle>;
    safeAreaEdges?: ('top' | 'right' | 'bottom' | 'left')[];
    bgClass?: string;
}

export default function ScreenWrapper({
    children,
    scrollable = false,
    style,
    safeAreaEdges,
    bgClass = 'bg-background',
}: ScreenWrapperProps) {
    const content = scrollable ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
        </ScrollView>
    ) : (
        <View className="flex-1">{children}</View>
    );

    return (
        <SafeAreaView
            className={`flex-1 ${bgClass}`}
            style={style}
            edges={safeAreaEdges}
        >
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {content}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
