import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    FlatList,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CurrencyInput, Button, Input } from '../../components/ui';
import { calculateSurrenderValue, formatCurrency } from '../../utils/calculations';
import { memberService, groupService } from '../../services';
import { sendWhatsappMessage } from '../../utils/communications';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
    Main: undefined;
    RemoveMember: {
        groupId: string;
        groupName: string;
        potValue: number;
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RemoveMemberScreenProps {
    navigation: NavigationProp;
    route: {
        params: RootStackParamList['RemoveMember'];
    };
}

interface Member {
    id: string;
    name: string;
    ticketNumber: number;
    phone: string;
    totalPaid: number;
    status: 'active' | 'prized';
}

/**
 * UI Screen 11: Remove Member (Voluntary Exit)
 * 
 * Features:
 * - Select member to remove
 * - Calculate surrender value (5% penalty)
 * - Show payment breakdown
 * - Remove ticket from group
 * - Reduce total member count
 * - WhatsApp notification
 */
export const RemoveMemberScreen = ({
    navigation,
    route,
}: RemoveMemberScreenProps) => {
    const {
        groupId, // Added groupId
        groupName,
        potValue,
    } = route.params;

    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmReason, setConfirmReason] = useState('');
    const [sendNotification, setSendNotification] = useState(true);

    // Real data state
    const [dbMembers, setDbMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        loadData();
    }, [groupId]);

    const loadData = async () => {
        try {
            setInitializing(true);
            const members = await groupService.getGroupMembers(groupId);

            setDbMembers(members.map(m => ({
                id: m.member_id, // Map group member to Member interface
                name: m.name,
                ticketNumber: m.ticket_number,
                phone: m.phone,
                totalPaid: m.total_paid,
                status: m.is_prized ? 'prized' : 'active'
            })));
        } catch (error) {
            console.error('Failed to load members:', error);
            Alert.alert('Error', 'Failed to load group members');
        } finally {
            setInitializing(false);
        }
    };

    const filteredMembers = dbMembers.filter( // Changed 'members' to 'dbMembers'
        m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.phone.includes(searchQuery) ||
            m.ticketNumber.toString().includes(searchQuery)
    );

    // Calculate surrender value
    const surrenderValue = selectedMember
        ? calculateSurrenderValue(selectedMember.totalPaid, potValue)
        : 0;
    const penalty = potValue * 0.05;

    const handleRemoveMember = async () => {
        if (!selectedMember) return;

        setLoading(true);
        try {
            // Remove member from group
            await memberService.removeMemberFromGroup(
                groupId,
                selectedMember.id,
                confirmReason || 'Voluntary exit'
            );

            // Send WhatsApp notification if enabled
            if (sendNotification && selectedMember.phone) {
                // Determine message based on surrender value positive/negative
                const message = `Notice: Your membership in ${groupName} (Ticket #${selectedMember.ticketNumber}) has been cancelled. ` +
                    (surrenderValue > 0
                        ? `A refund of ${formatCurrency(surrenderValue)} is processed.`
                        : `Please contact admin for settlement.`);

                // We'll trigger this after the alert logic or let user confirm sharing?
                // For "Remove", it's good to notify.
                // Since this is async and we want to remove immediately, we can fire and forget or await.
                await sendWhatsappMessage(selectedMember.phone, message);
            }

            Alert.alert(
                'Success',
                `Member ${selectedMember.name} removed successfully. Surrender Value: ${formatCurrency(surrenderValue)}`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Failed to remove member:', error);
            Alert.alert('Error', 'Failed to remove member from group');
        } finally {
            setLoading(false);
        }
    };

    const renderMember = ({ item }: { item: Member }) => {
        const isSelected = selectedMember?.id === item.id;

        return (
            <TouchableOpacity
                onPress={() => setSelectedMember(item)}
                className="mb-2"
            >
                <Card className={isSelected ? 'border-2 border-loss-600' : ''}>
                    <View className="flex-row justify-between items-center">
                        <View className="bg-neutral-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                            <Text className="text-neutral-700 font-bold">#{item.ticketNumber}</Text>
                        </View>
                        <View className="flex-1">
                            <View className="flex-row items-center">
                                <Text className="text-base font-bold text-neutral-900">
                                    {item.name}
                                </Text>
                                {item.status === 'prized' && (
                                    <View className="ml-2 bg-profit-100 rounded-full px-2 py-0.5">
                                        <Text className="text-xs font-bold text-profit-700">
                                            PRIZED
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text className="text-sm text-neutral-500 mt-1">
                                Total Paid: {formatCurrency(item.totalPaid)}
                            </Text>
                        </View>
                        {isSelected && (
                            <View className="bg-loss-100 rounded-full px-3 py-1">
                                <Text className="text-loss-700 font-bold text-xs">
                                    ✓ REMOVING
                                </Text>
                            </View>
                        )}
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-neutral-200">
                <View className="flex-row items-center justify-between mb-2">
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text className="text-primary-600 text-lg">← Back</Text>
                    </TouchableOpacity>
                    <View className="bg-loss-100 rounded-full px-3 py-1">
                        <Text className="text-loss-700 font-bold text-xs">
                            REMOVE MEMBER
                        </Text>
                    </View>
                </View>
                <Text className="text-2xl font-bold text-neutral-900">Remove Member</Text>
                <Text className="text-sm text-neutral-500 mt-1">{groupName}</Text>
            </View>

            {/* Surrender Value Card */}
            {selectedMember && (
                <View className="px-6 pt-4">
                    <Card variant="gradient" gradientType="loss" animated>
                        <Text className="text-white text-lg font-bold mb-3">
                            💸 Settlement Calculation
                        </Text>

                        <View className="space-y-3">
                            {/* Total Paid */}
                            <View className="flex-row justify-between items-center">
                                <Text className="text-white/80">Total Amount Paid</Text>
                                <Text className="text-white text-xl font-bold">
                                    {formatCurrency(selectedMember.totalPaid)}
                                </Text>
                            </View>

                            <View className="h-px bg-white/20" />

                            {/* Penalty */}
                            <View className="flex-row justify-between items-center">
                                <View>
                                    <Text className="text-white/80">Exit Penalty (5%)</Text>
                                    <Text className="text-white/60 text-xs">
                                        5% of pot value
                                    </Text>
                                </View>
                                <Text className="text-white text-xl font-bold">
                                    - {formatCurrency(penalty)}
                                </Text>
                            </View>

                            <View className="h-px bg-white/20" />

                            {/* Surrender Value */}
                            <View className="flex-row justify-between items-center bg-white/10 rounded-lg p-3">
                                <View>
                                    <Text className="text-white font-semibold">
                                        Refund Amount
                                    </Text>
                                    <Text className="text-white/60 text-xs">
                                        Amount to return
                                    </Text>
                                </View>
                                <Text className="text-profit-300 text-2xl font-bold">
                                    {formatCurrency(surrenderValue)}
                                </Text>
                            </View>
                        </View>

                        {/* Warning */}
                        <View className="mt-4 pt-4 border-t border-white/20">
                            <Text className="text-white/60 text-xs">
                                ⚠️ This action will permanently remove ticket #{selectedMember.ticketNumber} from the group. The total member count will be reduced.
                            </Text>
                        </View>
                    </Card>
                </View>
            )}

            {/* Search */}
            <View className="px-6 pt-4">
                <Input
                    placeholder="Search by name, phone, or ticket #..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Members List */}
            <ScrollView className="flex-1 px-6 pt-4 pb-48" showsVerticalScrollIndicator={false}>
                {selectedMember && (
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-neutral-700 mb-2">
                            Reason for Exit (Optional)
                        </Text>
                        <Input
                            placeholder="e.g., Financial constraints, Relocation, etc."
                            value={confirmReason}
                            onChangeText={setConfirmReason}
                            multiline
                            numberOfLines={2}
                        />
                    </View>
                )}

                <Text className="text-lg font-bold text-neutral-900 mb-3">
                    Select Member to Remove
                </Text>

                <FlatList
                    data={filteredMembers}
                    renderItem={renderMember}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                />

                {filteredMembers.length === 0 && (
                    <View className="items-center justify-center py-12">
                        <Text className="text-neutral-500 text-center">
                            No members found
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Action Bar */}
            <View className="px-6 py-4 bg-white border-t border-neutral-200">
                {/* WhatsApp Toggle */}
                <View className="flex-row items-center justify-between mb-4 p-3 bg-neutral-100 rounded-lg">
                    <Text className="text-sm font-semibold text-neutral-700">
                        Send WhatsApp Notification?
                    </Text>
                    <TouchableOpacity
                        onPress={() => setSendNotification(!sendNotification)}
                        className={`w-12 h-6 rounded-full ${sendNotification ? 'bg-primary-600' : 'bg-neutral-300'
                            }`}
                    >
                        <View
                            className={`w-5 h-5 bg-white rounded-full absolute top-0.5 ${sendNotification ? 'right-0.5' : 'left-0.5'
                                }`}
                        />
                    </TouchableOpacity>
                </View>

                <Button
                    variant="danger"
                    size="lg"
                    fullWidth
                    onPress={handleRemoveMember}
                    disabled={!selectedMember || loading}
                >
                    {loading ? 'Removing Member...' : (selectedMember
                        ? `Remove & Refund ${formatCurrency(surrenderValue)}`
                        : 'Select Member to Remove'
                    )}
                </Button>

                {selectedMember && (
                    <Text className="text-xs text-neutral-500 text-center mt-2">
                        This action cannot be undone
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
};
