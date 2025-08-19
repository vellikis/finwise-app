// theme.tsx
import React, {
	createContext,
	useContext,
	useMemo,
	useState,
	ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import {
	DefaultTheme,
	DarkTheme,
	Theme as NavigationTheme,
} from "@react-navigation/native";

// ---- COLOR PALETTES ----
// Updated to match HomeScreen's exact colors and add a few "on*" helpers.
export const lightColors = {
	// Base
	background: "#F9FAFB", // was COLORS.bg
	card: "#ffffff",
	text: "#181A20",
	textSecondary: "#6B7280",
	border: "#E3E6ED",

	// Brand / primary
	primary: "#4F46E5",
	primary1: "#6366F1", // gradient end (was COLORS.primary1)
	primary2: "#4F46E5", // gradient start (was COLORS.primary2)
	onPrimary: "#ffffff",

	// Accents
	accent: "#FFB800",

	// Finance
	income: "#10B981", // exact match
	expense: "#EF4444", // exact match

	// Tips box gradient + text
	tipBg1: "#F0FDF4",
	tipBg2: "#D1FAE5",
	tipTextPrimary: "#065F46",
	tipTextSecondary: "#047857",
};

export const darkColors = {
	// Dark base
	background: "#181A20",
	card: "#232946",
	text: "#ffffff",
	textSecondary: "#B0B7C3",
	border: "#232946",

	// Brand / primary (keep same hues for consistency)
	primary: "#4F46E5",
	primary1: "#6366F1",
	primary2: "#4F46E5",
	onPrimary: "#ffffff",

	// Accents
	accent: "#FFB800",

	// Finance (keep same greens/reds so meaning is consistent)
	income: "#10B981",
	expense: "#EF4444",

	// Tips box gradient + text (use subtler dark-friendly greens)
	tipBg1: "#10231b",
	tipBg2: "#163024",
	tipTextPrimary: "#B7F9D0",
	tipTextSecondary: "#A0EEC4",
};

// ---- THEME TYPES ----
export type ThemeMode = "system" | "light" | "dark";
export type AppTheme = typeof lightColors;

interface ThemeContextProps {
	theme: AppTheme;
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
}

// ---- CONTEXT ----
const ThemeContext = createContext<ThemeContextProps>({
	theme: lightColors,
	mode: "system",
	setMode: () => {},
});

// ---- PROVIDER ----
export function ThemeProvider({ children }: { children: ReactNode }) {
	const systemScheme = useColorScheme(); // "light" | "dark"
	const [mode, setMode] = useState<ThemeMode>("system");

	const theme = useMemo(() => {
		if (mode === "light") return lightColors;
		if (mode === "dark") return darkColors;
		return systemScheme === "dark" ? darkColors : lightColors;
	}, [mode, systemScheme]);

	const contextValue = useMemo(
		() => ({
			theme,
			mode,
			setMode,
		}),
		[theme, mode]
	);

	return (
		<ThemeContext.Provider value={contextValue}>
			{children}
		</ThemeContext.Provider>
	);
}

// ---- HOOKS ----
export function useTheme() {
	return useContext(ThemeContext).theme;
}

export function useThemeMode() {
	const ctx = useContext(ThemeContext);
	return {
		mode: ctx.mode,
		setMode: ctx.setMode,
	};
}

// ---- REACT NAVIGATION THEME MAPPER ----
export function getNavigationTheme(theme: AppTheme): NavigationTheme {
	const base = theme === darkColors ? DarkTheme : DefaultTheme;
	return {
		...base,
		colors: {
			...base.colors,
			background: theme.background,
			card: theme.card,
			primary: theme.primary,
			text: theme.text,
			border: theme.border,
			notification: theme.accent,
		},
	};
}
