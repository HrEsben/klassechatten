import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
} from 'react-native';
import ReactionsDisplay from './ReactionsDisplay';
import Avatar from './Avatar';
import { getRelativeTime } from '../utils/time';
import { colors, spacing, typography, borders } from '../constants/theme';

interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

interface MessageItemProps {
  item: any;
  isOwnMessage: boolean;
  currentUserId?: string;
  reactions: ReactionGroup[];
  onImagePress: (url: string) => void;
  onErrorRetry: (item: any) => void;
  onReactionPickerOpen: (messageId: number) => void;
  onToggleReaction: (messageId: number, emoji: string) => Promise<void>;
}

function MessageItem({
  item,
  isOwnMessage,
  currentUserId,
  reactions,
  onImagePress,
  onErrorRetry,
  onReactionPickerOpen,
  onToggleReaction,
}: MessageItemProps) {
  const isOptimistic = item.isOptimistic;
  const isLoading = item.isLoading;
  const hasError = item.hasError;

  // Animation for wiggle effect
  const wiggleAnim = useRef(new Animated.Value(0)).current;

  // Only enable reactions for non-optimistic messages with numeric IDs
  const messageId = typeof item.id === 'number' ? item.id : null;

  const handleToggleReaction = (emoji: string) => {
    if (messageId) {
      onToggleReaction(messageId, emoji);
    }
  };

  const handleLongPressIn = () => {
    // Wiggle animation
    Animated.sequence([
      Animated.timing(wiggleAnim, {
        toValue: -5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(wiggleAnim, {
        toValue: 5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(wiggleAnim, {
        toValue: -5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(wiggleAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

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
          {/* Sender name - outside bubble */}
          <View style={[styles.messageHeader, isOwnMessage && styles.ownMessageHeader]}>
            <Text style={[styles.messageSender, isOwnMessage && styles.ownMessageSenderText]}>
              {isOwnMessage ? 'Dig' : (item.profiles?.display_name || 'Ukendt bruger')}
            </Text>
            {/* Loading/Error indicators */}
            {isLoading && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
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

          {/* Message bubble - Long press to add reaction */}
          <TouchableOpacity
            activeOpacity={1}
            onLongPress={messageId ? handleAddReaction : undefined}
            onPressIn={messageId ? handleLongPressIn : undefined}
            delayLongPress={500}
          >
            <Animated.View 
              style={[
                styles.messageBubble, 
                isOwnMessage && styles.ownMessageBubble,
                { transform: [{ rotate: wiggleAnim.interpolate({
                  inputRange: [-5, 5],
                  outputRange: ['-2deg', '2deg']
                }) }] }
              ]}
            >
              {item.image_url && (
                <View style={styles.imageContainer}>
                  <TouchableOpacity 
                    onPress={() => !item.isUploadingImage && onImagePress(item.image_url)} 
                    activeOpacity={0.8}
                    disabled={item.isUploadingImage}
                  >
                    <Image
                      source={{ uri: item.image_url }}
                      style={[
                        styles.messageImageThumbnail,
                        item.isUploadingImage && { opacity: 0.5 }
                      ]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                  {item.isUploadingImage && (
                    <View style={styles.imageUploadingOverlay}>
                      <ActivityIndicator size="large" color={colors.base100} />
                      <Text style={styles.imageUploadingText}>Uploader...</Text>
                    </View>
                  )}
                </View>
              )}

              {item.body && (
                <Text style={[styles.messageBody, isOwnMessage && styles.ownMessageBodyText]}>
                  {item.body}
                </Text>
              )}

              {item.edited_at && (
                <Text style={[styles.editedLabel, isOwnMessage && styles.ownMessageBodyText]}>
                  (redigeret)
                </Text>
              )}
            </Animated.View>
          </TouchableOpacity>

          {/* Reactions - outside bubble */}
          {messageId && !isOptimistic && reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              <ReactionsDisplay
                reactions={reactions}
                onToggle={handleToggleReaction}
              />
            </View>
          )}

          {/* Time and read receipts - outside bubble */}
          <View style={[styles.messageFooter, isOwnMessage && styles.ownMessageFooter]}>
            <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTimeText]}>
              {getRelativeTime(item.created_at)}
            </Text>
            {hasError && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => onErrorRetry(item)}
              >
                <Text style={styles.retryText}>↻ Prøv igen</Text>
              </TouchableOpacity>
            )}
            {!hasError && isOptimistic && (
              <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTimeText]}>
                {isLoading ? 'Sender...' : 'Sendt'}
              </Text>
            )}
            {/* Read receipts - only show for own messages */}
            {!hasError && isOwnMessage && item.read_receipts && item.read_receipts.length > 0 && (
              <Text style={[styles.readReceipt, styles.ownMessageTimeText]}>
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
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
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
    marginRight: spacing.sm,
  },
  messageContent: {
    maxWidth: '100%',
  },
  ownMessageContent: {
    alignItems: 'flex-end',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ownMessageHeader: {
    justifyContent: 'flex-end',
  },
  messageSender: {
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
    color: colors.baseContent,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
  ownMessageSenderText: {
    color: colors.opacity[60],
  },
  messageStatus: {
    marginLeft: spacing.sm,
  },
  errorIcon: {
    fontSize: typography.sizes.md,
  },
  messageBubble: {
    backgroundColor: colors.base200,
    borderRadius: borders.radius.none,
    padding: spacing.md,
    maxWidth: '100%',
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
  },
  ownMessageBubble: {
    backgroundColor: colors.primary,
  },
  imageContainer: {
    position: 'relative',
  },
  messageImageThumbnail: {
    width: 200,
    height: 150,
    marginBottom: spacing.sm,
    borderRadius: borders.radius.none,
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
  },
  imageUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: spacing.sm,
    backgroundColor: 'rgba(26, 26, 26, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  imageUploadingText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.base100,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
  messageBody: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.baseContent,
    lineHeight: 24,
  },
  ownMessageBodyText: {
    color: colors.base100,
  },
  editedLabel: {
    fontSize: typography.sizes.sm,
    color: colors.opacity[60],
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
  reactionsContainer: {
    marginTop: spacing.xs,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ownMessageFooter: {
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: typography.sizes.xs,
    color: colors.opacity[50],
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
  ownMessageTimeText: {
    color: colors.opacity[60],
  },
  readReceipt: {
    fontSize: typography.sizes.xs,
    marginLeft: spacing.sm,
  },
  retryButton: {
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.error,
    borderRadius: 4,
  },
  retryText: {
    color: colors.base100,
    fontSize: 11,
    fontWeight: '600' as const,
  },
});

export default React.memo(MessageItem);
