// screens/BudgetsScreen.tsx
import React, {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useLayoutEffect,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	StatusBar,
	FlatList,
	TouchableOpacity,
	Modal,
	TextInput,
	Alert,
	Platform,
	Button,
	KeyboardAvoidingView,
	Keyboard,
	ScrollView,
	RefreshControl,
} from "react-native";
import { Appearance } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useIsFocused } from "@react-navigation/native";

import { useTheme } from "../theme";
import {
	Budget,
	BudgetPeriod,
	getBudgets,
	createBudget,
	updateBudget,
	deleteBudget,
	getTransactions,
	Transaction,
} from "../database";

// --- tiny progress bar component ---
function Progress({ value, max }: { value: number; max: number }) {
	const theme = useTheme();
	const pct = Math.max(0, Math.min(1, max ? value / max : 0));
	return (
		<View
			style={{
				height: 10,
				borderRadius: 8,
				backgroundColor: theme.border,
				overflow: "hidden",
			}}
		>
			<View
				style={{
					width: `${pct * 100}%`,
					height: "100%",
					backgroundColor: pct >= 1 ? theme.expense : theme.primary1,
				}}
			/>
		</View>
	);
}

// --- date helpers ---
function startOfDay(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
}
function daysBetween(a: Date, b: Date) {
	return Math.floor(
		(startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000
	);
}
function monthDays(year: number, monthIndex: number) {
	return new Date(year, monthIndex + 1, 0).getDate();
}
function clampDay(y: number, m: number, day: number) {
	return Math.min(day, monthDays(y, m));
}

/** Current cycle window from anchor */
function getCurrentWindow(
	b: Budget,
	now = new Date()
): { from: Date; to: Date } {
	const anchor = startOfDay(new Date(b.startDate));
	const today = startOfDay(now);

	if (b.period === "weekly") {
		const diff = daysBetween(anchor, today);
		const k = diff >= 0 ? Math.floor(diff / 7) : Math.floor((diff - 6) / 7);
		const from = addDays(anchor, k * 7);
		const to = addDays(from, 6);
		return { from, to };
	}

	// monthly
	const anchorDay = anchor.getDate();
	const y = today.getFullYear();
	const m = today.getMonth();
	let startYear = y;
	let startMonth = m;
	const todayDay = today.getDate();

	if (todayDay < anchorDay) {
		if (m === 0) {
			startYear = y - 1;
			startMonth = 11;
		} else {
			startMonth = m - 1;
		}
	}

	const cycleStartDay = clampDay(startYear, startMonth, anchorDay);
	const from = new Date(startYear, startMonth, cycleStartDay);

	let endYear = startYear;
	let endMonth = startMonth + 1;
	if (endMonth > 11) {
		endMonth = 0;
		endYear += 1;
	}
	const nextStartDay = clampDay(endYear, endMonth, anchorDay);
	const nextStart = new Date(endYear, endMonth, nextStartDay);
	const to = addDays(nextStart, -1);

	return { from, to };
}

export default function BudgetsScreen({ navigation }: any) {
	const insets = useSafeAreaInsets();
	const theme = useTheme();
	const isFocused = useIsFocused();

	useLayoutEffect(() => {
		navigation?.setOptions?.({ headerShown: false });
	}, [navigation]);

	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [refreshing, setRefreshing] = useState(false);

	const [showModal, setShowModal] = useState(false);
	const [editing, setEditing] = useState<Budget | null>(null);

	// form state
	const [fCategory, setFCategory] = useState("");
	const [fAmount, setFAmount] = useState("");
	const [fPeriod, setFPeriod] = useState<BudgetPeriod>("monthly");
	const [fStartDate, setFStartDate] = useState(new Date());
	const [showDatePicker, setShowDatePicker] = useState(false); // iOS inline toggle

	const load = useCallback(async () => {
		const [b, tx] = await Promise.all([getBudgets(), getTransactions()]);
		setBudgets(b);
		setTransactions(tx);
	}, []);

	// Load on focus
	useEffect(() => {
		if (isFocused) load();
	}, [isFocused, load]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await load();
		setRefreshing(false);
	}, [load]);

	// computed spend per budget (case-insensitive category match)
	const computed = useMemo(() => {
		const byId = new Map<number, { spent: number; from: Date; to: Date }>();
		const now = new Date();

		for (const b of budgets) {
			const { from, to } = getCurrentWindow(b, now);
			const spent = transactions
				.filter(
					t =>
						t.type === "expense" &&
						t.category?.trim().toLowerCase() === b.category.trim().toLowerCase()
				)
				.filter(t => {
					const d = new Date(t.date);
					return (
						d >= from &&
						d <=
							new Date(
								to.getFullYear(),
								to.getMonth(),
								to.getDate(),
								23,
								59,
								59
							)
					);
				})
				.reduce((acc, t) => acc + (t.amount || 0), 0);

			byId.set(b.id, { spent, from, to });
		}
		return byId;
	}, [budgets, transactions]);

	const openCreate = () => {
		setEditing(null);
		setFCategory("");
		setFAmount("");
		setFPeriod("monthly");
		setFStartDate(new Date());
		setShowModal(true);
	};

	const openEdit = (b: Budget) => {
		setEditing(b);
		setFCategory(b.category);
		setFAmount(String(b.amount));
		setFPeriod(b.period);
		setFStartDate(new Date(b.startDate));
		setShowModal(true);
	};

	const save = async () => {
		const amount = parseFloat(fAmount);
		if (!fCategory.trim())
			return Alert.alert("Validation", "Please enter a category.");
		if (!amount || amount <= 0)
			return Alert.alert("Validation", "Amount must be a positive number.");

		const iso = fStartDate.toISOString();
		if (editing) {
			await updateBudget(editing.id, fCategory.trim(), amount, fPeriod, iso);
		} else {
			await createBudget(fCategory.trim(), amount, fPeriod, iso);
		}
		setShowModal(false);
		await load(); // refresh list immediately
	};

	const confirmDelete = (b: Budget) => {
		Alert.alert("Delete budget", `Delete budget for "${b.category}"?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					await deleteBudget(b.id);
					await load();
				},
			},
		]);
	};

	// Dismiss keyboard before opening date picker
	const openDatePicker = () => {
		Keyboard.dismiss();
		setShowDatePicker(true); // iOS inline; Android dialog
	};

	const renderItem = ({ item }: { item: Budget }) => {
		const info = computed.get(item.id);
		const spent = info?.spent ?? 0;
		const remaining = item.amount - spent;
		const over = remaining < 0;

		return (
			<TouchableOpacity
				activeOpacity={0.9}
				onPress={() => openEdit(item)}
				onLongPress={() => confirmDelete(item)}
				style={[styles.card, { backgroundColor: theme.card }]}
			>
				<View style={styles.cardRow}>
					<Text
						style={[styles.cardTitle, { color: theme.text }]}
						numberOfLines={1}
					>
						{item.category}
					</Text>
					<Text style={[styles.cardAmount, { color: theme.textSecondary }]}>
						€{item.amount.toFixed(2)}
					</Text>
				</View>

				<View style={{ marginVertical: 10 }}>
					<Progress value={spent} max={item.amount} />
				</View>

				<View style={styles.cardRow}>
					<Text style={{ color: theme.textSecondary }}>
						Spent:{" "}
						<Text style={{ color: over ? theme.expense : theme.text }}>
							€{spent.toFixed(2)}
						</Text>
					</Text>
					<Text style={{ color: over ? theme.expense : theme.textSecondary }}>
						{over ? "Over by" : "Remaining"}: €{Math.abs(remaining).toFixed(2)}
					</Text>
				</View>

				{info && (
					<Text
						style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary }}
					>
						{item.period === "weekly" ? "This week" : "This month"} •{" "}
						{info.from.toLocaleDateString()} – {info.to.toLocaleDateString()}
					</Text>
				)}
			</TouchableOpacity>
		);
	};

	// Controls row (below header) — one big purple button
	const ListControls = (
		<View style={styles.controlsRow}>
			<TouchableOpacity
				onPress={openCreate}
				activeOpacity={0.9}
				style={[styles.controlBtn, { backgroundColor: theme.primary1 }]}
			>
				<Ionicons name="add-circle-outline" size={16} color={theme.onPrimary} />
				<Text style={[styles.controlText, { color: theme.onPrimary }]}>
					Add budget
				</Text>
			</TouchableOpacity>
		</View>
	);

	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: theme.background }}
			edges={["bottom"]}
		>
			{/* Transparent status bar + gradient overlay fix */}
			<StatusBar
				barStyle="light-content"
				translucent
				backgroundColor="transparent"
			/>
			<View style={[styles.statusOverlay, { height: insets.top }]}>
				<LinearGradient
					colors={[theme.primary2, theme.primary1]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={{ flex: 1 }}
				/>
			</View>

			{/* Header */}
			<LinearGradient
				colors={[theme.primary2, theme.primary1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.header, { paddingTop: insets.top + 12 }]}
			>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Ionicons
						name="wallet-outline"
						size={32}
						color={theme.onPrimary}
						style={{ marginRight: 10 }}
					/>
					<Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
						Budgets
					</Text>
				</View>
			</LinearGradient>

			<FlatList
				data={budgets}
				keyExtractor={b => String(b.id)}
				renderItem={renderItem}
				contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
				ListHeaderComponent={ListControls}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				ListEmptyComponent={
					<View style={{ alignItems: "center", marginTop: 60 }}>
						{ListControls}
						<Text style={{ fontSize: 48, marginTop: 16 }}>🧮</Text>
						<Text
							style={{
								color: theme.textSecondary,
								fontSize: 17,
								textAlign: "center",
								marginTop: 12,
							}}
						>
							No budgets yet
						</Text>
						<Text
							style={{
								color: theme.textSecondary,
								fontSize: 15,
								marginTop: 6,
								textAlign: "center",
							}}
						>
							Tap “Add budget” to create your first one.
						</Text>
					</View>
				}
			/>

			{/* Create / Edit Modal */}
			<Modal
				visible={showModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowModal(false)}
			>
				<View style={styles.modalOverlay}>
					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						style={{ width: "100%" }}
					>
						<ScrollView
							keyboardShouldPersistTaps="handled"
							contentContainerStyle={{ alignItems: "center" }}
						>
							<View
								style={[styles.modalContent, { backgroundColor: theme.card }]}
							>
								<Text style={[styles.modalTitle, { color: theme.text }]}>
									{editing ? "Edit Budget" : "Create Budget"}
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
									placeholder="Category"
									placeholderTextColor={theme.textSecondary}
									value={fCategory}
									onChangeText={setFCategory}
									returnKeyType="next"
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
									placeholder="Amount (€)"
									placeholderTextColor={theme.textSecondary}
									keyboardType="numeric"
									returnKeyType="done"
									blurOnSubmit
									onSubmitEditing={() => Keyboard.dismiss()}
									value={fAmount}
									onChangeText={setFAmount}
								/>

								{/* Period selector — close wheel if switching */}
								<View style={styles.segment}>
									{(["weekly", "monthly"] as BudgetPeriod[]).map(p => (
										<TouchableOpacity
											key={p}
											onPress={() => {
												setFPeriod(p);
												setShowDatePicker(false); // close inline wheel when switching
											}}
											style={[
												styles.segmentBtn,
												{
													backgroundColor:
														fPeriod === p ? theme.primary1 : theme.card,
													borderColor: theme.border,
												},
											]}
										>
											<Text
												style={{
													fontWeight: "800",
													color:
														fPeriod === p
															? theme.onPrimary
															: theme.textSecondary,
												}}
											>
												{p[0].toUpperCase() + p.slice(1)}
											</Text>
										</TouchableOpacity>
									))}
								</View>

								{/* Start date (anchor) */}
								<TouchableOpacity
									onPress={openDatePicker}
									style={[
										styles.datePickerBtn,
										{
											borderColor: theme.border,
											backgroundColor: theme.background,
										},
									]}
								>
									<Text style={{ color: theme.text }}>
										Start date: {fStartDate.toLocaleDateString()}
									</Text>
								</TouchableOpacity>

								{/* ANDROID: native dialog */}
								{showDatePicker && Platform.OS === "android" && (
									<DateTimePicker
										value={fStartDate}
										mode="date"
										display="default"
										onChange={(event, selected) => {
											setShowDatePicker(false);
											if (event.type === "set" && selected)
												setFStartDate(selected);
										}}
									/>
								)}

								{/* iOS: inline spinner, clipped & centered like Recurring */}
								{showDatePicker && Platform.OS === "ios" && (
									<View
										style={[
											styles.inlinePickerBox,
											{
												backgroundColor: theme.background,
												borderColor: theme.border,
											},
										]}
									>
										<DateTimePicker
											value={fStartDate}
											mode="date"
											display="spinner"
											themeVariant={
												Appearance.getColorScheme() === "dark"
													? "dark"
													: "light"
											}
											onChange={(_, selected) => {
												if (selected) setFStartDate(selected); // live update
											}}
											style={styles.iosSpinner}
										/>
									</View>
								)}

								<View
									style={{
										flexDirection: "row",
										justifyContent: "space-between",
										marginTop: 16,
									}}
								>
									<Button
										title="Cancel"
										onPress={() => setShowModal(false)}
										color={theme.textSecondary}
									/>
									<Button
										title={editing ? "Save" : "Create"}
										onPress={save}
										color={theme.primary2}
									/>
								</View>
							</View>
						</ScrollView>
					</KeyboardAvoidingView>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	// covers the status-bar area with the same gradient to avoid a white strip
	statusOverlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 },

	header: {
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
	headerTitle: { fontSize: 28, fontWeight: "900", letterSpacing: 1.2 },

	// Controls bar under header
	controlsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
	controlBtn: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
		paddingHorizontal: 12,
		borderRadius: 999,
	},
	controlText: { marginLeft: 6, fontWeight: "800" },

	card: {
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		elevation: 2,
		shadowOpacity: 0.12,
		shadowRadius: 6,
	},
	cardRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	cardTitle: { fontSize: 17, fontWeight: "800" },
	cardAmount: { fontSize: 15, fontWeight: "700" },

	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		padding: 24,
		borderRadius: 16,
		width: "100%", // was "88%"
		maxWidth: 520,
		alignSelf: "center", // ensure it’s centered like Recurring
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
		borderWidth: 1,
		marginBottom: 12,
		padding: 10,
		fontSize: 16,
		borderRadius: 10,
		width: "100%",
	},

	segment: { flexDirection: "row", gap: 8, marginBottom: 12 },
	segmentBtn: {
		flex: 1,
		paddingVertical: 10,
		alignItems: "center",
		borderRadius: 999,
		borderWidth: 1,
	},

	datePickerBtn: {
		padding: 12,
		borderWidth: 1,
		borderRadius: 10,
		alignItems: "center",
		marginBottom: 14,
	},

	// Inline iOS picker container (same as Recurring)
	inlinePickerBox: {
		borderWidth: 1,
		borderRadius: 16,
		overflow: "hidden",
		marginBottom: 12,
		alignSelf: "stretch",
		width: "100%", // add
		minWidth: 0, // add (prevents clipping)
	},
	iosSpinner: {
		width: "100%",
		alignSelf: "stretch",
		height: 216,
	},
});
