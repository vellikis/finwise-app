// screens/HomeScreen.tsx
import React, {
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
	useCallback,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	StatusBar,
	RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTheme } from "../theme";

// DB helpers
import {
	getTransactions,
	getBudgets,
	getRecurringRules,
	materializeRecurring,
	Transaction,
	Budget,
	RecurringRule,
} from "../database";

/* -------------------------- tiny helpers -------------------------- */
const euro = (n: number) => `€${n.toFixed(2)}`;
const startOfDay = (d: Date) =>
	new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) =>
	new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

function getMonthBounds(ref = new Date()) {
	const y = ref.getFullYear();
	const m = ref.getMonth();
	return {
		start: new Date(y, m, 1),
		end: endOfDay(new Date(y, m, daysInMonth(y, m))),
	};
}

function getLastMonthBounds(ref = new Date()) {
	const y = ref.getFullYear();
	const m = ref.getMonth();
	const ly = m === 0 ? y - 1 : y;
	const lm = m === 0 ? 11 : m - 1;
	return {
		start: new Date(ly, lm, 1),
		end: endOfDay(new Date(ly, lm, daysInMonth(ly, lm))),
	};
}

// Budgets: compute current window (weekly/monthly) identical to BudgetsScreen
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

// Recurring: next due (same as RecurringScreen)
type RecurringFrequency = "daily" | "weekly" | "monthly";
function stepDate(freq: RecurringFrequency, d: Date) {
	if (freq === "daily") return addDays(d, 1);
	if (freq === "weekly") return addDays(d, 7);
	const x = new Date(d);
	x.setMonth(x.getMonth() + 1);
	return x;
}
function nextDue(rule: RecurringRule, now = new Date()): Date {
	const today = startOfDay(now);
	const anchor = startOfDay(new Date(rule.startDate));
	const last = rule.lastRun ? startOfDay(new Date(rule.lastRun)) : null;
	let cursor = last
		? stepDate(rule.frequency as RecurringFrequency, last)
		: anchor;
	if (cursor < anchor) cursor = anchor;
	while (cursor < today)
		cursor = stepDate(rule.frequency as RecurringFrequency, cursor);
	return cursor;
}

