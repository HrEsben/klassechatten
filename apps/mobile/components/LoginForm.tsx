import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borders, buttonSizes } from '../constants/theme';

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
          <Text style={styles.title}>{isSignUp ? 'Opret konto' : 'Log ind'}</Text>

        {isSignUp && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Navn</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Dit navn"
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="din@email.dk"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Mindst 6 tegn"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Vent...' : isSignUp ? 'Opret konto' : 'Log ind'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.secondaryButtonText}>
            {isSignUp ? 'Har du allerede en konto? Log ind' : 'Ingen konto? Opret en'}
          </Text>
        </TouchableOpacity>
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
    width: '100%',
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
  inputContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.widest,
    color: colors.opacity[50],
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
    borderRadius: borders.radius.none,
    paddingVertical: buttonSizes.md.paddingVertical,
    paddingHorizontal: buttonSizes.md.paddingHorizontal,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.baseContent,
    backgroundColor: colors.base100,
  },
  button: {
    height: buttonSizes.md.height,
    paddingVertical: buttonSizes.md.paddingVertical,
    paddingHorizontal: buttonSizes.md.paddingHorizontal,
    borderRadius: borders.radius.none,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    borderWidth: borders.width.standard,
  },
  primaryButton: {
    backgroundColor: colors.baseContent,
    borderColor: colors.baseContent,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: colors.opacity[10],
  },
  disabledButton: {
    backgroundColor: colors.opacity[30],
    borderColor: colors.opacity[30],
  },
  buttonText: {
    color: colors.base100,
    fontSize: buttonSizes.md.fontSize,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  secondaryButtonText: {
    color: colors.baseContent,
    fontSize: buttonSizes.md.fontSize,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
});
