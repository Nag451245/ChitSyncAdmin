import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    TextInput,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui';
import { groupService } from '../../services';
import type { Group } from '../../types/database';
import { formatCurrency } from '../../utils/calculations';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<any>;

interface GroupsListScreenProps {
    navigation: NavigationProp;
}

export const GroupsListScreen: React.FC<GroupsListScreenProps> = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [groups, setGroups] = useState<Group[]>([]);
    const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const allGroups = await groupService.getAllGroups();
            setGroups(allGroups);
        } catch (error) {
            console.error('Failed to load groups:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadGroups();
    };

    const filteredGroups = groups.filter(g => {
        const matchesFilter = filter === 'all' || g.status === filter;
        const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-neutral-200">
                <Text className="text-2xl font-bold text-neutral-900">Groups</Text>
                <Text className="text-sm text-neutral-500">Manage all your chit fund groups</Text>
            </View>

            {/* Search & Filter */}
            <View className="px-6 py-4">
                <TextInput
                    placeholder="Search groups..."
                    className="bg-white p-3 rounded-lg border border-neutral-200 mb-4"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <View className="flex-row space-x-2">
                    {(['all', 'active', 'closed'] as const).map((f) => (
                        <TouchableOpacity
                            key={f}
                            onPress={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full ${filter === f ? 'bg-primary-600' : 'bg-neutral-200'}`}
                        >
                            <Text className={`text-sm font-semibold ${filter === f ? 'text-white' : 'text-neutral-600'} capitalize`}>
                                {f}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0ea5e9" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-6 pb-6"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {filteredGroups.length === 0 ? (
                        <View className="items-center py-12">
                            <Text className="text-neutral-400 text-lg">No groups found</Text>
                        </View>
                    ) : (
                        filteredGroups.map((group) => (
                            <TouchableOpacity
                                key={group.id}
                                className="mb-4"
                                onPress={() => {
                                    // Navigate based on status
                                    if (group.status === 'active') {
                                        navigation.navigate('AuctionRoom', { groupId: group.id });
                                    } else {
                                        // View closed group details (Using AuctionRoom for now in read-only mode notionally)
                                        // Or navigate to a summary
                                        navigation.navigate('AuctionRoom', { groupId: group.id });
                                    }
                                }}
                            >
                                <Card>
                                    <View className="flex-row justify-between items-start">
                                        <View>
                                            <Text className="text-lg font-bold text-neutral-900">{group.name}</Text>
                                            <Text className="text-sm text-neutral-500 mt-1">
                                                Pot: {formatCurrency(group.pot_value)} • {group.total_members} Members
                                            </Text>
                                        </View>
                                        <View className={`px-2 py-1 rounded text-xs ${group.status === 'active' ? 'bg-green-100' : 'bg-neutral-100'}`}>
                                            <Text className={`text-xs font-bold ${group.status === 'active' ? 'text-green-700' : 'text-neutral-500'} capitalize`}>
                                                {group.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="mt-4 flex-row justify-between items-center">
                                        <Text className="text-sm text-neutral-600">
                                            Month {group.current_month} / {group.duration}
                                        </Text>
                                        <Text className="text-primary-600 font-semibold">View Details →</Text>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        ))
                    )}
                    <View className="h-20" />
                </ScrollView>
            )}
        </SafeAreaView>
    );
};