/* ------------------------------- UI ------------------------------- */
export default function HomeScreen({ navigation }: any) {
	const insets = useSafeAreaInsets();
	const theme = useTheme();

	const [tx, setTx] = useState<Transaction[]>([]);
	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [rules, setRules] = useState<RecurringRule[]>([]);
	const [refreshing, setRefreshing] = useState(false);

	useLayoutEffect(() => {
		navigation?.setOptions?.({ headerShown: false });
	}, [navigation]);

	const load = useCallback(async () => {
		const [t, b, r] = await Promise.all([
			getTransactions(),
			getBudgets(),
			getRecurringRules(),
		]);
		setTx(t);
		setBudgets(b);
		setRules(r);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await load();
		setRefreshing(false);
	}, [load]);

	/* ---------- derived: month stats, forecast ---------- */
	const {
		monthIncome,
		monthExpense,
		netMonth,
		forecastExpense,
		lastMonthExpense,
		forecastDelta,
	} = useMemo(() => {
		const now = new Date();
		const { start, end } = getMonthBounds(now);
		const lm = getLastMonthBounds(now);

		const inWindow = (d: Date, a: Date, b: Date) => d >= a && d <= b;

		const mIncome = tx
			.filter(t => t.type === "income")
			.filter(t => inWindow(new Date(t.date), start, end))
			.reduce((s, t) => s + (t.amount || 0), 0);

		const mExpense = tx
			.filter(t => t.type === "expense")
			.filter(t => inWindow(new Date(t.date), start, end))
			.reduce((s, t) => s + (t.amount || 0), 0);

		const lmExpense = tx
			.filter(t => t.type === "expense")
			.filter(t => inWindow(new Date(t.date), lm.start, lm.end))
			.reduce((s, t) => s + (t.amount || 0), 0);

		const day = now.getDate();
		const dim = daysInMonth(now.getFullYear(), now.getMonth());
		const daily = day ? mExpense / day : 0;
		const forecast = daily * dim;

		return {
			monthIncome: mIncome,
			monthExpense: mExpense,
			netMonth: mIncome - mExpense,
			forecastExpense: forecast,
			lastMonthExpense: lmExpense,
			forecastDelta: forecast - lmExpense,
		};
	}, [tx]);

	/* ---------- budgets mini summary ---------- */
	const miniBudgets = useMemo(() => {
		const now = new Date();
		const rows = budgets.map(b => {
			const { from, to } = getCurrentWindow(b, now);
			const spent = tx
				.filter(
					t =>
						t.type === "expense" &&
						t.category?.trim().toLowerCase() === b.category.trim().toLowerCase()
				)
				.filter(t => {
					const d = new Date(t.date);
					return d >= from && d <= endOfDay(to);
				})
				.reduce((s, t) => s + (t.amount || 0), 0);
			const pct = Math.max(0, Math.min(1, b.amount ? spent / b.amount : 0));
			return { b, spent, pct };
		});
		// pick up to 3 most spent
		return rows.sort((a, b) => b.pct - a.pct).slice(0, 3);
	}, [budgets, tx]);

	/* ---------- recurring next due & run-due ---------- */
	const { nextRecurring, dueTodayCount } = useMemo(() => {
		if (!rules.length)
			return { nextRecurring: null as RecurringRule | null, dueTodayCount: 0 };
		const today = startOfDay(new Date()).getTime();
		let next: { rule: RecurringRule; due: Date } | null = null;
		let count = 0;
		for (const r of rules) {
			const d = nextDue(r);
			if (startOfDay(d).getTime() === today) count += 1;
			if (!next || d < next.due) next = { rule: r, due: d };
		}
		return { nextRecurring: next?.rule ?? null, dueTodayCount: count };
	}, [rules]);

	const runDueNow = useCallback(async () => {
		await materializeRecurring();
		await load();
	}, [load]);

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

			{/* Gradient Header */}
			<LinearGradient
				colors={[theme.primary2, theme.primary1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.header, { paddingTop: insets.top + 12 }]}
			>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Ionicons
						name="cash-outline"
						size={32}
						color={theme.onPrimary}
						style={{ marginRight: 10 }}
					/>
					<Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
						FinWise
					</Text>
				</View>
			</LinearGradient>

			<ScrollView
				style={{ flex: 1 }}
				contentContainerStyle={{ paddingBottom: 24 }}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
			>
				{/* Quick Stats (Month) */}
				<View style={styles.statsRow}>
					<BlurView intensity={30} tint="light" style={styles.statCard}>
						<Text style={[styles.statLabel, { color: theme.income }]}>
							Income (Month)
						</Text>
						<Text
							style={[styles.statValue, { color: theme.income }]}
							numberOfLines={1}
							adjustsFontSizeToFit
						>
							+{euro(monthIncome)}
						</Text>
					</BlurView>

					<BlurView intensity={30} tint="light" style={styles.statCard}>
						<Text style={[styles.statLabel, { color: theme.expense }]}>
							Expenses (Month)
						</Text>
						<Text
							style={[styles.statValue, { color: theme.expense }]}
							numberOfLines={1}
							adjustsFontSizeToFit
						>
							-{euro(monthExpense)}
						</Text>
					</BlurView>
				</View>

				{/* Forecast row */}
				<View style={[styles.forecastCard, { backgroundColor: theme.card }]}>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<Ionicons
							name="sparkles-outline"
							size={18}
							color={theme.textSecondary}
						/>
						<Text style={[styles.forecastTitle, { color: theme.text }]}>
							Burn rate forecast
						</Text>
					</View>
					<Text style={[styles.forecastValue, { color: theme.text }]}>
						{euro(forecastExpense)} this month
					</Text>
					<Text style={{ color: theme.textSecondary, marginTop: 2 }}>
						{forecastDelta >= 0 ? "↑" : "↓"} {euro(Math.abs(forecastDelta))} vs
						last month ({euro(lastMonthExpense)})
					</Text>
				</View>

				{/* Action Buttons (navigate) */}
				<View style={styles.actionRow}>
					<TouchableOpacity
						style={styles.actionBtn}
						onPress={() => navigation.navigate("Transactions")}
					>
						<LinearGradient
							colors={[theme.primary1, theme.primary2]}
							style={styles.actionInner}
						>
							<MaterialCommunityIcons
								name="swap-horizontal"
								size={30}
								color={theme.onPrimary}
							/>
							<Text
								style={[styles.actionText, { color: theme.onPrimary }]}
								numberOfLines={1}
								adjustsFontSizeToFit
								minimumFontScale={0.85}
							>
								Transactions
							</Text>
						</LinearGradient>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.actionBtn}
						onPress={() => navigation.navigate("Budgets")}
					>
						<LinearGradient
							colors={["#10B981", "#059669"]}
							style={styles.actionInner}
						>
							<Ionicons
								name="wallet-outline"
								size={30}
								color={theme.onPrimary}
							/>
							<Text
								style={[styles.actionText, { color: theme.onPrimary }]}
								numberOfLines={1}
								adjustsFontSizeToFit
								minimumFontScale={0.85}
							>
								Budgets
							</Text>
						</LinearGradient>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.actionBtn}
						onPress={() => navigation.navigate("Recurring")}
					>
						<LinearGradient
							colors={[theme.primary2, theme.primary1]}
							style={styles.actionInner}
						>
							<Ionicons name="repeat" size={30} color={theme.onPrimary} />
							<Text
								style={[styles.actionText, { color: theme.onPrimary }]}
								numberOfLines={1}
								adjustsFontSizeToFit
								minimumFontScale={0.85}
							>
								Recurring
							</Text>
						</LinearGradient>
					</TouchableOpacity>
				</View>

				{/* Next Recurring + Run due */}
				<View style={[styles.tile, { backgroundColor: theme.card }]}>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<View style={{ flexDirection: "row", alignItems: "center" }}>
							<Ionicons
								name="notifications-outline"
								size={18}
								color={theme.textSecondary}
							/>
							<Text style={[styles.tileTitle, { color: theme.text }]}>
								Next recurring
							</Text>
						</View>
						{dueTodayCount > 0 && (
							<TouchableOpacity
								onPress={runDueNow}
								style={[styles.pill, { backgroundColor: theme.primary1 }]}
							>
								<Ionicons
									name="play-outline"
									size={14}
									color={theme.onPrimary}
								/>
								<Text style={[styles.pillText, { color: theme.onPrimary }]}>
									Run due ({dueTodayCount})
								</Text>
							</TouchableOpacity>
						)}
					</View>
					{nextRecurring ? (
						<Text style={{ marginTop: 8, color: theme.textSecondary }}>
							{nextRecurring.category} •{" "}
							{startOfDay(nextDue(nextRecurring)).getTime() ===
							startOfDay(new Date()).getTime()
								? "Today"
								: new Date(nextDue(nextRecurring)).toLocaleDateString()}
						</Text>
					) : (
						<Text style={{ marginTop: 8, color: theme.textSecondary }}>
							No recurring rules yet.
						</Text>
					)}
				</View>

				{/* Budgets mini summary */}
				<View style={[styles.tile, { backgroundColor: theme.card }]}>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<Ionicons
							name="pie-chart-outline"
							size={18}
							color={theme.textSecondary}
						/>
						<Text style={[styles.tileTitle, { color: theme.text }]}>
							Budgets overview
						</Text>
					</View>

					{miniBudgets.length ? (
						miniBudgets.map(({ b, spent, pct }) => (
							<View key={b.id} style={{ marginTop: 12 }}>
								<View
									style={{
										flexDirection: "row",
										justifyContent: "space-between",
									}}
								>
									<Text style={{ color: theme.text }}>{b.category}</Text>
									<Text
										style={{
											color: pct >= 1 ? theme.expense : theme.textSecondary,
										}}
									>
										{euro(spent)} / {euro(b.amount)}
									</Text>
								</View>
								<View
									style={{
										height: 10,
										borderRadius: 8,
										backgroundColor: theme.border,
										overflow: "hidden",
										marginTop: 6,
									}}
								>
									<View
										style={{
											width: `${Math.max(
												2,
												Math.min(100, Math.round(pct * 100))
											)}%`,
											height: "100%",
											backgroundColor:
												pct >= 1 ? theme.expense : theme.primary1,
										}}
									/>
								</View>
							</View>
						))
					) : (
						<Text style={{ marginTop: 8, color: theme.textSecondary }}>
							No budgets yet.
						</Text>
					)}
				</View>

				{/* Recent Activity */}
				<View style={[styles.tile, { backgroundColor: theme.card }]}>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<Ionicons
							name="time-outline"
							size={18}
							color={theme.textSecondary}
						/>
						<Text style={[styles.tileTitle, { color: theme.text }]}>
							Recent activity
						</Text>
					</View>

					{tx.length ? (
						tx
							.slice()
							.sort((a, b) => +new Date(b.date) - +new Date(a.date))
							.slice(0, 5)
							.map(t => (
								<View key={`${t.id}-${t.date}`} style={styles.activityRow}>
									<View style={styles.activityLeft}>
										<View
											style={[
												styles.dot,
												{
													backgroundColor:
														t.type === "income" ? theme.income : theme.expense,
												},
											]}
										/>
										<Text style={{ color: theme.text }}>
											{t.category ||
												(t.type === "income" ? "Income" : "Expense")}
										</Text>
									</View>
									<Text
										style={{
											color: t.type === "income" ? theme.income : theme.expense,
											fontWeight: "800",
										}}
									>
										{(t.type === "income" ? "+" : "-") + euro(t.amount || 0)}
									</Text>
								</View>
							))
					) : (
						<Text style={{ marginTop: 8, color: theme.textSecondary }}>
							No transactions yet.
						</Text>
					)}
				</View>

				{/* Tip Section (kept) */}
				<LinearGradient
					colors={[theme.tipBg1, theme.tipBg2]}
					style={styles.tipsBox}
				>
					<Text style={[styles.tipsTitle, { color: theme.tipTextPrimary }]}>
						💡 Pro Tip
					</Text>
					<Text style={[styles.tipsText, { color: theme.tipTextSecondary }]}>
						Set a monthly savings goal and watch your progress in Budgets!
					</Text>
				</LinearGradient>
			</ScrollView>
		</SafeAreaView>
	);
}

