// navigation/TabNavigator.tsx
import React, { useState } from "react";
import { TouchableOpacity, StyleSheet, Modal, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "../screens/HomeScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import BudgetsScreen from "../screens/BudgetsScreen";
import RecurringScreen from "../screens/RecurringScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { useTheme } from "../theme";
import QuickAddModal from "../components/QuickAddModal"; // <-- use the presentational component

export type TabParamList = {
	Home: undefined;
	Transactions: { refreshToken?: number } | undefined;
	Budgets: undefined;
	Recurring: undefined;
	Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// HOC: only used on the tabs where FAB should show
function withFAB<P extends object>(Wrapped: React.ComponentType<P>) {
	return function ComponentWithFAB(props: P) {
		const insets = useSafeAreaInsets();
		const theme = useTheme();
		const [showQuick, setShowQuick] = useState(false);

		return (
			<>
				<Wrapped {...props} />

				{/* FAB... unchanged */}
				<TouchableOpacity
					activeOpacity={0.9}
					style={[
						fabStyles.button,
						{
							backgroundColor: theme.primary,
							bottom: insets.bottom + 24,
							shadowColor: "rgba(0,0,0,0.35)",
						},
					]}
					onPress={() => setShowQuick(true)}
				>
					<Ionicons name="add" size={28} color={theme.onPrimary ?? "#fff"} />
				</TouchableOpacity>

				{/* Modal */}
				<Modal
					visible={showQuick}
					transparent
					animationType="slide"
					onRequestClose={() => setShowQuick(false)}
				>
					<QuickAddModal
						onClose={() => setShowQuick(false)}
						onSaved={() => {
							(props as any)?.navigation?.navigate("Transactions", {
								refreshToken: Date.now(),
							});
						}}
					/>
				</Modal>
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
					switch (route.name) {
						case "Home":
							return <Feather name="home" size={size} color={color} />;
						case "Transactions":
							return (
								<Ionicons name="swap-horizontal" size={size} color={color} />
							);
						case "Budgets":
							return (
								<Ionicons name="wallet-outline" size={size} color={color} />
							);
						case "Recurring":
							return <Ionicons name="repeat" size={size} color={color} />;
						case "Settings":
							return <Feather name="settings" size={size} color={color} />;
						default:
							return null;
					}
				},
			})}
		>
			{/* ✅ FAB only on these two tabs */}
			<Tab.Screen name="Home" component={withFAB(HomeScreen)} />
			<Tab.Screen name="Transactions" component={withFAB(TransactionsScreen)} />

			{/* ⛔ No FAB on these */}
			<Tab.Screen name="Budgets" component={BudgetsScreen} />
			<Tab.Screen name="Recurring" component={RecurringScreen} />
			<Tab.Screen name="Settings" component={SettingsScreen} />
		</Tab.Navigator>
	);
}

const fabStyles = StyleSheet.create({
	button: {
		position: "absolute",
		right: 20,
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		elevation: 8, // Android shadow
		shadowOpacity: 0.35,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 6 },
	},
});
