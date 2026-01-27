import { database } from './database';
import type { Auction, CreateAuctionData } from '../types/database';
import uuid from 'react-native-uuid';

/**
 * Auction Service
 * Handles all auction-related database operations
 */
class AuctionService {
    /**
     * Conduct an auction
     */
    async conductAuction(data: CreateAuctionData): Promise<string> {
        const auctionId = uuid.v4().toString();
        const now = new Date().toISOString();

        const queries = [];

        // Insert auction record
        queries.push({
            query: `
        INSERT INTO auctions (
          id, group_id, month_number, winner_id, bid_amount,
          foreman_commission, dividend, next_payable,
          auction_date, conducted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
            params: [
                auctionId,
                data.group_id,
                data.month_number,
                data.winner_id,
                data.bid_amount,
                data.foreman_commission,
                data.dividend,
                data.next_payable,
                data.auction_date,
                now,
            ],
        });

        // Mark winner as prized
        queries.push({
            query: `UPDATE group_members SET is_prized = 1 WHERE id = ?`,
            params: [data.winner_id],
        });

        // Update all active members' payments for next month
        queries.push({
            query: `
        INSERT INTO payments (
          id, group_id, member_id, month_number, amount_due, amount_paid, created_at
        )
        SELECT 
          lower(hex(randomblob(16))), 
          ?, 
          id, 
          ?, 
          ?, 
          0,
          ?
        FROM group_members
        WHERE group_id = ? AND is_active = 1
      `,
            params: [
                data.group_id,
                data.month_number + 1,
                data.next_payable,
                now,
                data.group_id,
            ],
        });

        // Create transaction for prize money
        queries.push({
            query: `
        INSERT INTO transactions (
          id, group_id, member_id, transaction_type, amount,
          description, transaction_date, created_at
        ) VALUES (?, ?, ?, 'prize', ?, ?, ?, ?)
      `,
            params: [
                uuid.v4().toString(),
                data.group_id,
                data.winner_id,
                data.bid_amount,
                `Prize money for Month ${data.month_number}`,
                data.auction_date,
                now,
            ],
        });

        // Create transaction for foreman commission
        queries.push({
            query: `
        INSERT INTO transactions (
          id, group_id, member_id, transaction_type, amount,
          description, transaction_date, created_at
        ) VALUES (?, ?, NULL, 'commission', ?, ?, ?, ?)
      `,
            params: [
                uuid.v4().toString(),
                data.group_id,
                data.foreman_commission,
                `Commission for Month ${data.month_number}`,
                data.auction_date,
                now,
            ],
        });

        // Update group current month
        queries.push({
            query: `UPDATE groups SET current_month = ? WHERE id = ?`,
            params: [data.month_number + 1, data.group_id],
        });

        await database.transaction(queries);
        return auctionId;
    }

    /**
     * Get auction by group and month
     */
    async getAuction(groupId: string, monthNumber: number): Promise<Auction | null> {
        const auctions = await database.executeQuery<Auction>(
            `SELECT * FROM auctions WHERE group_id = ? AND month_number = ?`,
            [groupId, monthNumber]
        );
        return auctions[0] || null;
    }

    /**
     * Get all auctions for a group
     */
    async getGroupAuctions(groupId: string): Promise<Auction[]> {
        const auctions = await database.executeQuery<Auction>(
            `SELECT * FROM auctions WHERE group_id = ? ORDER BY month_number`,
            [groupId]
        );
        return auctions;
    }

    /**
     * Get non-prized members for auction dropdown
     */
    async getNonPrizedMembers(groupId: string): Promise<Array<any>> {
        const members = await database.executeQuery<any>(`
      SELECT 
        gm.id,
        gm.ticket_number,
        m.name,
        m.phone
      FROM group_members gm
      JOIN members m ON gm.member_id = m.id
      WHERE gm.group_id = ? 
        AND gm.is_prized = 0 
        AND gm.is_active = 1
      ORDER BY gm.ticket_number
    `, [groupId]);
        return members;
    }

    /**
     * Get auction history with winner details
     */
    async getAuctionHistory(groupId: string): Promise<Array<any>> {
        const history = await database.executeQuery<any>(`
      SELECT 
        a.*,
        m.name as winner_name,
        gm.ticket_number
      FROM auctions a
      JOIN group_members gm ON a.winner_id = gm.id
      JOIN members m ON gm.member_id = m.id
      WHERE a.group_id = ?
      ORDER BY a.month_number DESC
    `, [groupId]);
        return history;
    }

    /**
     * Get upcoming auction date
     */
    async getUpcomingAuction(groupId: string): Promise<any | null> {
        const auctions = await database.executeQuery<any>(`
      SELECT 
        ad.scheduled_date,
        ad.month_number,
        g.current_month
      FROM auction_dates ad
      JOIN groups g ON ad.group_id = g.id
      WHERE ad.group_id = ? AND ad.month_number >= g.current_month
      ORDER BY ad.month_number
      LIMIT 1
    `, [groupId]);
        return auctions[0] || null;
    }

    /**
     * Check if auction is conducted for a month
     */
    async isAuctionConducted(groupId: string, monthNumber: number): Promise<boolean> {
        const auctions = await database.executeQuery<any>(
            `SELECT COUNT(*) as count FROM auctions WHERE group_id = ? AND month_number = ?`,
            [groupId, monthNumber]
        );
        return auctions[0]?.count > 0;
    }
}

export const auctionService = new AuctionService();
