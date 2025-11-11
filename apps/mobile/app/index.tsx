import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

// Imports for the real app
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
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
    <View style={styles.container}>
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
      
      <View style={styles.content}>
        <ClassRoomBrowser />
      </View>
      
      <StatusBar style="auto" />
    </View>
  );
}

export default function Index() {
  console.log('Index component rendering...');
  
  if (DEBUG_MODE) {
    return <DebugScreen />;
  }

  // Original protected route (enabled for real app)
  return (
    <ProtectedRoute>
      <HomeScreen />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 44,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
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
  // Original styles (kept for reference)
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 4,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 16,
  },
});
