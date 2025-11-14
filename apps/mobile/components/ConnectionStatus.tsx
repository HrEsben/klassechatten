import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, typography, borders } from '../constants/theme';

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
    if (isReconnecting) return colors.warning; // warning
    if (isConnected && showConnected) return colors.accent; // success
    return colors.error; // error
  };

  const getMessage = () => {
    if (isReconnecting) return 'GENFORBINDER...';
    if (isConnected && showConnected) return 'TILSLUTTET';
    return 'FORBINDELSE MISTET';
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    borderBottomWidth: borders.width.standard,
    borderBottomColor: borders.color.default,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
  text: {
    color: colors.base100,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.widest,
  },
});
