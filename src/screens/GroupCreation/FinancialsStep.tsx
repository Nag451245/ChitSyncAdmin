import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CurrencyInput, Input, Button } from '../../components/ui';
import {
    calculateBaseInstallment,
    formatCurrency,
} from '../../utils/calculations';

interface FinancialsStepProps {
    onNext: (data: FinancialsData) => void;
    initialData?: FinancialsData;
}

export interface FinancialsData {
    groupName: string;
    potValue: string;
    duration: string;
    commissionPercentage: string;
    cloneExisting: boolean;
}

/**
 * UI Screen 2: Group Creation - Step 1 (Financials)
 * 
 * Inputs:
 * - Group Name
 * - Pot Value (numeric)
 * - Duration (months)
 * - Commission % (default 5%)
 * - Clone existing group toggle
 * 
 * Auto-calculates:
 * - Base Installment
 * - Total Members Required
 */
export const FinancialsStep: React.FC<FinancialsStepProps> = ({
    onNext,
    initialData,
}) => {
    const [groupName, setGroupName] = useState(initialData?.groupName || '');
    const [potValue, setPotValue] = useState(initialData?.potValue || '');
    const [duration, setDuration] = useState(initialData?.duration || '20');
    const [commissionPercentage, setCommissionPercentage] = useState(
        initialData?.commissionPercentage || '5'
    );
    const [cloneExisting, setCloneExisting] = useState(
        initialData?.cloneExisting || false
    );

    // Validation
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Calculate derived values
    const potValueNum = parseInt(potValue.replace(/,/g, '')) || 0;
    const durationNum = parseInt(duration) || 0;
    const baseInstallment = calculateBaseInstallment(potValueNum, durationNum);
    const totalMembers = durationNum; // Total members = duration in months

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!groupName.trim()) {
            newErrors.groupName = 'Group name is required';
        }

        if (!potValue || potValueNum === 0) {
            newErrors.potValue = 'Pot value must be greater than 0';
        }

        if (!duration || durationNum === 0) {
            newErrors.duration = 'Duration must be greater than 0';
        }

        if (durationNum < 12 || durationNum > 60) {
            newErrors.duration = 'Duration should be between 12 and 60 months';
        }

        const commissionNum = parseFloat(commissionPercentage) || 0;
        if (commissionNum < 0 || commissionNum > 20) {
            newErrors.commissionPercentage = 'Commission should be between 0% and 20%';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            onNext({
                groupName,
                potValue,
                duration,
                commissionPercentage,
                cloneExisting,
            });
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-neutral-200">
                <Text className="text-sm text-primary-600 font-semibold">STEP 1 OF 3</Text>
                <Text className="text-2xl font-bold text-neutral-900 mt-1">
                    Financial Details
                </Text>
                <Text className="text-sm text-neutral-500 mt-1">
                    Set up pot value, duration, and commission
                </Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                {/* Clone Toggle */}
                <Card className="mb-6">
                    <View className="flex-row justify-between items-center">
                        <View className="flex-1 mr-4">
                            <Text className="text-base font-bold text-neutral-900 mb-1">
                                Clone Existing Group?
                            </Text>
                            <Text className="text-sm text-neutral-500">
                                Pre-fill data from a closed group
                            </Text>
                        </View>
                        <Switch
                            value={cloneExisting}
                            onValueChange={setCloneExisting}
                            trackColor={{ false: '#e5e5e5', true: '#0ea5e9' }}
                            thumbColor={cloneExisting ? '#ffffff' : '#f5f5f5'}
                        />
                    </View>
                </Card>

                {/* Group Name */}
                <Input
                    label="Group Name *"
                    placeholder="e.g., Premium Group A"
                    value={groupName}
                    onChangeText={setGroupName}
                    error={errors.groupName}
                    hint="Choose a unique name for this group"
                />

                {/* Pot Value */}
                <CurrencyInput
                    label="Pot Value *"
                    value={potValue}
                    onChangeText={setPotValue}
                    error={errors.potValue}
                    hint="Total amount to be distributed"
                />

                {/* Duration */}
                <Input
                    label="Duration (Months) *"
                    placeholder="20"
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                    error={errors.duration}
                    hint="Number of months (12-60)"
                />

                {/* Commission Percentage */}
                <Input
                    label="Commission Percentage"
                    placeholder="5"
                    value={commissionPercentage}
                    onChangeText={setCommissionPercentage}
                    keyboardType="decimal-pad"
                    error={errors.commissionPercentage}
                    hint="Foreman commission (0-20%)"
                    rightIcon={<Text className="text-neutral-500 font-semibold">%</Text>}
                />

                {/* Live Calculations */}
                {potValueNum > 0 && durationNum > 0 && (
                    <Card variant="glass" className="mb-6 bg-primary-50 border border-primary-200">
                        <Text className="text-sm font-semibold text-primary-700 mb-3">
                            ✨ Auto-Calculated Values
                        </Text>

                        <View className="space-y-3">
                            <View className="flex-row justify-between items-center">
                                <Text className="text-neutral-600">Base Installment</Text>
                                <Text className="text-lg font-bold text-primary-700">
                                    {formatCurrency(baseInstallment)}
                                </Text>
                            </View>

                            <View className="h-px bg-primary-200" />

                            <View className="flex-row justify-between items-center">
                                <Text className="text-neutral-600">Total Members Required</Text>
                                <Text className="text-lg font-bold text-primary-700">
                                    {totalMembers}
                                </Text>
                            </View>

                            <View className="h-px bg-primary-200" />

                            <View className="flex-row justify-between items-center">
                                <Text className="text-neutral-600">Total Pot Rotated</Text>
                                <Text className="text-lg font-bold text-primary-700">
                                    {formatCurrency(potValueNum)}
                                </Text>
                            </View>
                        </View>
                    </Card>
                )}

                <View className="h-24" />
            </ScrollView>

            {/* Bottom Action Bar */}
            <View className="px-6 py-4 bg-white border-t border-neutral-200">
                <Button variant="primary" size="lg" fullWidth onPress={handleNext}>
                    Next: Schedule →
                </Button>
            </View>
        </SafeAreaView>
    );
};
