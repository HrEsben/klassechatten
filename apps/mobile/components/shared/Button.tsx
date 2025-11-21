import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, typography, borders, buttonSizes } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'error';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const sizeStyles = buttonSizes[size];

  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      height: sizeStyles.height,
      paddingVertical: sizeStyles.paddingVertical,
      paddingHorizontal: sizeStyles.paddingHorizontal,
      borderWidth: borders.width.standard,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borders.radius.none,
    };

    if (fullWidth) {
      base.width = '100%';
    }

    if (disabled || loading) {
      base.opacity = 0.5;
    }

    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: colors.baseContent,
          borderColor: colors.baseContent,
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderColor: colors.baseContent,
        };
      case 'error':
        return {
          ...base,
          backgroundColor: colors.error,
          borderColor: colors.error,
        };
      default:
        return base;
    }
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontSize: sizeStyles.fontSize,
      fontWeight: typography.weights.bold,
      textTransform: 'uppercase',
    };

    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'error':
        return {
          ...base,
          color: '#ffffff',
        };
      case 'ghost':
      case 'outline':
        return {
          ...base,
          color: colors.baseContent,
        };
      default:
        return base;
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' || variant === 'outline' ? colors.baseContent : '#ffffff'}
        />
      ) : (
        <Text style={getTextStyle()}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
