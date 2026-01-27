// Database Types and Interfaces

export interface Group {
    id: string;
    name: string;
    pot_value: number;
    duration: number;
    commission_percentage: number;
    base_installment: number;
    total_members: number;
    current_month: number;
    auction_day: number;
    auction_time: string;
    created_at: string;
    status: 'active' | 'closed' | 'archived';
    closed_at?: string;
}

export interface Member {
    id: string;
    name: string;
    phone: string;
    created_at: string;
    source: 'database' | 'contacts';
}

export interface GroupMember {
    id: string;
    group_id: string;
    member_id: string;
    ticket_number: number;
    joined_month: number;
    is_prized: boolean;
    is_active: boolean;
    total_paid: number;
    total_received: number;
    exit_month?: number;
    exit_reason?: string;
}

export interface Auction {
    id: string;
    group_id: string;
    month_number: number;
    winner_id: string;
    bid_amount: number;
    foreman_commission: number;
    dividend: number;
    next_payable: number;
    auction_date: string;
    conducted_at: string;
}

export interface AuctionDate {
    id: string;
    group_id: string;
    month_number: number;
    scheduled_date: string;
    is_modified: boolean;
}

export interface Payment {
    id: string;
    group_id: string;
    member_id: string;
    month_number: number;
    amount_due: number;
    amount_paid: number;
    payment_mode?: 'cash' | 'upi' | 'bank';
    payment_date?: string;
    status: 'pending' | 'partial' | 'paid';
    receipt_sent: boolean;
    created_at: string;
}

export interface Transaction {
    id: string;
    group_id: string;
    member_id?: string;
    transaction_type: 'payment' | 'prize' | 'refund' | 'commission' | 'cost';
    amount: number;
    description?: string;
    transaction_date: string;
    created_at: string;
}

export interface Setting {
    key: string;
    value: string;
    updated_at: string;
}

// Helper types for database operations
export type CreateGroupData = Omit<Group, 'id' | 'created_at' | 'current_month' | 'status'>;
export type CreateMemberData = Omit<Member, 'id' | 'created_at'>;
export type CreatePaymentData = Omit<Payment, 'id' | 'created_at'>;
export type CreateAuctionData = Omit<Auction, 'id' | 'conducted_at'>;
