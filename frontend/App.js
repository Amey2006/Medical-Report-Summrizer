// ============================================================
// BABY SCAN APP - ROOT APPLICATION ENTRY
// ============================================================
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import HomeScreen from "./src/screens/HomeScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ResultScreen from "./src/screens/ResultScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import { subscribeToSession, syncUserSession } from "./src/services/auth";
import { auth, subscribeToAuthChanges } from "./src/services/firebase";
import { COLORS } from "./src/theme";
import { getAuthProfile } from "./src/utils/storage";

const Stack = createStackNavigator();

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    const unsubscribeSession = subscribeToSession((profile) => {
      if (mounted) {
        setSessionUser(profile);
        setAuthReady(true);
      }
    });

    getAuthProfile().then((profile) => {
      if (mounted && profile) {
        setSessionUser(profile);
      }
    });

    if (!auth) {
      getAuthProfile().then((profile) => {
        if (mounted) {
          setSessionUser(profile);
          setAuthReady(true);
        }
      });

      return () => {
        mounted = false;
        unsubscribeSession();
      };
    }

    const unsubscribeFirebase = subscribeToAuthChanges(async (firebaseUser) => {
      const profile = await syncUserSession(firebaseUser);

      if (mounted) {
        setSessionUser(profile);
        setAuthReady(true);
      }
    });

    return () => {
      mounted = false;
      unsubscribeFirebase();
      unsubscribeSession();
    };
  }, []);

  if (!authReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.loadingScreen}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: COLORS.background },
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  opacity: current.progress,
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width * 0.3, 0],
                      }),
                    },
                  ],
                },
              }),
            }}
          >
            {sessionUser ? (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="History" component={HistoryScreen} />
                <Stack.Screen name="Result" component={ResultScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
