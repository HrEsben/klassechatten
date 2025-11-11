import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useUserClasses } from '../hooks/useUserClasses';
import ChatRoom from './ChatRoom';

export default function ClassRoomBrowser() {
  const { classes, loading, error } = useUserClasses();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0070f3" />
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

  // If a room is selected, show the chat
  if (selectedRoomId) {
    return (
      <View style={{ flex: 1 }}>
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
      </View>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
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
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  listContent: {
    gap: 12,
  },
  classCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  classHeader: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  schoolName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  expandIcon: {
    fontSize: 20,
  },
  roomsList: {
    padding: 12,
  },
  noRoomsText: {
    color: '#666',
    fontStyle: 'italic',
  },
  roomButton: {
    padding: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomButtonLocked: {
    backgroundColor: '#e9ecef',
  },
  roomName: {
    fontSize: 16,
  },
  roomArrow: {
    fontSize: 18,
    color: '#007bff',
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#6c757d',
    borderRadius: 4,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  backHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
