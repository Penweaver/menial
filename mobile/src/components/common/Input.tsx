import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Radii, Layout, Spacing } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPhone?: boolean;
  onClear?: () => void;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isPhone = false,
  value,
  onChangeText,
  onClear,
  containerStyle,
  placeholder,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        {isPhone && (
          <View style={styles.phonePrefixContainer}>
            <Text style={styles.flagEmoji}>🇳🇬</Text>
            <Text style={styles.phonePrefix}>+234</Text>
            <View style={styles.prefixDivider} />
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, isPhone && styles.phoneInput]}
          keyboardType={isPhone ? 'phone-pad' : props.keyboardType}
          {...props}
        />
        {value && value.length > 0 && onClear ? (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    height: Layout.inputHeight,
    backgroundColor: Colors.canvas,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  inputFocused: {
    borderColor: Colors.borderActive,
    backgroundColor: Colors.surface,
  },
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerContainer,
  },
  input: {
    flex: 1,
    height: '100%',
    ...Typography.scale.bodyLg,
    color: Colors.textPrimary,
  },
  phoneInput: {
    paddingLeft: Spacing.xs,
  },
  phonePrefixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.xs,
  },
  flagEmoji: {
    fontSize: 18,
    marginRight: 4,
  },
  phonePrefix: {
    ...Typography.scale.bodyLg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginRight: 6,
  },
  prefixDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginRight: 6,
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  errorText: {
    ...Typography.scale.bodySm,
    color: Colors.dangerText,
    marginTop: Spacing.xs,
  },
});
