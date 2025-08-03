import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./navigation/TabNavigator";
import QuickAddModal from "./components/QuickAddModal";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme, getNavigationTheme } from "./theme";

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
				<Stack.Screen
					name="QuickAdd"
					component={QuickAddModal}
					options={{ presentation: "modal" }}
				/>
			</Stack.Navigator>
		</NavigationContainer>
	);
}

export default function App() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<ThemeProvider>
				<ThemedNavigation />
			</ThemeProvider>
		</GestureHandlerRootView>
	);
}
