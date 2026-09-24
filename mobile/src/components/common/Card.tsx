import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Colors, Radii, Spacing, Elevation } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  selected?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  selected = false,
}) => {
  const containerStyle = [
    styles.card,
    selected && styles.selected,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        style={containerStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Elevation.card,
  },
  selected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primaryContainer,
  },
});
