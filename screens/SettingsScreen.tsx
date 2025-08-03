import React from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { useTheme, useThemeMode } from "../theme";
import { Feather } from "@expo/vector-icons";

export default function SettingsScreen() {
	const theme = useTheme();
	const { mode, setMode } = useThemeMode();

	const isDark = mode === "dark";
	const isLight = mode === "light";

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<Text style={[styles.header, { color: theme.text }]}>Settings</Text>

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
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 24, alignItems: "center" },
	header: { fontSize: 26, fontWeight: "700", marginBottom: 30 },
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 18,
		padding: 18,
		borderRadius: 12,
		backgroundColor: "rgba(200,200,200,0.08)",
	},
});
