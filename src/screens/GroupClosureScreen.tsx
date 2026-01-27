import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    FlatList,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '../components/ui';
import { calculateForemanProfit, formatCurrency } from '../utils/calculations';
import { sendWhatsappMessage, MessageTemplates } from '../utils/communications';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { groupService, auctionService, paymentService } from '../services';
import { CommonActions } from '@react-navigation/native';

type RootStackParamList = {
    Main: undefined;
    GroupClosure: {
        groupId: string;
        groupName?: string;
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GroupClosureScreenProps {
    navigation: NavigationProp;
    route: {
        params: RootStackParamList['GroupClosure'];
    };
}

interface FinalMember {
    id: string;
    name: string;
    ticketNumber: number;
    totalPaid: number;
    totalReceived: number; // For prized members
    netPosition: number;
}

/**
 * UI Screen 12: Group Closure & Final Settlement
 */
export const GroupClosureScreen = ({
    navigation,
    route,
}: GroupClosureScreenProps) => {
    const { groupId, groupName: initialGroupName } = route.params;

    const [loading, setLoading] = useState(true);
    const [confirmed, setConfirmed] = useState(false);
    const [finalMembers, setFinalMembers] = useState<FinalMember[]>([]);

    // Financials
    const [groupName, setGroupName] = useState(initialGroupName || '');
    const [totalCommissions, setTotalCommissions] = useState(0);
    const [badDebts, setBadDebts] = useState(0);
    const [operationalCosts, setOperationalCosts] = useState(0);
    const [foremanProfit, setForemanProfit] = useState(0);

    useEffect(() => {
        loadClosureData();
    }, [groupId]);

    const loadClosureData = async () => {
        try {
            setLoading(true);

            // 1. Get Group Details
            const group = await groupService.getGroup(groupId);
            if (group) setGroupName(group.name);

            // 2. Get Auctions for Commissions
            const auctions = await auctionService.getGroupAuctions(groupId);
            const totalComm = auctions.reduce((sum, a) => sum + a.foreman_commission, 0);
            setTotalCommissions(totalComm);

            // 3. Get Defaulters for Bad Debts
            const defaulters = await paymentService.getDefaulters(groupId);
            const totalBadDebt = defaulters.reduce((sum, d) => sum + d.total_due, 0);
            setBadDebts(totalBadDebt);

            // 4. Calculate Member Positions
            const members = await groupService.getGroupMembers(groupId);
            const memberStats = await Promise.all(members.map(async m => {
                // Get payments by this member
                const payments = await paymentService.getMemberPayments(groupId, m.member_id);
                const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);

                // Check if prized (received money)
                // In a real app, we'd sum transactions of type 'prize'.
                // For now, if prized, we assume they received (PotValue - Commission - Dividend)? 
                // Creating a simplified calculation based on auction data if available.
                let totalReceived = 0;
                if (m.is_prized) {
                    const winningAuction = auctions.find(a => a.winner_id === m.id);
                    if (winningAuction) {
                        totalReceived = winningAuction.bid_amount; // This is the prize amount
                    }
                }

                // Net Position = Received - Paid
                const netPosition = totalReceived - totalPaid;

                return {
                    id: m.member_id,
                    name: m.name,
                    ticketNumber: m.ticket_number,
                    totalPaid,
                    totalReceived,
                    netPosition
                };
            }));

            setFinalMembers(memberStats);

            // 5. Calculate Foreman Profit
            const opCosts = 0; // Placeholder or calculate based on logic
            setOperationalCosts(opCosts);
            setForemanProfit(calculateForemanProfit(totalComm, totalBadDebt, opCosts));

        } catch (error) {
            console.error('Failed to load closure data:', error);
            Alert.alert('Error', 'Failed to load group data');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseGroup = async () => {
        try {
            setLoading(true);
            // Update group status to 'closed'
            await groupService.updateGroup(groupId, { status: 'closed' });

            Alert.alert(
                'Success',
                'Group closed successfully. All records have been archived.',
                [{
                    text: 'OK & Share Report',
                    onPress: async () => {
                        // Generate Summary
                        const summary = `📢 *Group Closure Announcement*\n\n` +
                            `Group: *${groupName}* has been officially closed.\n` +
                            `✅ Total Members: ${finalMembers.length}\n` +
                            `💰 Net Profit Generated: ${formatCurrency(foremanProfit)}\n\n` +
                            `All accounts have been settled. Thank you!`;

                        await sendWhatsappMessage('', summary);

                        // Reset navigation to Dashboard
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'Main' }],
                            })
                        );
                    }
                }]
            );
        } catch (error) {
            console.error('Failed to close group:', error);
            Alert.alert('Error', 'Failed to close group');
            setLoading(false);
        }
    };

    const renderMemberSummary = ({ item }: { item: FinalMember }) => (
        <Card className="mb-2">
            <View className="flex-row justify-between items-center">
                <View className="bg-neutral-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                    <Text className="text-neutral-700 font-bold">#{item.ticketNumber}</Text>
                </View>
                <View className="flex-1">
                    <Text className="text-base font-bold text-neutral-900">
                        {item.name}
                    </Text>
                    <View className="flex-row mt-1">
                        <Text className="text-xs text-neutral-500">
                            Paid: {formatCurrency(item.totalPaid)} |
                        </Text>
                        <Text className="text-xs text-neutral-500">
                            {' '}Received: {formatCurrency(item.totalReceived)}
                        </Text>
                    </View>
                </View>
                <View className="items-end">
                    <Text
                        className={`text-lg font-bold ${item.netPosition > 0
                            ? 'text-profit-600'
                            : item.netPosition < 0
                                ? 'text-loss-600'
                                : 'text-neutral-600'
                            }`}
                    >
                        {item.netPosition > 0 && '+'}
                        {formatCurrency(Math.abs(item.netPosition))}
                    </Text>
                    <Text className="text-xs text-neutral-500 mt-1">
                        {item.netPosition > 0
                            ? 'Gain'
                            : item.netPosition < 0
                                ? 'Loss'
                                : 'Break-Even'}
                    </Text>
                </View>
            </View>
        </Card>
    );

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0ea5e9" />
                    <Text className="text-neutral-500 mt-4">Loading final settlement...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const totalMembersSettled = finalMembers.length;
    const profitableMembers = finalMembers.filter(m => m.netPosition > 0).length;
    const lossMembers = finalMembers.filter(m => m.netPosition < 0).length;

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-neutral-200">
                <View className="flex-row items-center justify-between mb-2">
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text className="text-primary-600 text-lg">← Back</Text>
                    </TouchableOpacity>
                    <View className="bg-profit-100 rounded-full px-3 py-1">
                        <Text className="text-profit-700 font-bold text-xs">
                            FINAL CLOSURE
                        </Text>
                    </View>
                </View>
                <Text className="text-2xl font-bold text-neutral-900">Group Closure</Text>
                <Text className="text-sm text-neutral-500 mt-1">{groupName}</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                {/* Foreman Profit Card */}
                <Card variant="gradient" gradientType="profit" animated className="mb-6">
                    <Text className="text-white text-lg font-bold mb-4">
                        ✨ Foreman's Final Profit
                    </Text>

                    <View className="bg-white/10 rounded-lg p-4 mb-3">
                        <Text className="text-white/80 text-sm mb-1">Net Profit</Text>
                        <Text className="text-white text-4xl font-bold">
                            {formatCurrency(foremanProfit)}
                        </Text>
                    </View>

                    <View className="space-y-2">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-white/80">Total Commissions</Text>
                            <Text className="text-white text-lg font-bold">
                                {formatCurrency(totalCommissions)}
                            </Text>
                        </View>

                        <View className="h-px bg-white/20" />

                        <View className="flex-row justify-between items-center">
                            <Text className="text-white/80">Bad Debts</Text>
                            <Text className="text-white text-lg font-bold">
                                - {formatCurrency(badDebts)}
                            </Text>
                        </View>

                        <View className="h-px bg-white/20" />

                        <View className="flex-row justify-between items-center">
                            <Text className="text-white/80">Operational Costs</Text>
                            <Text className="text-white text-lg font-bold">
                                - {formatCurrency(operationalCosts)}
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Group Statistics */}
                <View className="flex-row mb-6 space-x-3">
                    <Card className="flex-1">
                        <Text className="text-sm text-neutral-500 mb-1">Total Members</Text>
                        <Text className="text-3xl font-bold text-primary-600">
                            {totalMembersSettled}
                        </Text>
                    </Card>
                    <Card className="flex-1">
                        <Text className="text-sm text-neutral-500 mb-1">Profitable</Text>
                        <Text className="text-3xl font-bold text-profit-600">
                            {profitableMembers}
                        </Text>
                    </Card>
                    <Card className="flex-1">
                        <Text className="text-sm text-neutral-500 mb-1">Loss</Text>
                        <Text className="text-3xl font-bold text-loss-600">
                            {lossMembers}
                        </Text>
                    </Card>
                </View>

                {/* Member-Wise Settlement */}
                <Text className="text-lg font-bold text-neutral-900 mb-3">
                    Final Member Settlement
                </Text>

                <FlatList
                    data={finalMembers}
                    renderItem={renderMemberSummary}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                />

                {/* Warning Card */}
                <Card variant="glass" className="mt-6 mb-6 bg-warning-50 border border-warning-200">
                    <Text className="text-sm font-semibold text-warning-900 mb-2">
                        ⚠️ Important Notice
                    </Text>
                    <Text className="text-xs text-warning-700">
                        Closing this group will:
                        {'\n'}• Archive all transaction data
                        {'\n'}• Mark group as completed
                        {'\n'}• Send final summary to all members via WhatsApp
                        {'\n'}• Remove group from active dashboard
                        {'\n\n'}This action cannot be undone.
                    </Text>
                </Card>

                {/* Confirmation Checkbox */}
                <TouchableOpacity
                    onPress={() => setConfirmed(!confirmed)}
                    className="flex-row items-center mb-6 p-4 bg-neutral-100 rounded-lg"
                >
                    <View
                        className={`w-6 h-6 rounded mr-3 border-2 ${confirmed
                            ? 'bg-primary-600 border-primary-600'
                            : 'bg-white border-neutral-300'
                            } items-center justify-center`}
                    >
                        {confirmed && (
                            <Text className="text-white font-bold">✓</Text>
                        )}
                    </View>
                    <Text className="flex-1 text-sm font-semibold text-neutral-700">
                        I confirm that all settlements are accurate and I want to close this group permanently.
                    </Text>
                </TouchableOpacity>

                <View className="h-24" />
            </ScrollView>

            {/* Bottom Action Bar */}
            <View className="px-6 py-4 bg-white border-t border-neutral-200">
                <Button
                    variant="success"
                    size="lg"
                    fullWidth
                    onPress={handleCloseGroup}
                    disabled={!confirmed}
                >
                    Close Group & Archive 📁
                </Button>
                <Text className="text-xs text-neutral-500 text-center mt-2">
                    Final report will be exported and sent to all members
                </Text>
            </View>
        </SafeAreaView>
    );
};
