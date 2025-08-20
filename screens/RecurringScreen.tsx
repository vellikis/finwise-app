// screens/RecurringScreen.tsx
import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
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
	RecurringRule,
	RecurringFrequency,
	getRecurringRules,
	createRecurringRule,
	updateRecurringRule,
	deleteRecurringRule,
	materializeRecurring,
} from "../database";
import InlineDateWheel from "../components/InlineDateWheel";
import { parseAmount } from "../utils/money";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatAmount } from "../utils/money";

// --- date helpers ---
function startOfDay(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
}
function addWeeks(d: Date, n: number) {
	return addDays(d, 7 * n);
}
function addMonths(d: Date, n: number) {
	const x = new Date(d);
	x.setMonth(x.getMonth() + n);
	return x;
}
function stepDate(freq: RecurringFrequency, d: Date) {
	return freq === "daily"
		? addDays(d, 1)
		: freq === "weekly"
		? addWeeks(d, 1)
		: addMonths(d, 1);
}

/** Compute the next due date (>= today) for a rule */
function nextDue(rule: RecurringRule, now = new Date()): Date {
	const today = startOfDay(now);
	const anchor = startOfDay(new Date(rule.startDate));
	const last = rule.lastRun ? startOfDay(new Date(rule.lastRun)) : null;
	let cursor = last ? stepDate(rule.frequency, last) : anchor;
	if (cursor < anchor) cursor = anchor;
	while (cursor < today) cursor = stepDate(rule.frequency, cursor);
	return cursor;
}

