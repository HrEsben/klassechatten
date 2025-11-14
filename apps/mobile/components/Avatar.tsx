import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, typography, borders } from '../constants/theme';

interface AvatarProps {
  user?: {
    display_name?: string;
    avatar_url?: string;
    avatar_color?: string;
  };
  size?: number;
  style?: any;
}

export default function Avatar({ user, size = 40, style }: AvatarProps) {
  const displayName = user?.display_name || 'U';
  const avatarUrl = user?.avatar_url;
  const avatarColor = user?.avatar_color || colors.primary;
  
  // Get initials from display name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: borders.radius.none, // Sharp corners for Berlin Edgy aesthetic
    borderWidth: borders.width.standard,
    borderColor: borders.color.default,
  };

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[avatarStyle, style]}
        defaultSource={undefined}
      />
    );
  }

  // Fallback to colored square with initials
  return (
    <View
      style={[
        avatarStyle,
        {
          backgroundColor: avatarColor,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.initialsText,
          {
            fontSize: size * 0.4,
          },
        ]}
      >
        {getInitials(displayName)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initialsText: {
    color: colors.base100,
    fontWeight: typography.weights.black,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});