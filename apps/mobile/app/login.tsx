import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/LoginForm';

export default function LoginScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, redirect to home
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Don't render login form if already authenticated
  if (user) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <LoginForm />
    </View>
  );
}