export default function RecurringScreen({ navigation }: any) {
	const theme = useTheme();
	const insets = useSafeAreaInsets();
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

	useLayoutEffect(() => {
		navigation?.setOptions?.({ headerShown: false });
	}, [navigation]);

	const [rules, setRules] = useState<RecurringRule[]>([]);
	const [refreshing, setRefreshing] = useState(false);

	// modal state
	const [showModal, setShowModal] = useState(false);
	const [editing, setEditing] = useState<RecurringRule | null>(null);
	const [fType, setFType] = useState<"income" | "expense">("expense");
	const [fAmount, setFAmount] = useState("");
	const [fCategory, setFCategory] = useState("");
	const [fFreq, setFFreq] = useState<RecurringFrequency>("monthly");
	const [fStartDate, setFStartDate] = useState(new Date());

	// iOS inline date wheel toggle
	const [showDatePicker, setShowDatePicker] = useState(false);

	const load = useCallback(async () => {
		const r = await getRecurringRules();
		setRules(r);
	}, []);

	useEffect(() => {
		if (isFocused) load();
	}, [isFocused, load]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await load();
		setRefreshing(false);
	}, [load]);

	const openCreate = () => {
		setEditing(null);
		setFType("expense");
		setFAmount("");
		setFCategory("");
		setFFreq("monthly");
		setFStartDate(new Date());
		setShowModal(true);
	};

	const openEdit = (r: RecurringRule) => {
		setEditing(r);
		setFType(r.type);
		setFAmount(String(r.amount));
		setFCategory(r.category);
		setFFreq(r.frequency);
		setFStartDate(new Date(r.startDate));
		setShowModal(true);
	};

	const save = async () => {
		const amount = parseAmount(fAmount);
		if (!fCategory.trim())
			return Alert.alert("Validation", "Please enter a category.");
		if (!amount || amount <= 0)
			return Alert.alert("Validation", "Amount must be a positive number.");
		const iso = startOfDay(fStartDate).toISOString();

		if (editing) {
			await updateRecurringRule(
				editing.id,
				fType,
				amount,
				fCategory.trim(),
				iso,
				fFreq
			);
		} else {
			await createRecurringRule(fType, amount, fCategory.trim(), iso, fFreq);
		}
		setShowModal(false);
		await materializeRecurring(); // post anything due right away
		await load();
	};

	const confirmDelete = (r: RecurringRule) => {
		Alert.alert("Delete rule", `Delete "${r.category}" ${r.frequency}?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					await deleteRecurringRule(r.id);
					await load();
				},
			},
		]);
	};

	const runDueNow = async () => {
		await materializeRecurring();
		await load();
	};

	const openDatePicker = () => {
		Keyboard.dismiss();
		setShowDatePicker(true); // show inline spinner on iOS, dialog on Android
	};

	const renderItem = ({ item }: { item: RecurringRule }) => {
		const due = nextDue(item);
		const today = startOfDay(new Date());
		const dueLabel =
			due.getTime() === today.getTime() ? "Today" : due.toLocaleDateString();

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
					<Text
						style={{
							color: item.type === "income" ? theme.income : theme.expense,
							fontWeight: "900",
						}}
					>
						{item.type === "income" ? "+" : "-"}€
						{formatAmount(item.amount, showCents)}
					</Text>
				</View>

				<View style={styles.badgeRow}>
					<View
						style={[
							styles.badge,
							{ borderColor: theme.border, backgroundColor: theme.background },
						]}
					>
						<Ionicons
							name="time-outline"
							size={14}
							color={theme.textSecondary}
						/>
						<Text
							style={{
								marginLeft: 6,
								color: theme.textSecondary,
								fontWeight: "700",
							}}
						>
							{item.frequency[0].toUpperCase() + item.frequency.slice(1)}
						</Text>
					</View>
					<View
						style={[
							styles.badge,
							{ borderColor: theme.border, backgroundColor: theme.background },
						]}
					>
						<Ionicons
							name="calendar-outline"
							size={14}
							color={theme.textSecondary}
						/>
						<Text style={{ marginLeft: 6, color: theme.textSecondary }}>
							Anchor: {new Date(item.startDate).toLocaleDateString()}
						</Text>
					</View>
					<View
						style={[
							styles.badge,
							{ borderColor: theme.border, backgroundColor: theme.background },
						]}
					>
						<Ionicons
							name="notifications-outline"
							size={14}
							color={theme.textSecondary}
						/>
						<Text style={{ marginLeft: 6, color: theme.textSecondary }}>
							Next due: {dueLabel}
						</Text>
					</View>
				</View>

				{!!item.lastRun && (
					<Text
						style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary }}
					>
						Last posted: {new Date(item.lastRun).toLocaleDateString()}
					</Text>
				)}
			</TouchableOpacity>
		);
	};

	// List header component: controls bar under the gradient header
	const ListControls = (
		<View style={styles.controlsRow}>
			{/* Left half: Run due (filled) */}
			<TouchableOpacity
				onPress={runDueNow}
				activeOpacity={0.9}
				style={[styles.controlBtn, { backgroundColor: theme.primary1 }]}
			>
				<Ionicons name="play-outline" size={16} color={theme.onPrimary} />
				<Text style={[styles.controlText, { color: theme.onPrimary }]}>
					Run due
				</Text>
			</TouchableOpacity>

			{/* Right half: New rule (white background) */}
			<TouchableOpacity
				onPress={openCreate}
				activeOpacity={0.9}
				style={[
					styles.controlBtn,
					{
						backgroundColor: "#fff",
						borderWidth: 1,
						borderColor: theme.border,
						elevation: 2,
						shadowColor: "rgba(0,0,0,0.12)",
						shadowOpacity: 0.12,
						shadowRadius: 6,
						shadowOffset: { width: 0, height: 2 },
					},
				]}
			>
				<Ionicons name="add-circle-outline" size={16} color="#111827" />
				<Text style={[styles.controlText, { color: "#111827" }]}>New rule</Text>
			</TouchableOpacity>
		</View>
	);

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

			{/* Status bar overlay to avoid white strip */}
			<View style={[styles.statusOverlay, { height: insets.top }]}>
				<LinearGradient
					colors={[theme.primary2, theme.primary1]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={{ flex: 1 }}
				/>
			</View>

			{/* Clean header with title only */}
			<LinearGradient
				colors={[theme.primary2, theme.primary1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.header, { paddingTop: insets.top + 12 }]}
			>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Ionicons
						name="repeat-outline"
						size={32}
						color={theme.onPrimary}
						style={{ marginRight: 10 }}
					/>
					<Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
						Recurring
					</Text>
				</View>
			</LinearGradient>

			<FlatList
				data={rules}
				keyExtractor={r => String(r.id)}
				renderItem={renderItem}
				contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
				ListHeaderComponent={ListControls}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				ListEmptyComponent={
					<View style={{ alignItems: "center", marginTop: 40 }}>
						{ListControls}
						<Text style={{ fontSize: 48, marginTop: 16 }}>🔁</Text>
						<Text
							style={{
								color: theme.textSecondary,
								fontSize: 17,
								textAlign: "center",
								marginTop: 12,
							}}
						>
							No recurring rules yet
						</Text>
						<Text
							style={{
								color: theme.textSecondary,
								fontSize: 15,
								marginTop: 6,
								textAlign: "center",
							}}
						>
							Use “New rule” to create one. Your global + button keeps adding
							transactions as usual.
						</Text>
					</View>
				}
			/>

			{/* Create/Edit Modal */}
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
									{editing ? "Edit Rule" : "Create Rule"}
								</Text>

								{/* income/expense */}
								<View style={styles.segment}>
									{(["expense", "income"] as ("expense" | "income")[]).map(
										t => (
											<TouchableOpacity
												key={t}
												onPress={() => setFType(t)}
												style={[
													styles.segmentBtn,
													{
														backgroundColor:
															fType === t ? theme.primary1 : theme.card,
														borderColor: theme.border,
													},
												]}
											>
												<Text
													style={{
														fontWeight: "800",
														color:
															fType === t
																? theme.onPrimary
																: theme.textSecondary,
													}}
												>
													{t[0].toUpperCase() + t.slice(1)}
												</Text>
											</TouchableOpacity>
										)
									)}
								</View>

								<TextInput
									placeholder="Amount (€)"
									placeholderTextColor={theme.textSecondary}
									keyboardType="numeric"
									returnKeyType="done"
									blurOnSubmit
									onSubmitEditing={() => Keyboard.dismiss()}
									style={[
										styles.input,
										{ borderColor: theme.border, color: theme.text },
									]}
									value={fAmount}
									onChangeText={setFAmount}
								/>

								<TextInput
									placeholder="Category"
									placeholderTextColor={theme.textSecondary}
									style={[
										styles.input,
										{ borderColor: theme.border, color: theme.text },
									]}
									value={fCategory}
									onChangeText={setFCategory}
								/>

								{/* frequency — also closes the date wheel if open */}
								<View style={styles.segment}>
									{(["daily", "weekly", "monthly"] as RecurringFrequency[]).map(
										freq => (
											<TouchableOpacity
												key={freq}
												onPress={() => {
													setFFreq(freq);
													setShowDatePicker(false); // close the wheel when changing frequency
												}}
												style={[
													styles.segmentBtn,
													{
														backgroundColor:
															fFreq === freq ? theme.primary1 : theme.card,
														borderColor: theme.border,
													},
												]}
											>
												<Text
													style={{
														fontWeight: "800",
														color:
															fFreq === freq
																? theme.onPrimary
																: theme.textSecondary,
													}}
												>
													{freq[0].toUpperCase() + freq.slice(1)}
												</Text>
											</TouchableOpacity>
										)
									)}
								</View>

								{/* anchor date */}
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

								{/* ANDROID: native dialog (closes after selection) */}
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

								{/* iOS: inline spinner (stays open), single instance */}
								{showDatePicker && Platform.OS === "ios" && (
									<InlineDateWheel
										value={fStartDate}
										onChange={setFStartDate}
										backgroundColor={theme.background}
										borderColor={theme.border}
									/>
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
		width: "100%",
		maxWidth: 520,
		borderRadius: 16,
		alignSelf: "center",
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

	badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
	badge: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},

	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		padding: 24,
		borderRadius: 16,
		width: "100%", // <- was 88%
		maxWidth: 520, // <- match Quick Add
		alignSelf: "center",
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

	// Inline iOS picker container
	inlinePickerBox: {
		borderWidth: 1,
		borderRadius: 16,
		overflow: "hidden",
		alignSelf: "stretch",
		width: "100%", // <- ensure full width of card
		minWidth: 0, // <- avoid clipping on small widths
		marginBottom: 12,
	},

	// styles.iosSpinner
	iosSpinner: {
		width: "100%", // <- fill container
		alignSelf: "stretch",
		height: 216,
	},
});
