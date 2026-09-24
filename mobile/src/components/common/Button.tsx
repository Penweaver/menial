import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radii, Layout } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'kinetic' | 'outline' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const isInteractive = !disabled && !loading;

  if (variant === 'kinetic') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={!isInteractive}
        activeOpacity={0.88}
        style={[styles.base, disabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={[Colors.primary, '#4F7EFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.inner, styles.gradientRadius]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primaryOn} size="small" />
          ) : (
            <View style={styles.contentRow}>
              {icon && <View style={styles.iconContainer}>{icon}</View>}
              <Text style={[styles.text, styles.textPrimary, textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary':
      case 'outline':
        return styles.secondaryContainer;
      case 'danger':
        return styles.dangerContainer;
      case 'primary':
      default:
        return styles.primaryContainer;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
      case 'outline':
        return styles.textSecondary;
      case 'danger':
        return styles.textDanger;
      case 'primary':
      default:
        return styles.textPrimary;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!isInteractive}
      activeOpacity={0.85}
      style={[
        styles.base,
        styles.inner,
        getContainerStyle(),
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? Colors.primary : Colors.primaryOn}
          size="small"
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.text, getTextStyle(), textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: Layout.buttonHeight,
    borderRadius: Radii.md,
    minHeight: Layout.minTouchTarget,
    width: '100%',
    overflow: 'hidden',
  },
  inner: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
    paddingHorizontal: 16,
  },
  gradientRadius: {
    borderRadius: Radii.md,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  primaryContainer: {
    backgroundColor: Colors.primary,
  },
  secondaryContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  dangerContainer: {
    backgroundColor: Colors.danger,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: Colors.surfaceSubtle,
    borderColor: Colors.border,
  },
  text: {
    ...Typography.scale.labelLg,
  },
  textPrimary: {
    color: Colors.primaryOn,
  },
  textSecondary: {
    color: Colors.primary,
  },
  textDanger: {
    color: Colors.textInverse,
  },
});
