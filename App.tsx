import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./navigation/TabNavigator";
import QuickAddModal from "./components/QuickAddModal";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme, getNavigationTheme } from "./theme";
import * as SplashScreen from "expo-splash-screen";
import { initDB, materializeRecurring } from "./database";

export type RootStackParamList = {
	MainTabs: undefined;
	QuickAdd: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// A wrapper to access theme in NavigationContainer
function ThemedNavigation() {
	const theme = useTheme();
	return (
		<NavigationContainer theme={getNavigationTheme(theme)}>
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
			try {
				await SplashScreen.preventAutoHideAsync();
				await initDB();
				await materializeRecurring();
			} catch (e) {
				console.error("App init failed:", e);
			} finally {
				setReady(true);
				await SplashScreen.hideAsync();
			}
		})();
	}, []);

	if (!ready) return null;

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<ThemeProvider>
				<ThemedNavigation />
			</ThemeProvider>
		</GestureHandlerRootView>
	);
}
