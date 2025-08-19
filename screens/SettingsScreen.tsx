import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet, Switch, StatusBar } from "react-native";
import { useTheme, useThemeMode } from "../theme";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";

const COLORS = {
	primary1: "#6366F1",
	primary2: "#4F46E5",
};

export default function SettingsScreen({ navigation }: any) {
	const theme = useTheme();
	const { mode, setMode } = useThemeMode();
	const insets = useSafeAreaInsets();

	const isDark = mode === "dark";
	const isLight = mode === "light";

	// Hide default header
	useLayoutEffect(() => {
		navigation?.setOptions?.({ headerShown: false });
	}, [navigation]);

	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: theme.background }}
			edges={["bottom"]}
		>
			<StatusBar
				barStyle="light-content"
				translucent
				backgroundColor="transparent"
			/>

			{/* Gradient Header */}
			<LinearGradient
				colors={[COLORS.primary2, COLORS.primary1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.header, { paddingTop: insets.top + 12 }]}
			>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Ionicons
						name="settings-outline"
						size={32}
						color="#fff"
						style={{ marginRight: 10 }}
					/>
					<Text style={styles.headerTitle}>Settings</Text>
				</View>
			</LinearGradient>

			{/* Content */}
			<View style={[styles.container]}>
				<View style={styles.row}>
					<Feather
						name="sun"
						size={24}
						color={isLight ? "#FFD93D" : theme.textSecondary}
					/>
					<Switch
						value={mode === "dark"}
						onValueChange={val => setMode(val ? "dark" : "light")}
						trackColor={{ false: "#bbb", true: "#333" }}
						thumbColor={isDark ? "#FFD93D" : "#fff"}
					/>
					<Feather
						name="moon"
						size={24}
						color={isDark ? "#FFD93D" : theme.textSecondary}
					/>
				</View>

				<Text
					style={{
						color: theme.textSecondary,
						marginTop: 16,
						fontSize: 15,
						textAlign: "center",
					}}
				>
					{mode === "system"
						? "Following device setting"
						: `App is in ${mode} mode`}
				</Text>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingBottom: 20,
		paddingHorizontal: 24,
		borderBottomLeftRadius: 28,
		borderBottomRightRadius: 28,
		elevation: 6,
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 10,
	},
	headerTitle: {
		color: "#fff",
		fontSize: 28,
		fontWeight: "900",
		letterSpacing: 1.2,
	},
	container: { flex: 1, padding: 24, alignItems: "center" },
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 18,
		padding: 18,
		borderRadius: 12,
		backgroundColor: "rgba(200,200,200,0.08)",
	},
});
