import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Button,
	ScrollView,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { initDB, getTransactions } from "../database";
import { useTheme } from "../theme"; // ← Import your theme hook

const userName = "Evan"; // You can make this dynamic later!

function getGreeting() {
	const hour = new Date().getHours();
	if (hour < 5) return "Good night";
	if (hour < 12) return "Good morning";
	if (hour < 18) return "Good afternoon";
	return "Good evening";
}

const HomeScreen = () => {
	const [balance, setBalance] = useState<number>(0);
	const navigation = useNavigation<any>();
	const theme = useTheme();

	useEffect(() => {
		(async () => {
			initDB();
			await calculateBalance();
		})();
	}, []);

	const calculateBalance = async () => {
		try {
			const txns = await getTransactions();
			const bal = txns.reduce(
				(sum, t) => (t.type === "income" ? sum + t.amount : sum - t.amount),
				0
			);
			setBalance(bal);
		} catch (err) {
			console.error("Error calculating balance:", err);
		}
	};

	return (
		<SafeAreaView
			style={[styles.safeArea, { backgroundColor: theme.background }]}
			edges={["top"]}
		>
			<ScrollView contentContainerStyle={styles.container}>
				<Text
					style={[
						styles.greeting,
						{ color: theme.text, marginTop: 14, marginBottom: 18 },
					]}
				>
					{getGreeting()}, {userName}!
				</Text>
				<Text style={[styles.heading, { color: theme.textSecondary }]}>
					Welcome to FinWise
				</Text>

				<View style={styles.section}>
					<Text style={[styles.label, { color: theme.textSecondary }]}>
						Current Balance
					</Text>
					<Text style={[styles.balance, { color: theme.text }]}>
						€{balance.toFixed(2)}
					</Text>
				</View>

				<View style={styles.actionsRow}>
					<Button
						title="Add Transaction"
						onPress={() => navigation.navigate("Transactions")}
						color={theme.primary}
					/>
					<Button
						title="Add Investment"
						onPress={() => navigation.navigate("Investments")}
						color={theme.accent}
					/>
				</View>

				<View style={styles.section}>
					<Text style={[styles.subheading, { color: theme.text }]}>
						Quick Insights
					</Text>
					<Text style={[styles.note, { color: theme.textSecondary }]}>
						• Predicted end-of-month balance
					</Text>
					<Text style={[styles.note, { color: theme.textSecondary }]}>
						• Spending by category chart
					</Text>
					<Text style={[styles.note, { color: theme.textSecondary }]}>
						• Investment overview (total invested, returns)
					</Text>
					<Text style={[styles.note, { color: theme.textSecondary }]}>
						• Alerts if you’re close to overspending
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

export default HomeScreen;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		paddingTop: Platform.OS === "android" ? 25 : 0,
	},
	container: {
		padding: 20,
	},
	greeting: {
		fontSize: 26,
		fontWeight: "700",
		textAlign: "center",
	},
	heading: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 24,
		textAlign: "center",
		letterSpacing: 0.2,
	},
	section: {
		marginBottom: 30,
	},
	label: {
		fontSize: 16,
	},
	balance: {
		fontSize: 32,
		fontWeight: "bold",
		marginTop: 5,
	},
	actionsRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginBottom: 30,
	},
	subheading: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 10,
	},
	note: {
		fontSize: 14,
		marginLeft: 10,
		marginBottom: 5,
	},
});
