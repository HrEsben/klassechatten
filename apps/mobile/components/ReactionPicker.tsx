import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borders } from '../constants/theme';

interface ReactionPickerProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

// Common emoji reactions for a school chat
const EMOJI_OPTIONS = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🎉', '🔥', '⭐', '✅', '👏', '🙏',
  '💯', '🤔', '😊', '😎', '🤩', '😴',
  '🎨', '📚', '✏️', '🏆', '💪', '🙌'
];

export default function ReactionPicker({
  visible,
  onSelect,
  onClose,
}: ReactionPickerProps) {
  const handleEmojiPress = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Tilføj reaktion</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.emojiGrid}
            showsVerticalScrollIndicator={false}
          >
            {EMOJI_OPTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleEmojiPress(emoji)}
                style={styles.emojiButton}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 0,
  },
  container: {
    backgroundColor: colors.base100,
    borderRadius: borders.radius.none,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl, // Extra padding for iOS home indicator
    width: width,
    maxHeight: height * 0.6, // 60% of screen height max
    minHeight: 250, // Ensure minimum height for small screens
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: borders.width.standard,
    borderBottomColor: borders.color.default,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.opacity[60],
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingBottom: spacing.sm,
  },
  emojiButton: {
    width: width / 6 - 12, // 6 emojis per row with spacing
    height: width / 6 - 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginHorizontal: spacing.xs,
    backgroundColor: colors.opacity[10],
    borderRadius: borders.radius.none, // Sharp corners
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
  },
  emoji: {
    fontSize: Math.min(28, width / 15), // Scale emoji size based on screen width
  },
});
