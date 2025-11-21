import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography, borders, shadows } from '../../constants/theme';

interface JumpToBottomButtonProps {
  visible: boolean;
  unreadCount: number;
  onPress: () => void;
}

export default function JumpToBottomButton({
  visible,
  unreadCount,
  onPress,
}: JumpToBottomButtonProps) {
  if (!visible) return null;

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>↓</Text>
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 100,
    width: 48,
    height: 48,
    borderRadius: 0,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: borders.width.standard,
    borderColor: colors.primary,
    ...shadows.card,
  },
  buttonText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.base100,
  },
  unreadBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: borders.width.standard,
    borderColor: colors.base100,
  },
  unreadText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.base100,
  },
});
