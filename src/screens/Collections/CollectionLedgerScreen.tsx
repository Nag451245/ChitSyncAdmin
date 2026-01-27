import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CurrencyInput, Button } from '../../components/ui';
import { formatCurrency } from '../../utils/calculations';
import { paymentService } from '../../services';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { sendWhatsappMessage, MessageTemplates } from '../../utils/communications';

type RootStackParamList = {
    Main: undefined;
    PaymentEntry: {
        memberId: string;
        memberName: string;
        amount: number;
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CollectionLedgerScreenProps {
    navigation: NavigationProp;
    route: {
        params: {
            groupId: string;
            groupName: string;
            monthNumber: number;
        };
    };
}

interface PaymentRecord {
    id: string;
    ticketNumber: number;
    memberName: string;
    phone: string;
    amount: number;
    status: 'paid' | 'pending' | 'partial';
    paidAmount?: number;
    paymentDate?: string;
}

/**
 * UI Screens 6-8: Collection Ledger
 * 
 * Features:
 * - Filter tabs (All, Paid, Unpaid)
 * - Member payment list with status indicators
 * - Payment entry modal
 * - Consolidated collection view
 * - WhatsApp Receipt Integration
 */
export const CollectionLedgerScreen: React.FC<CollectionLedgerScreenProps> = ({
    navigation,
    route,
}) => {
    const { groupId, groupName, monthNumber = 5 } = route.params;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<PaymentRecord | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank'>('cash');
    const [sendReceipt, setSendReceipt] = useState(true);
    const [saving, setSaving] = useState(false);

    // Real data from database
    const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);

    useEffect(() => {
        loadPayments();
    }, [groupId, monthNumber]);

    const loadPayments = async () => {
        try {
            setLoading(true);
            const payments = await paymentService.getPayments(groupId, monthNumber);

            // Transform database records to UI format
            const records: PaymentRecord[] = payments.map(p => ({
                id: p.id,
                ticketNumber: p.ticket_number,
                memberName: p.name,
                phone: p.phone,
                amount: p.amount_due,
                status: p.status as 'paid' | 'pending' | 'partial',
                paidAmount: p.amount_paid > 0 ? p.amount_paid : undefined,
                paymentDate: p.payment_date || undefined,
            }));

            setPaymentRecords(records);
        } catch (error) {
            console.error('Failed to load payments:', error);
            Alert.alert('Error', 'Failed to load payment records');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadPayments();
        setRefreshing(false);
    };

    const filteredRecords = paymentRecords.filter(record => {
        if (activeFilter === 'paid') return record.status === 'paid';
        if (activeFilter === 'unpaid') return record.status === 'pending' || record.status === 'partial';
        return true;
    });

    const totalPaid = paymentRecords.filter(r => r.status === 'paid').length;
    const totalPending = paymentRecords.filter(r => r.status === 'pending' || r.status === 'partial').length;

    const handleOpenPaymentModal = (member: PaymentRecord) => {
        setSelectedMember(member);
        setPaymentAmount(member.amount.toString());
        setShowPaymentModal(true);
    };

    const handleSavePayment = async () => {
        if (!selectedMember || !paymentAmount) return;

        const paidAmount = parseInt(paymentAmount.replace(/,/g, ''));

        if (isNaN(paidAmount) || paidAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
            return;
        }

        setSaving(true);

        try {
            // Update payment in database
            await paymentService.updatePayment(
                selectedMember.id,
                paidAmount,
                paymentMode,
                sendReceipt
            );

            // Mark receipt as sent if needed
            if (sendReceipt) {
                await paymentService.markReceiptSent(selectedMember.id);

                // Send WhatsApp Receipt
                if (selectedMember.phone) {
                    const message = MessageTemplates.paymentReceipt(
                        selectedMember.memberName,
                        formatCurrency(paidAmount),
                        monthNumber.toString(),
                        groupName
                    );
                    await sendWhatsappMessage(selectedMember.phone, message);
                } else {
                    Alert.alert('Notice', 'Member phone number not found. Receipt skipped.');
                }
            }

            Alert.alert('Success', `Payment of ${formatCurrency(paidAmount)} recorded successfully!`);

            // Reload payments to reflect changes
            await loadPayments();

            setShowPaymentModal(false);
            setSelectedMember(null);
            setPaymentAmount('');
        } catch (error) {
            console.error('Failed to save payment:', error);
            Alert.alert('Error', 'Failed to save payment. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const renderPaymentRecord = ({ item }: { item: PaymentRecord }) => (
        <TouchableOpacity
            onPress={() => item.status !== 'paid' && handleOpenPaymentModal(item)}
            className="mb-2"
        >
            <Card>
                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center flex-1">
                        <View className="bg-primary-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                            <Text className="text-primary-700 font-bold">#{item.ticketNumber}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-neutral-900">
                                {item.memberName}
                            </Text>
                            {item.status === 'partial' && (
                                <Text className="text-xs text-warning-600 mt-1">
                                    Paid: {formatCurrency(item.paidAmount || 0)} / {formatCurrency(item.amount)}
                                </Text>
                            )}
                            {item.status === 'paid' && item.paymentDate && (
                                <Text className="text-xs text-neutral-500 mt-1">
                                    Paid on {new Date(item.paymentDate).toLocaleDateString('en-IN')}
                                </Text>
                            )}
                        </View>
                    </View>

                    <View className="items-end">
                        <Text className="text-lg font-bold text-neutral-900">
                            {formatCurrency(item.amount)}
                        </Text>
                        <View
                            className={`mt-2 px-2 py-1 rounded-full ${item.status === 'paid'
                                ? 'bg-profit-100'
                                : item.status === 'partial'
                                    ? 'bg-warning-100'
                                    : 'bg-loss-100'
                                }`}
                        >
                            <Text
                                className={`text-xs font-bold ${item.status === 'paid'
                                    ? 'text-profit-700'
                                    : item.status === 'partial'
                                        ? 'text-warning-700'
                                        : 'text-loss-700'
                                    }`}
                            >
                                {item.status === 'paid' ? '✓ PAID' : item.status === 'partial' ? 'PARTIAL' : 'PENDING'}
                            </Text>
                        </View>
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-neutral-200">
                <View className="flex-row items-center justify-between mb-2">
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text className="text-primary-600 text-lg">← Back</Text>
                    </TouchableOpacity>
                    <View className="bg-primary-100 rounded-full px-3 py-1">
                        <Text className="text-primary-700 font-bold text-xs">
                            MONTH {monthNumber}
                        </Text>
                    </View>
                </View>
                <Text className="text-2xl font-bold text-neutral-900">{groupName}</Text>
                <View className="flex-row mt-2">
                    <Text className="text-sm text-profit-600 mr-4">Paid: {totalPaid}</Text>
                    <Text className="text-sm text-loss-600">Pending: {totalPending}</Text>
                </View>
            </View>

            {/* Filter Tabs */}
            <View className="flex-row px-6 pt-4 space-x-2">
                <TouchableOpacity
                    onPress={() => setActiveFilter('all')}
                    className={`flex-1 py-2 rounded-lg ${activeFilter === 'all' ? 'bg-primary-600' : 'bg-neutral-200'
                        }`}
                >
                    <Text
                        className={`text-center font-bold ${activeFilter === 'all' ? 'text-white' : 'text-neutral-600'
                            }`}
                    >
                        All
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveFilter('paid')}
                    className={`flex-1 py-2 rounded-lg ${activeFilter === 'paid' ? 'bg-profit-600' : 'bg-neutral-200'
                        }`}
                >
                    <Text
                        className={`text-center font-bold ${activeFilter === 'paid' ? 'text-white' : 'text-neutral-600'
                            }`}
                    >
                        Paid
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveFilter('unpaid')}
                    className={`flex-1 py-2 rounded-lg ${activeFilter === 'unpaid' ? 'bg-loss-600' : 'bg-neutral-200'
                        }`}
                >
                    <Text
                        className={`text-center font-bold ${activeFilter === 'unpaid' ? 'text-white' : 'text-neutral-600'
                            }`}
                    >
                        Unpaid
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Payment Records */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0ea5e9" />
                    <Text className="text-neutral-500 mt-4">Loading payments...</Text>
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-6 pt-4 pb-6"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#0ea5e9']}
                            tintColor="#0ea5e9"
                        />
                    }
                >
                    {filteredRecords.length === 0 ? (
                        <View className="items-center justify-center py-12">
                            <Text className="text-neutral-500 text-lg">No payments found</Text>
                            <Text className="text-neutral-400 text-sm mt-2">
                                {activeFilter === 'all'
                                    ? 'No payment records for this month'
                                    : `No ${activeFilter} payments`}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredRecords}
                            renderItem={renderPaymentRecord}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                        />
                    )}
                </ScrollView>
            )}

            {/* Payment Entry Modal */}
            {showPaymentModal && selectedMember && (
                <View className="absolute inset-0 bg-black/50 items-center justify-center">
                    <ScrollView className="w-full px-6">
                        <Card className="my-6">
                            <Text className="text-xl font-bold text-neutral-900 mb-4">
                                Receive Payment
                            </Text>

                            <View className="mb-4">
                                <Text className="text-sm text-neutral-600 mb-1">From</Text>
                                <Text className="text-lg font-bold text-neutral-900">
                                    {selectedMember.memberName}
                                </Text>
                            </View>

                            <CurrencyInput
                                label="Amount Receiving"
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                                hint="Can be partial payment"
                            />

                            {/* Payment Mode */}
                            <View className="mb-4">
                                <Text className="text-sm font-semibold text-neutral-700 mb-2">
                                    Payment Mode
                                </Text>
                                <View className="flex-row space-x-2">
                                    {(['cash', 'upi', 'bank'] as const).map(mode => (
                                        <TouchableOpacity
                                            key={mode}
                                            onPress={() => setPaymentMode(mode)}
                                            className={`flex-1 py-2 rounded-lg ${paymentMode === mode
                                                ? 'bg-primary-600'
                                                : 'bg-neutral-200'
                                                }`}
                                        >
                                            <Text
                                                className={`text-center font-bold capitalize ${paymentMode === mode
                                                    ? 'text-white'
                                                    : 'text-neutral-600'
                                                    }`}
                                            >
                                                {mode}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Send Receipt Toggle */}
                            <View className="flex-row items-center justify-between mb-6 p-3 bg-neutral-100 rounded-lg">
                                <Text className="text-sm font-semibold text-neutral-700">
                                    Send Receipt on WhatsApp?
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setSendReceipt(!sendReceipt)}
                                    className={`w-12 h-6 rounded-full ${sendReceipt ? 'bg-primary-600' : 'bg-neutral-300'
                                        }`}
                                >
                                    <View
                                        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 ${sendReceipt ? 'right-0.5' : 'left-0.5'
                                            }`}
                                    />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row space-x-3">
                                <Button
                                    variant="outline"
                                    size="md"
                                    fullWidth
                                    onPress={() => {
                                        setShowPaymentModal(false);
                                        setSelectedMember(null);
                                    }}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="success"
                                    size="md"
                                    fullWidth
                                    onPress={handleSavePayment}
                                    className="flex-1"
                                    disabled={!paymentAmount || saving}
                                >
                                    {saving ? 'Saving...' : 'Save Payment'}
                                </Button>
                            </View>
                        </Card>
                    </ScrollView>
                </View>
            )}
        </SafeAreaView>
    );
};
