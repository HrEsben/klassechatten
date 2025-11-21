import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borders } from '../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.title}>KLASSECHATTEN</Text>
          <View style={styles.accentBar} />
          <Text style={styles.subtitle}>
            SIKKER CHAT{'\n'}TIL SKOLEKLASSER
          </Text>
        </View>

        {/* CTA Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.primaryButtonText}>LOG IND</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.secondaryButtonText}>OPRET BRUGER</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.geometric}>
          <View style={[styles.geoSquare, { backgroundColor: colors.primary }]} />
          <View style={[styles.geoSquare, { backgroundColor: colors.secondary }]} />
          <View style={[styles.geoSquare, { backgroundColor: colors.accent }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base300,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: 48,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  accentBar: {
    height: 4,
    width: 96,
    backgroundColor: colors.primary,
    marginBottom: spacing.xl,
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.opacity[60],
    textAlign: 'center',
    lineHeight: 28,
  },
  actions: {
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.baseContent,
    borderWidth: borders.width.standard,
    borderColor: colors.baseContent,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.base100,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: borders.width.standard,
    borderColor: colors.baseContent,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  geometric: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  geoSquare: {
    width: 8,
    height: 8,
  },
});
