import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserClasses } from '../hooks/useUserClasses';
import ChatRoom from './ChatRoom';
import { colors, spacing, typography, borders, shadows } from '../constants/theme';

export default function ClassRoomBrowser() {
  const { classes, loading, error } = useUserClasses();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Indlæser klasser...</Text>
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

  if (classes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>Ingen klasser endnu</Text>
        <Text style={styles.emptySubtitle}>
          Du er ikke medlem af nogen klasser. Bed din lærer om en invitationskode.
        </Text>
      </View>
    );
  }

  // If a room is selected, show the chat fullscreen
  if (selectedRoomId) {
    return (
      <SafeAreaView style={styles.chatContainer} edges={['bottom']}>
        <View style={styles.backHeader}>
          <TouchableOpacity
            onPress={() => setSelectedRoomId(null)}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.backHeaderTitle}>#{selectedRoomName}</Text>
        </View>
        <ChatRoom roomId={selectedRoomId} showHeader={false} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mine klasser</Text>
      
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={({ item: classItem }) => (
          <View style={styles.classCard}>
            {/* Class header */}
            <TouchableOpacity
              onPress={() =>
                setExpandedClassId(
                  expandedClassId === classItem.id ? null : classItem.id
                )
              }
              style={styles.classHeader}
            >
              <View>
                <Text style={styles.classLabel}>{classItem.label}</Text>
                {classItem.school_name && (
                  <Text style={styles.schoolName}>{classItem.school_name}</Text>
                )}
              </View>
              <Text style={styles.expandIcon}>
                {expandedClassId === classItem.id ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {/* Rooms list */}
            {expandedClassId === classItem.id && (
              <View style={styles.roomsList}>
                {classItem.rooms.length === 0 ? (
                  <Text style={styles.noRoomsText}>Ingen chatrum endnu</Text>
                ) : (
                  classItem.rooms.map((room) => (
                    <TouchableOpacity
                      key={room.id}
                      onPress={() => {
                        if (!room.is_locked) {
                          setSelectedRoomId(room.id);
                          setSelectedRoomName(room.name);
                        }
                      }}
                      disabled={room.is_locked}
                      style={[
                        styles.roomButton,
                        room.is_locked && styles.roomButtonLocked,
                      ]}
                    >
                      <Text style={styles.roomName}>
                        #{room.name}
                        {room.is_locked && ' 🔒'}
                      </Text>
                      <Text style={styles.roomArrow}>→</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.base100,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: colors.base100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.base100,
    padding: spacing.xl,
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
  },
  emptyTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
    marginBottom: spacing.lg,
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.opacity[60],
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
    marginBottom: spacing.xl,
  },
  listContent: {
    gap: spacing.md,
  },
  classCard: {
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
    borderRadius: borders.radius.none,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.base100,
    ...shadows.card,
    position: 'relative',
  },
  classHeader: {
    padding: spacing.lg,
    backgroundColor: colors.base200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: borders.width.accentBar,
    borderLeftColor: colors.primary,
  },
  classLabel: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
  },
  schoolName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.opacity[50],
    marginTop: spacing.xs,
  },
  expandIcon: {
    fontSize: typography.sizes.xl,
    color: colors.baseContent,
  },
  roomsList: {
    padding: spacing.md,
  },
  noRoomsText: {
    color: colors.opacity[60],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
  roomButton: {
    padding: spacing.md,
    backgroundColor: colors.base100,
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
    borderRadius: borders.radius.none,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: borders.width.accentBar,
    borderLeftColor: colors.primaryOpacity[30],
  },
  roomButtonLocked: {
    backgroundColor: colors.base200,
    opacity: 0.6,
  },
  roomName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    color: colors.baseContent,
  },
  roomArrow: {
    fontSize: typography.sizes.lg,
    color: colors.primary,
    fontWeight: typography.weights.black,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: borders.width.standard,
    borderBottomColor: borders.color.default,
    backgroundColor: colors.base100,
    gap: spacing.md,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.baseContent,
    borderRadius: borders.radius.none,
    borderWidth: borders.width.standard,
    borderColor: colors.baseContent,
  },
  backButtonText: {
    color: colors.base100,
    fontWeight: typography.weights.black,
    fontSize: typography.sizes.lg,
  },
  backHeaderTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    color: colors.baseContent,
  },
});
