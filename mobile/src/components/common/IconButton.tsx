/**
 * Menial Mobile - Standardized IconButton Component
 * 
 * Ergonomically optimized icon-only touch target conforming to
 * Apple Human Interface Guidelines and Material Design 3 (Minimum 48x48dp target).
 */

import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Colors, Radii, Layout } from '../../constants/theme';

export type IconButtonVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonShape = 'circle' | 'square';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  shape?: IconButtonShape;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  variant = 'default',
  size = 'md',
  shape = 'circle',
  disabled = false,
  loading = false,
  style,
  testID,
}) => {
  const isInteractive = !disabled && !loading;

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return {
          width: 36,
          height: 36,
          borderRadius: shape === 'circle' ? 18 : Radii.md,
        };
      case 'lg':
        return {
          width: 54,
          height: 54,
          borderRadius: shape === 'circle' ? 27 : Radii.lg,
        };
      case 'md':
      default:
        return {
          width: Layout.minTouchTarget,
          height: Layout.minTouchTarget,
          borderRadius: shape === 'circle' ? Layout.minTouchTarget / 2 : Radii.md,
        };
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return styles.primary;
      case 'secondary':
        return styles.secondary;
      case 'danger':
        return styles.danger;
      case 'ghost':
        return styles.ghost;
      case 'default':
      default:
        return styles.defaultVariant;
    }
  };

  const getIndicatorColor = (): string => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return Colors.primaryOn;
      case 'secondary':
      case 'ghost':
        return Colors.primary;
      case 'default':
      default:
        return Colors.textPrimary;
    }
  };

  const hitSlop =
    size === 'sm'
      ? { top: 6, bottom: 6, left: 6, right: 6 }
      : undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!isInteractive}
      activeOpacity={variant === 'ghost' ? 0.6 : 0.78}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      testID={testID}
      style={[
        styles.base,
        getSizeStyle(),
        getVariantStyle(),
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getIndicatorColor()} />
      ) : (
        icon
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultVariant: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  primary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  secondary: {
    backgroundColor: Colors.primaryContainer,
  },
  danger: {
    backgroundColor: Colors.danger,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  disabled: {
    opacity: 0.45,
    backgroundColor: Colors.surfaceSubtle,
    borderColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
});
