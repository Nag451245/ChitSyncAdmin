import { database } from './database';
import type { Payment, CreatePaymentData } from '../types/database';
import uuid from 'react-native-uuid';

/**
 * Payment Service
 * Handles all payment-related database operations
 */
class PaymentService {
    /**
     * Record a payment
     */
    async recordPayment(data: CreatePaymentData): Promise<string> {
        const paymentId = uuid.v4().toString();
        const now = new Date().toISOString();

        await database.executeSingle(
            `INSERT INTO payments (
        id, group_id, member_id, month_number, amount_due, amount_paid,
        payment_mode, payment_date, status, receipt_sent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                paymentId,
                data.group_id,
                data.member_id,
                data.month_number,
                data.amount_due,
                data.amount_paid,
                data.payment_mode || null,
                data.payment_date || now,
                data.status,
                data.receipt_sent ? 1 : 0,
                now,
            ]
        );

        // Update group_member total_paid
        await database.executeSingle(
            `UPDATE group_members 
       SET total_paid = total_paid + ?
       WHERE id = ?`,
            [data.amount_paid, data.member_id]
        );

        // Create transaction record
        await database.executeSingle(
            `INSERT INTO transactions (
        id, group_id, member_id, transaction_type, amount,
        description, transaction_date, created_at
      ) VALUES (?, ?, ?, 'payment', ?, ?, ?, ?)`,
            [
                uuid.v4().toString(),
                data.group_id,
                data.member_id,
                data.amount_paid,
                `Payment for Month ${data.month_number}`,
                data.payment_date || now,
                now,
            ]
        );

        return paymentId;
    }

    /**
     * Update payment
     */
    async updatePayment(
        paymentId: string,
        amountPaid: number,
        paymentMode?: string,
        receiptSent?: boolean
    ): Promise<void> {
        const now = new Date().toISOString();

        // Get current payment to calculate diff
        const payments = await database.executeQuery<Payment>(
            'SELECT * FROM payments WHERE id = ?',
            [paymentId]
        );

        if (payments.length === 0) {
            throw new Error('Payment not found');
        }

        const payment = payments[0];
        const diff = amountPaid - payment.amount_paid;

        // Determine new status
        let status: 'pending' | 'partial' | 'paid' = 'pending';
        if (amountPaid >= payment.amount_due) {
            status = 'paid';
        } else if (amountPaid > 0) {
            status = 'partial';
        }

        const queries = [];

        // Update payment
        queries.push({
            query: `
        UPDATE payments 
        SET amount_paid = ?, 
            payment_mode = ?, 
            payment_date = ?,
            status = ?,
            receipt_sent = ?
        WHERE id = ?
      `,
            params: [
                amountPaid,
                paymentMode || payment.payment_mode,
                now,
                status,
                receiptSent ? 1 : payment.receipt_sent,
                paymentId,
            ],
        });

        // Update group_member total_paid if there's a difference
        if (diff !== 0) {
            queries.push({
                query: `UPDATE group_members SET total_paid = total_paid + ? WHERE id = ?`,
                params: [diff, payment.member_id],
            });

            // Create transaction for the difference
            queries.push({
                query: `
          INSERT INTO transactions (
            id, group_id, member_id, transaction_type, amount,
            description, transaction_date, created_at
          ) VALUES (?, ?, ?, 'payment', ?, ?, ?, ?)
        `,
                params: [
                    uuid.v4().toString(),
                    payment.group_id,
                    payment.member_id,
                    diff,
                    `Payment update for Month ${payment.month_number}`,
                    now,
                    now,
                ],
            });
        }

        await database.transaction(queries);
    }

    /**
     * Get payments for a group and month
     */
    async getPayments(groupId: string, monthNumber: number): Promise<Array<Payment & any>> {
        const payments = await database.executeQuery<Payment & any>(`
      SELECT 
        p.*,
        m.name,
        m.phone,
        gm.ticket_number
      FROM payments p
      JOIN group_members gm ON p.member_id = gm.id
      JOIN members m ON gm.member_id = m.id
      WHERE p.group_id = ? AND p.month_number = ?
      ORDER BY gm.ticket_number
    `, [groupId, monthNumber]);
        return payments;
    }

    /**
     * Get member's payment history
     */
    async getMemberPayments(groupId: string, memberId: string): Promise<Payment[]> {
        const payments = await database.executeQuery<Payment>(`
      SELECT * FROM payments
      WHERE group_id = ? AND member_id = ?
      ORDER BY month_number
    `, [groupId, memberId]);
        return payments;
    }

    /**
     * Get pending payments for a group
     */
    async getPendingPayments(groupId: string): Promise<Array<Payment & any>> {
        const payments = await database.executeQuery<Payment & any>(`
      SELECT 
        p.*,
        m.name,
        m.phone,
        gm.ticket_number
      FROM payments p
      JOIN group_members gm ON p.member_id = gm.id
      JOIN members m ON gm.member_id = m.id
      WHERE p.group_id = ? AND p.status IN ('pending', 'partial')
      ORDER BY p.month_number, gm.ticket_number
    `, [groupId]);
        return payments;
    }

    /**
     * Get payment statistics for a group
     */
    async getPaymentStats(groupId: string): Promise<{
        totalCollected: number;
        totalPending: number;
        paidCount: number;
        pendingCount: number;
    }> {
        const stats = await database.executeQuery<any>(`
      SELECT 
        COALESCE(SUM(amount_paid), 0) as totalCollected,
        COALESCE(SUM(amount_due - amount_paid), 0) as totalPending,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paidCount,
        SUM(CASE WHEN status IN ('pending', 'partial') THEN 1 ELSE 0 END) as pendingCount
      FROM payments
      WHERE group_id = ?
    `, [groupId]);

        return stats[0] || {
            totalCollected: 0,
            totalPending: 0,
            paidCount: 0,
            pendingCount: 0,
        };
    }

    /**
     * Mark receipt as sent
     */
    async markReceiptSent(paymentId: string): Promise<void> {
        await database.executeSingle(
            'UPDATE payments SET receipt_sent = 1 WHERE id = ?',
            [paymentId]
        );
    }

    /**
     * Get defaulters (members with pending payments)
     */
    async getDefaulters(groupId: string): Promise<Array<any>> {
        const defaulters = await database.executeQuery<any>(`
      SELECT 
        m.name,
        m.phone,
        gm.ticket_number,
        COUNT(p.id) as pending_months,
        SUM(p.amount_due - p.amount_paid) as total_due
      FROM group_members gm
      JOIN members m ON gm.member_id = m.id
      JOIN payments p ON gm.id = p.member_id
      WHERE p.group_id = ? 
        AND p.status IN ('pending', 'partial')
        AND gm.is_active = 1
      GROUP BY gm.id
      HAVING total_due > 0
      ORDER BY total_due DESC
    `, [groupId]);
        return defaulters;
    }

    /**
     * Get global payment statistics (across all groups)
     */
    async getGlobalPaymentStats(): Promise<{
        totalCollected: number;
        totalPending: number;
    }> {
        const stats = await database.executeQuery<any>(`
      SELECT 
        COALESCE(SUM(amount_paid), 0) as totalCollected,
        COALESCE(SUM(amount_due - amount_paid), 0) as totalPending
      FROM payments
    `);
        return stats[0] || { totalCollected: 0, totalPending: 0 };
    }

    /**
     * Get recent transactions across all groups
     */
    async getRecentTransactions(limit: number = 5): Promise<Array<any>> {
        const transactions = await database.executeQuery<any>(`
      SELECT 
        t.*,
        g.name as group_name,
        m.name as member_name
      FROM transactions t
      LEFT JOIN groups g ON t.group_id = g.id
      LEFT JOIN members m ON t.member_id = m.id
      ORDER BY t.created_at DESC
      LIMIT ?
    `, [limit]);
        return transactions;
    }
}

export const paymentService = new PaymentService();
