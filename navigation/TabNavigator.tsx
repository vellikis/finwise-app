import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather, Ionicons } from "@expo/vector-icons";

// Import screens
import HomeScreen from "../screens/HomeScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import CategoriesScreen from "../screens/CategoriesScreen";
import RecurringScreen from "../screens/RecurringScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { useTheme } from "../theme";

// Type for Bottom Tabs
export type TabParamList = {
	Home: undefined;
	Transactions: undefined;
	Categories: undefined;
	Recurring: undefined;
	Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// HOC to inject FAB
function withFAB<P extends object>(WrappedComponent: React.ComponentType<P>) {
	return function ComponentWithFAB(props: any) {
		const navigation = useNavigation<NavigationProp<any>>();
		return (
			<>
				<WrappedComponent {...props} />
				<TouchableOpacity
					style={fabStyles.button}
					onPress={() => navigation.navigate("QuickAdd")}
				>
					<Text style={fabStyles.text}>+</Text>
				</TouchableOpacity>
			</>
		);
	};
}

export default function TabNavigator() {
	const theme = useTheme();

	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				headerStyle: { backgroundColor: theme.card },
				headerTintColor: theme.text,
				tabBarStyle: {
					backgroundColor: theme.card,
					borderTopColor: theme.border,
				},
				tabBarActiveTintColor: theme.primary,
				tabBarInactiveTintColor: theme.textSecondary,
				tabBarShowLabel: true,
				tabBarIcon: ({ color, size }) => {
					if (route.name === "Home") {
						return <Feather name="home" size={size} color={color} />;
					}
					if (route.name === "Transactions") {
						return <Feather name="list" size={size} color={color} />;
					}
					if (route.name === "Categories") {
						return <Feather name="grid" size={size} color={color} />;
					}
					if (route.name === "Recurring") {
						return <Ionicons name="repeat" size={size} color={color} />;
					}
					if (route.name === "Settings") {
						return <Feather name="settings" size={size} color={color} />;
					}
					return null;
				},
			})}
		>
			<Tab.Screen name="Home" component={withFAB(HomeScreen)} />
			<Tab.Screen name="Transactions" component={withFAB(TransactionsScreen)} />
			<Tab.Screen name="Categories" component={withFAB(CategoriesScreen)} />
			<Tab.Screen name="Recurring" component={withFAB(RecurringScreen)} />
			<Tab.Screen name="Settings" component={withFAB(SettingsScreen)} />
		</Tab.Navigator>
	);
}

const fabStyles = StyleSheet.create({
	button: {
		position: "absolute",
		right: 20,
		bottom: 30,
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: "#007AFF",
		alignItems: "center",
		justifyContent: "center",
		elevation: 8, // Add shadow on Android
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
	text: { color: "#fff", fontSize: 32, lineHeight: 32 },
});
