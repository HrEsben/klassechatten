import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

interface AppFeature {
  id: number;
  title: string;
  description: string;
  status: 'ready' | 'pending' | 'planned';
}

export default function FeaturesScreen() {
  const router = useRouter();
  const [features] = useState<AppFeature[]>([
    {
      id: 1,
      title: 'Real-time Chat',
      description: 'Send og modtag beskeder i realtid med AI-moderation',
      status: 'ready'
    },
    {
      id: 2,
      title: 'Class Rooms',
      description: 'Browse og deltag i klasseværelser',
      status: 'ready'
    },
    {
      id: 3,
      title: 'User Authentication',
      description: 'Sikker login med Supabase Auth',
      status: 'ready'
    },
    {
      id: 4,
      title: 'Push Notifications',
      description: 'Få besked om nye meddelelser',
      status: 'pending'
    },
    {
      id: 5,
      title: 'Image Sharing',
      description: 'Del billeder i chat',
      status: 'planned'
    }
  ]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return '#22c55e';
      case 'pending': return '#f59e0b';
      case 'planned': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready': return 'Klar';
      case 'pending': return 'Under udvikling';
      case 'planned': return 'Planlagt';
      default: return 'Ukendt';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Tilbage</Text>
          </TouchableOpacity>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.loadingText}>Indlæser funktioner...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Tilbage</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>KlasseChatten Features</Text>
      {user && (
        <Text style={styles.userInfo}>
          Logget ind som: {user.email}
        </Text>
      )}
      
      <FlatList
        data={features}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.featureItem}>
            <View style={styles.featureHeader}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
              </View>
            </View>
            <Text style={styles.featureDescription}>{item.description}</Text>
          </View>
        )}
        style={styles.list}
      />
    </View>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  featureItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
