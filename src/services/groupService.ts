import { database } from './database';
import type { Group, CreateGroupData, GroupMember, Member, AuctionDate } from '../types/database';
import uuid from 'react-native-uuid';

/**
 * Group Service
 * Handles all group-related database operations
 */
class GroupService {
    /**
     * Create a new group with members and auction dates
     */
    async createGroup(
        groupData: CreateGroupData,
        members: Array<{ member: Member; ticketNumber: number }>,
        auctionDates: Array<{ monthNumber: number; date: string; isModified: boolean }>
    ): Promise<string> {
        const groupId = uuid.v4().toString();
        const now = new Date().toISOString();

        const queries = [];

        // Insert group
        queries.push({
            query: `
        INSERT INTO groups (
          id, name, pot_value, duration, commission_percentage,
          base_installment, total_members, auction_day, auction_time, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
            params: [
                groupId,
                groupData.name,
                groupData.pot_value,
                groupData.duration,
                groupData.commission_percentage,
                groupData.base_installment,
                groupData.total_members,
                groupData.auction_day,
                groupData.auction_time,
                now,
            ],
        });

        // Insert members and group_members
        for (const { member, ticketNumber } of members) {
            const memberId = member.id || uuid.v4().toString();
            const groupMemberId = uuid.v4().toString();

            // Insert member if not exists
            queries.push({
                query: `
          INSERT OR IGNORE INTO members (id, name, phone, created_at, source)
          VALUES (?, ?, ?, ?, ?)
        `,
                params: [memberId, member.name, member.phone, now, member.source],
            });

            // Insert group_member
            queries.push({
                query: `
          INSERT INTO group_members (
            id, group_id, member_id, ticket_number, joined_month
          ) VALUES (?, ?, ?, ?, 1)
        `,
                params: [groupMemberId, groupId, memberId, ticketNumber],
            });
        }

        // Insert auction dates
        for (const { monthNumber, date, isModified } of auctionDates) {
            queries.push({
                query: `
          INSERT INTO auction_dates (id, group_id, month_number, scheduled_date, is_modified)
          VALUES (?, ?, ?, ?, ?)
        `,
                params: [
                    uuid.v4().toString(),
                    groupId,
                    monthNumber,
                    date,
                    isModified ? 1 : 0,
                ],
            });
        }

        // Insert initial payments for month 1
        for (const { member, ticketNumber } of members) {
            queries.push({
                query: `
          INSERT INTO payments (
            id, group_id, member_id, month_number, amount_due, amount_paid, created_at
          ) SELECT ?, ?, gm.id, 1, ?, 0, ?
          FROM group_members gm
          WHERE gm.group_id = ? AND gm.ticket_number = ?
        `,
                params: [
                    uuid.v4().toString(),
                    groupId,
                    groupData.base_installment,
                    now,
                    groupId,
                    ticketNumber,
                ],
            });
        }

        await database.transaction(queries);
        return groupId;
    }

    /**
     * Get all groups
     */
    async getAllGroups(): Promise<Group[]> {
        const groups = await database.executeQuery<Group>(`
      SELECT * FROM groups
      WHERE status IN ('active', 'closed')
      ORDER BY created_at DESC
    `);
        return groups;
    }

    /**
     * Get active groups only
     */
    async getActiveGroups(): Promise<Group[]> {
        const groups = await database.executeQuery<Group>(`
      SELECT * FROM groups
      WHERE status = 'active'
      ORDER BY created_at DESC
    `);
        return groups;
    }

    /**
     * Get single group by ID
     */
    async getGroup(id: string): Promise<Group | null> {
        const groups = await database.executeQuery<Group>(
            'SELECT * FROM groups WHERE id = ?',
            [id]
        );
        return groups[0] || null;
    }

    /**
     * Get group members with member details
     */
    async getGroupMembers(groupId: string): Promise<Array<GroupMember & Member>> {
        const members = await database.executeQuery<GroupMember & Member>(`
      SELECT 
        gm.*,
        m.name,
        m.phone,
        m.source
      FROM group_members gm
      JOIN members m ON gm.member_id = m.id
      WHERE gm.group_id = ? AND gm.is_active = 1
      ORDER BY gm.ticket_number
    `, [groupId]);
        return members;
    }

    /**
     * Get group auction dates
     */
    async getAuctionDates(groupId: string): Promise<AuctionDate[]> {
        const dates = await database.executeQuery<AuctionDate>(`
      SELECT * FROM auction_dates
      WHERE group_id = ?
      ORDER BY month_number
    `, [groupId]);
        return dates;
    }

    /**
     * Update group current month
     */
    async updateCurrentMonth(groupId: string, month: number): Promise<void> {
        await database.executeSingle(
            'UPDATE groups SET current_month = ? WHERE id = ?',
            [month, groupId]
        );
    }

    /**
     * Close a group
     */
    async closeGroup(groupId: string): Promise<void> {
        const now = new Date().toISOString();
        await database.executeSingle(
            `UPDATE groups SET status = 'closed', closed_at = ? WHERE id = ?`,
            [now, groupId]
        );
    }

    /**
     * Update group
     */
    async updateGroup(groupId: string, data: Partial<Group>): Promise<void> {
        const fields = Object.keys(data)
            .map(key => `${key} = ?`)
            .join(', ');
        const values = [...Object.values(data), groupId];

        await database.executeSingle(
            `UPDATE groups SET ${fields} WHERE id = ?`,
            values
        );
    }

    /**
     * Delete group (and all related data via CASCADE)
     */
    async deleteGroup(groupId: string): Promise<void> {
        await database.executeSingle('DELETE FROM groups WHERE id = ?', [groupId]);
    }

    /**
     * Get group statistics
     */
    async getGroupStats(groupId: string): Promise<{
        totalCollected: number;
        pendingCollections: number;
        totalMembers: number;
        activeMembers: number;
    }> {
        const stats = await database.executeQuery<any>(`
      SELECT 
        COALESCE(SUM(p.amount_paid), 0) as totalCollected,
        COALESCE(SUM(p.amount_due - p.amount_paid), 0) as pendingCollections,
        COUNT(DISTINCT gm.id) as totalMembers,
        SUM(CASE WHEN gm.is_active = 1 THEN 1 ELSE 0 END) as activeMembers
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN payments p ON gm.id = p.member_id
      WHERE g.id = ?
    `, [groupId]);

        return stats[0] || {
            totalCollected: 0,
            pendingCollections: 0,
            totalMembers: 0,
            activeMembers: 0,
        };
    }
}

export const groupService = new GroupService();
