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
export const lightColors = {
	background: "#f6f8fa",
	card: "#ffffff",
	primary: "#007AFF",
	accent: "#FFB800",
	income: "#2ecc71",
	expense: "#e74c3c",
	text: "#181A20",
	textSecondary: "#747A8B",
	border: "#E3E6ED",
};

export const darkColors = {
	background: "#181A20",
	card: "#232946",
	primary: "#007AFF",
	accent: "#FFB800",
	income: "#2ecc71",
	expense: "#e74c3c",
	text: "#ffffff",
	textSecondary: "#B0B7C3",
	border: "#232946",
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
