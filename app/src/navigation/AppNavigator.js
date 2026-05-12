import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import GenerateScreen from '../screens/GenerateScreen';
import LibraryScreen from '../screens/LibraryScreen';
import MyPageScreen from '../screens/MyPageScreen';
import ReadScreen from '../screens/ReadScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ icon, focused }) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>{icon}</Text>
    </View>
  );
}

function MainTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'ios' ? 0 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 80 : 68,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            android: { elevation: 8 },
          }),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Generate"
        component={GenerateScreen}
        options={{
          tabBarLabel: '책 만들기',
          tabBarIcon: ({ focused }) => <TabIcon icon="✨" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: '내 서재',
          tabBarIcon: ({ focused }) => <TabIcon icon="📚" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MyPage"
        options={{
          tabBarLabel: '마이페이지',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      >
        {props => <MyPageScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconWrapActive: {
    backgroundColor: '#EEF5E8',
  },
  icon: { fontSize: 20, opacity: 0.45 },
  iconActive: { opacity: 1 },
});

export default function AppNavigator({ isLoggedIn, onLogout }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="Main">
              {props => <MainTabs {...props} onLogout={onLogout} />}
            </Stack.Screen>
            <Stack.Screen
              name="Read"
              component={ReadScreen}
              options={{ presentation: 'card', gestureEnabled: true }}
            />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
