// database.ts
import * as SQLite from "expo-sqlite";

/* =======================
   Types
======================= */
export interface Transaction {
	id: number;
	type: string;
	amount: number;
	category: string;
	date: string;
}

export interface Investment {
	id: number;
	amount: number;
	platform: string;
	return_percentage: number;
	date: string;
}

export type BudgetPeriod = "weekly" | "monthly";
export interface Budget {
	id: number;
	category: string;
	amount: number;
	period: BudgetPeriod;
	startDate: string; // ISO string used to anchor the cycle windows
}

export type RecurringFrequency = "daily" | "weekly" | "monthly";
export interface RecurringRule {
	id: number;
	type: "income" | "expense";
	amount: number;
	category: string;
	startDate: string; // ISO start-of-day anchor
	frequency: RecurringFrequency;
	lastRun: string | null; // ISO date of last materialized occurrence
}

/* =======================
   DB instance (async API)Φι
======================= */
// Coerce to `any` so TS won’t complain if only openDatabaseSync is present
const SQLiteAny = SQLite as any;

// Either async or sync factory depending on platform/SDK
const db: any = SQLiteAny.openDatabase
	? SQLiteAny.openDatabase("finwise.db")
	: SQLiteAny.openDatabaseSync("finwise.db");

/* =======================
   Initialization
======================= */
export const initDB = async (): Promise<void> => {
	try {
		await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT    NOT NULL,
        amount REAL  NOT NULL,
        category TEXT,
        date TEXT
      );

      CREATE TABLE IF NOT EXISTS investments (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        amount            REAL    NOT NULL,
        platform          TEXT    NOT NULL,
        return_percentage REAL,
        date              TEXT
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT CHECK(period IN ('weekly','monthly')) NOT NULL,
        startDate TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recurring_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT CHECK(type IN ('income','expense')) NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        startDate TEXT NOT NULL,
        frequency TEXT CHECK(frequency IN ('daily','weekly','monthly')) NOT NULL,
        lastRun TEXT
      );
    `);

		// Try to add a link column; ignore error if it already exists
		try {
			await db.execAsync(
				`ALTER TABLE transactions ADD COLUMN source_rule_id INTEGER;`
			);
		} catch (_) {}
		console.log("✅ DB initialized");
	} catch (err) {
		console.error("🔥 initDB failed:", err);
	}
};

/* =======================
   Transactions
======================= */
export const insertTransaction = async (
	type: string,
	amount: number,
	category: string,
	date: string
): Promise<void> => {
	try {
		await db.runAsync(
			`INSERT INTO transactions (type, amount, category, date)
       VALUES (?, ?, ?, ?);`,
			[type, amount, category, date]
		);
	} catch (err) {
		console.error("🔥 insertTransaction failed:", err);
		throw err;
	}
};

export const getTransactions = async (): Promise<Transaction[]> => {
	try {
		// getAllAsync already returns an array of row objects
		const rows = await db.getAllAsync(
			`SELECT * FROM transactions ORDER BY date DESC;`
		);
		return rows as Transaction[];
	} catch (err) {
		console.error("🔥 getTransactions failed:", err);
		throw err;
	}
};

export const deleteTransaction = async (id: number): Promise<void> => {
	try {
		await db.runAsync(`DELETE FROM transactions WHERE id = ?;`, [id]);
	} catch (err) {
		console.error("🔥 deleteTransaction failed:", err);
		throw err;
	}
};

export const updateTransaction = async (
	id: number,
	type: string,
	amount: number,
	category: string,
	date: string
): Promise<void> => {
	try {
		await db.runAsync(
			`UPDATE transactions
         SET type = ?, amount = ?, category = ?, date = ?
       WHERE id = ?;`,
			[type, amount, category, date, id]
		);
	} catch (err) {
		console.error("🔥 updateTransaction failed:", err);
		throw err;
	}
};

/* =======================
   Investments
======================= */
export const insertInvestment = async (
	amount: number,
	platform: string,
	returnPercentage: number,
	date: string
): Promise<void> => {
	try {
		await db.runAsync(
			`INSERT INTO investments (amount, platform, return_percentage, date)
       VALUES (?, ?, ?, ?);`,
			[amount, platform, returnPercentage, date]
		);
	} catch (err) {
		console.error("🔥 insertInvestment failed:", err);
		throw err;
	}
};

export const getInvestments = async (): Promise<Investment[]> => {
	try {
		const rows = await db.getAllAsync(
			`SELECT * FROM investments ORDER BY date DESC;`
		);
		return rows as Investment[];
	} catch (err) {
		console.error("🔥 getInvestments failed:", err);
		throw err;
	}
};

export const deleteInvestment = async (id: number): Promise<void> => {
	try {
		await db.runAsync(`DELETE FROM investments WHERE id = ?;`, [id]);
	} catch (err) {
		console.error("🔥 deleteInvestment failed:", err);
		throw err;
	}
};

/* =======================
   Budgets
======================= */
export async function ensureBudgetsTable(): Promise<void> {
	try {
		await db.execAsync(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT CHECK(period IN ('weekly','monthly')) NOT NULL,
        startDate TEXT NOT NULL
      );
    `);
	} catch (err) {
		console.error("🔥 ensureBudgetsTable failed:", err);
		throw err;
	}
}

