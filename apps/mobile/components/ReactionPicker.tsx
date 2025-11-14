import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';

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
      animationType="fade"
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

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 0, // Sharp corners
    padding: 16,
    width: width * 0.85,
    maxWidth: 400,
    maxHeight: '70%',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    color: '#1a1a1a',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: '15%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 0, // Sharp corners
  },
  emoji: {
    fontSize: 28,
  },
});
