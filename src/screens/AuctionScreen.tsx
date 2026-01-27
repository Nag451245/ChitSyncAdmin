import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CurrencyInput, Input, Button } from '../components/ui';
import {
    calculateDividend,
    calculateForemanCommission,
    calculateNextPayable,
    formatCurrency,
} from '../utils/calculations';
import { sendWhatsappMessage, MessageTemplates } from '../utils/communications';
import { groupService, auctionService } from '../services';
import type { Group, GroupMember } from '../types/database';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
    Main: undefined;
    GroupCreation: undefined;
    AuctionRoom: {
        groupId: string;
        groupName: string;
        potValue: number;
        commissionPercentage: number;
        totalMembers: number;
        baseInstallment: number;
        monthNumber: number;
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AuctionScreenProps {
    navigation: NavigationProp;
    route: {
        params: RootStackParamList['AuctionRoom'];
    };
}

interface NonPrizedMember {
    id: string;
    name: string;
    ticketNumber: number;
    phone: string;
}

/**
 * UI Screen 5: Auction Room
 * 
 * Features:
 * - Winner selection dropdown (filtered to non-prized members only)
 * - Bid amount input
 * - Live calculation card (commission, dividend, new payable)
 * - Confirm & Notify button (triggers WhatsApp)
 */
export const AuctionScreen = ({
    navigation,
    route,
}: AuctionScreenProps) => {
    const { groupId } = route.params;

    const [loading, setLoading] = useState(true);
    const [conducting, setConducting] = useState(false);
    const [group, setGroup] = useState<Group | null>(null);
    const [nonPrizedMembers, setNonPrizedMembers] = useState<NonPrizedMember[]>([]);

    const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
    const [bidAmount, setBidAmount] = useState('');
    const [showWinnerDropdown, setShowWinnerDropdown] = useState(false);

    useEffect(() => {
        loadAuctionData();
    }, [groupId]);

    const loadAuctionData = async () => {
        try {
            // Fetch group details
            const groupData = await groupService.getGroup(groupId);
            if (!groupData) {
                Alert.alert('Error', 'Group not found');
                navigation.goBack();
                return;
            }
            setGroup(groupData);

            // Fetch non-prized members
            const members = await auctionService.getNonPrizedMembers(groupId);
            setNonPrizedMembers(members.map(m => ({
                id: m.id,
                name: m.name,
                ticketNumber: m.ticket_number,
                phone: m.phone,
            })));
        } catch (error) {
            console.error('Failed to load auction data:', error);
            Alert.alert('Error', 'Failed to load auction data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate live values
    const bidAmountNum = parseInt(bidAmount.replace(/,/g, '')) || 0;
    const foremanCommission = group ? calculateForemanCommission(
        bidAmountNum,
        group.commission_percentage
    ) : 0;
    const dividend = group ? calculateDividend(
        bidAmountNum,
        foremanCommission,
        group.total_members
    ) : 0;
    const newPayable = group ? calculateNextPayable(group.base_installment, dividend) : 0;

    const selectedWinner = nonPrizedMembers.find(m => m.id === selectedWinnerId);

    const handleConfirm = async () => {
        if (!selectedWinnerId || !bidAmountNum || !group) {
            Alert.alert('Validation Error', 'Please select a winner and enter bid amount');
            return;
        }

        setConducting(true);

        try {
            await auctionService.conductAuction({
                group_id: groupId,
                month_number: group.current_month,
                winner_id: selectedWinnerId,
                bid_amount: bidAmountNum,
                foreman_commission: foremanCommission,
                dividend,
                next_payable: newPayable,
                auction_date: new Date().toISOString(),
            });

            Alert.alert(
                'Success',
                `Auction completed successfully!\nWinner: ${selectedWinner?.name}\nBid: ${formatCurrency(bidAmountNum)}`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => navigation.goBack(),
                    },
                    {
                        text: 'Share on WhatsApp',
                        onPress: async () => {
                            if (selectedWinner?.phone) {
                                const message = MessageTemplates.auctionWinner(
                                    selectedWinner.name,
                                    formatCurrency(bidAmountNum),
                                    group.name,
                                    group.current_month.toString()
                                );
                                await sendWhatsappMessage(selectedWinner.phone, message);
                            } else {
                                Alert.alert('Error', 'Winner phone number not found');
                            }
                            navigation.goBack();
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Failed to conduct auction:', error);
            Alert.alert('Error', 'Failed to conduct auction. Please try again.');
        } finally {
            setConducting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0ea5e9" />
                    <Text className="text-neutral-500 mt-4">Loading auction data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!group) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 items-center justify-center">
                    <Text className="text-neutral-700 text-lg">Group not found</Text>
                </View>
            </SafeAreaView>
        );
    }

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
                            MONTH {group.current_month}/{group.duration}
                        </Text>
                    </View>
                </View>
                <Text className="text-2xl font-bold text-neutral-900">{group.name}</Text>
                <Text className="text-sm text-neutral-500 mt-1">
                    Pot Value: {formatCurrency(group.pot_value)}
                </Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                {/* Winner Selection */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-neutral-700 mb-2">
                        Select Winner *
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowWinnerDropdown(!showWinnerDropdown)}
                        className="bg-white rounded-xl px-4 py-3 border border-neutral-300"
                    >
                        {selectedWinner ? (
                            <View className="flex-row items-center">
                                <View className="bg-primary-100 rounded-full w-8 h-8 items-center justify-center mr-3">
                                    <Text className="text-primary-700 font-bold text-xs">
                                        #{selectedWinner.ticketNumber}
                                    </Text>
                                </View>
                                <Text className="text-base text-neutral-900 font-semibold">
                                    {selectedWinner.name}
                                </Text>
                            </View>
                        ) : (
                            <Text className="text-neutral-400">Select a member...</Text>
                        )}
                    </TouchableOpacity>

                    {/* Dropdown */}
                    {showWinnerDropdown && (
                        <Card className="mt-2">
                            <ScrollView className="max-h-60">
                                {nonPrizedMembers.map(member => (
                                    <TouchableOpacity
                                        key={member.id}
                                        onPress={() => {
                                            setSelectedWinnerId(member.id);
                                            setShowWinnerDropdown(false);
                                        }}
                                        className="py-3 border-b border-neutral-100 flex-row items-center"
                                    >
                                        <View className="bg-primary-100 rounded-full w-8 h-8 items-center justify-center mr-3">
                                            <Text className="text-primary-700 font-bold text-xs">
                                                #{member.ticketNumber}
                                            </Text>
                                        </View>
                                        <Text className="text-base text-neutral-900 font-semibold">
                                            {member.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </Card>
                    )}

                    <Text className="text-xs text-neutral-500 mt-1 ml-1">
                        Only non-prized members are shown
                    </Text>
                </View>

                {/* Bid Amount */}
                <CurrencyInput
                    label="Bid Amount *"
                    value={bidAmount}
                    onChangeText={setBidAmount}
                    hint="Amount bid by the winner"
                />

                {/* Live Calculation Card */}
                {bidAmountNum > 0 && selectedWinnerId && (
                    <Card
                        variant="gradient"
                        gradientType="primary"
                        animated
                        className="mb-6"
                    >
                        <Text className="text-white text-lg font-bold mb-4">
                            ⚡ Live Calculations
                        </Text>

                        <View className="space-y-3">
                            {/* Foreman Fee */}
                            <View className="flex-row justify-between items-center">
                                <Text className="text-white/80">Foreman Commission</Text>
                                <Text className="text-white text-xl font-bold">
                                    {formatCurrency(foremanCommission)}
                                </Text>
                            </View>

                            <View className="h-px bg-white/20" />

                            {/* Dividend */}
                            <View className="flex-row justify-between items-center">
                                <View>
                                    <Text className="text-white/80">Dividend per Member</Text>
                                    <Text className="text-white/60 text-xs">
                                        Savings for all members
                                    </Text>
                                </View>
                                <Text className="text-white text-xl font-bold">
                                    {formatCurrency(dividend)}
                                </Text>
                            </View>

                            <View className="h-px bg-white/20" />

                            {/* New Payable */}
                            <View className="flex-row justify-between items-center bg-white/10 rounded-lg p-3">
                                <View>
                                    <Text className="text-white font-semibold">
                                        Next Month Payable
                                    </Text>
                                    <Text className="text-white/60 text-xs">
                                        Reduced installment amount
                                    </Text>
                                </View>
                                <Text className="text-profit-300 text-2xl font-bold">
                                    {formatCurrency(newPayable)}
                                </Text>
                            </View>
                        </View>

                        <View className="mt-4 pt-4 border-t border-white/20">
                            <Text className="text-white/60 text-xs mb-2">Calculation:</Text>
                            <Text className="text-white/80 text-xs">
                                Base Installment: {formatCurrency(group.base_installment)}
                            </Text>
                            <Text className="text-white/80 text-xs">
                                - Dividend: {formatCurrency(dividend)}
                            </Text>
                            <Text className="text-white font-semibold text-xs mt-1">
                                = {formatCurrency(newPayable)}
                            </Text>
                        </View>
                    </Card>
                )}

                <View className="h-24" />
            </ScrollView>

            {/* Bottom Action Bar */}
            <View className="px-6 py-4 bg-white border-t border-neutral-200">
                <Button
                    variant="success"
                    size="lg"
                    fullWidth
                    onPress={handleConfirm}
                    disabled={!selectedWinnerId || !bidAmountNum}
                >
                    Confirm & Notify Members 📱
                </Button>
                <Text className="text-xs text-neutral-500 text-center mt-2">
                    WhatsApp notifications will be sent to all members
                </Text>
            </View>
        </SafeAreaView>
    );
};
