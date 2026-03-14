import './src/global.css';
import 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { useAppStore } from './src/store/useAppStore';

export default function App() {
  // Request notification permissions (safe — won't crash)
  React.useEffect(() => {
    (async () => {
      try {
        const { requestPermissions } = require('./src/services/notifications');
        await requestPermissions();
      } catch (e) {
        console.warn('Notification permissions failed:', e);
      }
    })();
  }, []);

  // Periodic lock status check (safe — wrapped in try/catch in store)
  React.useEffect(() => {
    const checkLockStatus = useAppStore.getState().checkLockStatus;
    checkLockStatus();
    const interval = setInterval(checkLockStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
