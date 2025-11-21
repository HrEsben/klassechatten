import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

// Imports for the real app
import { useAuth } from '../contexts/AuthContext';
import ClassRoomBrowser from '../components/ClassRoomBrowser';

// Debug mode - simple screen without auth
const DEBUG_MODE = false;

function DebugScreen() {
  console.log('DebugScreen rendering...');
  const router = useRouter();
  
  const goToLogin = () => {
    console.log('Navigating to login...');
    router.push('/login');
  };
  
  const goToTodos = () => {
    console.log('Navigating to todos...');
    router.push('/todos');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>KlasseChatten Debug</Text>
      <Text style={styles.subtitle}>App is running successfully!</Text>
      
      <TouchableOpacity style={styles.button} onPress={goToLogin}>
        <Text style={styles.buttonText}>Go to Login</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={goToTodos}>
        <Text style={styles.buttonText}>Go to Todos</Text>
      </TouchableOpacity>
      
      <StatusBar style="auto" />
    </View>
  );
}

// Original home screen (enabled for real app)
function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>KlasseChatten</Text>
          <Text style={styles.username}>
            {user?.user_metadata?.display_name || user?.email}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log ud</Text>
        </TouchableOpacity>
      </View>
      
      <ClassRoomBrowser />
      
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not authenticated - go to welcome
        router.replace('/welcome');
      }
      // If authenticated, stay on this page (shows HomeScreen)
    }
  }, [user, loading, router]);

  if (DEBUG_MODE) {
    return <DebugScreen />;
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff3fa4" />
        <Text style={styles.loadingText}>Indlæser...</Text>
      </View>
    );
  }

  // Show nothing while redirecting
  if (!user) {
    return null;
  }

  // Authenticated - show home screen
  return <HomeScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: 200,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(26, 26, 26, 0.1)',
    backgroundColor: '#f8f8f8',
  },
  username: {
    fontSize: 12,
    color: 'rgba(26, 26, 26, 0.6)',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  logoutButton: {
    backgroundColor: '#e86b6b',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: '#f8f8f8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
});
