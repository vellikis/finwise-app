// screens/SettingsScreen.tsx
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Switch,
	StatusBar,
	TouchableOpacity,
	Alert,
	Platform,
	Linking,
	ScrollView,
} from "react-native";
import { useTheme, useThemeMode } from "../theme";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import Constants from "expo-constants";
import DateTimePicker from "@react-native-community/datetimepicker";

import { getTransactions, getBudgets, getRecurringRules } from "../database";

type AppLockMode = "off" | "biometric" | "passcode";
type AutoLockDelaySec = 30 | 60 | 300;

type SettingsShape = {
	showCents: boolean;
	appLock: AppLockMode;
	autoLockAfterSec: AutoLockDelaySec;
	reminderEnabled: boolean;
	reminderTime: string; // "20:00"
	reminderId?: string | null;
};

const SETTINGS_KEY = "finwise.settings.v1";

const COLORS = {
	primary1: "#6366F1",
	primary2: "#4F46E5",
	danger: "#EF4444",
};

export default function SettingsScreen({ navigation }: any) {
	const theme = useTheme();
	const { mode, setMode } = useThemeMode(); // 'light' | 'dark' | 'system'
	const insets = useSafeAreaInsets();

	const [settings, setSettings] = useState<SettingsShape>({
		showCents: true,
		appLock: "off",
		autoLockAfterSec: 60,
		reminderEnabled: false,
		reminderTime: "20:00",
		reminderId: null,
	});

	const [showTimePicker, setShowTimePicker] = useState(false);

	useLayoutEffect(() => {
		navigation?.setOptions?.({ headerShown: false });
	}, [navigation]);

	useEffect(() => {
		(async () => {
			const raw = await AsyncStorage.getItem(SETTINGS_KEY);
			if (raw) {
				try {
					const parsed = JSON.parse(raw);
					setSettings(s => ({ ...s, ...parsed }));
				} catch {}
			}
		})();
	}, []);
	useEffect(() => {
		AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(
			() => {}
		);
	}, [settings]);

	const isDark = mode === "dark";

	const setSetting = <K extends keyof SettingsShape>(
		key: K,
		value: SettingsShape[K]
	) => setSettings(s => ({ ...s, [key]: value }));

	const timeLabel = useMemo(() => {
		const [hh, mm] = settings.reminderTime.split(":").map(n => parseInt(n, 10));
		const d = new Date();
		d.setHours(hh, mm, 0, 0);
		return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}, [settings.reminderTime]);

	// ---- App Lock ----
	const setAppLock = async (next: AppLockMode) => {
		if (next === "biometric") {
			const hasHardware = await LocalAuthentication.hasHardwareAsync();
			if (!hasHardware) {
				Alert.alert(
					"Not supported",
					"No biometric hardware available on this device."
				);
				return;
			}
			const enrolled = await LocalAuthentication.isEnrolledAsync();
			if (!enrolled) {
				Alert.alert(
					"No biometrics set up",
					"Please add Face ID/Touch ID in device settings."
				);
				return;
			}
			const res = await LocalAuthentication.authenticateAsync({
				promptMessage: "Enable App Lock",
				cancelLabel: "Cancel",
			});
			if (!res.success) return;
		}
		if (next === "passcode") {
			Alert.alert("Passcode", "Passcode lock is a placeholder for the demo.");
		}
		setSetting("appLock", next);
	};

	// ---- Notifications ----
	async function ensureNotifPermission(): Promise<boolean> {
		const { status: existing } = await Notifications.getPermissionsAsync();
		if (existing === "granted") return true;
		const { status } = await Notifications.requestPermissionsAsync();
		return status === "granted";
	}
	function parseHHMM(hhmm: string): { hours: number; minutes: number } {
		const [h, m] = hhmm.split(":").map(x => parseInt(x, 10));
		return { hours: h || 20, minutes: m || 0 };
	}

	async function scheduleDailyReminder() {
		const ok = await ensureNotifPermission();
		if (!ok) {
			Alert.alert(
				"Permission needed",
				"Enable notifications to schedule reminders."
			);
			setSetting("reminderEnabled", false);
			return;
		}
		const { hours, minutes } = parseHHMM(settings.reminderTime);

		if (settings.reminderId) {
			try {
				await Notifications.cancelScheduledNotificationAsync(
					settings.reminderId
				);
			} catch {}
		}

		// ✅ typed calendar trigger
		const trigger: Notifications.CalendarTriggerInput = {
			type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
			hour: hours,
			minute: minutes,
			repeats: true,
		};

		const id = await Notifications.scheduleNotificationAsync({
			content: {
				title: "Log today’s transactions",
				body: "Add what you spent or earned today.",
			},
			trigger,
		});

		setSettings(s => ({ ...s, reminderId: id }));
	}

	async function cancelDailyReminder() {
		if (settings.reminderId) {
			try {
				await Notifications.cancelScheduledNotificationAsync(
					settings.reminderId
				);
			} catch {}
		}
		setSettings(s => ({ ...s, reminderId: null }));
	}

	// ---- Export CSV ----
	function toCSV(rows: any[], columns: string[]): string {
		const escape = (val: any) => {
			if (val == null) return "";
			const s = String(val).replace(/"/g, '""');
			return `"${s}"`;
		};
		const header = columns.join(",");
		const body = rows
			.map(r => columns.map(c => escape(r[c])).join(","))
			.join("\n");
		return `${header}\n${body}`;
	}

	async function writeAndShareCSV(
		rows: any[],
		cols: string[],
		baseName: string
	) {
		const csv = toCSV(rows, cols);
		const ts = new Date().toISOString().replace(/[:.]/g, "-");
		const fileUri = `${FileSystem.cacheDirectory}${baseName}-${ts}.csv`;
		await FileSystem.writeAsStringAsync(fileUri, csv, {
			encoding: FileSystem.EncodingType.UTF8,
		});
		if (await Sharing.isAvailableAsync()) {
			await Sharing.shareAsync(fileUri, {
				mimeType: "text/csv",
				dialogTitle: `Export ${baseName}`,
			});
		} else {
			Alert.alert("Saved", `File saved to:\n${fileUri}`);
		}
	}

	async function exportTransactions() {
		const data = await getTransactions();
		const rows = data.map((t: any) => ({
			id: t.id,
			type: t.type,
			amount: t.amount,
			category: t.category,
			date: t.date,
			note: t.note ?? "",
		}));
		await writeAndShareCSV(
			rows,
			["id", "type", "amount", "category", "date", "note"],
			"transactions"
		);
	}
	async function exportBudgets() {
		const data = await getBudgets();
		const rows = data.map((b: any) => ({
			id: b.id,
			category: b.category,
			amount: b.amount,
			period: b.period,
			startDate: b.startDate,
		}));
		await writeAndShareCSV(
			rows,
			["id", "category", "amount", "period", "startDate"],
			"budgets"
		);
	}
	async function exportRecurring() {
		const data = await getRecurringRules();
		const rows = data.map((r: any) => ({
			id: r.id,
			type: r.type,
			amount: r.amount,
			category: r.category,
			startDate: r.startDate,
			frequency: r.frequency,
			lastRun: r.lastRun ?? "",
		}));
		await writeAndShareCSV(
			rows,
			["id", "type", "amount", "category", "startDate", "frequency", "lastRun"],
			"recurring"
		);
	}

	// ---- Reset data (guarded placeholder) ----
	async function resetAllDataGuarded() {
		Alert.alert(
			"Reset all data",
			"This will permanently delete transactions, budgets, and recurring rules on this device.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							Alert.alert(
								"Almost there",
								"Hook this button to your database reset helper (e.g. resetAllData())."
							);
						} catch {
							Alert.alert("Error", "Failed to reset data.");
						}
					},
				},
			]
		);
	}

	const appVersion =
		Constants?.expoConfig?.version ||
		(Constants as any)?.manifest2?.extra?.version ||
		"1.0.0";

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

			<LinearGradient
				colors={[COLORS.primary2, COLORS.primary1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.header, { paddingTop: insets.top + 12 }]}
			>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Ionicons
						name="settings-outline"
						size={32}
						color="#fff"
						style={{ marginRight: 10 }}
					/>
					<Text style={styles.headerTitle}>Settings</Text>
				</View>
			</LinearGradient>

			<ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
				{/* Appearance */}
				<Section title="Appearance" theme={theme}>
					<Row title="Theme" theme={theme}>
						<Segmented
							options={[
								{ key: "light", label: "Light" },
								{ key: "system", label: "System" },
								{ key: "dark", label: "Dark" },
							]}
							value={mode}
							onChange={v => setMode(v as any)}
							theme={theme}
						/>
					</Row>

					<Row title="Show cents (.00)" theme={theme}>
						<Switch
							value={settings.showCents}
							onValueChange={v => setSetting("showCents", v)}
							trackColor={{ false: theme.border, true: COLORS.primary1 }}
							thumbColor={"#fff"}
						/>
					</Row>
				</Section>

				{/* Privacy & Security */}
				<Section title="Privacy & Security" theme={theme}>
					<Row title="App Lock" theme={theme}>
						<Segmented
							options={[
								{ key: "off", label: "Off" },
								{ key: "biometric", label: "Biometric" },
								{ key: "passcode", label: "Passcode" },
							]}
							value={settings.appLock}
							onChange={v => setAppLock(v as AppLockMode)}
							theme={theme}
						/>
					</Row>

					<Row
						title="Auto-lock after"
						disabled={settings.appLock === "off"}
						theme={theme}
					>
						<Segmented
							options={[
								{ key: "30", label: "30s" },
								{ key: "60", label: "1m" },
								{ key: "300", label: "5m" },
							]}
							value={String(settings.autoLockAfterSec)}
							onChange={v =>
								setSetting("autoLockAfterSec", Number(v) as AutoLockDelaySec)
							}
							disabled={settings.appLock === "off"}
							theme={theme}
						/>
					</Row>
				</Section>

				{/* Reminders */}
				<Section title="Reminders" theme={theme}>
					<Row title="Daily log reminder" theme={theme}>
						<Switch
							value={settings.reminderEnabled}
							onValueChange={async v => {
								setSetting("reminderEnabled", v);
								if (v) await scheduleDailyReminder();
								else await cancelDailyReminder();
							}}
							trackColor={{ false: theme.border, true: COLORS.primary1 }}
							thumbColor={"#fff"}
						/>
					</Row>

					<Row
						title="Reminder time"
						subtitle={timeLabel}
						onPress={() => setShowTimePicker(true)}
						disabled={!settings.reminderEnabled}
						theme={theme}
					>
						<Ionicons
							name="chevron-forward"
							size={18}
							color={theme.textSecondary}
							style={{ marginLeft: 8 }}
						/>
					</Row>

					{showTimePicker && (
						<DateTimePicker
							value={hhmmToDate(settings.reminderTime)}
							mode="time"
							display={Platform.OS === "ios" ? "spinner" : "default"}
							onChange={async (e, selected) => {
								if (Platform.OS === "android") setShowTimePicker(false);
								if (!selected) return;
								const hh = selected.getHours().toString().padStart(2, "0");
								const mm = selected.getMinutes().toString().padStart(2, "0");
								setSetting("reminderTime", `${hh}:${mm}`);
								if (settings.reminderEnabled) {
									await scheduleDailyReminder();
								}
							}}
							style={
								Platform.OS === "ios" ? { alignSelf: "stretch" } : undefined
							}
						/>
					)}
				</Section>

				{/* Data */}
				<Section title="Data" theme={theme}>
					<RowButton
						title="Export transactions (CSV)"
						icon="file-text"
						onPress={exportTransactions}
						theme={theme}
					/>
					<RowButton
						title="Export budgets (CSV)"
						icon="file-text"
						onPress={exportBudgets}
						theme={theme}
					/>
					<RowButton
						title="Export recurring (CSV)"
						icon="file-text"
						onPress={exportRecurring}
						theme={theme}
					/>

					<RowButton
						title="Reset all data"
						icon="trash-2"
						danger
						onPress={resetAllDataGuarded}
						theme={theme}
					/>
				</Section>

				{/* About & Support */}
				<Section title="About & Support" theme={theme}>
					<StaticRow title="App version" value={appVersion} theme={theme} />
					<RowButton
						title="What’s new"
						icon="info"
						onPress={() =>
							Alert.alert(
								"What’s new",
								"• Quick Add overlay\n• Recurring & Budgets improvements\n• Settings & CSV export"
							)
						}
						theme={theme}
					/>
					<RowButton
						title="Privacy (placeholder)"
						icon="shield"
						onPress={() =>
							Alert.alert(
								"Privacy",
								"Add your privacy policy link/content here."
							)
						}
						theme={theme}
					/>
					<RowButton
						title="Licenses"
						icon="book"
						onPress={() =>
							Alert.alert(
								"Open-source licenses",
								"Add a licenses screen or link for the demo."
							)
						}
						theme={theme}
					/>
					<RowButton
						title="Contact support"
						icon="mail"
						onPress={() =>
							Linking.openURL(
								"mailto:hello@example.com?subject=FinWise Support"
							)
						}
						theme={theme}
					/>
				</Section>
			</ScrollView>
		</SafeAreaView>
	);
}

