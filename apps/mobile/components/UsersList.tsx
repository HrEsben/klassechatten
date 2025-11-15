import React from 'react';
import { View, Text, FlatList, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Avatar from './Avatar';
import { colors, spacing, typography, borders } from '../constants/theme';

interface UsersListUser {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  avatar_color?: string;
  online?: boolean;
  typing?: boolean;
}

interface UsersListProps {
  users: UsersListUser[];
  onlineUserIds: Set<string>;
  currentUserId?: string;
  visible: boolean;
  onClose: () => void;
}

export default function UsersList({
  users,
  onlineUserIds,
  currentUserId,
  visible,
  onClose,
}: UsersListProps) {
  const onlineUsers = users.filter(u => onlineUserIds.has(u.user_id));
  const offlineUsers = users.filter(u => !onlineUserIds.has(u.user_id));

  const renderUser = ({ item }: { item: UsersListUser }) => {
    const isCurrentUser = item.user_id === currentUserId;
    const isOnline = onlineUserIds.has(item.user_id);

    return (
      <View style={[styles.userItem, isCurrentUser && styles.currentUserItem]}>
        <View style={styles.avatarContainer}>
          <Avatar
            user={{
              display_name: item.display_name,
              avatar_url: item.avatar_url,
              avatar_color: item.avatar_color,
            }}
            size={40}
          />
          {isOnline && <View style={styles.onlineBadge} />}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.display_name}
            {isCurrentUser && (
              <Text style={styles.currentUserLabel}> (dig)</Text>
            )}
          </Text>
          {item.typing ? (
            <Text style={styles.statusText}>skriver...</Text>
          ) : !isOnline ? (
            <Text style={styles.statusText}>offline</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Brugere</Text>
            <Text style={styles.headerSubtitle}>
              {onlineUsers.length} online · {users.length} total
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Users List */}
        <FlatList
          data={[...onlineUsers, ...offlineUsers]}
          renderItem={renderUser}
          keyExtractor={(item) => item.user_id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={() => (
            <>
              {onlineUsers.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>ONLINE</Text>
                </View>
              )}
            </>
          )}
          ListFooterComponent={() => (
            <>
              {offlineUsers.length > 0 && (
                <>
                  <View style={[styles.sectionHeader, styles.sectionHeaderWithMargin]}>
                    <Text style={styles.sectionTitle}>OFFLINE</Text>
                  </View>
                </>
              )}
            </>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: borders.width.standard,
    borderBottomColor: borders.color.default,
    backgroundColor: colors.base100,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.opacity[60],
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.sizes.xl,
    color: colors.baseContent,
    fontWeight: typography.weights.bold,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionHeader: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sectionHeaderWithMargin: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.widest,
    color: colors.opacity[50],
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borders.radius.none,
    marginBottom: spacing.xs,
    backgroundColor: colors.base100,
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
  },
  currentUserItem: {
    backgroundColor: colors.base200,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.base100,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.baseContent,
  },
  currentUserLabel: {
    fontSize: typography.sizes.sm,
    color: colors.opacity[50],
    fontWeight: typography.weights.medium,
  },
  statusText: {
    fontSize: typography.sizes.sm,
    color: colors.opacity[60],
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    fontFamily: 'monospace',
  },
});
