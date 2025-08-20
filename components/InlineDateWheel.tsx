import React from "react";
import { View, StyleSheet, Platform, Appearance } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

type Props = {
	value: Date;
	onChange: (d: Date) => void;
	backgroundColor?: string;
	borderColor?: string;
	style?: any;
};

export default function InlineDateWheel({
	value,
	onChange,
	backgroundColor = "#fff",
	borderColor = "#e5e7eb",
	style,
}: Props) {
	// Only render inline wheel on iOS. (Android uses native dialog outside this component.)
	if (Platform.OS !== "ios") return null;

	return (
		<View style={[styles.box, { backgroundColor, borderColor }, style]}>
			<DateTimePicker
				value={value}
				mode="date"
				display="spinner"
				themeVariant={Appearance.getColorScheme() === "dark" ? "dark" : "light"}
				onChange={(_, selected) => {
					if (selected) onChange(selected);
				}}
				style={styles.wheel}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	box: {
		borderWidth: 1,
		borderRadius: 16,
		overflow: "hidden",
		alignSelf: "stretch",
		width: "100%",
		minWidth: 0,
		marginBottom: 12,
	},
	wheel: {
		width: "100%",
		alignSelf: "stretch",
		height: 216,
	},
});