export async function getBudgets(): Promise<Budget[]> {
	try {
		const rows = await db.getAllAsync(
			`SELECT id, category, amount, period, startDate
         FROM budgets
        ORDER BY id DESC;`
		);
		// Avoid <Budget> generic on untyped function to prevent TS2347
		return rows as Budget[];
	} catch (err) {
		console.error("🔥 getBudgets failed:", err);
		throw err;
	}
}

export async function createBudget(
	category: string,
	amount: number,
	period: BudgetPeriod,
	startDateISO: string
): Promise<void> {
	try {
		await db.runAsync(
			`INSERT INTO budgets (category, amount, period, startDate)
       VALUES (?, ?, ?, ?);`,
			[category, amount, period, startDateISO]
		);
	} catch (err) {
		console.error("🔥 createBudget failed:", err);
		throw err;
	}
}

export async function updateBudget(
	id: number,
	category: string,
	amount: number,
	period: BudgetPeriod,
	startDateISO: string
): Promise<void> {
	try {
		await db.runAsync(
			`UPDATE budgets
         SET category = ?, amount = ?, period = ?, startDate = ?
       WHERE id = ?;`,
			[category, amount, period, startDateISO, id]
		);
	} catch (err) {
		console.error("🔥 updateBudget failed:", err);
		throw err;
	}
}

export async function deleteBudget(id: number): Promise<void> {
	try {
		await db.runAsync(`DELETE FROM budgets WHERE id = ?;`, [id]);
	} catch (err) {
		console.error("🔥 deleteBudget failed:", err);
		throw err;
	}
}

/** Sum of expenses for a given category since startDate */
export async function getBudgetSpent(
	category: string,
	startDateISO: string
): Promise<number> {
	try {
		// getAllAsync always returns an array of objects
		const rows: any[] = await db.getAllAsync(
			`SELECT SUM(amount) as total
       FROM transactions
       WHERE category = ?
         AND type = 'expense'
         AND date >= ?;`,
			[category, startDateISO]
		);

		// rows[0]?.total might be null if no transactions
		const total = rows?.[0]?.total ?? 0;
		return Number(total);
	} catch (err) {
		console.error("🔥 getBudgetSpent failed:", err);
		return 0;
	}
}

/* =======================
   Recurring
======================= */
export async function getRecurringRules(): Promise<RecurringRule[]> {
	try {
		const rows = await db.getAllAsync(
			`SELECT id, type, amount, category, startDate, frequency, lastRun
         FROM recurring_rules
        ORDER BY id DESC;`
		);
		return rows as RecurringRule[];
	} catch (err) {
		console.error("🔥 getRecurringRules failed:", err);
		throw err;
	}
}

