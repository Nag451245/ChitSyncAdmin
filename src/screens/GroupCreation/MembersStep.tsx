import React, { useState } from 'react';
// Contacts integration
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Input, Button } from '../../components/ui';
import * as Contacts from 'expo-contacts';

interface MembersStepProps {
    onComplete: (data: MembersData) => void;
    onBack: () => void;
    initialData?: MembersData;
    totalMembers: number;
}

export interface MembersData {
    members: Member[];
}

export interface Member {
    id: string;
    name: string;
    phone: string;
    ticketNumber: number;
    source: 'database' | 'contacts';
}

export const MembersStep: React.FC<MembersStepProps> = ({
    onComplete,
    onBack,
    initialData,
    totalMembers,
}) => {
    const [activeTab, setActiveTab] = useState<'database' | 'contacts'>('database');
    const [selectedMembers, setSelectedMembers] = useState<Member[]>(
        initialData?.members || []
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [contactsMembers, setContactsMembers] = useState<Member[]>([]);
    const [permissionStatus, setPermissionStatus] = useState<Contacts.PermissionStatus | null>(null);

    // Mock Database Data (keeping this as is for now)
    const mockDatabaseMembers = [
        { id: '1', name: 'Ramesh Kumar', phone: '+91 98765 43210', source: 'database' as const },
        { id: '2', name: 'Suresh Patel', phone: '+91 98765 43211', source: 'database' as const },
        { id: '3', name: 'Mahesh Sharma', phone: '+91 98765 43212', source: 'database' as const },
        { id: '4', name: 'Rajesh Verma', phone: '+91 98765 43213', source: 'database' as const },
        { id: '5', name: 'Dinesh Gupta', phone: '+91 98765 43214', source: 'database' as const },
    ];

    React.useEffect(() => {
        (async () => {
            const { status } = await Contacts.requestPermissionsAsync();
            setPermissionStatus(status);

            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers],
                });

                if (data.length > 0) {
                    const formattedContacts: Member[] = data
                        .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
                        .map(c => ({
                            id: c.id ?? Math.random().toString(), // fallback ID
                            name: c.name ?? 'Unknown',
                            phone: c.phoneNumbers?.[0]?.number ?? '',
                            ticketNumber: 0, // Assigned on selection
                            source: 'contacts' as const
                        }));
                    setContactsMembers(formattedContacts);
                }
            }
        })();
    }, []);

    const availableMembers = activeTab === 'database'
        ? mockDatabaseMembers
        : contactsMembers;

    const filteredMembers = availableMembers.filter(
        m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.phone.includes(searchQuery)
    );

    const isMemberSelected = (id: string) => {
        return selectedMembers.some(m => m.id === id);
    };

    const handleAddMember = (member: typeof mockDatabaseMembers[0]) => {
        if (selectedMembers.length >= totalMembers) {
            // Show error toast
            return;
        }

        const newMember: Member = {
            ...member,
            ticketNumber: selectedMembers.length + 1,
        };

        setSelectedMembers([...selectedMembers, newMember]);
    };

    const handleRemoveMember = (id: string) => {
        const newMembers = selectedMembers
            .filter(m => m.id !== id)
            .map((m, index) => ({ ...m, ticketNumber: index + 1 }));
        setSelectedMembers(newMembers);
    };

    const handleComplete = () => {
        onComplete({ members: selectedMembers });
    };

    const progress = selectedMembers.length;
    const progressPercentage = (progress / totalMembers) * 100;

    const renderAvailableMember = ({ item }: { item: typeof mockDatabaseMembers[0] }) => {
        const isSelected = isMemberSelected(item.id);

        return (
            <TouchableOpacity
                onPress={() => isSelected ? null : handleAddMember(item)}
                disabled={isSelected}
            >
                <Card className={`mb-2 ${isSelected ? 'opacity-50' : ''}`}>
                    <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                            <Text className="text-base font-bold text-neutral-900">
                                {item.name}
                            </Text>
                            <Text className="text-sm text-neutral-500 mt-1">{item.phone}</Text>
                        </View>
                        <Button
                            variant={isSelected ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={isSelected}
                            onPress={() => handleAddMember(item)}
                        >
                            {isSelected ? 'Added' : 'Add'}
                        </Button>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    const renderSelectedMember = ({ item }: { item: Member }) => (
        <Card className="mb-2">
            <View className="flex-row justify-between items-center">
                <View className="bg-primary-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                    <Text className="text-primary-700 font-bold">#{item.ticketNumber}</Text>
                </View>
                <View className="flex-1">
                    <Text className="text-base font-bold text-neutral-900">{item.name}</Text>
                    <Text className="text-sm text-neutral-500">{item.phone}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => handleRemoveMember(item.id)}
                    className="ml-2"
                >
                    <Text className="text-loss-600 font-bold text-lg">×</Text>
                </TouchableOpacity>
            </View>
        </Card>
    );

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-neutral-200">
                <Text className="text-sm text-primary-600 font-semibold">STEP 3 OF 3</Text>
                <Text className="text-2xl font-bold text-neutral-900 mt-1">
                    Add Members
                </Text>

                {/* Progress Counter */}
                <View className="mt-3">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm font-semibold text-neutral-700">
                            Members: {progress}/{totalMembers}
                        </Text>
                        <Text className="text-sm font-bold text-primary-600">
                            {progressPercentage.toFixed(0)}%
                        </Text>
                    </View>
                    <View className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <View
                            className="h-full bg-primary-600 rounded-full"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </View>
                </View>
            </View>

            {/* Selected Members Summary */}
            {selectedMembers.length > 0 && (
                <View className="px-6 pt-4">
                    <Text className="text-sm font-bold text-neutral-900 mb-2">
                        Selected Members
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-2"
                    >
                        {selectedMembers.map(member => (
                            <View
                                key={member.id}
                                className="bg-primary-100 rounded-full px-3 py-1.5 mr-2"
                            >
                                <Text className="text-primary-700 font-semibold text-xs">
                                    #{member.ticketNumber} {member.name}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Tabs */}
            <View className="flex-row px-6 pt-4 space-x-3">
                <TouchableOpacity
                    onPress={() => setActiveTab('database')}
                    className={`flex-1 py-3 rounded-xl ${activeTab === 'database'
                        ? 'bg-primary-600'
                        : 'bg-neutral-200'
                        }`}
                >
                    <Text
                        className={`text-center font-bold ${activeTab === 'database' ? 'text-white' : 'text-neutral-600'
                            }`}
                    >
                        Global Database
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('contacts')}
                    className={`flex-1 py-3 rounded-xl ${activeTab === 'contacts'
                        ? 'bg-primary-600'
                        : 'bg-neutral-200'
                        }`}
                >
                    <Text
                        className={`text-center font-bold ${activeTab === 'contacts' ? 'text-white' : 'text-neutral-600'
                            }`}
                    >
                        Phone Contacts
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

            {/* Available Members List */}
            <ScrollView className="flex-1 px-6 pt-4 pb-24" showsVerticalScrollIndicator={false}>
                <FlatList
                    data={filteredMembers as any}
                    renderItem={renderAvailableMember}
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
                <View className="flex-row space-x-3">
                    <Button
                        variant="outline"
                        size="lg"
                        fullWidth
                        onPress={onBack}
                        className="flex-1"
                    >
                        ← Back
                    </Button>
                    <Button
                        variant="success"
                        size="lg"
                        fullWidth
                        onPress={handleComplete}
                        className="flex-1"
                        disabled={progress === 0}
                    >
                        {progress < totalMembers
                            ? `Create with ${progress}/${totalMembers}`
                            : 'Create Group ✓'
                        }
                    </Button>
                </View>
            </View>
        </SafeAreaView>
    );
};
