import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting: boolean;
  showWhenConnected?: boolean;
  position?: 'top' | 'bottom';
}

/**
 * Subtle connection status indicator for mobile
 * Shows a small banner when disconnected or reconnecting
 */
export function ConnectionStatus({
  isConnected,
  isReconnecting,
  showWhenConnected = false,
  position = 'top',
}: ConnectionStatusProps) {
  const [showConnected, setShowConnected] = useState(false);
  const [hasEverConnected, setHasEverConnected] = useState(false);
  const [slideAnim] = useState(new Animated.Value(position === 'top' ? -100 : 100));

  useEffect(() => {
    if (isConnected) {
      setHasEverConnected(true);
      
      if (isReconnecting || !hasEverConnected) {
        setShowConnected(true);
        const timer = setTimeout(() => {
          setShowConnected(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [isConnected, isReconnecting, hasEverConnected]);

  useEffect(() => {
    const shouldShow = isReconnecting || !isConnected || (isConnected && showConnected);
    
    Animated.timing(slideAnim, {
      toValue: shouldShow ? 0 : (position === 'top' ? -100 : 100),
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConnected, isReconnecting, showConnected, slideAnim, position]);

  if (isConnected && !showConnected && !showWhenConnected) {
    return null;
  }

  const getBackgroundColor = () => {
    if (isReconnecting) return '#f59e0b'; // warning
    if (isConnected && showConnected) return '#10b981'; // success
    return '#ef4444'; // error
  };

  const getMessage = () => {
    if (isReconnecting) return 'Genforbinder...';
    if (isConnected && showConnected) return 'Tilsluttet';
    return 'Forbindelse mistet';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.top : styles.bottom,
        { backgroundColor: getBackgroundColor() },
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.text}>{getMessage()}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
