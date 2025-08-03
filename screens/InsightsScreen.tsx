import React from "react";
import { View, Text, StyleSheet } from "react-native";

const InsightsScreen = () => (
	<View style={styles.container}>
		<Text style={styles.text}>Welcome to Insights</Text>
	</View>
);

export default InsightsScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	text: {
		fontSize: 20,
		fontWeight: "bold",
	},
});
