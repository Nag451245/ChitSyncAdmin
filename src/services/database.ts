import * as SQLite from 'expo-sqlite';

const DB_NAME = 'chitsync.db';

/**
 * Core Database Service
 * Handles SQLite initialization, schema creation, and basic operations
 */
class DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;

    /**
     * Initialize database connection and create tables
     */
    async init(): Promise<void> {
        try {
            this.db = await SQLite.openDatabaseAsync(DB_NAME);
            await this.createTables();
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    /**
     * Get database instance
     */
    getDB(): SQLite.SQLiteDatabase {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
        return this.db;
    }

    /**
     * Create all database tables
     */
    private async createTables(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.execAsync(`
      PRAGMA foreign_keys = ON;

      -- Groups Table
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pot_value INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        commission_percentage REAL NOT NULL,
        base_installment INTEGER NOT NULL,
        total_members INTEGER NOT NULL,
        current_month INTEGER DEFAULT 1,
        auction_day INTEGER NOT NULL,
        auction_time TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        closed_at TEXT,
        UNIQUE(name)
      );

      -- Members Table
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TEXT NOT NULL,
        source TEXT DEFAULT 'database',
        UNIQUE(phone)
      );

      -- Group_Members Junction Table
      CREATE TABLE IF NOT EXISTS group_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        ticket_number INTEGER NOT NULL,
        joined_month INTEGER DEFAULT 1,
        is_prized INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        total_paid INTEGER DEFAULT 0,
        total_received INTEGER DEFAULT 0,
        exit_month INTEGER,
        exit_reason TEXT,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
        UNIQUE(group_id, ticket_number),
        UNIQUE(group_id, member_id)
      );

      -- Auctions Table
      CREATE TABLE IF NOT EXISTS auctions (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        month_number INTEGER NOT NULL,
        winner_id TEXT NOT NULL,
        bid_amount INTEGER NOT NULL,
        foreman_commission INTEGER NOT NULL,
        dividend INTEGER NOT NULL,
        next_payable INTEGER NOT NULL,
        auction_date TEXT NOT NULL,
        conducted_at TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (winner_id) REFERENCES group_members(id),
        UNIQUE(group_id, month_number)
      );

      -- Auction_Dates Table
      CREATE TABLE IF NOT EXISTS auction_dates (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        month_number INTEGER NOT NULL,
        scheduled_date TEXT NOT NULL,
        is_modified INTEGER DEFAULT 0,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        UNIQUE(group_id, month_number)
      );

      -- Payments Table
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        month_number INTEGER NOT NULL,
        amount_due INTEGER NOT NULL,
        amount_paid INTEGER NOT NULL,
        payment_mode TEXT,
        payment_date TEXT,
        status TEXT DEFAULT 'pending',
        receipt_sent INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES group_members(id),
        UNIQUE(group_id, member_id, month_number)
      );

      -- Transactions Table
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        member_id TEXT,
        transaction_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        transaction_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES group_members(id)
      );

      -- Settings Table
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Create Indexes
      CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
      CREATE INDEX IF NOT EXISTS idx_group_members_member ON group_members(member_id);
      CREATE INDEX IF NOT EXISTS idx_auctions_group ON auctions(group_id);
      CREATE INDEX IF NOT EXISTS idx_payments_group ON payments(group_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_group ON transactions(group_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
    `);
    }

    /**
     * Execute a query with parameters
     */
    async executeQuery<T>(
        query: string,
        params: any[] = []
    ): Promise<T[]> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            const result = await this.db.getAllAsync<T>(query, params);
            return result;
        } catch (error) {
            console.error('Query execution failed:', query, error);
            throw error;
        }
    }

    /**
     * Execute a single query (INSERT, UPDATE, DELETE)
     */
    async executeSingle(query: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            const result = await this.db.runAsync(query, params);
            return result;
        } catch (error) {
            console.error('Single query execution failed:', query, error);
            throw error;
        }
    }

    /**
     * Execute multiple queries in a transaction
     */
    async transaction(queries: Array<{ query: string; params?: any[] }>): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            await this.db.withTransactionAsync(async () => {
                for (const { query, params = [] } of queries) {
                    await this.db!.runAsync(query, params);
                }
            });
        } catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    }

    /**
     * Reset database (for development only)
     */
    async resetDatabase(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.execAsync(`
      DROP TABLE IF EXISTS transactions;
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS auction_dates;
      DROP TABLE IF EXISTS auctions;
      DROP TABLE IF EXISTS group_members;
      DROP TABLE IF EXISTS members;
      DROP TABLE IF EXISTS groups;
      DROP TABLE IF EXISTS settings;
    `);

        await this.createTables();
        console.log('Database reset successfully');
    }

    /**
     * Close database connection
     */
    async close(): Promise<void> {
        if (this.db) {
            await this.db.closeAsync();
            this.db = null;
            console.log('Database closed');
        }
    }
}

// Export singleton instance
export const database = new DatabaseService();
