import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  size?: LoadingSize;
  text?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  xs: 'small' as const,
  sm: 'small' as const,
  md: 'large' as const,
  lg: 'large' as const,
  xl: 'large' as const,
};

const textSizeMap = {
  xs: typography.sizes.xs,
  sm: typography.sizes.sm,
  md: typography.sizes.md,
  lg: typography.sizes.lg,
  xl: typography.sizes.xl,
};

export default function LoadingSpinner({
  size = 'md',
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <>
      <ActivityIndicator size={sizeMap[size]} color={colors.primary} />
      {text && (
        <Text
          style={[
            styles.text,
            {
              fontSize: textSizeMap[size],
              marginTop: size === 'xs' || size === 'sm' ? spacing.sm : spacing.md,
            },
          ]}
        >
          {text}
        </Text>
      )}
    </>
  );

  if (fullScreen) {
    return <View style={styles.fullScreenContainer}>{content}</View>;
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.base100,
  },
  text: {
    color: colors.opacity[60],
    fontWeight: typography.weights.medium,
  },
});
