import React, { useState } from "react";
import {
	View,
	FlatList,
	Text,
	StyleSheet,
	TouchableOpacity,
	LayoutAnimation,
	Platform,
	UIManager,
	Alert,
	Modal,
	TextInput,
	Button,
} from "react-native";
import {
	getTransactions,
	deleteTransaction,
	updateTransaction,
	Transaction,
} from "../database";
import { useIsFocused } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
// 👇 Adjust path as needed
import { useTheme } from "../theme";

if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function TransactionsScreen() {
	const theme = useTheme();

	const [data, setData] = React.useState<Transaction[]>([]);
	const [expandedId, setExpandedId] = useState<number | null>(null);

	// Edit modal states
	const [editModalVisible, setEditModalVisible] = useState(false);
	const [editingTx, setEditingTx] = useState<Transaction | null>(null);
	const [editAmount, setEditAmount] = useState("");
	const [editCategory, setEditCategory] = useState("");
	const [editType, setEditType] = useState<"income" | "expense">("expense");
	const [editDate, setEditDate] = useState(new Date());
	const [showDatePicker, setShowDatePicker] = useState(false);

	const isFocused = useIsFocused();

	React.useEffect(() => {
		if (isFocused) {
			(async () => {
				const list = await getTransactions();
				setData(list);
			})();
		}
	}, [isFocused]);

	const handleExpand = (id: number) => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setExpandedId(prevId => (prevId === id ? null : id));
	};

	const handleDelete = (id: number) => {
		Alert.alert(
			"Delete Transaction",
			"Are you sure you want to delete this transaction?",
			[
				{
					text: "Cancel",
					style: "cancel",
				},
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						await deleteTransaction(id);
						const list = await getTransactions();
						setData(list);
						setExpandedId(null);
					},
				},
			],
			{ cancelable: true }
		);
	};

	const handleEdit = (tx: Transaction) => {
		setEditingTx(tx);
		setEditAmount(tx.amount.toString());
		setEditCategory(tx.category);
		setEditType(tx.type as "income" | "expense");
		setEditDate(new Date(tx.date));
		setEditModalVisible(true);
	};

	const saveEdit = async () => {
		if (!editingTx) return;
		await updateTransaction(
			editingTx.id,
			editType,
			parseFloat(editAmount),
			editCategory,
			editDate.toISOString()
		);
		const list = await getTransactions();
		setData(list);
		setEditModalVisible(false);
		setExpandedId(null);
	};

	const styles = StyleSheet.create({
		container: { flex: 1, padding: 16, backgroundColor: theme.background },
		row: {
			flexDirection: "row",
			justifyContent: "space-between",
			paddingVertical: 18,
			borderRadius: 10,
			marginBottom: 6,
			alignItems: "center",
			paddingHorizontal: 18,
			backgroundColor: theme.card,
		},
		incomeBox: {
			backgroundColor: theme.income,
		},
		expenseBox: {
			backgroundColor: theme.expense,
		},
		rowText: {
			color: theme.text,
			fontWeight: "bold",
			fontSize: 18,
		},
		detailsBox: {
			backgroundColor: theme.card,
			padding: 14,
			borderBottomLeftRadius: 10,
			borderBottomRightRadius: 10,
			marginBottom: 10,
		},
		detailsText: {
			color: theme.textSecondary,
			marginBottom: 6,
			fontSize: 15,
		},
		deleteBtn: {
			color: theme.expense,
			fontWeight: "bold",
			fontSize: 16,
		},
		buttonRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginTop: 12,
		},
		editBtn: {
			color: theme.primary,
			fontWeight: "bold",
			fontSize: 16,
		},
		input: {
			borderBottomWidth: 1,
			borderColor: theme.border,
			marginBottom: 14,
			padding: 10,
			fontSize: 16,
			color: theme.text,
			backgroundColor: theme.card,
		},
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.4)",
			justifyContent: "center",
			alignItems: "center",
		},
		modalContent: {
			backgroundColor: theme.card,
			padding: 24,
			borderRadius: 14,
			width: "85%",
		},
		modalTitle: {
			color: theme.text,
			fontSize: 20,
			marginBottom: 16,
			textAlign: "center",
		},
		datePickerBtn: {
			padding: 10,
			borderWidth: 1,
			borderColor: theme.border,
			borderRadius: 8,
			alignItems: "center",
			marginBottom: 14,
			backgroundColor: theme.background,
		},
		datePickerText: {
			color: theme.text,
		},
	});

	const renderItem = ({ item }: { item: Transaction }) => {
		const isExpanded = expandedId === item.id;
		const boxStyle =
			item.type === "income"
				? [styles.row, styles.incomeBox]
				: [styles.row, styles.expenseBox];

		return (
			<View>
				<TouchableOpacity
					activeOpacity={0.85}
					onPress={() => handleExpand(item.id)}
				>
					<View style={boxStyle}>
						<Text style={styles.rowText}>{item.category}</Text>
						<Text style={styles.rowText}>
							{item.type === "income" ? "+" : "-"}
							{item.amount.toFixed(2)}€
						</Text>
					</View>
				</TouchableOpacity>
				{isExpanded && (
					<View style={styles.detailsBox}>
						<Text style={styles.detailsText}>
							Date: {new Date(item.date).toLocaleDateString()}
						</Text>
						<Text style={styles.detailsText}>Type: {item.type}</Text>
						<View style={styles.buttonRow}>
							<TouchableOpacity onPress={() => handleEdit(item)}>
								<Text style={styles.editBtn}>Edit</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => handleDelete(item.id)}>
								<Text style={styles.deleteBtn}>Delete</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
			</View>
		);
	};

	return (
		<View style={styles.container}>
			<FlatList
				data={data}
				keyExtractor={item => item.id?.toString() ?? Math.random().toString()}
				renderItem={renderItem}
				ListEmptyComponent={
					<View style={{ alignItems: "center", marginTop: 60 }}>
						<Text style={{ fontSize: 48, marginBottom: 12 }}>🕊️</Text>
						<Text
							style={{
								color: theme.textSecondary,
								fontSize: 17,
								textAlign: "center",
							}}
						>
							No transactions yet
						</Text>
						<Text
							style={{
								color: theme.textSecondary,
								fontSize: 15,
								marginTop: 6,
								textAlign: "center",
							}}
						>
							Tap the <Text style={{ fontWeight: "bold" }}>+</Text> button below
							to add your first one!
						</Text>
					</View>
				}
			/>

			<Modal
				visible={editModalVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setEditModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Edit Transaction</Text>
						<TextInput
							style={styles.input}
							placeholder="Amount"
							placeholderTextColor={theme.textSecondary}
							keyboardType="numeric"
							value={editAmount}
							onChangeText={setEditAmount}
						/>
						<TextInput
							style={styles.input}
							placeholder="Category"
							placeholderTextColor={theme.textSecondary}
							value={editCategory}
							onChangeText={setEditCategory}
						/>
						<TouchableOpacity
							onPress={() => setShowDatePicker(true)}
							style={styles.datePickerBtn}
						>
							<Text style={styles.datePickerText}>
								{editDate.toLocaleDateString()}
							</Text>
						</TouchableOpacity>
						{showDatePicker && (
							<DateTimePicker
								value={editDate}
								mode="date"
								display={Platform.OS === "ios" ? "spinner" : "default"}
								onChange={(_, selected) => {
									setShowDatePicker(false);
									if (selected) setEditDate(selected);
								}}
							/>
						)}
						<View
							style={{
								flexDirection: "row",
								marginVertical: 10,
								justifyContent: "center",
							}}
						>
							<Button
								title={editType === "income" ? "Income" : "Expense"}
								color={editType === "income" ? theme.income : theme.expense}
								onPress={() =>
									setEditType(editType === "income" ? "expense" : "income")
								}
							/>
						</View>
						<View
							style={{
								flexDirection: "row",
								justifyContent: "space-between",
								marginTop: 16,
							}}
						>
							<Button
								title="Cancel"
								onPress={() => setEditModalVisible(false)}
								color={theme.textSecondary}
							/>
							<Button title="Save" onPress={saveEdit} color={theme.primary} />
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}