/* ------------------------------ styles ----------------------------- */
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
	headerTitle: { fontSize: 28, fontWeight: "900", letterSpacing: 1.2 },

	statsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 30,
		marginHorizontal: 24,
	},
	statCard: {
		flex: 1,
		marginHorizontal: 8,
		borderRadius: 20,
		padding: 22,
		alignItems: "center",
		overflow: "hidden",
	},
	statLabel: {
		fontSize: 16,
		marginBottom: 8,
		fontWeight: "600",
		letterSpacing: 0.5,
	},
	statValue: { fontSize: 26, fontWeight: "bold" },

	forecastCard: {
		marginTop: 16,
		marginHorizontal: 24,
		borderRadius: 16,
		padding: 16,
		elevation: 2,
		shadowOpacity: 0.05,
		shadowRadius: 4,
	},
	forecastTitle: { marginLeft: 8, fontWeight: "800", fontSize: 15 },
	forecastValue: { marginTop: 6, fontSize: 18, fontWeight: "900" },

	actionRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 24,
		marginHorizontal: 24,
	},
	actionBtn: { flex: 1, marginHorizontal: 6 },
	actionInner: {
		width: "100%",
		height: 120, // ⬅️ fixed height so all three match
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 18,
		overflow: "hidden",
	},
	actionText: {
		marginTop: 8,
		fontSize: 14,
		fontWeight: "bold",
		letterSpacing: 0.5,
		textAlign: "center",
		width: "90%", // ⬅️ keeps text from touching edges
	},

	welcomeBox: {
		marginTop: 28,
		marginHorizontal: 24,
		borderRadius: 18,
		padding: 26,
		alignItems: "center",
		elevation: 2,
		shadowOpacity: 0.05,
		shadowRadius: 4,
	},
	welcomeText: { fontSize: 24, fontWeight: "900", marginBottom: 8 },
	welcomeSub: { fontSize: 15, textAlign: "center" },

	tile: {
		marginTop: 16,
		marginHorizontal: 24,
		borderRadius: 16,
		padding: 16,
		elevation: 1,
		shadowOpacity: 0.04,
		shadowRadius: 4,
	},
	tileTitle: { marginLeft: 8, fontWeight: "800", fontSize: 15 },

	pill: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	pillText: { marginLeft: 6, fontWeight: "800", fontSize: 12 },

	// mini budgets
	// (bars are inline; see render)
	// recent activity
	activityRow: {
		marginTop: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	activityLeft: { flexDirection: "row", alignItems: "center" },
	dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
	tipsBox: {
		marginTop: 24,
		marginHorizontal: 24,
		borderRadius: 16,
		padding: 20,
		elevation: 1,
	},
	tipsTitle: { fontSize: 17, fontWeight: "900", marginBottom: 6 },
	tipsText: { fontSize: 14 },
});
