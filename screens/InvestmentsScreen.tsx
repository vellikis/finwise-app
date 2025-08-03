import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	Button,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Alert,
	Platform,
	UIManager,
	LayoutAnimation,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	insertInvestment,
	getInvestments,
	initDB,
	deleteInvestment,
} from "../database";

// Enable LayoutAnimation on Android
if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

const InvestmentsScreen = () => {
	const [investmentName, setInvestmentName] = useState("");
	const [amountInvested, setAmountInvested] = useState("");
	const [investments, setInvestments] = useState<any[]>([]);

	useEffect(() => {
		initDB();
		fetchInvestments();
	}, []);

	const fetchInvestments = async () => {
		try {
			const data = await getInvestments();
			setInvestments(data);
		} catch (error) {
			console.error(error);
		}
	};

	const handleAddInvestment = async () => {
		const invested = parseFloat(amountInvested);
		if (isNaN(invested)) {
			Alert.alert("Please enter a valid number for amount");
			return;
		}
		if (!investmentName.trim()) {
			Alert.alert("Please enter an investment name");
			return;
		}
		try {
			// We pass 0 for return_percentage and empty date
			await insertInvestment(invested, investmentName.trim(), 0, "");
			setInvestmentName("");
			setAmountInvested("");
			fetchInvestments();
		} catch (error) {
			console.error(error);
			Alert.alert("Failed to save investment");
		}
	};

	const confirmDelete = (id: number) => {
		Alert.alert(
			"Delete Holding",
			"Are you sure you want to delete this holding?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							await deleteInvestment(id);
							fetchInvestments();
						} catch (err) {
							console.error(err);
							Alert.alert("Failed to delete");
						}
					},
				},
			],
			{ cancelable: true }
		);
	};

	// Compute total invested
	const totalInvested = investments.reduce((sum, i) => sum + i.amount, 0);

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView
				contentContainerStyle={styles.container}
				keyboardShouldPersistTaps="handled"
			>
				{/* Total Invested Display */}
				<Text style={styles.totalText}>
					{`Total Invested:\n ${totalInvested.toFixed(2)}€`}
				</Text>

				{/* Add Holding Form */}
				<Text style={styles.title}>Add Holding</Text>
				<TextInput
					placeholder="Investment Name"
					value={investmentName}
					onChangeText={setInvestmentName}
					style={styles.input}
				/>
				<TextInput
					placeholder="Amount Invested (€)"
					keyboardType="numeric"
					value={amountInvested}
					onChangeText={setAmountInvested}
					style={styles.input}
				/>
				<Button title="Add Holding" onPress={handleAddInvestment} />

				{/* Holdings List */}
				<Text style={styles.sectionTitle}>Holdings (Long-press to delete)</Text>
				{investments.map(item => (
					<TouchableOpacity
						key={item.id}
						style={styles.itemRow}
						onLongPress={() => confirmDelete(item.id)}
					>
						<Text style={styles.itemName}>{item.platform}</Text>
						<Text style={styles.itemValue}>€{item.amount.toFixed(2)}</Text>
					</TouchableOpacity>
				))}
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#fff",
		paddingTop: Platform.OS === "android" ? 25 : 0,
	},
	container: {
		padding: 16,
	},
	totalText: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 12,
		textAlign: "center",
	},
	title: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 12,
	},
	input: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 6,
		padding: 8,
		marginBottom: 10,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		marginVertical: 12,
	},
	itemRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
		borderColor: "#eee",
	},
	itemName: {
		fontWeight: "bold",
		flex: 1,
	},
	itemValue: {
		marginLeft: 16,
	},
});

export default InvestmentsScreen;
