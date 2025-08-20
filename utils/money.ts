// utils/money.ts
export function parseAmount(input: string): number {
	if (!input) return 0;
	// normalize: strip spaces, convert comma to dot
	const s = input.replace(/\s/g, "").replace(",", ".");
	const n = Number(s);
	return Number.isFinite(n) ? n : 0;
}

export function formatAmount(amount: number, showCents: boolean) {
	if (showCents) {
		return new Intl.NumberFormat(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	}
	// 🔧 No cents: round to nearest whole number
	return new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 0,
	}).format(amount);
}
