import React, { useState, useEffect } from 'react';
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

interface ScheduleStepProps {
    onNext: (data: ScheduleData) => void;
    onBack: () => void;
    initialData?: ScheduleData;
    duration: number;
}

export interface ScheduleData {
    auctionDay: number;
    auctionTime: string;
    generatedDates: AuctionDate[];
}

export interface AuctionDate {
    monthNumber: number;
    date: Date;
    isModified: boolean;
}

/**
 * UI Screen 3: Group Creation - Step 2 (Schedule)
 * 
 * Inputs:
 * - Preferred Auction Day (1-31)
 * - Auction Time (HH:MM)
 * 
 * Features:
 * - Auto-generates dates for all months
 * - Manual override for holidays
 * - Preview list of all auction dates
 */
export const ScheduleStep: React.FC<ScheduleStepProps> = ({
    onNext,
    onBack,
    initialData,
    duration,
}) => {
    const [auctionDay, setAuctionDay] = useState(
        initialData?.auctionDay?.toString() || '5'
    );
    const [auctionTime, setAuctionTime] = useState(
        initialData?.auctionTime || '19:00'
    );
    const [generatedDates, setGeneratedDates] = useState<AuctionDate[]>(
        initialData?.generatedDates || []
    );
    const [editingMonth, setEditingMonth] = useState<number | null>(null);
    const [editDate, setEditDate] = useState('');

    // Generate dates when auction day changes
    useEffect(() => {
        if (auctionDay && parseInt(auctionDay) > 0 && parseInt(auctionDay) <= 31) {
            generateDates(parseInt(auctionDay));
        }
    }, [auctionDay, duration]);

    const generateDates = (day: number) => {
        const dates: AuctionDate[] = [];
        const today = new Date();

        for (let i = 0; i < duration; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, day);
            dates.push({
                monthNumber: i + 1,
                date,
                isModified: false,
            });
        }

        setGeneratedDates(dates);
    };

    const handleDateEdit = (monthNumber: number) => {
        setEditingMonth(monthNumber);
        const currentDate = generatedDates.find(d => d.monthNumber === monthNumber);
        if (currentDate) {
            const day = currentDate.date.getDate();
            setEditDate(day.toString());
        }
    };

    const handleDateSave = () => {
        if (editingMonth && editDate) {
            const newDates = generatedDates.map(d => {
                if (d.monthNumber === editingMonth) {
                    const newDate = new Date(d.date);
                    newDate.setDate(parseInt(editDate));
                    return {
                        ...d,
                        date: newDate,
                        isModified: true,
                    };
                }
                return d;
            });
            setGeneratedDates(newDates);
            setEditingMonth(null);
            setEditDate('');
        }
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const getMonthName = (date: Date): string => {
        return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    };

    const handleNext = () => {
        onNext({
            auctionDay: parseInt(auctionDay),
            auctionTime,
            generatedDates,
        });
    };

    const renderDateItem = ({ item }: { item: AuctionDate }) => (
        <TouchableOpacity
            onPress={() => handleDateEdit(item.monthNumber)}
            className="mb-2"
        >
            <Card className={item.isModified ? 'border-2 border-warning-500' : ''}>
                <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                        <View className="flex-row items-center">
                            <Text className="text-sm font-bold text-neutral-900">
                                Month {item.monthNumber}
                            </Text>
                            {item.isModified && (
                                <View className="ml-2 bg-warning-100 rounded-full px-2 py-0.5">
                                    <Text className="text-xs font-semibold text-warning-700">
                                        Modified
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-xs text-neutral-500 mt-1">
                            {getMonthName(item.date)}
                        </Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-lg font-bold text-primary-600">
                            {formatDate(item.date)}
                        </Text>
                        <Text className="text-xs text-neutral-500 mt-1">{auctionTime}</Text>
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
                <Text className="text-sm text-primary-600 font-semibold">STEP 2 OF 3</Text>
                <Text className="text-2xl font-bold text-neutral-900 mt-1">
                    Auction Schedule
                </Text>
                <Text className="text-sm text-neutral-500 mt-1">
                    Set preferred auction day and time
                </Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                {/* Auction Day */}
                <Input
                    label="Preferred Auction Day *"
                    placeholder="5"
                    value={auctionDay}
                    onChangeText={setAuctionDay}
                    keyboardType="numeric"
                    hint="Day of month (1-31)"
                />

                {/* Auction Time */}
                <Input
                    label="Auction Time *"
                    placeholder="19:00"
                    value={auctionTime}
                    onChangeText={setAuctionTime}
                    hint="24-hour format (e.g., 19:00 for 7:00 PM)"
                />

                {/* Info Card */}
                <Card variant="glass" className="mb-4 bg-primary-50 border border-primary-200">
                    <Text className="text-sm font-semibold text-primary-700 mb-2">
                        📅 Auto-Generated Schedule
                    </Text>
                    <Text className="text-xs text-neutral-600">
                        {duration} auction dates have been generated. Tap any date to manually adjust
                        for holidays or special occasions.
                    </Text>
                </Card>

                {/* Generated Dates List */}
                {generatedDates.length > 0 && (
                    <View className="mb-24">
                        <Text className="text-lg font-bold text-neutral-900 mb-3">
                            Preview Schedule ({generatedDates.length} months)
                        </Text>
                        <FlatList
                            data={generatedDates}
                            renderItem={renderDateItem}
                            keyExtractor={item => item.monthNumber.toString()}
                            scrollEnabled={false}
                        />
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
                        variant="primary"
                        size="lg"
                        fullWidth
                        onPress={handleNext}
                        className="flex-1"
                        disabled={generatedDates.length === 0}
                    >
                        Next: Members →
                    </Button>
                </View>
            </View>

            {/* Edit Date Modal */}
            {editingMonth !== null && (
                <View className="absolute inset-0 bg-black/50 items-center justify-center">
                    <Card className="mx-6 w-80">
                        <Text className="text-lg font-bold text-neutral-900 mb-4">
                            Edit Month {editingMonth} Date
                        </Text>

                        <Input
                            label="New Day"
                            placeholder="5"
                            value={editDate}
                            onChangeText={setEditDate}
                            keyboardType="numeric"
                        />

                        <View className="flex-row space-x-3 mt-4">
                            <Button
                                variant="outline"
                                size="md"
                                fullWidth
                                onPress={() => setEditingMonth(null)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                size="md"
                                fullWidth
                                onPress={handleDateSave}
                                className="flex-1"
                            >
                                Save
                            </Button>
                        </View>
                    </Card>
                </View>
            )}
        </SafeAreaView>
    );
};
