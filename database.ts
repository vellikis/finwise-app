// database.ts
import * as SQLite from "expo-sqlite";

// --- Types
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

// Coerce to `any` so TS won’t complain if we only have openDatabaseSync
const SQLiteAny = SQLite as any;

const db: any = SQLiteAny.openDatabase
	? SQLiteAny.openDatabase("finwise.db")
	: SQLiteAny.openDatabaseSync("finwise.db");

/**
 * Initialize both tables. You can safely call this multiple times;
 * under the hood execAsync will no-op if they already exist.
 */
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
    `);
		console.log("✅ DB initialized");
	} catch (err) {
		console.error("🔥 initDB failed:", err);
	}
};

/** Insert a new transaction */
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

/** Fetch all transactions, newest first */
export const getTransactions = async (): Promise<Transaction[]> => {
	try {
		return await db.getAllAsync(
			`SELECT * FROM transactions ORDER BY date DESC;`
		);
	} catch (err) {
		console.error("🔥 getTransactions failed:", err);
		throw err;
	}
};

/** Delete one transaction by ID */
export const deleteTransaction = async (id: number): Promise<void> => {
	try {
		await db.runAsync(`DELETE FROM transactions WHERE id = ?;`, [id]);
	} catch (err) {
		console.error("🔥 deleteTransaction failed:", err);
		throw err;
	}
};

/** Update a transaction */
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

/** Insert a new investment */
export const insertInvestment = async (
	amount: number,
	platform: string,
	returnPercentage: number,
	date: string
): Promise<void> => {
	try {
		await db.runAsync(
			`INSERT INTO investments
         (amount, platform, return_percentage, date)
       VALUES (?, ?, ?, ?);`,
			[amount, platform, returnPercentage, date]
		);
	} catch (err) {
		console.error("🔥 insertInvestment failed:", err);
		throw err;
	}
};

/** Fetch all investments, newest first */
export const getInvestments = async (): Promise<Investment[]> => {
	try {
		return await db.getAllAsync(
			`SELECT * FROM investments ORDER BY date DESC;`
		);
	} catch (err) {
		console.error("🔥 getInvestments failed:", err);
		throw err;
	}
};

/** Delete one investment by ID */
export const deleteInvestment = async (id: number): Promise<void> => {
	try {
		await db.runAsync(`DELETE FROM investments WHERE id = ?;`, [id]);
	} catch (err) {
		console.error("🔥 deleteInvestment failed:", err);
		throw err;
	}
};
