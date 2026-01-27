import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, FinancialCard, Button } from '../components/ui';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { groupService } from '../services';
import { formatCurrency } from '../utils/calculations';
import type { Group } from '../types/database';

type RootStackParamList = {
    Main: undefined;
    GroupCreation: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DashboardScreenProps {
    navigation: NavigationProp;
}

/**
 * UI Screen 1: Master Dashboard
 * 
 * The "God Mode" Dashboard showing:
 * - Financial Health Card (commission earned, pending collections)
 * - Auction Radar (upcoming auctions horizontal scroll)
 * - Active Groups List (vertical list with status)
 * - FAB button for creating new group
 */
export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [groups, setGroups] = useState<Group[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const activeGroups = await groupService.getActiveGroups();
            setGroups(activeGroups);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboardData();
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0ea5e9" />
                    <Text className="text-neutral-500 mt-4">Loading dashboard...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-neutral-200">
                <Text className="text-3xl font-bold text-neutral-900">ChitSync</Text>
                <Text className="text-sm text-neutral-500 mt-1">Foreman Dashboard</Text>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Financial Health Card */}
                <View className="px-6 pt-6 pb-4">
                    <Text className="text-lg font-bold text-neutral-900 mb-3">
                        Financial Health
                    </Text>

                    <Card variant="glass" className="bg-gradient-to-br from-primary-500 to-primary-700 p-5">
                        <View className="flex-row justify-between items-start mb-4">
                            <View className="flex-1">
                                <Text className="text-white/80 text-sm mb-1">Active Groups</Text>
                                <Text className="text-white text-3xl font-bold">{groups.length}</Text>
                            </View>
                            <View className="bg-white/20 rounded-full px-3 py-1">
                                <Text className="text-white text-xs font-semibold">LIVE</Text>
                            </View>
                        </View>

                        <View className="h-px bg-white/20 my-4" />

                        <View className="flex-row space-x-3">
                            <View className="flex-1 bg-white/10 rounded-xl p-3">
                                <Text className="text-white/60 text-xs">Total Members</Text>
                                <Text className="text-white text-xl font-bold mt-1">
                                    {groups.reduce((sum, g) => sum + g.total_members, 0)}
                                </Text>
                            </View>
                            <View className="flex-1 bg-white/10 rounded-xl p-3">
                                <Text className="text-white/60 text-xs">Total Pot Value</Text>
                                <Text className="text-white text-xl font-bold mt-1">
                                    {formatCurrency(groups.reduce((sum, g) => sum + g.pot_value, 0))}
                                </Text>
                            </View>
                        </View>
                    </Card>
                </View>

                {/* Active Groups List */}
                <View className="px-6 pt-2 pb-24">
                    <Text className="text-lg font-bold text-neutral-900 mb-3">
                        Active Groups ({groups.length})
                    </Text>

                    {groups.length === 0 ? (
                        <Card className="items-center py-8">
                            <Text className="text-6xl mb-3">📋</Text>
                            <Text className="text-lg font-bold text-neutral-700 mb-2">
                                No Active Groups
                            </Text>
                            <Text className="text-sm text-neutral-500 text-center px-6">
                                Tap the + button below to create your first chit fund group
                            </Text>
                        </Card>
                    ) : (
                        groups.map((group) => (
                            <TouchableOpacity
                                key={group.id}
                                className="mb-3"
                                onPress={() => {
                                    if (group.status === 'active') {
                                        (navigation as any).navigate('AuctionRoom', {
                                            groupId: group.id,
                                        });
                                    }
                                }}
                            >
                                <Card>
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-1">
                                            <Text className="text-base font-bold text-neutral-900 mb-1">
                                                {group.name}
                                            </Text>
                                            <View className="flex-row items-center space-x-2 mb-2">
                                                <Text className="text-xs text-neutral-500">
                                                    Month {group.current_month}/{group.duration}
                                                </Text>
                                                <View className="w-1 h-1 rounded-full bg-neutral-300" />
                                                <Text className="text-xs text-neutral-500">
                                                    {group.total_members} Members
                                                </Text>
                                                <View className="w-1 h-1 rounded-full bg-neutral-300" />
                                                <Text className="text-xs text-neutral-500">
                                                    Pot: {formatCurrency(group.pot_value)}
                                                </Text>
                                            </View>
                                            <View className="self-start px-2 py-1 rounded-full bg-primary-100">
                                                <Text className="text-xs font-semibold text-primary-700">
                                                    {group.status === 'active' ? 'Active' : 'Closed'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-neutral-400 text-xl">→</Text>
                                        </View>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* FAB - Create New Group */}
            <View className="absolute bottom-20 right-6">
                <TouchableOpacity
                    onPress={() => navigation.navigate('GroupCreation')}
                    className="w-16 h-16 bg-primary-600 rounded-full items-center justify-center shadow-strong"
                    style={{
                        shadowColor: '#0ea5e9',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 8,
                    }}
                >
                    <Text className="text-white text-3xl font-light">+</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};
