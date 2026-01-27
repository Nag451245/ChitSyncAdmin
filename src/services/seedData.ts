import { database, groupService, memberService } from './index';
import type { Member } from '../types/database';

/**
 * Seed Data Generator
 * Creates sample data for testing and demonstration
 */
export const seedData = async () => {
    console.log('🌱 Starting database seeding...');

    try {
        // Check if already seeded
        const existingGroups = await groupService.getAllGroups();
        if (existingGroups.length > 0) {
            console.log('✅ Database already seeded, skipping...');
            return;
        }

        // Sample members
        const sampleMembers: Array<Omit<Member, 'id' | 'created_at'>> = [
            { name: 'Ramesh Kumar', phone: '+919876543210', source: 'database' },
            { name: 'Suresh Patel', phone: '+919876543211', source: 'database' },
            { name: 'Mahesh Sharma', phone: '+919876543212', source: 'database' },
            { name: 'Rajesh Verma', phone: '+919876543213', source: 'database' },
            { name: 'Dinesh Gupta', phone: '+919876543214', source: 'database' },
            { name: 'Ganesh Singh', phone: '+919876543215', source: 'database' },
            { name: 'Prakash Reddy', phone: '+919876543216', source: 'database' },
            { name: 'Anil Joshi', phone: '+919876543217', source: 'database' },
            { name: 'Vijay Kulkarni', phone: '+919876543218', source: 'database' },
            { name: 'Sanjay Rao', phone: '+919876543219', source: 'database' },
            { name: 'Amit Shah', phone: '+919876543220', source: 'database' },
            { name: 'Rohit Mehta', phone: '+919876543221', source: 'database' },
            { name: 'Kiran Desai', phone: '+919876543222', source: 'database' },
            { name: 'Deepak Nair', phone: '+919876543223', source: 'database' },
            { name: 'Ashok Pillai', phone: '+919876543224', source: 'database' },
            { name: 'Vivek Tiwari', phone: '+919876543225', source: 'database' },
            { name: 'Manoj Iyer', phone: '+919876543226', source: 'database' },
            { name: 'Ravi Kapur', phone: '+919876543227', source: 'database' },
            { name: 'Naveen Menon', phone: '+919876543228', source: 'database' },
            { name: 'Pradeep Saxena', phone: '+919876543229', source: 'database' },
        ];

        // Create members first
        const createdMembers: Member[] = [];
        for (const member of sampleMembers) {
            const memberId = await memberService.createMember(member);
            const createdMember = await memberService.getMember(memberId);
            if (createdMember) {
                createdMembers.push(createdMember);
            }
        }

        console.log(`✅ Created ${createdMembers.length} sample members`);

        // Create sample group 1
        const group1Data = {
            name: 'Premium Business Chit - 2026',
            pot_value: 1000000, // 10 Lakhs
            duration: 20,
            commission_percentage: 5,
            base_installment: 50000,
            total_members: 20,
            auction_day: 1, // 1st of every month
            auction_time: '18:00',
        };

        // Generate auction dates for group 1
        const auctionDates1 = [];
        const startDate = new Date('2026-02-01');
        for (let i = 0; i < 20; i++) {
            const date = new Date(startDate);
            date.setMonth(startDate.getMonth() + i);
            auctionDates1.push({
                monthNumber: i + 1,
                date: date.toISOString(),
                isModified: false,
            });
        }

        // Assign members to group 1
        const membersWithTickets1 = createdMembers.map((member, index) => ({
            member,
            ticketNumber: index + 1,
        }));

        const groupId1 = await groupService.createGroup(
            group1Data,
            membersWithTickets1,
            auctionDates1
        );

        console.log(`✅ Created group: ${group1Data.name}`);

        // Create sample group 2 (smaller group)
        const group2Data = {
            name: 'Community Savings Group',
            pot_value: 500000, // 5 Lakhs
            duration: 10,
            commission_percentage: 4,
            base_installment: 50000,
            total_members: 10,
            auction_day: 15, // 15th of every month
            auction_time: '19:00',
        };

        const auctionDates2 = [];
        const startDate2 = new Date('2026-02-15');
        for (let i = 0; i < 10; i++) {
            const date = new Date(startDate2);
            date.setMonth(startDate2.getMonth() + i);
            auctionDates2.push({
                monthNumber: i + 1,
                date: date.toISOString(),
                isModified: false,
            });
        }

        const membersWithTickets2 = createdMembers.slice(0, 10).map((member, index) => ({
            member,
            ticketNumber: index + 1,
        }));

        const groupId2 = await groupService.createGroup(
            group2Data,
            membersWithTickets2,
            auctionDates2
        );

        console.log(`✅ Created group: ${group2Data.name}`);

        console.log('🌱 Database seeding completed successfully!');
        console.log(`   - ${createdMembers.length} members`);
        console.log(`   - 2 active groups`);
    } catch (error) {
        console.error('❌ Database seeding failed:', error);
        throw error;
    }
};

/**
 * Clear all data (for development/testing)
 */
export const clearAllData = async () => {
    console.log('🗑️ Clearing all data...');
    await database.resetDatabase();
    console.log('✅ All data cleared');
};
