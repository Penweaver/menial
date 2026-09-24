/**
 * Menial Mobile - Standardized Button Component
 * 
 * Strict alignment with Global UI/UX Best Practices (Apple HIG, Google Material Design 3, WCAG 2.2).
 * Features:
 * - Touch Targets: Minimum 48dp ergonomics across all interactive states.
 * - Semantic Hierarchy: Primary (Cobalt), Secondary (Tinted Container), Outline, Danger, Danger-Outline, Ghost, Kinetic (Gradient).
 * - Standard Sizing Tiers: 'sm' (38px with hitSlop), 'md' (48px standard), 'lg' (54px prominent CTA).
 * - Resilient States: Zero-shift ActivityIndicator loading, accessibility busy/disabled flags, tactile pressed states.
 * - Icon Support: Flexible left/right placement and accessible icon-only mode.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radii, Layout } from '../../constants/theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'danger'
  | 'danger-outline'
  | 'ghost'
  | 'kinetic';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = true,
  icon,
  iconPosition = 'left',
  iconOnly = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const isInteractive = !disabled && !loading;

  // Resolve Height and Sizing Metrics
  const getSizeContainerStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return {
          height: 38,
          minHeight: 38,
          paddingHorizontal: iconOnly ? 0 : 14,
          width: iconOnly ? 38 : fullWidth ? '100%' : 'auto',
          borderRadius: Radii.md,
        };
      case 'lg':
        return {
          height: 54,
          minHeight: 54,
          paddingHorizontal: iconOnly ? 0 : 24,
          width: iconOnly ? 54 : fullWidth ? '100%' : 'auto',
          borderRadius: Radii.lg,
        };
      case 'md':
      default:
        return {
          height: 48,
          minHeight: Layout.minTouchTarget,
          paddingHorizontal: iconOnly ? 0 : 20,
          width: iconOnly ? Layout.minTouchTarget : fullWidth ? '100%' : 'auto',
          borderRadius: Radii.md,
        };
    }
  };

  const getSizeTextStyle = (): TextStyle => {
    switch (size) {
      case 'sm':
        return {
          ...Typography.scale.labelMd,
          fontSize: 13,
          lineHeight: 18,
        };
      case 'lg':
        return {
          ...Typography.scale.labelLg,
          fontSize: 16,
          lineHeight: 22,
          fontWeight: '700',
        };
      case 'md':
      default:
        return {
          ...Typography.scale.labelLg,
          fontSize: 15,
          lineHeight: 20,
          fontWeight: '600',
        };
    }
  };

  // Resolve Container Visual Variant
  const getContainerVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'danger':
        return styles.dangerContainer;
      case 'danger-outline':
        return styles.dangerOutlineContainer;
      case 'ghost':
        return styles.ghostContainer;
      case 'kinetic':
        return styles.kineticContainer;
      case 'primary':
      default:
        return styles.primaryContainer;
    }
  };

  // Resolve Text Color
  const getTextVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'secondary':
        return styles.textSecondary;
      case 'outline':
        return styles.textOutline;
      case 'danger':
        return styles.textDanger;
      case 'danger-outline':
        return styles.textDangerOutline;
      case 'ghost':
        return styles.textGhost;
      case 'kinetic':
        return styles.textKinetic;
      case 'primary':
      default:
        return styles.textPrimary;
    }
  };

  // Resolve Indicator Color
  const getIndicatorColor = (): string => {
    switch (variant) {
      case 'secondary':
      case 'outline':
      case 'ghost':
        return Colors.primary;
      case 'danger-outline':
        return Colors.danger;
      case 'danger':
      case 'kinetic':
      case 'primary':
      default:
        return Colors.primaryOn;
    }
  };

  // Active touch opacity based on button type
  const activeOpacity = variant === 'ghost' ? 0.65 : 0.82;

  // Touch area hit-slop for 'sm' to guarantee minimum 48x48 ergonomics (WCAG 2.5.5)
  const hitSlop =
    size === 'sm'
      ? { top: 6, bottom: 6, left: 6, right: 6 }
      : undefined;

  // Render Inner Content (Icon + Label or Spinner)
  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={getIndicatorColor()}
          size={size === 'sm' ? 'small' : 'small'}
        />
      );
    }

    if (iconOnly) {
      return <View style={styles.iconCentered}>{icon}</View>;
    }

    return (
      <View style={styles.contentRow}>
        {icon && iconPosition === 'left' && (
          <View style={[styles.iconContainerLeft, size === 'sm' && styles.iconSmallLeft]}>
            {icon}
          </View>
        )}
        {title ? (
          <Text
            style={[
              styles.textBase,
              getSizeTextStyle(),
              getTextVariantStyle(),
              textStyle,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
        {icon && iconPosition === 'right' && (
          <View style={[styles.iconContainerRight, size === 'sm' && styles.iconSmallRight]}>
            {icon}
          </View>
        )}
      </View>
    );
  };

  // Kinetic Gradient Variant
  if (variant === 'kinetic') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={!isInteractive}
        activeOpacity={0.86}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || (typeof title === 'string' ? title : 'button')}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !isInteractive, busy: loading }}
        testID={testID}
        style={[
          styles.base,
          getSizeContainerStyle(),
          disabled && styles.disabled,
          style,
        ]}
      >
        <LinearGradient
          colors={[Colors.primary, '#4F7EFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.inner, { borderRadius: getSizeContainerStyle().borderRadius }]}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!isInteractive}
      activeOpacity={activeOpacity}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof title === 'string' ? title : 'button')}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      testID={testID}
      style={[
        styles.base,
        styles.inner,
        getSizeContainerStyle(),
        getContainerVariantStyle(),
        disabled && styles.disabled,
        style,
      ]}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerLeft: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerRight: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSmallLeft: {
    marginRight: 6,
  },
  iconSmallRight: {
    marginLeft: 6,
  },
  // Variant Containers
  primaryContainer: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryContainer: {
    backgroundColor: Colors.primaryContainer,
  },
  outlineContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  dangerContainer: {
    backgroundColor: Colors.danger,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  dangerOutlineContainer: {
    backgroundColor: Colors.dangerContainer,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  kineticContainer: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.20,
    shadowRadius: 6,
    elevation: 4,
  },
  disabled: {
    opacity: 0.45,
    backgroundColor: Colors.surfaceSubtle,
    borderColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  // Typography Variants
  textBase: {
    textAlign: 'center',
  },
  textPrimary: {
    color: Colors.primaryOn,
  },
  textSecondary: {
    color: Colors.primary,
    fontWeight: '700',
  },
  textOutline: {
    color: Colors.primary,
    fontWeight: '600',
  },
  textDanger: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  textDangerOutline: {
    color: Colors.danger,
    fontWeight: '700',
  },
  textGhost: {
    color: Colors.primary,
    fontWeight: '600',
  },
  textKinetic: {
    color: Colors.primaryOn,
    fontWeight: '700',
  },
});
