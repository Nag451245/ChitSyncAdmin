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
import { Card, FinancialCard } from '../../components/ui';
import { paymentService, groupService } from '../../services';
import { formatCurrency } from '../../utils/calculations';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Group } from '../../types/database';

type NavigationProp = NativeStackNavigationProp<any>;

interface CollectionsDashboardScreenProps {
    navigation: NavigationProp;
}

export const CollectionsDashboardScreen: React.FC<CollectionsDashboardScreenProps> = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ totalCollected: 0, totalPending: 0 });
    const [activeGroups, setActiveGroups] = useState<Group[]>([]);
    const [recentTxns, setRecentTxns] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Parallel fetching
            const [globalStats, groups, recent] = await Promise.all([
                paymentService.getGlobalPaymentStats(),
                groupService.getActiveGroups(),
                paymentService.getRecentTransactions(5)
            ]);

            setStats(globalStats);
            setActiveGroups(groups);
            setRecentTxns(recent);
        } catch (error) {
            console.error('Failed to load collection data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-neutral-200">
                <Text className="text-2xl font-bold text-neutral-900">Collections</Text>
                <Text className="text-sm text-neutral-500">Track payments and dues</Text>
            </View>

            <ScrollView
                className="flex-1"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Global Stats */}
                <View className="px-6 py-6 flex-row space-x-3">
                    <FinancialCard
                        title="Total Collected"
                        amount={stats.totalCollected}
                        trend="All time"
                        trendDirection="up"
                        variant="primary"
                        className="flex-1"
                    />
                    <FinancialCard
                        title="Total Outstanding"
                        amount={stats.totalPending}
                        trend="Pending"
                        trendDirection="down"
                        variant="warning"
                        className="flex-1"
                    />
                </View>

                {/* Active Collections (Groups) */}
                <View className="px-6 mb-6">
                    <Text className="text-lg font-bold text-neutral-900 mb-3">Active Collections</Text>
                    {loading ? (
                        <ActivityIndicator color="#0ea5e9" />
                    ) : activeGroups.length === 0 ? (
                        <Text className="text-neutral-500 italic">No active groups.</Text>
                    ) : (
                        activeGroups.map(group => (
                            <TouchableOpacity
                                key={group.id}
                                onPress={() => navigation.navigate('CollectionLedger', {
                                    groupId: group.id,
                                    groupName: group.name,
                                    monthNumber: group.current_month
                                })}
                                className="mb-3"
                            >
                                <Card>
                                    <View className="flex-row justify-between items-center">
                                        <View>
                                            <Text className="text-base font-bold text-neutral-900">{group.name}</Text>
                                            <Text className="text-xs text-neutral-500 mt-1">
                                                Current Month: {group.current_month}
                                            </Text>
                                        </View>
                                        <View className="bg-primary-50 px-3 py-1 rounded-full">
                                            <Text className="text-primary-600 font-semibold text-xs">Manage →</Text>
                                        </View>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Recent Transactions */}
                <View className="px-6 pb-12">
                    <Text className="text-lg font-bold text-neutral-900 mb-3">Recent Transactions</Text>
                    {recentTxns.length === 0 ? (
                        <Text className="text-neutral-500 italic">No recent transactions.</Text>
                    ) : (
                        recentTxns.map(tx => (
                            <Card key={tx.id} className="mb-2 p-3">
                                <View className="flex-row justify-between">
                                    <View className="flex-1">
                                        <Text className="text-sm font-bold text-neutral-800">
                                            {tx.member_name || 'Unknown Member'}
                                        </Text>
                                        <Text className="text-xs text-neutral-500">
                                            {tx.group_name} • {new Date(tx.transaction_date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text className={`font-bold ${tx.transaction_type === 'payment' ? 'text-green-600' : 'text-neutral-900'}`}>
                                            {tx.transaction_type === 'payment' ? '+' : ''}
                                            {formatCurrency(tx.amount)}
                                        </Text>
                                        <Text className="text-xs text-right text-neutral-400 capitalize">
                                            {tx.transaction_type}
                                        </Text>
                                    </View>
                                </View>
                            </Card>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
