import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	Button,
	StyleSheet,
	Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { insertTransaction } from "../database";

export default function QuickAddModal() {
	const navigation = useNavigation();
	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState("");
	const [date, setDate] = useState(new Date());
	const [type, setType] = useState<"expense" | "income">("expense"); // you can expand this as needed
	const [showPicker, setShowPicker] = useState(false);

	const onSave = async () => {
		if (!amount || !category) return;
		await insertTransaction(
			type,
			parseFloat(amount),
			category,
			date.toISOString()
		);
		navigation.goBack();
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Quick Add</Text>
			<TextInput
				style={styles.input}
				placeholder="Amount"
				keyboardType="numeric"
				value={amount}
				onChangeText={setAmount}
			/>
			<TextInput
				style={styles.input}
				placeholder="Category"
				value={category}
				onChangeText={setCategory}
			/>
			<View style={styles.row}>
				<Button
					title={type === "expense" ? "Expense" : "Income"}
					onPress={() => setType(type === "expense" ? "income" : "expense")}
				/>
				<Button
					title={date.toLocaleDateString()}
					onPress={() => setShowPicker(true)}
				/>
			</View>
			{showPicker && (
				<DateTimePicker
					value={date}
					mode="date"
					display={Platform.OS === "ios" ? "spinner" : "default"}
					onChange={(_, selected) => {
						setShowPicker(false);
						if (selected) setDate(selected);
					}}
				/>
			)}
			<Button title="Save" onPress={onSave} />
			<Button title="Cancel" onPress={() => navigation.goBack()} color="gray" />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 20, justifyContent: "center" },
	title: { fontSize: 24, marginBottom: 20, textAlign: "center" },
	input: {
		borderBottomWidth: 1,
		borderColor: "#ccc",
		marginBottom: 15,
		padding: 10,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 20,
	},
});
