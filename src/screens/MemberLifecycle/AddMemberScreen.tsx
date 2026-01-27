import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PhoneInput, Input, Button } from '../../components/ui';
import { calculateCatchUpAmount, formatCurrency } from '../../utils/calculations';
import { memberService, groupService, auctionService } from '../../services';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
    Main: undefined;
    AddMember: {
        groupId: string;
        groupName: string;
        currentMonth: number;
        netPayableHistory: number[];
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AddMemberScreenProps {
    navigation: NavigationProp;
    route: {
        params: RootStackParamList['AddMember'];
    };
}

interface MemberCandidate {
    id: string;
    name: string;
    phone: string;
    source: 'database' | 'contacts';
}

/**
 * UI Screen 9: Add New Member (Mid-Way Entry)
 * 
 * Features:
 * - Search from database or phone contacts
 * - Auto-calculate catch-up amount
 * - Show payment breakdown
 * - Assign next available ticket number
 * - WhatsApp notification option
 */
export const AddMemberScreen = ({
    navigation,
    route,
}: AddMemberScreenProps) => {
    const {
        groupId,
        groupName,
        currentMonth,
        netPayableHistory = [],
    } = route.params;

    const [activeTab, setActiveTab] = useState<'database' | 'contacts'>('database');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState<MemberCandidate | null>(null);
    const [sendNotification, setSendNotification] = useState(true);

    // State for real data
    const [dbMembers, setDbMembers] = useState<MemberCandidate[]>([]);
    const [nextTicketNumber, setNextTicketNumber] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [calculatedNetPayables, setCalculatedNetPayables] = useState<number[]>(netPayableHistory);

    useEffect(() => {
        loadInitialData();
    }, [groupId]);

    useEffect(() => {
        if (searchQuery.length > 0 && activeTab === 'database') {
            searchDatabase(searchQuery);
        } else if (searchQuery.length === 0) {
            loadAllMembers();
        }
    }, [searchQuery, activeTab]);

    const loadInitialData = async () => {
        try {
            // Get next ticket number
            const members = await groupService.getGroupMembers(groupId);
            const maxTicket = members.reduce((max, m) => Math.max(max, m.ticket_number), 0);
            setNextTicketNumber(maxTicket + 1);

            // Get auction history for catch-up amount if not passed
            if (calculatedNetPayables.length === 0 && currentMonth > 1) {
                const auctions = await auctionService.getGroupAuctions(groupId);
                // Extract next_payable from past auctions
                const history = auctions
                    .filter(a => a.month_number < currentMonth)
                    .sort((a, b) => a.month_number - b.month_number)
                    .map(a => a.next_payable);
                setCalculatedNetPayables(history);
            }

            // Initial load of members
            loadAllMembers();
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    };

    const loadAllMembers = async () => {
        try {
            const members = await memberService.getAllMembers();
            setDbMembers(members.map(m => ({
                id: m.id,
                name: m.name,
                phone: m.phone,
                source: 'database'
            })));
        } catch (error) {
            console.error('Failed to load members:', error);
        }
    };

    const searchDatabase = async (query: string) => {
        try {
            const results = await memberService.searchMembers(query);
            setDbMembers(results.map(m => ({
                id: m.id,
                name: m.name,
                phone: m.phone,
                source: 'database'
            })));
        } catch (error) {
            console.error('Failed to search members:', error);
        }
    };

    const mockContactMembers: MemberCandidate[] = [
        { id: 'c1', name: 'Priya Shah', phone: '+91 98765 44444', source: 'contacts' },
        { id: 'c2', name: 'Karan Singh', phone: '+91 98765 55555', source: 'contacts' },
    ];

    const availableMembers = activeTab === 'database'
        ? dbMembers
        : mockContactMembers; // Keep mock for contacts for now

    // Filter is handled by database search for 'database' tab, but we can filter locally too for responsiveness or contacts
    const filteredMembers = activeTab === 'contacts'
        ? availableMembers.filter(m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.phone.includes(searchQuery))
        : availableMembers;

    // Calculate catch-up amount
    const catchUpAmount = calculateCatchUpAmount(calculatedNetPayables);

    const handleAddMember = async () => {
        if (!selectedMember) return;

        setLoading(true);
        try {
            // Add member to group
            await memberService.addMemberToGroup(
                groupId,
                selectedMember.id,
                nextTicketNumber,
                catchUpAmount
            );

            // TODO: Send WhatsApp notification if enabled
            if (sendNotification) {
                console.log('Would send WhatsApp to:', selectedMember.phone);
            }

            Alert.alert(
                'Success',
                `Member ${selectedMember.name} added successfully with Ticket #${nextTicketNumber}`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Failed to add member:', error);
            Alert.alert('Error', 'Failed to add member to group');
        } finally {
            setLoading(false);
        }
    };

    const renderMemberCandidate = ({ item }: { item: MemberCandidate }) => {
        const isSelected = selectedMember?.id === item.id;

        return (
            <TouchableOpacity
                onPress={() => setSelectedMember(item)}
                className="mb-2"
            >
                <Card className={isSelected ? 'border-2 border-primary-600' : ''}>
                    <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                            <Text className="text-base font-bold text-neutral-900">
                                {item.name}
                            </Text>
                            <Text className="text-sm text-neutral-500 mt-1">{item.phone}</Text>
                        </View>
                        {isSelected && (
                            <View className="bg-primary-100 rounded-full px-3 py-1">
                                <Text className="text-primary-700 font-bold text-xs">
                                    ✓ SELECTED
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
                    <View className="bg-primary-100 rounded-full px-3 py-1">
                        <Text className="text-primary-700 font-bold text-xs">
                            MONTH {currentMonth}
                        </Text>
                    </View>
                </View>
                <Text className="text-2xl font-bold text-neutral-900">Add New Member</Text>
                <Text className="text-sm text-neutral-500 mt-1">{groupName}</Text>
            </View>

            {/* Catch-Up Amount Card */}
            {selectedMember && (
                <View className="px-6 pt-4">
                    <Card variant="gradient" gradientType="warning" animated>
                        <Text className="text-white text-lg font-bold mb-3">
                            💰 Catch-Up Payment Required
                        </Text>

                        <View className="bg-white/10 rounded-lg p-3 mb-3">
                            <Text className="text-white/80 text-sm mb-1">Total Amount</Text>
                            <Text className="text-white text-3xl font-bold">
                                {formatCurrency(catchUpAmount)}
                            </Text>
                        </View>

                        <Text className="text-white/80 text-xs">
                            Sum of net payables from Month 1 to {currentMonth} ({calculatedNetPayables.length} months)
                        </Text>

                        <View className="mt-3 pt-3 border-t border-white/20">
                            <Text className="text-white/60 text-xs mb-2">Breakdown:</Text>
                            {calculatedNetPayables.slice(0, 3).map((amount, index) => (
                                <Text key={index} className="text-white/80 text-xs">
                                    Month {index + 1}: {formatCurrency(amount)}
                                </Text>
                            ))}
                            {calculatedNetPayables.length > 3 && (
                                <Text className="text-white/80 text-xs">
                                    ... and {calculatedNetPayables.length - 3} more months
                                </Text>
                            )}
                        </View>

                        <View className="mt-3 pt-3 border-t border-white/20">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-white font-semibold">Assign Ticket #</Text>
                                <View className="bg-white rounded-full w-10 h-10 items-center justify-center">
                                    <Text className="text-warning-600 font-bold text-lg">
                                        {nextTicketNumber}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Card>
                </View>
            )}

            {/* Tabs */}
            <View className="flex-row px-6 pt-4 space-x-3">
                <TouchableOpacity
                    onPress={() => setActiveTab('database')}
                    className={`flex-1 py-3 rounded-xl ${activeTab === 'database' ? 'bg-primary-600' : 'bg-neutral-200'
                        }`}
                >
                    <Text
                        className={`text-center font-bold ${activeTab === 'database' ? 'text-white' : 'text-neutral-600'
                            }`}
                    >
                        Database
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('contacts')}
                    className={`flex-1 py-3 rounded-xl ${activeTab === 'contacts' ? 'bg-primary-600' : 'bg-neutral-200'
                        }`}
                >
                    <Text
                        className={`text-center font-bold ${activeTab === 'contacts' ? 'text-white' : 'text-neutral-600'
                            }`}
                    >
                        Contacts
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="px-6 pt-4">
                <Input
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Members List */}
            <ScrollView className="flex-1 px-6 pt-4 pb-24" showsVerticalScrollIndicator={false}>
                <FlatList
                    data={filteredMembers}
                    renderItem={renderMemberCandidate}
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
                    variant="success"
                    size="lg"
                    fullWidth
                    onPress={handleAddMember}
                    disabled={!selectedMember || loading}
                >
                    {loading ? 'Adding Member...' : (selectedMember
                        ? `Add ${selectedMember.name} - ${formatCurrency(catchUpAmount)}`
                        : 'Select a Member to Add'
                    )}
                </Button>
            </View>
        </SafeAreaView>
    );
};
