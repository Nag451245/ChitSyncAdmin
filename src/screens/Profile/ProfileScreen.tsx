import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Alert,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '../../components/ui';
import { database } from '../../services';
// Note: In a real app, import seedData properly or move it to a service method
import { seedData } from '../../services/seedData';

export const ProfileScreen = () => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    const handleResetDatabase = () => {
        Alert.alert(
            'Reset Database',
            'Are you sure you want to wipe all data and reset to seed data? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await seedData();
                            Alert.alert('Success', 'Database has been reset.');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to reset database.');
                        }
                    },
                },
            ]
        );
    };

    const handleExportData = () => {
        Alert.alert('Export Data', 'Data export functionality coming soon (PDF/CSV generation).');
    };

    const SettingItem = ({ icon, title, subtitle, onPress, toggle, value }: any) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!!toggle}
            className="flex-row items-center py-4 border-b border-neutral-100"
        >
            <View className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center mr-3">
                <Text className="text-xl">{icon}</Text>
            </View>
            <View className="flex-1">
                <Text className="text-base font-semibold text-neutral-800">{title}</Text>
                {subtitle && <Text className="text-xs text-neutral-500">{subtitle}</Text>}
            </View>
            {toggle ? (
                <Switch
                    value={value}
                    onValueChange={toggle}
                    trackColor={{ false: '#d4d4d4', true: '#0ea5e9' }}
                />
            ) : (
                <Text className="text-neutral-400">→</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-6 bg-white border-b border-neutral-200 items-center">
                <View className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center mb-3 border-2 border-primary-200">
                    <Text className="text-3xl">👨‍💼</Text>
                </View>
                <Text className="text-xl font-bold text-neutral-900">Nagendra B P</Text>
                <Text className="text-sm text-neutral-500">Foreman • Admin</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">

                {/* General Settings */}
                <Text className="text-sm font-bold text-neutral-500 mb-2 uppercase">Preferences</Text>
                <Card className="mb-6 py-0">
                    <SettingItem
                        icon="🔔"
                        title="Notifications"
                        subtitle="Manage alerts and reminders"
                        toggle={setNotificationsEnabled}
                        value={notificationsEnabled}
                    />
                    <SettingItem
                        icon="🔒"
                        title="Biometric Login"
                        subtitle="Use FaceID/TouchID"
                        toggle={setBiometricEnabled}
                        value={biometricEnabled}
                    />
                </Card>

                {/* Data Management */}
                <Text className="text-sm font-bold text-neutral-500 mb-2 uppercase">Data Management</Text>
                <Card className="mb-6 py-0">
                    <SettingItem
                        icon="☁️"
                        title="Cloud Backup"
                        subtitle="Last backup: Today, 9:00 AM"
                        onPress={() => Alert.alert('Backup', 'Backup initiated...')}
                    />
                    <SettingItem
                        icon="📤"
                        title="Export Data"
                        subtitle="Download CSV/PDF reports"
                        onPress={handleExportData}
                    />
                    <SettingItem
                        icon="🗑️"
                        title="Reset Database"
                        subtitle="Clear all data and reset"
                        onPress={handleResetDatabase}
                    />
                </Card>

                {/* App Info */}
                <Text className="text-center text-xs text-neutral-400 mb-8">
                    ChitSync Admin v1.0.0
                    {'\n'}Built with React Native & Expo
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
};
