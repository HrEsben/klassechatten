import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { useRoomMessages } from '../hooks/useRoomMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import { useRoomPresence } from '../hooks/useRoomPresence';
import { useReadReceipts } from '../hooks/useReadReceipts';
import { useAuth } from '../contexts/AuthContext';
import { getRelativeTime } from '../utils/time';

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
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

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

  // Presence and typing indicators
  const { onlineUsers, typingUsers, setTyping, onlineCount } = useRoomPresence({
    roomId,
    userId: user?.id || '',
    displayName: user?.user_metadata?.display_name || user?.email || 'Anonymous',
    enabled: !!user,
  });

  // Read receipts
  useReadReceipts({
    roomId,
    userId: user?.id || '',
    messages: messages.map(m => ({ id: m.id, user_id: m.user_id })),
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
    flatListRef.current?.scrollToEnd({ animated: true });
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
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
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

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = item.user_id === user?.id;
    const isOptimistic = item.isOptimistic;
    const isLoading = item.isLoading;
    const hasError = item.hasError;
    
    // Debug logging for images
    if (item.image_url) {
      console.log('Rendering message with image:', { id: item.id, image_url: item.image_url, body: item.body });
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
        isOptimistic && styles.optimisticMessage,
        hasError && styles.errorMessage
      ]}>
        <View style={styles.messageHeader}>
          <Text style={[
            styles.messageSender,
            isOwnMessage && styles.ownMessageText
          ]}>
            {isOwnMessage ? 'Dig' : (item.profiles?.display_name || 'Ukendt bruger')}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage && styles.ownMessageText
          ]}>
            {getRelativeTime(item.created_at)}
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
                    { text: 'Prøv igen', onPress: () => {
                      // Remove failed optimistic message
                      removeOptimisticMessage(item.id);
                      // Set message text back for retry
                      if (item.body) setMessageText(item.body);
                      if (item.image_url) setSelectedImageUri(item.image_url);
                    }}
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
          <Image 
            source={{ uri: item.image_url }}
            style={styles.messageImage}
            resizeMode="cover"
            onLoad={() => console.log('Image loaded successfully:', item.image_url)}
            onError={(e) => console.error('Image load error:', e.nativeEvent.error, item.image_url)}
          />
        )}
        {item.body && (
          <Text style={[
            styles.messageBody,
            isOwnMessage && styles.ownMessageText
          ]}>
            {item.body}
          </Text>
        )}
        {item.edited_at && (
          <Text style={[
            styles.editedLabel,
            isOwnMessage && styles.ownMessageText
          ]}>
            (redigeret)
          </Text>
        )}
        {/* Read receipts - only show for own messages */}
        {isOwnMessage && item.read_receipts && item.read_receipts.length > 0 && (
          <Text style={[styles.readReceipt, styles.ownMessageText]}>
            ✓✓ Læst af {item.read_receipts.length}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{roomName}</Text>
            {onlineCount > 0 && (
              <Text style={styles.onlineCount}>{onlineCount} online</Text>
            )}
          </View>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isConnected ? '#28a745' : '#ffc107' }
          ]} />
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        onContentSizeChange={() => {
          if (!loading && messages.length > 0 && isNearBottom) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onLayout={() => {
          if (!loading && messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
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

      {/* Suggestion Modal */}
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

      {/* Input */}
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
            <Text style={styles.imageButtonText}>📷</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={handleInputChange}
            placeholder="Skriv en besked..."
            editable={!sending && !uploading}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              ((!messageText.trim() && !selectedImageUri) || sending || uploading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={(!messageText.trim() && !selectedImageUri) || uploading}
          >
            <Text style={styles.sendButtonText}>
              {uploading ? '⏳' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 44,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  ownMessage: {
    backgroundColor: '#007bff',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#f5f5f5',
    alignSelf: 'flex-start',
  },
  ownMessageText: {
    color: '#fff',
  },
  messageSender: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageBody: {
    fontSize: 16,
  },
  editedLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  readReceipt: {
    fontSize: 12,
    color: '#007bff',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007bff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  modalSuggestion: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#333',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#28a745',
  },
  modalButtonSecondary: {
    backgroundColor: '#6c757d',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  typingContainer: {
    padding: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  messageImage: {
    width: 250, // Fixed width instead of percentage
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    padding: 8,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  imageButton: {
    width: 44,
    height: 44,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageButtonText: {
    fontSize: 24,
  },
  // Optimistic UI styles
  optimisticMessage: {
    opacity: 0.7,
  },
  errorMessage: {
    borderWidth: 1,
    borderColor: '#dc3545',
    backgroundColor: '#f8d7da',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageStatus: {
    marginLeft: 8,
  },
  errorIcon: {
    fontSize: 14,
  },
  // Jump to bottom button
  jumpToBottomButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#007bff',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  jumpToBottomText: {
    color: '#fff',
    fontSize: 20,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
