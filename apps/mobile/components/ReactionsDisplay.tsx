import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, typography, borders } from '../constants/theme';

interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

interface ReactionsDisplayProps {
  reactions: ReactionGroup[];
  onToggle: (emoji: string) => void;
  onAddClick?: () => void;
}

export default function ReactionsDisplay({
  reactions,
  onToggle,
  onAddClick,
}: ReactionsDisplayProps) {
  // Only show if there are reactions
  if (reactions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {reactions.map((reaction) => (
        <TouchableOpacity
          key={reaction.emoji}
          onPress={() => onToggle(reaction.emoji)}
          style={[
            styles.reactionButton,
            reaction.hasReacted && styles.reactionButtonActive,
          ]}
        >
          <Text style={styles.emoji}>{reaction.emoji}</Text>
          <Text
            style={[
              styles.count,
              reaction.hasReacted && styles.countActive,
            ]}
          >
            {reaction.count}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.base200,
    borderWidth: borders.width.standard,
    borderColor: colors.opacity[10],
    borderRadius: borders.radius.none,
    gap: spacing.xs,
  },
  reactionButtonActive: {
    backgroundColor: colors.opacity[30],
    borderColor: colors.primary,
  },
  emoji: {
    fontSize: typography.sizes.md,
  },
  count: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.baseContent,
  },
  countActive: {
    color: colors.baseContent,
  },
});
