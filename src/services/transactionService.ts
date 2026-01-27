import { database } from './database';
import type { Transaction } from '../types/database';
import uuid from 'react-native-uuid';

/**
 * Transaction Service
 * Handles all transaction/ledger operations
 */
class TransactionService {
    /**
     * Record a transaction
     */
    async recordTransaction(
        groupId: string,
        type: 'payment' | 'prize' | 'refund' | 'commission' | 'cost',
        amount: number,
        description?: string,
        memberId?: string
    ): Promise<string> {
        const transactionId = uuid.v4().toString();
        const now = new Date().toISOString();

        await database.executeSingle(
            `INSERT INTO transactions (
        id, group_id, member_id, transaction_type, amount,
        description, transaction_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [transactionId, groupId, memberId || null, type, amount, description || null, now, now]
        );

        return transactionId;
    }

    /**
     * Get all transactions for a group
     */
    async getGroupTransactions(groupId: string): Promise<Array<Transaction & any>> {
        const transactions = await database.executeQuery<Transaction & any>(`
      SELECT 
        t.*,
        m.name as member_name,
        gm.ticket_number
      FROM transactions t
      LEFT JOIN group_members gm ON t.member_id = gm.id
      LEFT JOIN members m ON gm.member_id = m.id
      WHERE t.group_id = ?
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `, [groupId]);
        return transactions;
    }

    /**
     * Get transactions for a specific member
     */
    async getMemberTransactions(groupId: string, memberId: string): Promise<Transaction[]> {
        const transactions = await database.executeQuery<Transaction>(`
      SELECT * FROM transactions
      WHERE group_id = ? AND member_id = ?
      ORDER BY transaction_date DESC
    `, [groupId, memberId]);
        return transactions;
    }

    /**
     * Get transactions by type
     */
    async getTransactionsByType(
        groupId: string,
        type: 'payment' | 'prize' | 'refund' | 'commission' | 'cost'
    ): Promise<Transaction[]> {
        const transactions = await database.executeQuery<Transaction>(`
      SELECT * FROM transactions
      WHERE group_id = ? AND transaction_type = ?
      ORDER BY transaction_date DESC
    `, [groupId, type]);
        return transactions;
    }

    /**
     * Get transaction summary for a group
     */
    async getTransactionSummary(groupId: string): Promise<{
        totalPayments: number;
        totalPrizes: number;
        totalRefunds: number;
        totalCommissions: number;
        totalCosts: number;
    }> {
        const summary = await database.executeQuery<any>(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END), 0) as totalPayments,
        COALESCE(SUM(CASE WHEN transaction_type = 'prize' THEN amount ELSE 0 END), 0) as totalPrizes,
        COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN amount ELSE 0 END), 0) as totalRefunds,
        COALESCE(SUM(CASE WHEN transaction_type = 'commission' THEN amount ELSE 0 END), 0) as totalCommissions,
        COALESCE(SUM(CASE WHEN transaction_type = 'cost' THEN amount ELSE 0 END), 0) as totalCosts
      FROM transactions
      WHERE group_id = ?
    `, [groupId]);

        return summary[0] || {
            totalPayments: 0,
            totalPrizes: 0,
            totalRefunds: 0,
            totalCommissions: 0,
            totalCosts: 0,
        };
    }

    /**
     * Get recent transactions (latest N)
     */
    async getRecentTransactions(groupId: string, limit: number = 10): Promise<Array<Transaction & any>> {
        const transactions = await database.executeQuery<Transaction & any>(`
      SELECT 
        t.*,
        m.name as member_name,
        gm.ticket_number
      FROM transactions t
      LEFT JOIN group_members gm ON t.member_id = gm.id
      LEFT JOIN members m ON gm.member_id = m.id
      WHERE t.group_id = ?
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ?
    `, [groupId, limit]);
        return transactions;
    }

    /**
     * Delete a transaction
     */
    async deleteTransaction(id: string): Promise<void> {
        await database.executeSingle('DELETE FROM transactions WHERE id = ?', [id]);
    }
}

export const transactionService = new TransactionService();
