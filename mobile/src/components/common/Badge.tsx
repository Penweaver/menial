import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Radii, Spacing } from '../../constants/theme';

export type BadgeType = 'verified' | 'pending' | 'escrow' | 'rejected' | 'neutral' | 'rating';

interface BadgeProps {
  label: string;
  type?: BadgeType;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  type = 'neutral',
  style,
  textStyle,
  icon,
}) => {
  const getContainerStyle = () => {
    switch (type) {
      case 'verified':
        return styles.verifiedContainer;
      case 'pending':
      case 'rating':
        return styles.pendingContainer;
      case 'escrow':
        return styles.escrowContainer;
      case 'rejected':
        return styles.rejectedContainer;
      case 'neutral':
      default:
        return styles.neutralContainer;
    }
  };

  const getTextStyle = () => {
    switch (type) {
      case 'verified':
        return styles.verifiedText;
      case 'pending':
      case 'rating':
        return styles.pendingText;
      case 'escrow':
        return styles.escrowText;
      case 'rejected':
        return styles.rejectedText;
      case 'neutral':
      default:
        return styles.neutralText;
    }
  };

  return (
    <View style={[styles.badgeBase, getContainerStyle(), style]}>
      {icon ? <Text style={[styles.badgeText, getTextStyle(), styles.iconText]}>{icon} </Text> : null}
      <Text style={[styles.badgeText, getTextStyle(), textStyle]}>
        {type === 'rating' ? label : label.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...Typography.scale.labelSm,
  },
  iconText: {
    marginRight: 2,
  },
  verifiedContainer: {
    backgroundColor: Colors.secondaryContainer,
  },
  verifiedText: {
    color: Colors.secondaryText,
  },
  pendingContainer: {
    backgroundColor: Colors.tertiaryContainer,
  },
  pendingText: {
    color: Colors.tertiaryText,
  },
  escrowContainer: {
    backgroundColor: Colors.escrowContainer,
  },
  escrowText: {
    color: Colors.escrowText,
  },
  rejectedContainer: {
    backgroundColor: Colors.dangerContainer,
  },
  rejectedText: {
    color: Colors.dangerText,
  },
  neutralContainer: {
    backgroundColor: Colors.surfaceSubtle,
  },
  neutralText: {
    color: Colors.textSecondary,
  },
});