export async function createRecurringRule(
	type: "income" | "expense",
	amount: number,
	category: string,
	startDateISO: string,
	frequency: RecurringFrequency
): Promise<void> {
	try {
		await db.runAsync(
			`INSERT INTO recurring_rules (type, amount, category, startDate, frequency)
       VALUES (?, ?, ?, ?, ?);`,
			[type, amount, category, startDateISO, frequency]
		);
	} catch (err) {
		console.error("🔥 createRecurringRule failed:", err);
		throw err;
	}
}

export async function updateRecurringRule(
	id: number,
	type: "income" | "expense",
	amount: number,
	category: string,
	startDateISO: string,
	frequency: RecurringFrequency
): Promise<void> {
	try {
		await db.runAsync(
			`UPDATE recurring_rules
          SET type = ?, amount = ?, category = ?, startDate = ?, frequency = ?
        WHERE id = ?;`,
			[type, amount, category, startDateISO, frequency, id]
		);
	} catch (err) {
		console.error("🔥 updateRecurringRule failed:", err);
		throw err;
	}
}

export async function deleteRecurringRule(id: number): Promise<void> {
	try {
		await db.runAsync(`DELETE FROM recurring_rules WHERE id = ?;`, [id]);
	} catch (err) {
		console.error("🔥 deleteRecurringRule failed:", err);
		throw err;
	}
}

// ===== Recurring materializer helpers + entrypoint =====

// Helpers (keeps dates at local start-of-day, then stores as ISO)
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

// Choose step function based on frequency
function nextStep(freq: RecurringFrequency) {
	return (d: Date) =>
		freq === "daily"
			? addDays(d, 1)
			: freq === "weekly"
			? addWeeks(d, 1)
			: addMonths(d, 1);
}

// Insert a transaction tied to a rule (note source_rule_id)
async function insertRecurringInstance(
	type: string,
	amount: number,
	category: string,
	dateISO: string,
	ruleId: number
) {
	await db.runAsync(
		`INSERT INTO transactions (type, amount, category, date, source_rule_id)
     VALUES (?, ?, ?, ?, ?);`,
		[type, amount, category, dateISO, ruleId]
	);
}

// Avoid duplicates for the same rule/date
async function hasInstanceFor(
	ruleId: number,
	isoDate: string
): Promise<boolean> {
	const rows: any[] = await db.getAllAsync(
		`SELECT id FROM transactions WHERE source_rule_id = ? AND date = ? LIMIT 1;`,
		[ruleId, isoDate]
	);
	return !!rows?.[0];
}

/** Generate and insert any due recurring instances up to today (local), update lastRun. */
export async function materializeRecurring(): Promise<void> {
	try {
		const rules = await getRecurringRules(); // <-- must exist
		const today = startOfDay(new Date());

		for (const r of rules) {
			const step = nextStep(r.frequency);
			const anchor = startOfDay(new Date(r.startDate));

			// If never run, start from anchor; else, start from the day after lastRun
			const last = r.lastRun ? startOfDay(new Date(r.lastRun)) : null;
			let cursor = last ? step(last) : anchor;

			// If anchor/cursor is in the future, skip
			if (cursor > today) continue;

			let lastMaterialized: Date | null = null;

			while (cursor <= today) {
				const iso = cursor.toISOString(); // consistent storage & duplicate check
				if (!(await hasInstanceFor(r.id, iso))) {
					await insertRecurringInstance(
						r.type,
						r.amount,
						r.category,
						iso,
						r.id
					);
				}
				lastMaterialized = cursor;
				cursor = step(cursor);
			}

			if (lastMaterialized) {
				await db.runAsync(
					`UPDATE recurring_rules SET lastRun = ? WHERE id = ?;`,
					[lastMaterialized.toISOString(), r.id]
				);
			}
		}
	} catch (err) {
		console.error("🔥 materializeRecurring failed:", err);
	}
}
