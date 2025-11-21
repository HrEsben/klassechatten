import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  
  // Individual field errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    let isValid = true;
    
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setDisplayNameError('');
    setGeneralError('');

    if (isSignUp && !displayName.trim()) {
      setDisplayNameError('Navn er påkrævet');
      isValid = false;
    }

    if (!email.trim()) {
      setEmailError('Email eller brugernavn er påkrævet');
      isValid = false;
    } else if (isSignUp && !email.includes('@')) {
      setEmailError('Indtast en gyldig email');
      isValid = false;
    } else if (!isSignUp && email.includes('@') && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      // In login mode, if it looks like an email (has @), validate it's properly formatted
      setEmailError('Indtast en gyldig email');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Adgangskode er påkrævet');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Mindst 6 tegn påkrævet');
      isValid = false;
    }

    return isValid;
  };

  const translateAuthError = (errorMessage: string): string => {
    // Translate common Supabase auth errors to Danish
    const translations: Record<string, string> = {
      'Invalid login credentials': 'Ugyldigt login',
      'Email not confirmed': 'Email ikke bekræftet',
      'User already registered': 'Bruger allerede registreret',
      'Password should be at least 6 characters': 'Adgangskode skal være mindst 6 tegn',
      'Unable to validate email address': 'Kunne ikke validere email-adresse',
      'Signup requires a valid password': 'Tilmelding kræver en gyldig adgangskode',
    };

    return translations[errorMessage] || errorMessage;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setGeneralError('');

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, { display_name: displayName });
        if (error) {
          setGeneralError(translateAuthError(error.message) || 'Kunne ikke oprette konto. Prøv igen.');
        } else {
          router.replace('/');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setGeneralError(translateAuthError(error.message) || 'Ugyldigt brugernavn eller adgangskode');
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
          {/* Card container with border */}
          <View style={styles.card}>
            {/* Header section with border and accent */}
            <View style={styles.header}>
              <View style={styles.backButtonContainer}>
                <Button
                  label="← TILBAGE"
                  onPress={() => router.push('/welcome')}
                  variant="ghost"
                  size="sm"
                />
              </View>
              <Text style={styles.title}>
                {isSignUp ? 'OPRET KONTO' : 'LOG IND'}
              </Text>
              <View style={styles.accentBar} />
            </View>

            {/* Form content */}
            <View style={styles.formContent}>
              {/* General error message */}
              {generalError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{generalError}</Text>
                </View>
              )}

              {isSignUp && (
                <Input
                  label="Visningsnavn"
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    if (displayNameError) setDisplayNameError('');
                  }}
                  placeholder="Indtast dit navn"
                  autoCapitalize="words"
                  error={displayNameError}
                />
              )}

              <Input
                label={isSignUp ? 'Email Adresse' : 'Email eller Brugernavn'}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
                placeholder={isSignUp ? 'din@email.dk' : 'email eller brugernavn'}
                keyboardType={isSignUp ? 'email-address' : 'default'}
                autoCapitalize="none"
                autoComplete="email"
                error={emailError}
              />

              <Input
                label="Adgangskode"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Indtast adgangskode"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                error={passwordError}
              />

              <Button
                label={loading ? '' : (isSignUp ? 'OPRET KONTO' : 'FÅ ADGANG')}
                onPress={handleSubmit}
                disabled={loading}
                loading={loading}
                fullWidth
                variant="primary"
                size="lg"
              />

              {/* Divider with "ELLER" text */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ELLER</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                label={isSignUp ? 'LOG IND I STEDET' : 'OPRET NY KONTO'}
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  // Clear all errors when switching modes
                  setEmailError('');
                  setPasswordError('');
                  setDisplayNameError('');
                  setGeneralError('');
                }}
                variant="outline"
                size="md"
                fullWidth
              />

              {/* Student signup hint */}
              {!isSignUp && (
                <View style={styles.hintContainer}>
                  <Text style={styles.hintText}>
                    ER DU BARN? BED DIN FORÆLDER OPRETTE EN KONTO TIL DIG
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base300,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  card: {
    backgroundColor: colors.base100,
    borderWidth: 2,
    borderColor: colors.opacity[10],
    borderRadius: 0, // Sharp corners
    overflow: 'hidden',
    // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryOpacity[20],
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.base100,
  },
  backButtonContainer: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
  },
  accentBar: {
    height: 4,
    width: 64,
    backgroundColor: colors.primary,
    marginTop: spacing.md,
  },
  formContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  helperText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.widest,
    color: colors.opacity[50],
    marginTop: spacing.xs,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.opacity[10],
  },
  dividerText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.widest,
    color: colors.opacity[40],
  },
  hintContainer: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  hintText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.opacity[50],
    textAlign: 'center',
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(232, 107, 107, 0.1)', // 10% error color opacity
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBoxText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.error,
  },
});
