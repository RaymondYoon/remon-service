import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { isLoggedIn, clearAuth } from './src/utils/auth';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';

export default function App() {
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'loggedIn' | 'loggedOut'

  useEffect(() => {
    isLoggedIn().then(ok => {
      setAuthState(ok ? 'loggedIn' : 'loggedOut');
    });
  }, []);

  const handleLogin = () => setAuthState('loggedIn');
  const handleLogout = async () => {
    await clearAuth();
    setAuthState('loggedOut');
  };

  if (authState === 'checking') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.background} />
        {authState === 'loggedOut'
          ? <LoginScreen onLogin={handleLogin} />
          : <AppNavigator isLoggedIn onLogout={handleLogout} />
        }
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
