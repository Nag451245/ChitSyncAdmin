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
import { Card, Input, Button } from '../../components/ui';
import { calculateCatchUpAmount, formatCurrency } from '../../utils/calculations';
import { memberService, groupService, auctionService } from '../../services';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
    Main: undefined;
    ReplaceMember: {
        groupId: string;
        groupName: string;
        currentMonth: number;
        netPayableHistory: number[];
    };
};

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type ReplaceMemberScreenProps = NativeStackScreenProps<RootStackParamList, 'ReplaceMember'>;

interface ExistingMember {
    id: string;
    name: string;
    ticketNumber: number;
    phone: string;
    totalPaid: number;
    status: 'active' | 'defaulter';
}

interface ReplacementCandidate {
    id: string;
    name: string;
    phone: string;
    source: 'database' | 'contacts';
}

/**
 * UI Screen 10: Replace Member (Defaulter/Exit)
 * 
 * Features:
 * - Select existing member to replace
 * - Search for replacement from database/contacts
 * - Show settlement details
 * - Transfer ticket number
 * - Calculate catch-up amount for replacement
 * - WhatsApp notifications for both parties
 */
export const ReplaceMemberScreen = ({
    navigation,
    route,
}: ReplaceMemberScreenProps) => {
    const {
        groupId,
        groupName,
        currentMonth,
        netPayableHistory = [],
    } = route.params;

    const [step, setStep] = useState<1 | 2>(1); // 1: Select existing, 2: Select replacement
    const [selectedExisting, setSelectedExisting] = useState<ExistingMember | null>(null);
    const [selectedReplacement, setSelectedReplacement] = useState<ReplacementCandidate | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'database' | 'contacts'>('database');

    // Real data state
    const [existingMembers, setExistingMembers] = useState<ExistingMember[]>([]);
    const [dbCandidates, setDbCandidates] = useState<ReplacementCandidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [calculatedNetPayables, setCalculatedNetPayables] = useState<number[]>(netPayableHistory);

    useEffect(() => {
        loadData();
    }, [groupId]);

    useEffect(() => {
        if (step === 2) {
            if (activeTab === 'database' && searchQuery) {
                searchDatabase(searchQuery);
            } else if (activeTab === 'database' && !searchQuery) {
                loadAllCandidates();
            }
        }
    }, [step, activeTab, searchQuery]);

    const loadData = async () => {
        try {
            // Load group active members
            const members = await groupService.getGroupMembers(groupId);
            // Filter only active members (can replace active or prized? Usually active defaulters/exits)
            // Assuming we replace anyone currently in the group
            setExistingMembers(members.map(m => ({
                id: m.member_id, // Important: using member_id, not group_member_id
                name: m.name,
                ticketNumber: m.ticket_number,
                phone: m.phone,
                totalPaid: m.total_paid,
                status: m.is_active ? 'active' : 'defaulter' // Mock logic - assume active unless specified
            })));

            // Load auction history if needed
            if (calculatedNetPayables.length === 0 && currentMonth > 1) {
                const auctions = await auctionService.getGroupAuctions(groupId);
                const history = auctions
                    .filter(a => a.month_number < currentMonth)
                    .sort((a, b) => a.month_number - b.month_number)
                    .map(a => a.next_payable);
                setCalculatedNetPayables(history);
            }
        } catch (error) {
            console.error('Failed to load group data:', error);
            Alert.alert('Error', 'Failed to load group members');
        }
    };

    const loadAllCandidates = async () => {
        try {
            const members = await memberService.getAllMembers();
            // Filter out those already in the group? Not strictly necessary but good UX
            // For now just load all
            setDbCandidates(members.map(m => ({
                id: m.id,
                name: m.name,
                phone: m.phone,
                source: 'database'
            })));
        } catch (error) {
            console.error('Failed to load candidates:', error);
        }
    };

    const searchDatabase = async (query: string) => {
        try {
            const members = await memberService.searchMembers(query);
            setDbCandidates(members.map(m => ({
                id: m.id,
                name: m.name,
                phone: m.phone,
                source: 'database'
            })));
        } catch (error) {
            console.error('Failed to search members:', error);
        }
    };

    const mockContactCandidates: ReplacementCandidate[] = [
        { id: 'rc1', name: 'Priya Shah', phone: '+91 98765 66666', source: 'contacts' },
    ];

    const availableCandidates = activeTab === 'database'
        ? dbCandidates
        : mockContactCandidates;

    const filteredCandidates = activeTab === 'contacts'
        ? availableCandidates.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone.includes(searchQuery))
        : availableCandidates;

    const catchUpAmount = calculateCatchUpAmount(calculatedNetPayables);
    const settlementForExisting = selectedExisting
        ? selectedExisting.totalPaid - catchUpAmount
        : 0;

    const handleNext = () => {
        if (selectedExisting) {
            setStep(2);
        }
    };

    const handleReplace = async () => {
        if (!selectedExisting || !selectedReplacement) return;

        setLoading(true);
        try {
            await memberService.replaceMember(
                groupId,
                selectedExisting.id, // oldMemberId
                selectedReplacement.id, // newMemberId
                catchUpAmount
            );

            // TODO: Send WhatsApp notifications
            console.log('Replaced member successfully');

            Alert.alert(
                'Success',
                `Member replaced successfully. Ticket #${selectedExisting.ticketNumber} transferred to ${selectedReplacement.name}.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Failed to replace member:', error);
            Alert.alert('Error', 'Failed to replace member. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderExistingMember = ({ item }: { item: ExistingMember }) => {
        const isSelected = selectedExisting?.id === item.id;

        return (
            <TouchableOpacity
                onPress={() => setSelectedExisting(item)}
                className="mb-2"
            >
                <Card className={isSelected ? 'border-2 border-primary-600' : ''}>
                    <View className="flex-row justify-between items-center">
                        <View className="bg-neutral-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                            <Text className="text-neutral-700 font-bold">#{item.ticketNumber}</Text>
                        </View>
                        <View className="flex-1">
                            <View className="flex-row items-center">
                                <Text className="text-base font-bold text-neutral-900">
                                    {item.name}
                                </Text>
                                {item.status === 'defaulter' && (
                                    <View className="ml-2 bg-loss-100 rounded-full px-2 py-0.5">
                                        <Text className="text-xs font-bold text-loss-700">
                                            DEFAULTER
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text className="text-sm text-neutral-500 mt-1">
                                Paid: {formatCurrency(item.totalPaid)}
                            </Text>
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

    const renderReplacementCandidate = ({ item }: { item: ReplacementCandidate }) => {
        const isSelected = selectedReplacement?.id === item.id;

        return (
            <TouchableOpacity
                onPress={() => setSelectedReplacement(item)}
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
                    <TouchableOpacity onPress={() => step === 2 ? setStep(1) : navigation.goBack()}>
                        <Text className="text-primary-600 text-lg">← Back</Text>
                    </TouchableOpacity>
                    <View className="bg-primary-100 rounded-full px-3 py-1">
                        <Text className="text-primary-700 font-bold text-xs">
                            STEP {step} OF 2
                        </Text>
                    </View>
                </View>
                <Text className="text-2xl font-bold text-neutral-900">Replace Member</Text>
                <Text className="text-sm text-neutral-500 mt-1">{groupName}</Text>
            </View>

            {step === 1 && (
                <>
                    {/* Step 1: Select Existing Member */}
                    <View className="px-6 pt-4">
                        <Text className="text-lg font-bold text-neutral-900 mb-3">
                            Select Member to Replace
                        </Text>
                    </View>

                    <ScrollView className="flex-1 px-6 pb-24" showsVerticalScrollIndicator={false}>
                        <FlatList
                            data={existingMembers}
                            renderItem={renderExistingMember}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                        />
                    </ScrollView>

                    {/* Settlement Preview */}
                    {selectedExisting && (
                        <View className="px-6 py-4 bg-warning-50 border-t border-warning-200">
                            <Text className="text-sm font-semibold text-warning-900 mb-2">
                                Settlement Preview
                            </Text>
                            <View className="flex-row justify-between">
                                <Text className="text-sm text-neutral-600">Amount to Refund:</Text>
                                <Text className={`text-base font-bold ${settlementForExisting >= 0 ? 'text-profit-600' : 'text-loss-600'
                                    }`}>
                                    {formatCurrency(Math.abs(settlementForExisting))}
                                    {settlementForExisting < 0 && ' (Dues)'}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View className="px-6 py-4 bg-white border-t border-neutral-200">
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onPress={handleNext}
                            disabled={!selectedExisting}
                        >
                            Next: Select Replacement →
                        </Button>
                    </View>
                </>
            )}

            {step === 2 && selectedExisting && (
                <>
                    {/* Replacement Info Card */}
                    <View className="px-6 pt-4">
                        <Card variant="glass" className="bg-primary-50 border border-primary-200 mb-4">
                            <Text className="text-sm font-semibold text-primary-700 mb-2">
                                Replacing Ticket #{selectedExisting.ticketNumber}
                            </Text>
                            <Text className="text-xs text-neutral-600">
                                {selectedExisting.name} will be replaced. The new member must pay catch-up amount.
                            </Text>
                        </Card>
                    </View>

                    {/* Catch-Up Amount Card */}
                    {selectedReplacement && (
                        <View className="px-6">
                            <Card variant="gradient" gradientType="primary" animated>
                                <Text className="text-white text-lg font-bold mb-3">
                                    💰 Catch-Up Amount
                                </Text>

                                <View className="bg-white/10 rounded-lg p-3">
                                    <Text className="text-white/80 text-sm mb-1">Total Amount</Text>
                                    <Text className="text-white text-3xl font-bold">
                                        {formatCurrency(catchUpAmount)}
                                    </Text>
                                </View>

                                <View className="mt-3 pt-3 border-t border-white/20">
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-white font-semibold">Transfer Ticket #</Text>
                                        <View className="bg-white rounded-full w-10 h-10 items-center justify-center">
                                            <Text className="text-primary-600 font-bold text-lg">
                                                {selectedExisting.ticketNumber}
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

                    {/* Replacement Candidates */}
                    <ScrollView className="flex-1 px-6 pt-4 pb-24" showsVerticalScrollIndicator={false}>
                        <FlatList
                            data={filteredCandidates}
                            renderItem={renderReplacementCandidate}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                        />

                        {filteredCandidates.length === 0 && (
                            <View className="items-center justify-center py-12">
                                <Text className="text-neutral-500 text-center">
                                    No candidates found
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <View className="px-6 py-4 bg-white border-t border-neutral-200">
                        <Button
                            variant="success"
                            size="lg"
                            fullWidth
                            onPress={handleReplace}
                            disabled={!selectedReplacement || loading}
                        >
                            {loading ? 'Replacing...' : (selectedReplacement
                                ? `Replace with ${selectedReplacement.name}`
                                : 'Select Replacement Member'
                            )}
                        </Button>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
};
