import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { colors, spacing, typography, borders, shadows } from '../constants/theme';
import { LoadingSpinner, Input, Button } from '../components/shared';

type OnboardingStep = 'choice' | 'create' | 'join' | 'success' | 'add-child';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdClass, setCreatedClass] = useState<any>(null);

  // Create class form state
  const [schoolName, setSchoolName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('0');
  const [classLetter, setClassLetter] = useState('A');
  const [studentCount, setStudentCount] = useState('20');

  // Join class form state
  const [inviteCode, setInviteCode] = useState('');

  // Child account form state
  const [childUsername, setChildUsername] = useState('');
  const [childDisplayName, setChildDisplayName] = useState('');
  const [childPassword, setChildPassword] = useState('');

  const handleCreateClass = async () => {
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Du skal være logget ind for at oprette en klasse');
        setLoading(false);
        return;
      }

      // Validate inputs
      if (!schoolName.trim()) {
        setError('Indtast skolenavn');
        setLoading(false);
        return;
      }

      const grade = parseInt(gradeLevel);
      if (isNaN(grade) || grade < 0 || grade > 10) {
        setError('Klassetrin skal være mellem 0 og 10');
        setLoading(false);
        return;
      }

      if (!classLetter.trim()) {
        setError('Indtast klassesbogstav');
        setLoading(false);
        return;
      }

      const count = parseInt(studentCount);
      if (isNaN(count) || count < 1 || count > 50) {
        setError('Antal elever skal være mellem 1 og 50');
        setLoading(false);
        return;
      }

      // Call Supabase RPC function directly
      const { data, error } = await supabase.rpc('create_class_with_students', {
        p_school_name: schoolName.trim(),
        p_grade_level: grade,
        p_class_letter: classLetter.trim().toUpperCase(),
        p_nickname: null,
        p_student_count: count,
        p_creator_id: user?.id || session.user.id,
      });

      if (error) {
        throw new Error(error.message || 'Kunne ikke oprette klasse');
      }

      setCreatedClass(data);
      // Auto-suggest child username based on class
      if (classLetter && schoolName) {
        const suggestion = `barn_${classLetter.toLowerCase()}`;
        setChildUsername(suggestion);
      }
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Du skal være logget ind for at tilmelde dig en klasse');
        setLoading(false);
        return;
      }

      // Validate input
      if (!inviteCode.trim() || inviteCode.trim().length !== 8) {
        setError('Indtast en gyldig 8-cifret invitationskode');
        setLoading(false);
        return;
      }

      const normalizedCode = inviteCode.trim().toUpperCase();

      // Find class by invite code
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, label, nickname, school_id, schools(name)')
        .eq('invite_code', normalizedCode)
        .single();

      if (classError || !classData) {
        setError('Ugyldig invitationskode');
        setLoading(false);
        return;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classData.id)
        .eq('user_id', session.user.id)
        .single();

      if (existingMember) {
        setError('Du er allerede medlem af denne klasse');
        setLoading(false);
        return;
      }

      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        setError('Profil ikke fundet');
        setLoading(false);
        return;
      }

      // Add user to class with appropriate role
      const { error: memberError } = await supabase
        .from('class_members')
        .insert({
          class_id: classData.id,
          user_id: session.user.id,
          role_in_class: profile.role,
        });

      if (memberError) {
        throw new Error('Kunne ikke tilmelde klasse');
      }

      // Success - reload to show new class
      router.replace('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (createdClass?.invite_code) {
      Clipboard.setString(createdClass.invite_code);
      Alert.alert('Kopieret!', 'Invitationskoden er kopieret');
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>IKKE LOGGET IND</Text>
          <Text style={styles.errorText}>
            Du skal være logget ind for at fortsætte
          </Text>
          <Button
            label="GÅ TIL LOGIN"
            onPress={() => router.replace('/login')}
            variant="primary"
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 'choice' && 'VELKOMMEN'}
              {step === 'create' && 'OPRET KLASSE'}
              {step === 'join' && 'BRUG KODE'}
              {step === 'success' && 'SUCCES!'}
            </Text>
            <View style={styles.accentBar} />
            {step === 'choice' && (
              <Text style={styles.subtitle}>
                Vælg hvordan du vil komme i gang
              </Text>
            )}
          </View>

          {/* Choice Step */}
          {step === 'choice' && (
            <View style={styles.cardsContainer}>
              {/* Join with Code Card */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setStep('join')}
              >
                <View style={styles.actionCardAccent} />
                <View style={styles.actionCardContent}>
                  <View style={styles.actionCardIcon}>
                    <Text style={styles.actionCardIconText}>#</Text>
                  </View>
                  <Text style={styles.actionCardTitle}>BRUG KODE</Text>
                  <Text style={styles.actionCardDescription}>
                    Deltag i en eksisterende klassechat med en invitationskode
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Create Class Card */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setStep('create')}
              >
                <View style={styles.actionCardAccent} />
                <View style={styles.actionCardContent}>
                  <View style={styles.actionCardIcon}>
                    <Text style={styles.actionCardIconText}>+</Text>
                  </View>
                  <Text style={styles.actionCardTitle}>OPRET KLASSECHAT</Text>
                  <Text style={styles.actionCardDescription}>
                    Tilmeld en klasse til KlasseChatten
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Create Class Form */}
          {step === 'create' && (
            <View style={styles.formCard}>
              <TouchableOpacity
                onPress={() => setStep('choice')}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← TILBAGE</Text>
              </TouchableOpacity>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{error}</Text>
                </View>
              )}

              <View style={styles.formContent}>
                <View style={styles.inlineRow}>
                  <View style={styles.inlineInput}>
                    <Input
                      label="Klassetrin"
                      value={gradeLevel}
                      onChangeText={setGradeLevel}
                      placeholder="0-10"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <View style={styles.inlineInput}>
                    <Input
                      label="Bogstav"
                      value={classLetter}
                      onChangeText={(text) => setClassLetter(text.toUpperCase())}
                      placeholder="A, X..."
                      maxLength={20}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <Input
                  label="Skole"
                  value={schoolName}
                  onChangeText={setSchoolName}
                  placeholder="F.eks. Vadgård Skole"
                  autoCapitalize="words"
                />

                <Input
                  label="Antal Elever"
                  value={studentCount}
                  onChangeText={setStudentCount}
                  placeholder="20"
                  keyboardType="number-pad"
                  maxLength={2}
                />

                {/* Live Preview */}
                {(gradeLevel || classLetter || schoolName) && (
                  <View style={styles.preview}>
                    <Text style={styles.previewTitle}>
                      {gradeLevel}.{classLetter || '?'} på {schoolName || 'Skolen'}
                    </Text>
                    {studentCount && (
                      <Text style={styles.previewSubtitle}>
                        {studentCount} elever
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.buttonRow}>
                  <Button
                    label="ANNULLER"
                    onPress={() => setStep('choice')}
                    variant="ghost"
                    size="md"
                    disabled={loading}
                  />
                  <Button
                    label="OPRET"
                    onPress={handleCreateClass}
                    variant="primary"
                    size="md"
                    loading={loading}
                    disabled={loading}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Join Class Form */}
          {step === 'join' && (
            <View style={styles.formCard}>
              <TouchableOpacity
                onPress={() => setStep('choice')}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← TILBAGE</Text>
              </TouchableOpacity>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{error}</Text>
                </View>
              )}

              <View style={styles.formContent}>
                <Input
                  label="Invitationskode"
                  value={inviteCode}
                  onChangeText={(text) => setInviteCode(text.toUpperCase())}
                  placeholder="ABC123XY"
                  autoCapitalize="characters"
                  maxLength={8}
                />

                <Text style={styles.helperText}>
                  Indtast den 8-cifrede kode du har modtaget
                </Text>

                <View style={styles.buttonRow}>
                  <Button
                    label="ANNULLER"
                    onPress={() => setStep('choice')}
                    variant="ghost"
                    size="md"
                    disabled={loading}
                  />
                  <Button
                    label="TILMELD"
                    onPress={handleJoinClass}
                    variant="primary"
                    size="md"
                    loading={loading}
                    disabled={loading || inviteCode.length !== 8}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Success Step */}
          {step === 'success' && createdClass && (
            <View style={styles.successCard}>
              <View style={styles.successHeader}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successTitle}>KLASSE OPRETTET!</Text>
              </View>

              <View style={styles.inviteCodeBox}>
                <Text style={styles.inviteCodeLabel}>INVITATIONSKODE</Text>
                <Text style={styles.inviteCode}>{createdClass.invite_code}</Text>
                <Button
                  label="KOPIER KODE"
                  onPress={handleCopyInviteCode}
                  variant="ghost"
                  size="sm"
                />
              </View>

              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>NÆSTE SKRIDT</Text>
                <Text style={styles.instructionsText}>
                  1. Del invitationskoden med de andre forældre{'\n'}
                  2. Hver forælder tilmelder sig med koden{'\n'}
                  3. Opret børnekonti i dashboardet{'\n'}
                  4. Børnene kan logge ind og chatte
                </Text>
              </View>

              <Button
                label="GÅ TIL DASHBOARD"
                onPress={() => router.replace('/')}
                variant="primary"
                size="lg"
                fullWidth
              />
            </View>
          )}
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
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
  subtitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.opacity[60],
    marginTop: spacing.lg,
  },
  cardsContainer: {
    gap: spacing.lg,
  },
  actionCard: {
    backgroundColor: colors.base100,
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  actionCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4,
    height: '100%',
    backgroundColor: colors.primaryOpacity[30],
  },
  actionCardContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    paddingLeft: spacing.xl + spacing.md,
  },
  actionCardIcon: {
    width: 64,
    height: 64,
    backgroundColor: colors.primaryOpacity[20],
    borderWidth: borders.width.standard,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionCardIconText: {
    fontSize: 32,
    fontWeight: typography.weights.black,
    color: colors.primary,
  },
  actionCardTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
    marginBottom: spacing.xs,
  },
  actionCardDescription: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.opacity[50],
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: colors.base100,
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
    ...shadows.card,
  },
  backButton: {
    padding: spacing.lg,
    borderBottomWidth: borders.width.standard,
    borderBottomColor: borders.color.default,
  },
  backButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.baseContent,
  },
  formContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inlineInput: {
    flex: 1,
  },
  preview: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  previewTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
    textAlign: 'center',
  },
  previewSubtitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.opacity[50],
    marginTop: spacing.sm,
  },
  helperText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.opacity[50],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  errorBox: {
    backgroundColor: 'rgba(232, 107, 107, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    margin: spacing.lg,
  },
  errorBoxText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.error,
  },
  successCard: {
    backgroundColor: colors.base100,
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
    padding: spacing.xl,
    gap: spacing.xl,
    ...shadows.card,
  },
  successHeader: {
    alignItems: 'center',
    gap: spacing.md,
  },
  successIcon: {
    fontSize: 64,
    color: colors.accent,
  },
  successTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
  },
  inviteCodeBox: {
    backgroundColor: colors.primaryOpacity[20],
    borderWidth: borders.width.standard,
    borderColor: colors.primary,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  inviteCodeLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.widest,
    color: colors.opacity[50],
  },
  inviteCode: {
    fontSize: 40,
    fontWeight: typography.weights.black,
    letterSpacing: 4,
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  instructionsBox: {
    backgroundColor: colors.opacity[10],
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
    padding: spacing.lg,
    gap: spacing.md,
  },
  instructionsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.baseContent,
  },
  instructionsText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.opacity[60],
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
  },
  errorText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.opacity[60],
    textAlign: 'center',
  },
});
