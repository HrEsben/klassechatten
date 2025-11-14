import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useReactions } from '../hooks/useReactions';
import ReactionsDisplay from './ReactionsDisplay';
import Avatar from './Avatar';
import { getRelativeTime } from '../utils/time';

interface MessageItemProps {
  item: any;
  isOwnMessage: boolean;
  currentUserId?: string;
  onImagePress: (url: string) => void;
  onErrorRetry: (item: any) => void;
  onReactionPickerOpen: (messageId: number) => void;
}

export default function MessageItem({
  item,
  isOwnMessage,
  currentUserId,
  onImagePress,
  onErrorRetry,
  onReactionPickerOpen,
}: MessageItemProps) {
  const isOptimistic = item.isOptimistic;
  const isLoading = item.isLoading;
  const hasError = item.hasError;

  // Only enable reactions for non-optimistic messages with numeric IDs
  const messageId = typeof item.id === 'number' ? item.id : null;
  const { reactionGroups, toggleReaction } = useReactions({
    messageId: messageId || 0,
    currentUserId,
    enabled: !!messageId && !isOptimistic,
  });

  const handleAddReaction = () => {
    if (messageId) {
      onReactionPickerOpen(messageId);
    }
  };

  return (
    <View
      style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
        isOptimistic && styles.optimisticMessage,
        hasError && styles.errorMessage,
      ]}
    >
      <View style={styles.messageRow}>
        {/* Avatar - only show for other users */}
        {!isOwnMessage && (
          <Avatar
            user={{
              display_name: item.profiles?.display_name || 'Ukendt bruger',
              avatar_url: item.profiles?.avatar_url,
              avatar_color: item.profiles?.avatar_color,
            }}
            size={32}
            style={styles.messageAvatar}
          />
        )}

        <View style={[styles.messageContent, isOwnMessage && styles.ownMessageContent]}>
          <View style={styles.messageHeader}>
            <Text style={[styles.messageSender, isOwnMessage && styles.ownMessageText]}>
              {isOwnMessage ? 'Dig' : (item.profiles?.display_name || 'Ukendt bruger')}
            </Text>
            {/* Loading/Error indicators */}
            {isLoading && (
              <ActivityIndicator
                size="small"
                color={isOwnMessage ? '#fff' : '#007bff'}
                style={styles.messageStatus}
              />
            )}
            {hasError && (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Besked fejlet',
                    'Beskeden kunne ikke sendes. Prøv igen.',
                    [
                      { text: 'OK' },
                      { text: 'Prøv igen', onPress: () => onErrorRetry(item) },
                    ]
                  );
                }}
                style={styles.messageStatus}
              >
                <Text style={styles.errorIcon}>❌</Text>
              </TouchableOpacity>
            )}
          </View>

          {item.image_url && (
            <TouchableOpacity onPress={() => onImagePress(item.image_url)} activeOpacity={0.8}>
              <Image
                source={{ uri: item.image_url }}
                style={styles.messageImageThumbnail}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {item.body && (
            <Text style={[styles.messageBody, isOwnMessage && styles.ownMessageText]}>
              {item.body}
            </Text>
          )}

          {item.edited_at && (
            <Text style={[styles.editedLabel, isOwnMessage && styles.ownMessageText]}>
              (redigeret)
            </Text>
          )}

          {/* Reactions */}
          {messageId && !isOptimistic && (
            <ReactionsDisplay
              reactions={reactionGroups}
              onToggle={toggleReaction}
              onAddClick={handleAddReaction}
            />
          )}

          {/* Time and read receipts footer */}
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageText]}>
              {getRelativeTime(item.created_at)}
            </Text>
            {/* Read receipts - only show for own messages */}
            {isOwnMessage && item.read_receipts && item.read_receipts.length > 0 && (
              <Text style={[styles.readReceipt, styles.ownMessageText]}>
                ✓✓ Læst af {item.read_receipts.length}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  optimisticMessage: {
    opacity: 0.6,
  },
  errorMessage: {
    opacity: 0.8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '80%',
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageContent: {
    backgroundColor: '#f0f0f0',
    borderRadius: 0, // Sharp corners
    padding: 12,
    maxWidth: '100%',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  ownMessageContent: {
    backgroundColor: '#ff3fa4', // primary color
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  ownMessageText: {
    color: '#fff',
  },
  messageStatus: {
    marginLeft: 8,
  },
  errorIcon: {
    fontSize: 14,
  },
  messageImageThumbnail: {
    width: 200,
    height: 150,
    marginBottom: 8,
    borderRadius: 0, // Sharp corners
  },
  messageBody: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  editedLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
  },
  readReceipt: {
    fontSize: 12,
    marginLeft: 8,
  },
});