/* ---------- helpers & small components ---------- */

function hhmmToDate(hhmm: string) {
	const [hh, mm] = hhmm.split(":").map(n => parseInt(n, 10));
	const d = new Date();
	d.setHours(hh || 20, mm || 0, 0, 0);
	return d;
}

function Section({
	title,
	children,
	theme,
}: {
	title: string;
	children: React.ReactNode;
	theme: ReturnType<typeof useTheme>;
}) {
	return (
		<View style={{ paddingHorizontal: 16, marginTop: 18 }}>
			<Text
				style={{
					color: theme.textSecondary,
					fontWeight: "800",
					marginBottom: 8,
				}}
			>
				{title.toUpperCase()}
			</Text>
			<View
				style={{
					backgroundColor: theme.card,
					borderRadius: 16,
					paddingVertical: 6,
					paddingHorizontal: 8,
					elevation: 2,
					shadowOpacity: 0.08,
					shadowRadius: 6,
				}}
			>
				{children}
			</View>
		</View>
	);
}

function Row({
	title,
	subtitle,
	children,
	onPress,
	disabled,
	theme,
}: {
	title: string;
	subtitle?: string;
	children?: React.ReactNode;
	onPress?: () => void;
	disabled?: boolean;
	theme: ReturnType<typeof useTheme>;
}) {
	return (
		<TouchableOpacity
			activeOpacity={onPress ? 0.7 : 1}
			onPress={onPress}
			disabled={!onPress || disabled}
			style={[
				styles.row,
				{ opacity: disabled ? 0.5 : 1, paddingVertical: 14, minHeight: 54 },
			]}
		>
			<View style={{ flex: 1 }}>
				<Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
				{!!subtitle && (
					<Text style={[styles.rowSub, { color: theme.textSecondary }]}>
						{subtitle}
					</Text>
				)}
			</View>
			{children}
		</TouchableOpacity>
	);
}

