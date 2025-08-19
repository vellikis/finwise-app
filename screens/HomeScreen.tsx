import React, { useLayoutEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTheme } from "../theme";

export default function HomeScreen({ navigation }: any) {
	const insets = useSafeAreaInsets();
	const theme = useTheme();

	useLayoutEffect(() => {
		navigation?.setOptions?.({ headerShown: false });
	}, [navigation]);

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
			>
				{/* Quick Stats */}
				<View style={styles.statsRow}>
					<BlurView intensity={30} tint="light" style={styles.statCard}>
						<Text style={[styles.statLabel, { color: theme.income }]}>
							Income
						</Text>
						<Text
							style={[styles.statValue, { color: theme.income }]}
							numberOfLines={1}
							adjustsFontSizeToFit
						>
							+€2,500
						</Text>
					</BlurView>

					<BlurView intensity={30} tint="light" style={styles.statCard}>
						<Text style={[styles.statLabel, { color: theme.expense }]}>
							Expenses
						</Text>
						<Text
							style={[styles.statValue, { color: theme.expense }]}
							numberOfLines={1}
							adjustsFontSizeToFit
						>
							-€1,300
						</Text>
					</BlurView>
				</View>

				{/* Action Buttons */}
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
							<Text style={[styles.actionText, { color: theme.onPrimary }]}>
								Transactions
							</Text>
						</LinearGradient>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.actionBtn}
						onPress={() => navigation.navigate("Insights")}
					>
						<LinearGradient
							colors={[theme.income, "#059669"]}
							style={styles.actionInner}
						>
							<Ionicons name="stats-chart" size={30} color={theme.onPrimary} />
							<Text style={[styles.actionText, { color: theme.onPrimary }]}>
								Insights
							</Text>
						</LinearGradient>
					</TouchableOpacity>
				</View>

				{/* Welcome Message */}
				<View
					style={[
						styles.welcomeBox,
						{ backgroundColor: theme.card, shadowColor: "#000" }, // keep subtle elevation
					]}
				>
					<Text style={[styles.welcomeText, { color: "#111827" }]}>
						Welcome back! 🎉
					</Text>
					<Text style={[styles.welcomeSub, { color: theme.textSecondary }]}>
						Track your finances, grow your wealth, and stay in control.
					</Text>
				</View>

				{/* Tip Section */}
				<LinearGradient
					colors={[theme.tipBg1, theme.tipBg2]}
					style={styles.tipsBox}
				>
					<Text style={[styles.tipsTitle, { color: theme.tipTextPrimary }]}>
						💡 Pro Tip
					</Text>
					<Text style={[styles.tipsText, { color: theme.tipTextSecondary }]}>
						Set a monthly savings goal and watch your progress in Insights!
					</Text>
				</LinearGradient>
			</ScrollView>
		</SafeAreaView>
	);
}

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
		fontSize: 28,
		fontWeight: "900",
		letterSpacing: 1.2,
	},
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
	statValue: {
		fontSize: 26,
		fontWeight: "bold",
	},
	actionRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 36,
		marginHorizontal: 24,
	},
	actionBtn: {
		flex: 1,
		marginHorizontal: 6,
	},
	actionInner: {
		width: "100%",
		paddingVertical: 22,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 18,
		overflow: "hidden",
		minHeight: 100,
	},
	actionText: {
		marginTop: 8,
		fontSize: 14,
		fontWeight: "bold",
		letterSpacing: 0.5,
		textAlign: "center",
		width: "100%",
	},
	welcomeBox: {
		marginTop: 36,
		marginHorizontal: 24,
		borderRadius: 18,
		padding: 26,
		alignItems: "center",
		elevation: 2,
		shadowOpacity: 0.05,
		shadowRadius: 4,
	},
	welcomeText: {
		fontSize: 24,
		fontWeight: "900",
		marginBottom: 8,
	},
	welcomeSub: {
		fontSize: 15,
		textAlign: "center",
	},
	tipsBox: {
		marginTop: 28,
		marginHorizontal: 24,
		borderRadius: 16,
		padding: 20,
		elevation: 1,
	},
	tipsTitle: {
		fontSize: 17,
		fontWeight: "900",
		marginBottom: 6,
	},
	tipsText: {
		fontSize: 14,
	},
});
