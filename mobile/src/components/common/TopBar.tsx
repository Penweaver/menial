import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing, Layout } from '../../constants/theme';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftContainer}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.rightContainer}>
        {rightAction ? rightAction : <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  leftContainer: {
    width: Layout.minTouchTarget,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: Layout.minTouchTarget,
    height: Layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  placeholder: {
    width: Layout.minTouchTarget,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
  },
  rightContainer: {
    minWidth: Layout.minTouchTarget,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
