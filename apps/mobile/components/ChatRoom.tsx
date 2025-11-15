import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { useRoomMessages } from '../hooks/useRoomMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import { useRoomPresence } from '../hooks/useRoomPresence';
import { useRoomUsers } from '../hooks/useRoomUsers';
import { useReadReceipts } from '../hooks/useReadReceipts';
import { useRoomReactions } from '../hooks/useRoomReactions';
import { useAuth } from '../contexts/AuthContext';
import { getRelativeTime } from '../utils/time';
import Avatar from './Avatar';
import MessageItem from './MessageItem';
import ReactionPickerWithHook from './ReactionPickerWithHook';
import UsersList from './UsersList';
import { colors, spacing, typography, borders, buttonSizes, shadows } from '../constants/theme';

interface ChatRoomProps {
  roomId: string;
  showHeader?: boolean;
}

export default function ChatRoom({ roomId, showHeader = true }: ChatRoomProps) {
  const [messageText, setMessageText] = useState('');
  const [showSuggestion, setShowSuggestion] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('Chat Room');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [enlargedImageUri, setEnlargedImageUri] = useState<string | null>(null);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<number | null>(null);
  const [usersListVisible, setUsersListVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);
  const inputRef = useRef<TextInput>(null);

  const { user } = useAuth();
  const { 
    messages, 
    loading, 
    error, 
    isConnected, 
    addOptimisticMessage, 
    updateOptimisticMessage, 
    removeOptimisticMessage 
  } = useRoomMessages({
    roomId,
    limit: 50,
  });

  const { sendMessage, pickImage, uploadImage, sending, uploading } = useSendMessage();

  // Fetch all users in the room (including offline users)
  const { users: allRoomUsers, loading: usersLoading } = useRoomUsers({
    roomId,
    enabled: !!user,
  });

  // Presence and typing indicators
  const { onlineUsers, typingUsers, setTyping, onlineCount } = useRoomPresence({
    roomId,
    userId: user?.id || '',
    displayName: user?.user_metadata?.display_name || user?.email || 'Anonymous',
    enabled: !!user,
  });

  // Create a set of online user IDs for quick lookup
  const onlineUserIds = useMemo(() => {
    return new Set(onlineUsers.map(u => u.user_id));
  }, [onlineUsers]);

  // Merge typing status into all users
  const usersWithStatus = useMemo(() => {
    return allRoomUsers.map(user => {
      const onlineUser = onlineUsers.find(ou => ou.user_id === user.user_id);
      return {
        ...user,
        online: onlineUserIds.has(user.user_id),
        typing: onlineUser?.typing || false,
      };
    });
  }, [allRoomUsers, onlineUsers, onlineUserIds]);

  // Memoize message IDs string to detect actual changes
  const messageIdsString = useMemo(() => {
    return messages.map(m => m.id).join(',');
  }, [messages]);

  // Memoize message info for read receipts to prevent re-renders
  const messageInfo = useMemo(() => {
    return messages.map(m => ({ id: m.id, user_id: m.user_id }));
  }, [messageIdsString]);

  // Read receipts
  useReadReceipts({
    roomId,
    userId: user?.id || '',
    messages: messageInfo,
    enabled: !!user,
  });

  // Room-level reactions subscription
  const { 
    getReactionsForMessage, 
    toggleReaction, 
    loading: reactionsLoading 
  } = useRoomReactions({
    roomId,
    currentUserId: user?.id,
    enabled: !!user,
  });

  // Fetch room details
  useEffect(() => {
    const fetchRoomDetails = async () => {
      const { supabase } = await import('../utils/supabase');
      const { data, error } = await supabase
        .from('rooms')
        .select('name')
        .eq('id', roomId)
        .single();
      
      if (data && !error) {
        setRoomName(data.name);
      }
    };

    fetchRoomDetails();
  }, [roomId]);

  // Helper function to scroll to bottom with proper offset
  const scrollToBottomWithOffset = (animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 50);
  };

  // Handle keyboard events - scroll to bottom when keyboard appears
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        // Small delay to ensure layout has adjusted
        setTimeout(() => {
          scrollToBottomWithOffset(true);
        }, 100);
      }
    );

    return () => {
      keyboardWillShow.remove();
    };
  }, []);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setMessageText(value);

    if (value.length > 0) {
      setTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 2000);
    } else {
      setTyping(false);
    }
  };

  // Smart scroll detection
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    
    setIsNearBottom(isAtBottom);
    setShowJumpToBottom(!isAtBottom && messages.length > 0);
    
    // Clear unread count when user scrolls to bottom
    if (isAtBottom) {
      setUnreadCount(0);
    }
  };

  // Jump to bottom function
  const jumpToBottom = () => {
    scrollToBottomWithOffset(true);
    setUnreadCount(0);
    setShowJumpToBottom(false);
  };

  // Update unread count when new messages arrive and user is not at bottom
  useEffect(() => {
    // Only count new messages that arrive after initial load
    if (previousMessageCount > 0 && messages.length > previousMessageCount && !isNearBottom) {
      const newMessageCount = messages.length - previousMessageCount;
      setUnreadCount(prev => prev + newMessageCount);
    }
    
    // Update the previous message count
    setPreviousMessageCount(messages.length);
  }, [messages.length, isNearBottom, previousMessageCount]);

  // Reset unread count on initial load
  useEffect(() => {
    if (!loading && messages.length > 0 && previousMessageCount === 0) {
      setUnreadCount(0);
    }
  }, [loading, messages.length, previousMessageCount]);

  // Auto-scroll to bottom when new messages arrive or on initial load
  useEffect(() => {
    if (messages.length > 0 && !loading && isNearBottom) {
      scrollToBottomWithOffset(false);
    }
  }, [messages.length, loading, isNearBottom]);

  const handleImagePick = () => {
    Alert.alert(
      'Vælg billede',
      'Vælg kilde',
      [
        {
          text: 'Kamera',
          onPress: async () => {
            const uri = await pickImage('camera');
            if (uri) setSelectedImageUri(uri);
          }
        },
        {
          text: 'Galleri',
          onPress: async () => {
            const uri = await pickImage('library');
            if (uri) setSelectedImageUri(uri);
          }
        },
        {
          text: 'Annuller',
          style: 'cancel'
        }
      ]
    );
  };

  const handleRemoveImage = () => {
    setSelectedImageUri(null);
  };

  const handleSend = async () => {
    if (!messageText.trim() && !selectedImageUri) return;

    // Stop typing indicator
    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const messageBody = messageText.trim();
    const imageUriTemp = selectedImageUri;

    // Add optimistic message immediately with loading state
    const tempId = addOptimisticMessage({
      user_id: user?.id || '',
      body: messageBody || '',
      image_url: imageUriTemp || undefined,
      profiles: {
        display_name: user?.user_metadata?.display_name || user?.email || 'You',
      },
      isLoading: true,
      hasError: false,
    });
    
    // Clear input immediately for instant feel
    setMessageText('');
    setSelectedImageUri(null);

    let imageUrl: string | null = null;

    try {
      // Upload image if selected
      if (imageUriTemp) {
        imageUrl = await uploadImage(imageUriTemp);
        if (!imageUrl) {
          // Mark optimistic message as failed
          updateOptimisticMessage(tempId, {
            isLoading: false,
            hasError: true,
          });
          Alert.alert('Fejl', 'Kunne ikke uploade billede. Prøv igen.');
          return;
        }
      }

      // Send message
      const result = await sendMessage(roomId, messageBody || undefined, imageUrl || undefined);

      if (result.status === 'block' || result.status === 'blocked') {
        // Remove optimistic message on block
        removeOptimisticMessage(tempId);
        return;
      }

      if (result.status === 'flag' && result.suggested) {
        // Remove optimistic message and show suggestion
        removeOptimisticMessage(tempId);
        setShowSuggestion(result.suggested);
        return;
      }

      // Success - mark as sent and it will be removed when real message arrives
      updateOptimisticMessage(tempId, {
        isLoading: false,
        hasError: false,
      });
      
    } catch (error) {
      // Mark optimistic message as failed
      updateOptimisticMessage(tempId, {
        isLoading: false,
        hasError: true,
      });
      console.error('Error sending message:', error);
    }
  };

  const useSuggestion = async () => {
    if (!showSuggestion) return;

    // Send the suggested text
    const result = await sendMessage(roomId, showSuggestion);
    
    if (result.message_id) {
      setMessageText('');
      setShowSuggestion(null);
      handleRemoveImage();
    }
  };

  const cancelMessage = () => {
    // Clear everything - user's message was rejected
    setMessageText('');
    setShowSuggestion(null);
    handleRemoveImage();
  };

  // Memoize callback functions to prevent MessageItem re-renders
  const handleImagePress = useCallback((url: string) => {
    setEnlargedImageUri(url);
  }, []);

  const handleErrorRetry = useCallback((failedItem: any) => {
    removeOptimisticMessage(failedItem.id);
    if (failedItem.body) setMessageText(failedItem.body);
    if (failedItem.image_url) setSelectedImageUri(failedItem.image_url);
  }, [removeOptimisticMessage]);

  const handleReactionPickerOpen = useCallback((messageId: number) => {
    setReactionPickerMessageId(messageId);
    setReactionPickerVisible(true);
  }, []);

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isOwnMessage = item.user_id === user?.id;
    const messageReactions = getReactionsForMessage(item.id || 0);

    return (
      <MessageItem
        item={item}
        isOwnMessage={isOwnMessage}
        currentUserId={user?.id}
        reactions={messageReactions}
        onImagePress={handleImagePress}
        onErrorRetry={handleErrorRetry}
        onReactionPickerOpen={handleReactionPickerOpen}
        onToggleReaction={toggleReaction}
      />
    );
  }, [user?.id, getReactionsForMessage, toggleReaction, handleImagePress, handleErrorRetry, handleReactionPickerOpen]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Indlæser beskeder...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Fejl: {error}</Text>
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 130 : 0}
      >
        <View style={styles.container}>
          {/* Header */}
          {showHeader && (
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>{roomName}</Text>
                {onlineCount > 0 && (
                  <Text style={styles.onlineCount}>{onlineCount} online</Text>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => setUsersListVisible(true)}
                style={styles.usersButton}
              >
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.baseContent} strokeWidth={2}>
                  <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="square" strokeLinejoin="miter" />
                  <Path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeLinecap="square" strokeLinejoin="miter" />
                  <Path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="square" strokeLinejoin="miter" />
                  <Path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="square" strokeLinejoin="miter" />
                </Svg>
                {allRoomUsers.length > 0 && (
                  <View style={styles.usersBadge}>
                    <Text style={styles.usersBadgeText}>{allRoomUsers.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: isConnected ? '#28a745' : '#ffc107' }
              ]} />
            </View>
          )}

          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            style={{ flex: 1 }}
            contentContainerStyle={styles.messagesList}
            contentInset={{ bottom: 60 }}
            contentOffset={{ x: 0, y: -60 }}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => {
              if (!loading && messages.length > 0 && isNearBottom) {
                scrollToBottomWithOffset(false);
              }
            }}
            onLayout={() => {
              if (!loading && messages.length > 0) {
                scrollToBottomWithOffset(false);
              }
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Ingen beskeder endnu. Send den første!
              </Text>
            }
          />

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>
                {typingUsers.length === 1
                  ? `${typingUsers[0]?.display_name || 'Nogen'} skriver...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]?.display_name || 'Nogen'} og ${typingUsers[1]?.display_name || 'nogen'} skriver...`
                  : `${typingUsers.length} personer skriver...`}
              </Text>
            </View>
          )}

          {/* Input Area */}
          <View style={styles.inputContainer}>
            {selectedImageUri && (
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: selectedImageUri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={handleImagePick}
                disabled={sending || uploading}
              >
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.baseContent} strokeWidth="1.5">
                  <Path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={messageText}
                onChangeText={handleInputChange}
                placeholder="Skriv en besked..."
                placeholderTextColor={colors.opacity[40]}
                editable={!sending && !uploading}
                multiline
                maxLength={500}
                onFocus={() => {
                  // Scroll to bottom when input is focused
                  setTimeout(() => {
                    scrollToBottomWithOffset(true);
                  }, 300);
                }}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  ((!messageText.trim() && !selectedImageUri) || sending || uploading) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={(!messageText.trim() && !selectedImageUri) || uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.base100} />
                ) : (
                  <Svg width="20" height="20" viewBox="0 0 24 24" fill={colors.base100} stroke="none">
                    <Path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </Svg>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modals outside KeyboardAvoidingView */}
      <Modal
        visible={showSuggestion !== null}
        transparent
        animationType="slide"
        onRequestClose={cancelMessage}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Din besked blev blokeret</Text>
            <Text style={styles.modalDescription}>
              Din besked indeholder indhold der kan være upassende. Du kan sende denne omformulering i stedet:
            </Text>
            <Text style={styles.modalSuggestion}>"{showSuggestion}"</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={useSuggestion}
              >
                <Text style={styles.modalButtonText}>Send omformulering</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={cancelMessage}
              >
                <Text style={styles.modalButtonText}>Annuller</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Jump to Bottom Button */}
      {showJumpToBottom && (
        <TouchableOpacity 
          style={styles.jumpToBottomButton} 
          onPress={jumpToBottom}
        >
          <Text style={styles.jumpToBottomText}>↓</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Enlarged Image Modal */}
      <Modal
        visible={!!enlargedImageUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEnlargedImageUri(null)}
      >
        <TouchableOpacity 
          style={styles.imageModalOverlay}
          activeOpacity={1}
          onPress={() => setEnlargedImageUri(null)}
        >
          <View style={styles.imageModalContent}>
            {enlargedImageUri && (
              <Image 
                source={{ uri: enlargedImageUri }}
                style={styles.enlargedImage}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reaction Picker Modal */}
      {reactionPickerMessageId && (
        <ReactionPickerWithHook
          visible={reactionPickerVisible}
          messageId={reactionPickerMessageId}
          currentUserId={user?.id}
          onReaction={(emoji) => toggleReaction(reactionPickerMessageId, emoji)}
          onClose={() => {
            setReactionPickerVisible(false);
            setReactionPickerMessageId(null);
          }}
        />
      )}

      {/* Users List Modal */}
      <UsersList
        users={usersWithStatus}
        onlineUserIds={onlineUserIds}
        currentUserId={user?.id}
        visible={usersListVisible}
        onClose={() => setUsersListVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.base100,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.opacity[60],
  },
  errorText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: borders.width.standard,
    borderBottomColor: borders.color.default,
    backgroundColor: colors.base100,
  },
  usersButton: {
    position: 'relative',
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  usersBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  usersBadgeText: {
    color: colors.base100,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
  },
  onlineCount: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.opacity[50],
    marginTop: spacing.xs,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: borders.radius.none,
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
  },
  messagesList: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  messageContainer: {
    padding: spacing.md,
    borderRadius: borders.radius.none,
    marginBottom: spacing.sm,
    maxWidth: '80%',
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
  },
  ownMessage: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: colors.base200,
    alignSelf: 'flex-start',
  },
  ownMessageText: {
    color: colors.base100,
  },
  messageSender: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.baseContent,
    marginBottom: spacing.xs,
  },
  messageTime: {
    fontSize: typography.sizes.sm,
    color: colors.opacity[60],
  },
  messageBody: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    paddingHorizontal: spacing.xs,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  editedLabel: {
    fontSize: typography.sizes.sm,
    color: colors.opacity[60],
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
  readReceipt: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.opacity[60],
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    marginTop: 40,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
  inputContainer: {
    padding: spacing.md,
    borderTopWidth: borders.width.standard,
    borderTopColor: borders.color.default,
    backgroundColor: colors.base200,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  input: {
    flex: 1,
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
    borderRadius: borders.radius.none,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.baseContent,
    maxHeight: 100,
    minHeight: 48,
    backgroundColor: colors.base100,
    marginLeft: -1, // Join with image button (overlap borders)
    marginRight: -1, // Join with send button (overlap borders)
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 48,
    minHeight: 48,
    borderRadius: borders.radius.none,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  sendButtonDisabled: {
    backgroundColor: colors.opacity[20],
    borderColor: colors.opacity[20],
  },
  sendButtonText: {
    color: colors.base100,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.base100,
    borderTopLeftRadius: borders.radius.bottomSheet,
    borderTopRightRadius: borders.radius.bottomSheet,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
    marginBottom: spacing.md,
  },
  modalDescription: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.opacity[60],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  modalSuggestion: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.baseContent,
    marginBottom: spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borders.radius.none,
    alignItems: 'center',
    borderWidth: borders.width.standard,
  },
  modalButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  modalButtonSecondary: {
    backgroundColor: colors.neutral,
    borderColor: colors.neutral,
  },
  modalButtonText: {
    color: colors.base100,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
    textTransform: 'uppercase',
  },
  typingContainer: {
    padding: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopWidth: borders.width.standard,
    borderTopColor: borders.color.default,
    backgroundColor: colors.base100,
  },
  typingText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.opacity[60],
  },
  messageImage: {
    width: 250,
    height: 200,
    borderRadius: borders.radius.none,
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  messageImageThumbnail: {
    width: 120,
    height: 90,
    borderRadius: borders.radius.none,
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  imagePreviewContainer: {
    position: 'relative',
    padding: spacing.sm,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: borders.radius.none,
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.error,
    width: 24,
    height: 24,
    borderRadius: borders.radius.none,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: colors.base100,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
  },
  imageButton: {
    width: 48,
    minHeight: 48,
    backgroundColor: colors.base200,
    borderRadius: borders.radius.none,
    borderWidth: borders.width.standard,
    borderColor: colors.base200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageButtonText: {
    fontSize: typography.sizes.xl,
    color: colors.baseContent,
    fontWeight: typography.weights.black,
  },
  // Optimistic UI styles
  optimisticMessage: {
    opacity: 0.7,
  },
  errorMessage: {
    borderWidth: borders.width.standard,
    borderColor: colors.error,
    backgroundColor: colors.base200,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  messageStatus: {
    marginLeft: spacing.sm,
  },
  errorIcon: {
    fontSize: typography.sizes.md,
  },
  // Jump to bottom button
  jumpToBottomButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: colors.primary,
    borderRadius: borders.radius.none,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borders.width.standard,
    borderColor: colors.primary,
    ...shadows.card,
  },
  jumpToBottomText: {
    color: colors.base100,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.error,
    borderRadius: borders.radius.none,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: colors.base100,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  // Image viewer modal styles
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedImage: {
    width: '100%',
    height: '100%',
  },
  // Avatar styles
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  messageAvatar: {
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  messageContent: {
    flex: 1,
  },
  ownMessageContent: {
    alignItems: 'flex-end',
  },
});
