import React from "react";
import { View, Text } from "react-native";

const PlaceholderScreen = ({ label }: { label: string }) => (
	<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
		<Text style={{ fontSize: 24, color: "#555" }}>{label}</Text>
	</View>
);

const RecurringScreen = () => <PlaceholderScreen label="Recurring" />;
export default RecurringScreen;
