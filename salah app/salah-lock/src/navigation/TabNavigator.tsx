import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import PrayerScreen from '../screens/PrayerScreen';
import CompassScreen from '../screens/CompassScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
    Home: { active: 'home', inactive: 'home-outline' },
    Prayer: { active: 'moon', inactive: 'moon-outline' },
    Compass: { active: 'compass', inactive: 'compass-outline' },
    Settings: { active: 'settings', inactive: 'settings-outline' },
    Profile: { active: 'person', inactive: 'person-outline' },
};

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: colors.gold,
                tabBarInactiveTintColor: colors.tabInactive,
                tabBarStyle: {
                    backgroundColor: '#061D13',  // Deep dark green matching background
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                    paddingTop: 10,
                    height: Platform.OS === 'ios' ? 88 : 68,
                    elevation: 0,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '700',
                    marginTop: 2,
                    letterSpacing: 0.3,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = TAB_ICONS[route.name];
                    const iconName = focused ? icons.active : icons.inactive;
                    return (
                        <View
                            style={
                                focused
                                    ? {
                                        backgroundColor: 'rgba(15,189,73,0.12)',
                                        borderRadius: 12,
                                        padding: 5,
                                    }
                                    : { padding: 5 }
                            }
                        >
                            <Ionicons name={iconName} size={22} color={color} />
                        </View>
                    );
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Prayer" component={PrayerScreen} />
            <Tab.Screen name="Compass" component={CompassScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}
