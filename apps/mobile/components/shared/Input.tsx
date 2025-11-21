import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors, spacing, typography, borders } from '../../constants/theme';

type InputVariant = 'default' | 'error' | 'success';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: InputVariant;
  containerStyle?: ViewStyle;
}

export default function Input({
  label,
  error,
  helperText,
  variant = 'default',
  containerStyle,
  ...textInputProps
}: InputProps) {
  const getBorderColor = () => {
    if (error || variant === 'error') return colors.error;
    if (variant === 'success') return colors.accent;
    return borders.color.default;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          {
            borderColor: getBorderColor(),
          },
        ]}
        placeholderTextColor={colors.opacity[40]}
        {...textInputProps}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
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
    height: 48,
    borderWidth: borders.width.standard,
    borderRadius: borders.radius.none,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.baseContent,
    backgroundColor: colors.base100,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.opacity[50],
    marginTop: spacing.xs,
  },
});
