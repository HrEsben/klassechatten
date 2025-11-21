import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

interface TypingIndicatorProps {
  typingUsers: Array<{ display_name?: string }>;
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const getMessage = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]?.display_name || 'Nogen'} skriver...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0]?.display_name || 'Nogen'} og ${
        typingUsers[1]?.display_name || 'nogen'
      } skriver...`;
    } else {
      return `${typingUsers.length} personer skriver...`;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{getMessage()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    fontStyle: 'italic',
    color: colors.opacity[60],
  },
});