function RowButton({
	title,
	icon,
	onPress,
	danger,
	theme,
}: {
	title: string;
	icon: React.ComponentProps<typeof Feather>["name"];
	onPress: () => void;
	danger?: boolean;
	theme: ReturnType<typeof useTheme>;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			style={[styles.row, { paddingVertical: 14, minHeight: 54 }]}
		>
			<Feather
				name={icon}
				size={18}
				color={danger ? COLORS.danger : theme.textSecondary}
				style={{ marginRight: 10 }}
			/>
			<Text
				style={[
					styles.rowTitle,
					{ color: danger ? COLORS.danger : theme.text },
				]}
			>
				{title}
			</Text>
		</TouchableOpacity>
	);
}

function StaticRow({
	title,
	value,
	theme,
}: {
	title: string;
	value: string;
	theme: ReturnType<typeof useTheme>;
}) {
	return (
		<View style={[styles.row, { paddingVertical: 14, minHeight: 54 }]}>
			<Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
			<Text style={[styles.rowSub, { color: theme.textSecondary }]}>
				{value}
			</Text>
		</View>
	);
}

function Segmented({
	options,
	value,
	onChange,
	disabled,
	theme,
}: {
	options: { key: string; label: string }[];
	value: string;
	onChange: (v: string) => void;
	disabled?: boolean;
	theme: ReturnType<typeof useTheme>;
}) {
	return (
		<View
			style={[
				styles.segment,
				{ opacity: disabled ? 0.5 : 1, backgroundColor: theme.background },
			]}
		>
			{options.map(opt => {
				const active = value === opt.key;
				return (
					<TouchableOpacity
						key={opt.key}
						onPress={() => !disabled && onChange(opt.key)}
						activeOpacity={0.85}
						style={[
							styles.segmentBtn,
							{
								backgroundColor: active ? COLORS.primary1 : "transparent",
								borderColor: active ? "transparent" : theme.border,
							},
						]}
					>
						<Text
							style={{
								fontWeight: "800",
								color: active ? "#fff" : theme.textSecondary,
							}}
						>
							{opt.label}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingBottom: 20,
		paddingHorizontal: 24,
		borderBottomLeftRadius: 28,
		borderBottomRightRadius: 28,
		elevation: 6,
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 10,
	},
	headerTitle: {
		color: "#fff",
		fontSize: 28,
		fontWeight: "900",
		letterSpacing: 1.2,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		borderRadius: 12,
	},
	rowTitle: {
		fontSize: 16,
		fontWeight: "800",
	},
	rowSub: {
		fontSize: 13,
		marginTop: 2,
	},
	segment: {
		flexDirection: "row",
		gap: 8,
		padding: 4,
		borderRadius: 999,
	},
	segmentBtn: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 999,
		borderWidth: 1,
	},
});
