// App.tsx
import React, { useCallback, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import {
	NavigationContainer,
	DarkTheme as NavDark,
	DefaultTheme as NavLight,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";

import TabNavigator from "./navigation/TabNavigator";
import { ThemeProvider, useTheme, useThemeMode } from "./theme";
import { initDB, materializeRecurring } from "./database";

SplashScreen.preventAutoHideAsync(); // <-- call once, as early as possible

const Stack = createNativeStackNavigator<{ MainTabs: undefined }>();

function ThemedNavigation() {
	const theme = useTheme();
	const { mode } = useThemeMode();
	const scheme = useColorScheme();
	const isDark = mode === "dark" || (mode === "system" && scheme === "dark");

	const navTheme = {
		...(isDark ? NavDark : NavLight),
		colors: {
			...(isDark ? NavDark.colors : NavLight.colors),
			primary: theme.primary1,
			background: theme.background,
			card: theme.card,
			text: theme.text,
			border: theme.border,
			notification: theme.primary2,
		},
	};

	return (
		<NavigationContainer theme={navTheme}>
			<Stack.Navigator screenOptions={{ headerShown: false }}>
				<Stack.Screen name="MainTabs" component={TabNavigator} />
			</Stack.Navigator>
		</NavigationContainer>
	);
}

export default function App() {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		(async () => {
			// Do all your startup work while the splash is visible
			await initDB();
			await materializeRecurring();
			setReady(true);
		})();
	}, []);

	// Hide the splash *after* the first frame of your UI is laid out
	const onLayoutRootView = useCallback(async () => {
		if (ready) {
			await SplashScreen.hideAsync();
		}
	}, [ready]);

	if (!ready) {
		// Returning null keeps the splash visible
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
			<ThemeProvider>
				<ThemedNavigation />
			</ThemeProvider>
		</GestureHandlerRootView>
	);
}
