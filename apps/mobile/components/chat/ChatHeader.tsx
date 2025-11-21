import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, typography, borders } from '../../constants/theme';

interface ChatHeaderProps {
  roomName: string;
  onlineCount: number;
  totalUsers: number;
  isConnected: boolean;
  onUsersPress: () => void;
}

export default function ChatHeader({
  roomName,
  onlineCount,
  totalUsers,
  isConnected,
  onUsersPress,
}: ChatHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{roomName}</Text>
        {onlineCount > 0 && (
          <Text style={styles.onlineCount}>{onlineCount} online</Text>
        )}
      </View>
      
      <TouchableOpacity onPress={onUsersPress} style={styles.usersButton}>
        <Svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.baseContent}
          strokeWidth={2}
        >
          <Path
            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <Path
            d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <Path
            d="M23 21v-2a4 4 0 0 0-3-3.87"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <Path
            d="M16 3.13a4 4 0 0 1 0 7.75"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </Svg>
        {totalUsers > 0 && (
          <View style={styles.usersBadge}>
            <Text style={styles.usersBadgeText}>{totalUsers}</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <View
        style={[
          styles.statusIndicator,
          { backgroundColor: isConnected ? colors.accent : colors.warning },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: borders.width.standard,
    borderBottomColor: borders.color.default,
    backgroundColor: colors.base100,
    gap: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
  },
  onlineCount: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.opacity[50],
    marginTop: spacing.xs,
  },
  usersButton: {
    position: 'relative',
    padding: spacing.sm,
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
    paddingHorizontal: spacing.xs,
  },
  usersBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.base100,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 0,
  },
});
