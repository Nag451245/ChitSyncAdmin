import './global.css';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { TabNavigator } from './src/navigation/TabNavigator';
import { database } from './src/services';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await database.init();
      console.log('✅ Database initialized successfully');

      // Seed data on first launch
      const { seedData } = await import('./src/services/seedData');
      await seedData();

      setIsReady(true);
    } catch (err) {
      console.error('❌ App initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 px-6">
        <Text className="text-2xl font-bold text-loss-600 mb-2">⚠️ Error</Text>
        <Text className="text-base text-neutral-700 text-center">{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="text-base text-neutral-600 mt-4">Initializing...</Text>
      </View>
    );
  }

  return <TabNavigator />;
}
