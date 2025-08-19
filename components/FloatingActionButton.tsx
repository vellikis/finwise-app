// components/QuickAddModal.tsx
import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Platform,
	KeyboardAvoidingView,
	Keyboard,
	ScrollView,
	TouchableOpacity,
	Pressable,
	StatusBar,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { insertTransaction } from "../database";
import { useTheme } from "../theme";

export default function QuickAddModal() {
	const navigation = useNavigation();
	const theme = useTheme();

	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState("");
	const [date, setDate] = useState(new Date());
	const [type, setType] = useState<"expense" | "income">("expense");
	const [showPicker, setShowPicker] = useState(false);

	const canSave = !!amount && !!category;

	const onSave = async () => {
		if (!canSave) return;
		await insertTransaction(
			type,
			parseFloat(amount),
			category.trim(),
			date.toISOString()
		);
		navigation.goBack();
	};

	const openPicker = () => {
		Keyboard.dismiss();
		setShowPicker(true);
	};

	return (
		<View style={styles.modalOverlay}>
			<StatusBar
				barStyle="light-content"
				translucent
				backgroundColor="transparent"
			/>
			{/* Tap outside to close */}
			<Pressable
				style={StyleSheet.absoluteFill}
				onPress={() => navigation.goBack()}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={{ width: "100%" }}
			>
				<ScrollView
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={{ alignItems: "center" }}
				>
					<View style={[styles.modalContent, { backgroundColor: theme.card }]}>
						<Text style={[styles.modalTitle, { color: theme.text }]}>
							Quick Add
						</Text>

						{/* Type segmented pill */}
						<View style={styles.segment}>
							{(["expense", "income"] as const).map(t => {
								const selected = type === t;
								return (
									<TouchableOpacity
										key={t}
										onPress={() => setType(t)}
										activeOpacity={0.9}
										style={[
											styles.segmentBtn,
											{
												backgroundColor: selected ? theme.primary1 : theme.card,
												borderColor: selected ? theme.primary1 : theme.border,
											},
										]}
									>
										<Text
											style={{
												fontWeight: "800",
												color: selected ? theme.onPrimary : theme.textSecondary,
											}}
										>
											{t[0].toUpperCase() + t.slice(1)}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>

						{/* Amount */}
						<View
							style={[
								styles.inputWrap,
								{
									borderColor: theme.border,
									backgroundColor: theme.background,
								},
							]}
						>
							<Ionicons
								name="cash-outline"
								size={18}
								color={theme.textSecondary}
							/>
							<TextInput
								style={[styles.input, { color: theme.text }]}
								placeholder="Amount"
								placeholderTextColor={theme.textSecondary}
								keyboardType="numeric"
								returnKeyType="done"
								blurOnSubmit
								onSubmitEditing={Keyboard.dismiss}
								value={amount}
								onChangeText={setAmount}
							/>
						</View>

						{/* Category */}
						<View
							style={[
								styles.inputWrap,
								{
									borderColor: theme.border,
									backgroundColor: theme.background,
								},
							]}
						>
							<Ionicons
								name="pricetag-outline"
								size={18}
								color={theme.textSecondary}
							/>
							<TextInput
								style={[styles.input, { color: theme.text }]}
								placeholder="Category"
								placeholderTextColor={theme.textSecondary}
								value={category}
								onChangeText={setCategory}
							/>
						</View>

						{/* Date (white pill) */}
						<TouchableOpacity
							onPress={openPicker}
							activeOpacity={0.9}
							style={[
								styles.dateBtn,
								{
									backgroundColor: "#fff",
									borderColor: theme.border,
									elevation: 2,
									shadowColor: "rgba(0,0,0,0.12)",
									shadowOpacity: 0.12,
									shadowRadius: 6,
									shadowOffset: { width: 0, height: 2 },
								},
							]}
						>
							<Ionicons name="calendar-outline" size={18} color="#111827" />
							<Text style={[styles.dateBtnText, { color: "#111827" }]}>
								{date.toLocaleDateString()}
							</Text>
						</TouchableOpacity>

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

						{/* Actions (pill buttons) */}
						<View style={styles.actionsRow}>
							<TouchableOpacity
								onPress={() => navigation.goBack()}
								activeOpacity={0.9}
								style={[
									styles.actionBtn,
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
								<Ionicons name="close-outline" size={18} color="#111827" />
								<Text style={[styles.actionText, { color: "#111827" }]}>
									Cancel
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								onPress={onSave}
								activeOpacity={canSave ? 0.9 : 1}
								disabled={!canSave}
								style={[
									styles.actionBtn,
									{ backgroundColor: canSave ? theme.primary1 : theme.border },
								]}
							>
								<Ionicons
									name="save-outline"
									size={18}
									color={theme.onPrimary}
								/>
								<Text style={[styles.actionText, { color: theme.onPrimary }]}>
									Save
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	// match RecurringScreen overlay
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

	segment: { flexDirection: "row", gap: 8, marginBottom: 14 },
	segmentBtn: {
		flex: 1,
		alignItems: "center",
		paddingVertical: 12,
		borderRadius: 999,
		borderWidth: 1,
	},

	inputWrap: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 12,
		borderWidth: 1,
		paddingHorizontal: 10,
		paddingVertical: 10,
		marginBottom: 12,
	},
	input: { flex: 1, marginLeft: 8, fontSize: 16 },

	dateBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		borderWidth: 1,
		borderRadius: 999, // pill
		paddingVertical: 12,
		marginBottom: 16,
	},
	dateBtnText: { fontWeight: "800" },

	actionsRow: { flexDirection: "row", gap: 12 },
	actionBtn: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 14,
		borderRadius: 999, // pill
	},
	actionText: { fontWeight: "800" },
});
