import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
  if (reactions.length === 0 && !onAddClick) {
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

      {onAddClick && (
        <TouchableOpacity onPress={onAddClick} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 0, // Sharp corners
    gap: 4,
  },
  reactionButtonActive: {
    backgroundColor: 'rgba(255, 63, 164, 0.3)', // primary/30 (funkyfred theme)
    borderColor: '#ff3fa4', // primary color
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.8)',
  },
  countActive: {
    color: '#1a1a1a',
  },
  addButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 0, // Sharp corners
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.6)',
  },
});
