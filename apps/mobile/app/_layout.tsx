import { Slot, Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { View, Text } from 'react-native';
import { Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { initializePushNotifications } from '../utils/pushNotifications';

// Temporarily disable auth to debug
const DEBUG_MODE = false;

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('Error caught by boundary:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Noget gik galt
          </Text>
          <Text style={{ textAlign: 'center', color: '#666', marginBottom: 10 }}>
            {this.state.error?.message || 'Ukendt fejl'}
          </Text>
          <Text style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
            Prøv at genstarte appen. Hvis problemet fortsætter, kontakt support.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function PushNotificationInitializer() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user?.id) {
      console.log('Initializing push notifications for user:', user.id);
      initializePushNotifications(user.id).catch(error => {
        console.error('Failed to initialize push notifications:', error);
      });
    }
  }, [user?.id]);
  
  return null;
}

export default function RootLayout() {
  console.log('RootLayout rendering...', { DEBUG_MODE });
  
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <PushNotificationInitializer />
          <Slot />
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
