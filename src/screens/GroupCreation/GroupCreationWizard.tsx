import React, { useState } from 'react';
import { View, ActivityIndicator, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    FinancialsStep,
    FinancialsData,
} from './FinancialsStep';
import {
    ScheduleStep,
    ScheduleData,
} from './ScheduleStep';
import {
    MembersStep,
    MembersData,
} from './MembersStep';
import { groupService, memberService } from '../../services';
import type { Member } from '../../types/database';

type RootStackParamList = {
    Main: undefined;
    GroupCreation: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GroupCreationWizardProps {
    navigation: NavigationProp;
}

export interface GroupData {
    financials: FinancialsData;
    schedule: ScheduleData;
    members: MembersData;
}

/**
 * Group Creation Wizard Container
 * Manages state and navigation between 3 steps
 * Saves data to database on completion
 */
export const GroupCreationWizard: React.FC<GroupCreationWizardProps> = ({
    navigation,
}) => {
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [financialsData, setFinancialsData] = useState<FinancialsData | undefined>();
    const [scheduleData, setScheduleData] = useState<ScheduleData | undefined>();
    const [saving, setSaving] = useState(false);

    const handleFinancialsNext = (data: FinancialsData) => {
        setFinancialsData(data);
        setCurrentStep(2);
    };

    const handleScheduleNext = (data: ScheduleData) => {
        setScheduleData(data);
        setCurrentStep(3);
    };

    const handleScheduleBack = () => {
        setCurrentStep(1);
    };

    const handleMembersBack = () => {
        setCurrentStep(2);
    };

    const handleMembersComplete = async (data: MembersData) => {
        if (!financialsData || !scheduleData) {
            Alert.alert('Error', 'Missing group data');
            return;
        }

        setSaving(true);

        try {
            const potValue = parseInt(financialsData.potValue.replace(/,/g, ''));
            const duration = parseInt(financialsData.duration);
            const baseInstallment = Math.round(potValue / duration);

            // Prepare group data
            const groupData = {
                name: financialsData.groupName,
                pot_value: potValue,
                duration,
                commission_percentage: parseFloat(financialsData.commissionPercentage),
                base_installment: baseInstallment,
                total_members: duration,
                auction_day: scheduleData.auctionDay,
                auction_time: scheduleData.auctionTime,
            };

            // Prepare members with ticket numbers
            const membersWithTickets: Array<{ member: Member; ticketNumber: number }> = [];

            for (const selectedMember of data.members) {
                // Check if member exists or create new
                let member = await memberService.getMemberByPhone(selectedMember.phone);

                if (!member) {
                    const memberId = await memberService.createMember({
                        name: selectedMember.name,
                        phone: selectedMember.phone,
                        source: selectedMember.source || 'database',
                    });
                    member = await memberService.getMember(memberId);
                }

                if (member) {
                    membersWithTickets.push({
                        member,
                        ticketNumber: selectedMember.ticketNumber,
                    });
                }
            }

            // Prepare auction dates
            const auctionDates = scheduleData.generatedDates.map((dateItem, index) => ({
                monthNumber: index + 1,
                date: dateItem.date.toISOString(),
                isModified: dateItem.isModified,
            }));

            // Save to database
            await groupService.createGroup(groupData, membersWithTickets, auctionDates);

            Alert.alert(
                'Success',
                `Group "${groupData.name}" created successfully!`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        } catch (error) {
            console.error('Failed to create group:', error);
            Alert.alert('Error', 'Failed to create group. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const totalMembers = financialsData ? parseInt(financialsData.duration) : 20;

    if (saving) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0ea5e9" />
                    <Text className="text-neutral-700 mt-4 text-lg font-semibold">
                        Creating Group...
                    </Text>
                    <Text className="text-neutral-500 mt-2">Please wait</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1">
            {currentStep === 1 && (
                <FinancialsStep
                    onNext={handleFinancialsNext}
                    initialData={financialsData}
                />
            )}

            {currentStep === 2 && financialsData && (
                <ScheduleStep
                    onNext={handleScheduleNext}
                    onBack={handleScheduleBack}
                    initialData={scheduleData}
                    duration={parseInt(financialsData.duration)}
                />
            )}

            {currentStep === 3 && (
                <MembersStep
                    onComplete={handleMembersComplete}
                    onBack={handleMembersBack}
                    initialData={undefined}
                    totalMembers={totalMembers}
                />
            )}
        </View>
    );
};

