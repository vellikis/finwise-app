// components/QuickAddModal.tsx
import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	Button,
	StyleSheet,
	Platform,
	KeyboardAvoidingView,
	ScrollView,
	Keyboard,
	TouchableOpacity,
} from "react-native";
import { Appearance } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { insertTransaction } from "../database";

type Props = {
	onClose?: () => void; // ✅ accept onClose from TabNavigator
};

export default function QuickAddModal({ onClose }: Props) {
	const theme = useTheme();

	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState("");
	const [date, setDate] = useState(new Date());
	const [type, setType] = useState<"expense" | "income">("expense");
	const [showPicker, setShowPicker] = useState(false);

	const close = () => {
		onClose?.();
	};

	const openPicker = () => {
		Keyboard.dismiss();
		setShowPicker(true); // iOS: inline spinner; Android: native dialog
	};

	const onSave = async () => {
		if (!amount || !category) return;
		await insertTransaction(
			type,
			parseFloat(amount),
			category.trim(),
			date.toISOString()
		);
		close();
	};

	return (
		<View style={styles.overlay}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={{ width: "100%" }}
			>
				<ScrollView
					contentContainerStyle={{ alignItems: "center" }}
					keyboardShouldPersistTaps="handled"
				>
					<View style={[styles.card, { backgroundColor: theme.card }]}>
						<Text style={[styles.title, { color: theme.text }]}>Quick Add</Text>

						{/* Expense / Income toggle */}
						<View style={styles.segment}>
							{(["expense", "income"] as const).map(t => (
								<TouchableOpacity
									key={t}
									onPress={() => setType(t)}
									activeOpacity={0.9}
									style={[
										styles.segmentBtn,
										{
											backgroundColor: type === t ? theme.primary1 : theme.card,
											borderColor: theme.border,
										},
									]}
								>
									<Text
										style={{
											fontWeight: "800",
											color: type === t ? theme.onPrimary : theme.textSecondary,
										}}
									>
										{t[0].toUpperCase() + t.slice(1)}
									</Text>
								</TouchableOpacity>
							))}
						</View>

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
							value={amount}
							onChangeText={setAmount}
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
							value={category}
							onChangeText={setCategory}
						/>

						{/* Date opener */}
						<TouchableOpacity
							onPress={openPicker}
							activeOpacity={0.9}
							style={[
								styles.dateBtn,
								{
									borderColor: theme.border,
									backgroundColor: theme.background,
								},
							]}
						>
							<Ionicons
								name="calendar-outline"
								size={16}
								color={theme.textSecondary}
							/>
							<Text style={{ marginLeft: 8, color: theme.text }}>
								{date.toLocaleDateString()}
							</Text>
						</TouchableOpacity>

						{/* ANDROID: native dialog */}
						{showPicker && Platform.OS === "android" && (
							<DateTimePicker
								value={date}
								mode="date"
								display="default"
								onChange={(event, selected) => {
									setShowPicker(false);
									if (event.type === "set" && selected) setDate(selected);
								}}
							/>
						)}

						{/* iOS: inline spinner (stays open) – same as Recurring */}
						{showPicker && Platform.OS === "ios" && (
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
									value={date}
									mode="date"
									display="spinner"
									themeVariant={
										Appearance.getColorScheme() === "dark" ? "dark" : "light"
									}
									onChange={(_, selected) => {
										if (selected) setDate(selected); // live update; don't close
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
								onPress={close}
								color={theme.textSecondary}
							/>
							<Button title="Save" onPress={onSave} color={theme.primary2} />
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)", // tinted backdrop like other modals
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 16,
	},
	card: {
		width: "100%",
		maxWidth: 520,
		alignSelf: "center",
		borderRadius: 16,
		shadowColor: "rgba(0,0,0,0.15)",
		padding: 16,
		marginBottom: 12,
		elevation: 2,
		shadowOpacity: 0.12,
		shadowRadius: 6,
		// important: let children use full width
		overflow: "visible",
	},
	title: {
		fontSize: 22,
		fontWeight: "900",
		textAlign: "center",
		marginBottom: 16,
	},
	input: {
		borderWidth: 1,
		borderRadius: 10,
		padding: 10,
		fontSize: 16,
		marginBottom: 12,
		width: "100%",
	},
	segment: { flexDirection: "row", gap: 8, marginBottom: 12, width: "100%" },
	segmentBtn: {
		flex: 1,
		alignItems: "center",
		paddingVertical: 10,
		borderRadius: 999,
		borderWidth: 1,
	},
	dateBtn: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 10,
		paddingVertical: 12,
		paddingHorizontal: 12,
		marginBottom: 12,
	},
	inlinePickerBox: {
		borderWidth: 1,
		borderRadius: 16,
		overflow: "hidden", // clips the tinted wheel edge cleanly
		alignSelf: "stretch", // take full width of the card
		width: "100%",
		marginBottom: 12,
		// make sure the picker can use the full width (prevents year truncation)
		minWidth: 0,
	},
	iosSpinner: {
		width: "100%",
		alignSelf: "stretch",
		height: 216, // standard iOS picker height
	},
});
