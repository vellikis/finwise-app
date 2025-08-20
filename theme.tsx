// theme.ts
import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark" | "system";

type Theme = {
	isDark: boolean;
	background: string;
	card: string;
	text: string;
	textSecondary: string;
	border: string;

	primary1: string;
	primary2: string;
	onPrimary: string;

	income: string;
	expense: string;

	tipBg1: string;
	tipBg2: string;
	tipTextPrimary: string;
	tipTextSecondary: string;

	// (optional extras you referenced)
	primary?: string;
	primarySoft?: string;
};

const light: Theme = {
	isDark: false,
	background: "#F7F8FA",
	card: "#FFFFFF",
	text: "#111827",
	textSecondary: "#6B7280",
	border: "#E5E7EB",

	primary1: "#6366F1",
	primary2: "#4F46E5",
	onPrimary: "#FFFFFF",

	income: "#10B981",
	expense: "#EF4444",

	tipBg1: "#EEF2FF",
	tipBg2: "#E0E7FF",
	tipTextPrimary: "#111827",
	tipTextSecondary: "#374151",

	primary: "#6366F1",
	primarySoft: "#EEF2FF",
};

const dark: Theme = {
	isDark: true,
	background: "#0B0F14",
	card: "#131A22",
	text: "#F9FAFB",
	textSecondary: "#93A3B5",
	border: "#293241",

	primary1: "#6366F1",
	primary2: "#4F46E5",
	onPrimary: "#FFFFFF",

	income: "#22C55E",
	expense: "#F87171",

	tipBg1: "#1B2230",
	tipBg2: "#1F2940",
	tipTextPrimary: "#F9FAFB",
	tipTextSecondary: "#93A3B5",

	primary: "#6366F1",
	primarySoft: "#1B2230",
};

type ThemeModeCtx = { mode: ThemeMode; setMode: (m: ThemeMode) => void };
const ThemeContext = createContext<Theme>(light);
const ThemeModeContext = createContext<ThemeModeCtx>({
	mode: "system",
	setMode: () => {},
});

const MODE_KEY = "finwise.themeMode.v1";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const system = useColorScheme(); // 'light' | 'dark' | null
	const [mode, setMode] = useState<ThemeMode>("system");

	// load saved mode once
	useEffect(() => {
		(async () => {
			const saved = await AsyncStorage.getItem(MODE_KEY);
			if (saved === "light" || saved === "dark" || saved === "system")
				setMode(saved);
		})();
	}, []);

	// persist mode
	useEffect(() => {
		AsyncStorage.setItem(MODE_KEY, mode).catch(() => {});
	}, [mode]);

	const effective = mode === "system" ? system ?? "light" : mode;
	const theme = useMemo(
		() => (effective === "dark" ? dark : light),
		[effective]
	);

	const modeCtx = useMemo(() => ({ mode, setMode }), [mode]);

	return (
		<ThemeModeContext.Provider value={modeCtx}>
			<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
		</ThemeModeContext.Provider>
	);
}

export function useTheme() {
	return useContext(ThemeContext);
}
export function useThemeMode() {
	return useContext(ThemeModeContext);
}
