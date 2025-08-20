// screens/TransactionsScreen.tsx
import React, {
	useMemo,
	useState,
	useCallback,
	useEffect,
	useLayoutEffect,
} from "react";
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
	StatusBar,
	RefreshControl,
	Pressable, // ⬅️ added
	Appearance, // ⬅️ added (for iOS spinner themeVariant)
} from "react-native";
import {
	getTransactions,
	deleteTransaction,
	updateTransaction,
	Transaction,
} from "../database";
import { useIsFocused } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { parseAmount } from "../utils/money";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatAmount } from "../utils/money";

if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilterKey = "today" | "week" | "month" | "custom";

export default function TransactionsScreen({ navigation }: any) {
	const insets = useSafeAreaInsets();
	const theme = useTheme();

	useLayoutEffect(() => {
		navigation?.setOptions?.({ headerShown: false });
	}, [navigation]);

	const [data, setData] = useState<Transaction[]>([]);
	const [expandedId, setExpandedId] = useState<number | null>(null);

	// Edit modal
	const [editModalVisible, setEditModalVisible] = useState(false);
	const [editingTx, setEditingTx] = useState<Transaction | null>(null);
	const [editAmount, setEditAmount] = useState("");
	const [editCategory, setEditCategory] = useState("");
	const [editType, setEditType] = useState<"income" | "expense">("expense");
	const [editDate, setEditDate] = useState(new Date());
	const [showDatePicker, setShowDatePicker] = useState(false);

	// Filters
	const [filter, setFilter] = useState<FilterKey>("today");
	const [customFrom, setCustomFrom] = useState<Date | null>(null);
	const [customTo, setCustomTo] = useState<Date | null>(null);

	// Custom pickers visibility
	const [showFromPicker, setShowFromPicker] = useState(false);
	const [showToPicker, setShowToPicker] = useState(false);

	const isFocused = useIsFocused();

	const SETTINGS_KEY = "finwise.settings.v1";
	const [showCents, setShowCents] = useState(true);

	useEffect(() => {
		(async () => {
			try {
				const raw = await AsyncStorage.getItem(SETTINGS_KEY);
				if (raw) {
					const s = JSON.parse(raw);
					if (typeof s.showCents === "boolean") setShowCents(s.showCents);
				}
			} catch {}
		})();
	}, [isFocused]);

	const load = useCallback(async () => {
		const list = await getTransactions();
		list.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		);
		setData(list);
	}, []);

	useEffect(() => {
		if (isFocused) load();
	}, [isFocused, load]);

	// Pull-to-refresh
	const [refreshing, setRefreshing] = useState(false);
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await load();
		setRefreshing(false);
	}, [load]);

	const handleExpand = (id: number) => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setExpandedId(prev => (prev === id ? null : id));
	};

	const handleDelete = async (id: number) => {
		Alert.alert(
			"Delete Transaction",
			"Are you sure you want to delete this transaction?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						await deleteTransaction(id);
						await load();
						setExpandedId(null);
					},
				},
			]
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
			parseAmount(editAmount),
			editCategory.trim() || "Uncategorized",
			editDate.toISOString()
		);
		await load();
		setEditModalVisible(false);
		setExpandedId(null);
	};

	const startOfDay = (d: Date) =>
		new Date(d.getFullYear(), d.getMonth(), d.getDate());
	const isInRange = (d: Date, from: Date, to: Date) =>
		d.getTime() >= startOfDay(from).getTime() &&
		d.getTime() <=
			new Date(
				to.getFullYear(),
				to.getMonth(),
				to.getDate(),
				23,
				59,
				59
			).getTime();

	const filteredData = useMemo(() => {
		const now = new Date();
		if (filter === "today")
			return data.filter(tx => isInRange(new Date(tx.date), now, now));
		if (filter === "week") {
			const from = new Date(now);
			from.setDate(now.getDate() - 6);
			return data.filter(tx => isInRange(new Date(tx.date), from, now));
		}
		if (filter === "month") {
			const from = new Date(now.getFullYear(), now.getMonth(), 1);
			return data.filter(tx => isInRange(new Date(tx.date), from, now));
		}
		if (customFrom && customTo)
			return data.filter(tx =>
				isInRange(new Date(tx.date), customFrom, customTo)
			);
		return data;
	}, [data, filter, customFrom, customTo]);

	// --- NEW: unified filter handler that also hides pickers ---
	const handleFilterPress = (key: FilterKey) => {
		if (key !== "custom") {
			setFilter(key);
			// close any open custom pickers
			setShowFromPicker(false);
			setShowToPicker(false);
			return;
		}
		// Custom: just show the range buttons; don't open any wheel yet
		setFilter("custom");
		setShowFromPicker(false);
		setShowToPicker(false);
	};

	// Open range pickers
	const openFrom = () => {
		setShowToPicker(false);
		setShowFromPicker(true);
	};
	const openTo = () => {
		setShowFromPicker(false);
		setShowToPicker(true);
	};

	const renderRightActions = (id: number) => (
		<TouchableOpacity
			onPress={() => handleDelete(id)}
			activeOpacity={0.9}
			style={[styles.deleteAction, { backgroundColor: theme.expense }]}
		>
			<Ionicons name="trash" size={22} color="#fff" />
			<Text style={styles.deleteActionText}>Delete</Text>
		</TouchableOpacity>
	);

	const renderItem = ({ item }: { item: Transaction }) => {
		const isExpanded = expandedId === item.id;
		const isIncome = item.type === "income";

		const RowContent = (
			<TouchableOpacity
				activeOpacity={0.9}
				onPress={() => handleExpand(item.id)}
			>
				<View
					style={[
						styles.row,
						{ backgroundColor: theme.card, shadowColor: "rgba(0,0,0,0.08)" },
					]}
				>
					<View style={styles.rowLeft}>
						<View
							style={[
								styles.dot,
								{ backgroundColor: isIncome ? theme.income : theme.expense },
							]}
						/>
						<Text
							style={[styles.rowTitle, { color: theme.text }]}
							numberOfLines={1}
						>
							{item.category}
						</Text>
					</View>

					<Text
						style={[
							styles.amount,
							{ color: isIncome ? theme.income : theme.expense },
						]}
						numberOfLines={1}
						adjustsFontSizeToFit
					>
						{isIncome ? "+" : "-"}€{formatAmount(item.amount, showCents)}
					</Text>
				</View>
			</TouchableOpacity>
		);

		return (
			<View>
				<Swipeable renderRightActions={() => renderRightActions(item.id)}>
					{RowContent}
				</Swipeable>

				{isExpanded && (
					<View
						style={[
							styles.detailsBox,
							{ backgroundColor: theme.card, borderColor: theme.border },
						]}
					>
						<Text style={[styles.detailsText, { color: theme.textSecondary }]}>
							Date: {new Date(item.date).toLocaleDateString()}
						</Text>
						<Text style={[styles.detailsText, { color: theme.textSecondary }]}>
							Type: {item.type}
						</Text>

						<View style={styles.buttonRow}>
							<TouchableOpacity
								onPress={() => handleEdit(item)}
								style={[
									styles.pillBtn,
									{ backgroundColor: (theme as any).primarySoft ?? "#EEF2FF" },
								]}
							>
								<Text style={[styles.pillBtnText, { color: theme.primary2 }]}>
									Edit
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => handleDelete(item.id)}
								style={[styles.pillBtn, { backgroundColor: theme.expense }]}
							>
								<Text style={[styles.pillBtnText, { color: "#fff" }]}>
									Delete
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
			</View>
		);
	};

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

			{/* Header */}
			<LinearGradient
				colors={[theme.primary2, theme.primary1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.header, { paddingTop: insets.top + 12 }]}
			>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<MaterialCommunityIcons
						name="swap-horizontal"
						size={32}
						color={theme.onPrimary}
						style={{ marginRight: 10 }}
					/>
					<Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
						Transactions
					</Text>
				</View>
			</LinearGradient>

			{/* Filter bar */}
			<View style={styles.filterBar}>
				{(["today", "week", "month"] as FilterKey[]).map(key => (
					<TouchableOpacity
						key={key}
						onPress={() => handleFilterPress(key)} // ⬅️ use new handler
						style={[
							styles.filterChip,
							{ backgroundColor: theme.card, borderColor: theme.border },
							filter === key && { backgroundColor: theme.primary1 },
						]}
						activeOpacity={0.9}
					>
						<Text
							style={[
								styles.filterText,
								{
									color: filter === key ? theme.onPrimary : theme.textSecondary,
								},
							]}
						>
							{key[0].toUpperCase() + key.slice(1)}
						</Text>
					</TouchableOpacity>
				))}
				<TouchableOpacity
					onPress={() => handleFilterPress("custom")} // ⬅️ use new handler
					style={[
						styles.filterChip,
						{ backgroundColor: theme.card, borderColor: theme.border },
						filter === "custom" && { backgroundColor: theme.primary1 },
					]}
					activeOpacity={0.9}
				>
					<Text
						style={[
							styles.filterText,
							{
								color:
									filter === "custom" ? theme.onPrimary : theme.textSecondary,
							},
						]}
					>
						Custom
					</Text>
				</TouchableOpacity>
			</View>

			{/* Custom range buttons */}
			{filter === "custom" && (
				<View style={styles.customRangeRow}>
					<TouchableOpacity
						onPress={openFrom}
						style={[
							styles.rangeBtn,
							{ borderColor: theme.border, backgroundColor: theme.card },
						]}
					>
						<Text style={{ color: theme.textSecondary }}>
							{customFrom ? customFrom.toLocaleDateString() : "From"}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={openTo}
						style={[
							styles.rangeBtn,
							{ borderColor: theme.border, backgroundColor: theme.card },
						]}
					>
						<Text style={{ color: theme.textSecondary }}>
							{customTo ? customTo.toLocaleDateString() : "To"}
						</Text>
					</TouchableOpacity>
				</View>
			)}

			<FlatList
				data={filteredData}
				keyExtractor={item => item.id?.toString() ?? Math.random().toString()}
				renderItem={renderItem}
				contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
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
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={theme.text}
						colors={[theme.primary1 ?? "#6366F1"]}
						progressBackgroundColor={theme.card}
					/>
				}
			/>

			{/* Edit Modal (unchanged) */}
			<Modal
				visible={editModalVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setEditModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: theme.card }]}>
						<Text style={[styles.modalTitle, { color: theme.text }]}>
							Edit Transaction
						</Text>
						<TextInput
							style={[
								styles.input,
								{
									borderColor: theme.border,
									color: theme.text,
									backgroundColor: theme.background,
								},
							]}
							placeholder="Amount"
							placeholderTextColor={theme.textSecondary}
							keyboardType="numeric"
							value={editAmount}
							onChangeText={setEditAmount}
						/>
						<TextInput
							style={[
								styles.input,
								{
									borderColor: theme.border,
									color: theme.text,
									backgroundColor: theme.background,
								},
							]}
							placeholder="Category"
							placeholderTextColor={theme.textSecondary}
							value={editCategory}
							onChangeText={setEditCategory}
						/>

						<TouchableOpacity
							onPress={() => setShowDatePicker(true)}
							style={[
								styles.datePickerBtn,
								{
									borderColor: theme.border,
									backgroundColor: theme.background,
								},
							]}
						>
							<Text style={{ color: theme.text }}>
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
							<Button title="Save" onPress={saveEdit} color={theme.primary2} />
						</View>
					</View>
				</View>
			</Modal>

			{/* --- ANDROID custom range pickers (native dialogs) --- */}
			{showFromPicker && Platform.OS === "android" && (
				<DateTimePicker
					value={customFrom ?? new Date()}
					mode="date"
					display="default"
					onChange={(event, selected) => {
						setShowFromPicker(false);
						if (event.type === "set" && selected)
							setCustomFrom(startOfDay(selected));
					}}
				/>
			)}
			{showToPicker && Platform.OS === "android" && (
				<DateTimePicker
					value={customTo ?? new Date()}
					mode="date"
					display="default"
					onChange={(event, selected) => {
						setShowToPicker(false);
						if (event.type === "set" && selected)
							setCustomTo(startOfDay(selected));
					}}
				/>
			)}

			{/* --- iOS custom range pickers (bottom sheet with Done) --- */}
			{Platform.OS === "ios" && (showFromPicker || showToPicker) && (
				<Modal
					visible
					transparent
					animationType="fade"
					onRequestClose={() => {
						setShowFromPicker(false);
						setShowToPicker(false);
					}}
				>
					<View style={styles.centerOverlay}>
						<View
							style={[
								styles.centerCard,
								{ backgroundColor: theme.card, borderColor: theme.border },
							]}
						>
							<View
								style={[styles.centerHeader, { borderColor: theme.border }]}
							>
								<Text style={{ color: theme.textSecondary, fontWeight: "600" }}>
									{showFromPicker ? "From date" : "To date"}
								</Text>
								<TouchableOpacity
									onPress={() => {
										setShowFromPicker(false);
										setShowToPicker(false);
									}}
								>
									<Text style={{ color: theme.primary2, fontWeight: "800" }}>
										Done
									</Text>
								</TouchableOpacity>
							</View>

							<DateTimePicker
								value={
									showFromPicker
										? customFrom ?? new Date()
										: customTo ?? new Date()
								}
								mode="date"
								display="spinner"
								themeVariant={
									Appearance.getColorScheme() === "dark" ? "dark" : "light"
								}
								onChange={(_, selected) => {
									if (!selected) return;
									if (showFromPicker) setCustomFrom(startOfDay(selected));
									else setCustomTo(startOfDay(selected));
								}}
								style={styles.iosSpinner}
							/>
						</View>
					</View>
				</Modal>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },

	header: {
		marginBottom: 14,
		paddingBottom: 20,
		paddingHorizontal: 24,
		borderBottomLeftRadius: 28,
		borderBottomRightRadius: 28,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		elevation: 6,
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 10,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: "900",
		letterSpacing: 1.2,
	},

	filterBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		marginBottom: 8,
	},
	filterChip: {
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 999,
		borderWidth: 1,
		marginRight: 8,
		elevation: 1,
		shadowColor: "rgba(0,0,0,0.05)",
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},
	filterText: { fontWeight: "700", fontSize: 13 },

	customRangeRow: {
		flexDirection: "row",
		paddingHorizontal: 16,
		marginBottom: 8,
		gap: 8,
	},
	rangeBtn: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 10,
		alignItems: "center",
	},

	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 16,
		paddingHorizontal: 16,
		borderRadius: 16,
		marginBottom: 10,
		elevation: 2,
		shadowOpacity: 0.12,
		shadowRadius: 6,
	},
	rowLeft: { flexDirection: "row", alignItems: "center", maxWidth: "60%" },
	dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
	rowTitle: { fontSize: 16, fontWeight: "700" },
	amount: {
		fontSize: 18,
		fontWeight: "900",
		maxWidth: "40%",
		textAlign: "right",
	},

	detailsBox: {
		marginTop: -6,
		marginBottom: 10,
		padding: 14,
		borderBottomLeftRadius: 16,
		borderBottomRightRadius: 16,
		borderWidth: 1,
	},
	detailsText: { marginBottom: 6, fontSize: 15 },
	buttonRow: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: 12,
		marginTop: 8,
	},
	pillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
	pillBtnText: { fontWeight: "800" },

	deleteAction: {
		justifyContent: "center",
		alignItems: "center",
		width: 90,
		borderRadius: 16,
		marginVertical: 5,
	},
	deleteActionText: { color: "#fff", marginTop: 4, fontWeight: "800" },

	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		padding: 24,
		borderRadius: 16,
		width: "88%",
		elevation: 4,
		shadowColor: "rgba(0,0,0,0.15)",
		shadowOpacity: 0.2,
		shadowRadius: 8,
	},
	modalTitle: {
		fontSize: 20,
		marginBottom: 16,
		textAlign: "center",
		fontWeight: "800",
	},
	input: {
		borderBottomWidth: 1,
		marginBottom: 14,
		padding: 10,
		fontSize: 16,
		borderRadius: 8,
	},
	datePickerBtn: {
		padding: 12,
		borderWidth: 1,
		borderRadius: 10,
		alignItems: "center",
		marginBottom: 14,
	},

	// iOS bottom sheet for custom pickers
	centerOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 16,
	},
	centerCard: {
		width: "92%",
		maxWidth: 520,
		borderRadius: 16,
		borderWidth: 1,
		overflow: "hidden",
	},
	centerHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderBottomWidth: 1,
	},
	iosSpinner: {
		width: "100%",
		alignSelf: "stretch",
		height: 216,
	},
});
