import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { colors } from '../theme/colors';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    loading?: boolean;
    fullWidth?: boolean;
    className?: string;
}

export default function Button({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    fullWidth = true,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    let bgClass = 'bg-primary';
    let textClass = 'text-white';

    if (variant === 'secondary') {
        bgClass = 'bg-primaryLight';
        textClass = 'text-primary';
    } else if (variant === 'danger') {
        bgClass = 'bg-danger';
        textClass = 'text-white';
    } else if (variant === 'outline') {
        bgClass = 'bg-transparent border-2 border-primary';
        textClass = 'text-primary';
    }

    const widthClass = fullWidth ? 'w-full' : 'w-auto px-8';
    const opacityClass = disabled ? 'opacity-50' : 'opacity-100';

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            disabled={disabled || loading}
            className={`py-4 rounded-full flex-row justify-center items-center ${bgClass} ${widthClass} ${opacityClass} ${className}`}
            style={{
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4
            }}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' || variant === 'secondary' ? colors.primary : colors.white} />
            ) : (
                <Text className={`font-semibold text-base ${textClass}`}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}
