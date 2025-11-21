import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../constants/theme';
import { Button, Input } from './shared';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email || !password || (isSignUp && !displayName)) {
      Alert.alert('Fejl', 'Udfyld venligst alle felter');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, { display_name: displayName });
        if (error) {
          Alert.alert('Fejl', error.message);
        } else {
          router.replace('/');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          Alert.alert('Fejl', error.message);
        } else {
          router.replace('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>{isSignUp ? 'OPRET KONTO' : 'LOG IND'}</Text>

          {isSignUp && (
            <Input
              label="Navn"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Dit navn"
              autoCapitalize="words"
            />
          )}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="din@email.dk"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Mindst 6 tegn"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />

          <Button
            label={loading ? 'VENT VENLIGST...' : (isSignUp ? 'OPRET KONTO' : 'LOG IND')}
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
            fullWidth
            variant="primary"
            size="lg"
          />

          <Button
            label={isSignUp ? 'HAR ALLEREDE KONTO? LOG IND' : 'INGEN KONTO? OPRET EN'}
            onPress={() => setIsSignUp(!isSignUp)}
            variant="ghost"
            size="md"
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base100,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
    marginBottom: spacing.xxxl,
    textAlign: 'center',
  },
});
