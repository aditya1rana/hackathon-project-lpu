import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.75;

// Mecca Coordinates
const MECCA_LAT = 21.422487;
const MECCA_LON = 39.826206;

export default function CompassScreen() {
    const [magnetometer, setMagnetometer] = useState(0);
    const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
    const [subscription, setSubscription] = useState<any>(null);

    const user = useAppStore((s) => s.user);

    const rotation = useSharedValue(0);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    };

    useEffect(() => {
        _subscribe();
        return () => {
            _unsubscribe();
        };
    }, []);

    const [distance, setDistance] = useState<number | null>(null);

    useEffect(() => {
        if (user?.latitude && user?.longitude) {
            const bearing = calculateQiblaBearing(user.latitude, user.longitude);
            setQiblaBearing(bearing);
            setDistance(calculateDistance(user.latitude, user.longitude, MECCA_LAT, MECCA_LON));
        }
    }, [user?.latitude, user?.longitude]);


    useEffect(() => {
        if (qiblaBearing !== null) {
            let degree = qiblaBearing - magnetometer;
            if (degree < 0) degree += 360;

            const diff = degree - rotation.value;
            if (diff > 180) {
                rotation.value += 360;
            } else if (diff < -180) {
                rotation.value -= 360;
            }

            rotation.value = withSpring(degree, { damping: 20, stiffness: 90 });
        }
    }, [magnetometer, qiblaBearing]);

    const _subscribe = () => {
        Magnetometer.setUpdateInterval(50);
        setSubscription(
            Magnetometer.addListener((data) => {
                setMagnetometer(_angle(data));
            })
        );
    };

    const _unsubscribe = () => {
        subscription && subscription.remove();
        setSubscription(null);
    };

    const _angle = (magnetometer: any) => {
        let angle = 0;
        if (magnetometer) {
            let { x, y } = magnetometer;
            if (Math.atan2(y, x) >= 0) {
                angle = Math.atan2(y, x) * (180 / Math.PI);
            } else {
                angle = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
            }
        }
        return Math.round(angle);
    };

    const calculateQiblaBearing = (lat: number, lon: number): number => {
        const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
        const toDegrees = (rad: number) => (rad * 180) / Math.PI;

        const phi1 = toRadians(lat);
        const phi2 = toRadians(MECCA_LAT);
        const deltaLambda = toRadians(MECCA_LON - lon);

        const y = Math.sin(deltaLambda);
        const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda);
        let bearing = toDegrees(Math.atan2(y, x));

        return (bearing + 360) % 360;
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${rotation.value}deg` }],
        };
    });

    const isFacingQibla = qiblaBearing !== null && (Math.abs((qiblaBearing - magnetometer + 360) % 360) < 10 || Math.abs((qiblaBearing - magnetometer + 360) % 360) > 350);
    const currentDegree = Math.round(magnetometer);

    return (
        <ScreenWrapper safeAreaEdges={['top']} bgClass="bg-background">
            <View className="flex-1 items-center justify-center px-6 pb-12 relative">

                {/* Background geometric pattern glow */}
                <View className="absolute top-1/4 w-[120%] h-[50%] opacity-20" style={{ backgroundColor: colors.primary, borderRadius: 1000, filter: 'blur(60px)' }} />

                <View className="items-center mb-12">
                    <View className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full mb-4">
                        <Text className="text-gold tracking-[0.2em] text-xs font-bold" style={{ color: colors.gold }}>🕋 MECCA</Text>
                    </View>
                    <Text className="text-4xl font-bold text-white mb-2 text-center" style={{ textShadowColor: 'rgba(255,255,255,0.2)', textShadowRadius: 10 }}>Qibla Finder</Text>
                    <Text className="text-white/60 text-center text-sm font-medium">
                        {user?.city ? `Direction from ${user.city}` : 'Rotate your phone to find the Qibla'}
                    </Text>
                </View>

                {/* Compass Dial (Frosted Glass) */}
                <View className="justify-center items-center rounded-full mb-10" style={styles.compassContainer}>
                    <View
                        style={[
                            styles.compassWrapper,
                            {
                                borderColor: isFacingQibla ? colors.success : 'rgba(255,255,255,0.1)',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                shadowColor: isFacingQibla ? colors.success : colors.primary,
                            }
                        ]}
                        className="justify-center items-center rounded-full"
                    >
                        {/* Direction Markers */}
                        <Text style={[styles.directionText, { top: 20, color: colors.gold, opacity: 0.8 }]}>N</Text>
                        <Text style={[styles.directionText, { bottom: 20, color: 'rgba(255,255,255,0.4)' }]}>S</Text>
                        <Text style={[styles.directionText, { left: 20, color: 'rgba(255,255,255,0.4)' }]}>W</Text>
                        <Text style={[styles.directionText, { right: 20, color: 'rgba(255,255,255,0.4)' }]}>E</Text>

                        {/* Animated Needle */}
                        <Animated.View style={[styles.needleContainer, animatedStyle]}>
                            <Ionicons
                                name="navigate"
                                size={120}
                                color={isFacingQibla ? colors.success : colors.gold}
                                style={{ transform: [{ translateY: -15 }], textShadowColor: isFacingQibla ? 'rgba(15,189,73,0.5)' : 'rgba(238,189,43,0.5)', textShadowRadius: 20 }}
                            />
                        </Animated.View>
                    </View>
                </View>

                {/* Distance and Degree info */}
                {distance && (
                    <View className="flex-row justify-between w-full px-4 mb-8">
                        <View className="items-center bg-cardElevated border border-border/50 py-3 px-6 rounded-2xl shadow-sm">
                            <Text className="text-white/50 text-xs mb-1 uppercase tracking-wider">Distance</Text>
                            <Text className="text-white font-bold text-lg" style={{ color: colors.gold }}>{distance.toLocaleString()} km</Text>
                        </View>
                        <View className="items-center bg-cardElevated border border-border/50 py-3 px-6 rounded-2xl shadow-sm">
                            <Text className="text-white/50 text-xs mb-1 uppercase tracking-wider">Degree</Text>
                            <Text className="text-white font-bold text-lg" style={{ color: colors.gold }}>{currentDegree}°</Text>
                        </View>
                    </View>
                )}

                {isFacingQibla ? (
                    <View className="px-8 justify-center py-4 rounded-full flex-row items-center border border-success/30 shadow-sm" style={{ backgroundColor: 'rgba(46,160,67,0.15)' }}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                        <Text className="font-bold text-lg ml-2.5 uppercase tracking-wide" style={{ color: colors.success }}>Facing Qibla</Text>
                    </View>
                ) : (
                    <View className="px-8 justify-center py-4 rounded-full flex-row items-center border border-primary/20 shadow-sm" style={{ backgroundColor: 'rgba(15,189,73,0.1)' }}>
                        <Ionicons name="compass-outline" size={22} color={colors.primary} />
                        <Text className="font-semibold text-sm ml-2.5 uppercase tracking-wide" style={{ color: colors.primary }}>Keep rotating...</Text>
                    </View>
                )}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    compassContainer: {
        width: COMPASS_SIZE,
        height: COMPASS_SIZE,
        borderRadius: COMPASS_SIZE / 2,
        shadowColor: '#0FBD49',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 10,
    },
    compassWrapper: {
        width: '100%',
        height: '100%',
        borderWidth: 8,
        position: 'relative',
    },
    directionText: {
        position: 'absolute',
        fontSize: 18,
        fontWeight: 'bold',
    },
    needleContainer: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
    }
});
