import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';

// Screen Imports
import { DashboardScreen } from '../screens/DashboardScreen';
import { AuctionScreen } from '../screens/AuctionScreen';
import { GroupCreationWizard } from '../screens/GroupCreation/GroupCreationWizard';

// New Tab Screens
import { GroupsListScreen } from '../screens/Groups/GroupsListScreen';
import { CollectionsDashboardScreen } from '../screens/Collections/CollectionsDashboardScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';

// Feature Screens
import { CollectionLedgerScreen } from '../screens/Collections/CollectionLedgerScreen';
import { AddMemberScreen } from '../screens/MemberLifecycle/AddMemberScreen';
import { ReplaceMemberScreen } from '../screens/MemberLifecycle/ReplaceMemberScreen';
import { RemoveMemberScreen } from '../screens/MemberLifecycle/RemoveMemberScreen';
import { GroupClosureScreen } from '../screens/GroupClosureScreen';

export type RootStackParamList = {
    Main: undefined;
    GroupCreation: undefined;
    AuctionRoom: {
        groupId: string;
        groupName: string;
        potValue: number;
        commissionPercentage: number;
        totalMembers: number;
        baseInstallment: number;
        monthNumber: number;
    };
    CollectionLedger: {
        groupId: string;
        groupName: string;
        monthNumber: number;
    };
    AddMember: {
        groupId: string;
        groupName: string;
        currentMonth: number;
        netPayableHistory: number[];
    };
    ReplaceMember: {
        groupId: string;
        groupName: string;
        currentMonth: number;
        netPayableHistory: number[];
    };
    RemoveMember: {
        groupId: string;
        groupName: string;
        potValue: number;
    };
    GroupClosure: {
        groupId: string;
        groupName?: string;
    };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Bottom Tab Navigator
 */
const TabNavigatorComponent = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarActiveTintColor: '#0ea5e9',
                tabBarInactiveTintColor: '#a3a3a3',
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopWidth: 1,
                    borderTopColor: '#e5e5e5',
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>📊</Text>
                    ),
                }}
            />
            <Tab.Screen
                name="Groups"
                component={GroupsListScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>👥</Text>
                    ),
                }}
            />
            <Tab.Screen
                name="Collections"
                component={CollectionsDashboardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>💰</Text>
                    ),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>⚙️</Text>
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

// Wrapper for GroupCreation to handle props if needed
const GroupCreationWizardScreen = ({ navigation }: any) => {
    return <GroupCreationWizard navigation={navigation} />;
};

/**
 * Root Navigator with Stack
 */
export const TabNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    presentation: 'card',
                }}
            >
                {/* Main Tabs */}
                <Stack.Screen name="Main" component={TabNavigatorComponent} />

                {/* Modals / Wizards */}
                <Stack.Screen
                    name="GroupCreation"
                    component={GroupCreationWizardScreen}
                    options={{ presentation: 'modal', gestureEnabled: true }}
                />
                <Stack.Screen
                    name="AuctionRoom"
                    component={AuctionScreen}
                    options={{ presentation: 'card' }} // Changed to card for full screen feel
                />

                {/* Feature Screens */}
                <Stack.Screen name="CollectionLedger" component={CollectionLedgerScreen} />
                <Stack.Screen name="AddMember" component={AddMemberScreen} />
                <Stack.Screen name="ReplaceMember" component={ReplaceMemberScreen} />
                <Stack.Screen name="RemoveMember" component={RemoveMemberScreen} />
                <Stack.Screen name="GroupClosure" component={GroupClosureScreen} />

            </Stack.Navigator>
        </NavigationContainer>
    );
};
