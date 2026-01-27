import { database } from './database';
import type { Member, CreateMemberData, GroupMember } from '../types/database';
import uuid from 'react-native-uuid';

/**
 * Member Service
 * Handles all member-related database operations
 */
class MemberService {
    /**
     * Create a new member
     */
    async createMember(data: CreateMemberData): Promise<string> {
        const memberId = uuid.v4().toString();
        const now = new Date().toISOString();

        await database.executeSingle(
            `INSERT INTO members (id, name, phone, created_at, source)
       VALUES (?, ?, ?, ?, ?)`,
            [memberId, data.name, data.phone, now, data.source || 'database']
        );

        return memberId;
    }

    /**
     * Get member by ID
     */
    async getMember(id: string): Promise<Member | null> {
        const members = await database.executeQuery<Member>(
            'SELECT * FROM members WHERE id = ?',
            [id]
        );
        return members[0] || null;
    }

    /**
     * Get member by phone
     */
    async getMemberByPhone(phone: string): Promise<Member | null> {
        const members = await database.executeQuery<Member>(
            'SELECT * FROM members WHERE phone = ?',
            [phone]
        );
        return members[0] || null;
    }

    /**
     * Search members by name or phone
     */
    async searchMembers(query: string): Promise<Member[]> {
        const members = await database.executeQuery<Member>(
            `SELECT * FROM members 
       WHERE name LIKE ? OR phone LIKE ?
       ORDER BY name`,
            [`%${query}%`, `%${query}%`]
        );
        return members;
    }

    /**
     * Get all members
     */
    async getAllMembers(): Promise<Member[]> {
        const members = await database.executeQuery<Member>(
            'SELECT * FROM members ORDER BY name'
        );
        return members;
    }

    /**
     * Add member to a group
     */
    async addMemberToGroup(
        groupId: string,
        memberId: string,
        ticketNumber: number,
        catchUpAmount: number
    ): Promise<string> {
        const groupMemberId = uuid.v4().toString();
        const now = new Date().toISOString();

        const queries = [];

        // Get current month
        const groups = await database.executeQuery<any>(
            'SELECT current_month FROM groups WHERE id = ?',
            [groupId]
        );
        const currentMonth = groups[0]?.current_month || 1;

        // Insert group_member
        queries.push({
            query: `
        INSERT INTO group_members (
          id, group_id, member_id, ticket_number, joined_month
        ) VALUES (?, ?, ?, ?, ?)
      `,
            params: [groupMemberId, groupId, memberId, ticketNumber, currentMonth],
        });

        // Create catch-up payment if joining mid-way
        if (currentMonth > 1 && catchUpAmount > 0) {
            queries.push({
                query: `
          INSERT INTO payments (
            id, group_id, member_id, month_number, amount_due, amount_paid,
            status, created_at
          ) VALUES (?, ?, ?, 0, ?, 0, 'pending', ?)
        `,
                params: [uuid.v4().toString(), groupId, groupMemberId, catchUpAmount, now],
            });
        }

        await database.transaction(queries);
        return groupMemberId;
    }

    /**
     * Remove member from group (voluntary exit)
     */
    async removeMemberFromGroup(
        groupId: string,
        memberId: string,
        exitReason?: string
    ): Promise<void> {
        // Get current month
        const groups = await database.executeQuery<any>(
            'SELECT current_month FROM groups WHERE id = ?',
            [groupId]
        );
        const currentMonth = groups[0]?.current_month || 1;

        await database.executeSingle(
            `UPDATE group_members 
       SET is_active = 0, exit_month = ?, exit_reason = ?
       WHERE group_id = ? AND member_id = ?`,
            [currentMonth, exitReason || 'Voluntary exit', groupId, memberId]
        );
    }

    /**
     * Replace member (defaulter or exit)
     */
    async replaceMember(
        groupId: string,
        oldMemberId: string,
        newMemberId: string,
        catchUpAmount: number
    ): Promise<void> {
        const now = new Date().toISOString();

        // Get old member's ticket number and current month
        const oldMembers = await database.executeQuery<any>(
            `SELECT gm.ticket_number, gm.id as group_member_id, g.current_month
       FROM group_members gm
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.group_id = ? AND gm.member_id = ?`,
            [groupId, oldMemberId]
        );

        if (oldMembers.length === 0) {
            throw new Error('Old member not found in group');
        }

        const ticketNumber = oldMembers[0].ticket_number;
        const currentMonth = oldMembers[0].current_month;

        const queries = [];

        // Deactivate old member
        queries.push({
            query: `
        UPDATE group_members 
        SET is_active = 0, exit_month = ?, exit_reason = 'Replaced'
        WHERE group_id = ? AND member_id = ?
      `,
            params: [currentMonth, groupId, oldMemberId],
        });

        // Add new member with same ticket number
        const newGroupMemberId = uuid.v4().toString();
        queries.push({
            query: `
        INSERT INTO group_members (
          id, group_id, member_id, ticket_number, joined_month
        ) VALUES (?, ?, ?, ?, ?)
      `,
            params: [newGroupMemberId, groupId, newMemberId, ticketNumber, currentMonth],
        });

        // Create catch-up payment for new member
        if (catchUpAmount > 0) {
            queries.push({
                query: `
          INSERT INTO payments (
            id, group_id, member_id, month_number, amount_due, amount_paid,
            status, created_at
          ) VALUES (?, ?, ?, 0, ?, 0, 'pending', ?)
        `,
                params: [uuid.v4().toString(), groupId, newGroupMemberId, catchUpAmount, now],
            });
        }

        await database.transaction(queries);
    }

    /**
     * Get member's groups
     */
    async getMemberGroups(memberId: string): Promise<Array<any>> {
        const groups = await database.executeQuery<any>(`
      SELECT 
        g.*,
        gm.ticket_number,
        gm.is_prized,
        gm.total_paid,
        gm.total_received
      FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      WHERE gm.member_id = ? AND gm.is_active = 1
      ORDER BY g.created_at DESC
    `, [memberId]);
        return groups;
    }

    /**
     * Update member
     */
    async updateMember(id: string, data: Partial<Member>): Promise<void> {
        const fields = Object.keys(data)
            .map(key => `${key} = ?`)
            .join(', ');
        const values = [...Object.values(data), id];

        await database.executeSingle(
            `UPDATE members SET ${fields} WHERE id = ?`,
            values
        );
    }

    /**
     * Delete member
     */
    async deleteMember(id: string): Promise<void> {
        await database.executeSingle('DELETE FROM members WHERE id = ?', [id]);
    }
}

export const memberService = new MemberService();
