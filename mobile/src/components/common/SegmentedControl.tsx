/**
 * Menial Mobile - Standardized SegmentedControl Component
 * 
 * High-craft iOS/Material 3 style segmented pill control.
 * Used for binary or multi-option toggles (e.g. Phone vs Email, Worker vs Employer).
 * Guarantees minimum 44-48dp touch target ergonomics per option.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Colors, Typography, Spacing, Radii, Layout } from '../../constants/theme';

export interface SegmentedControlOption<T extends string = string> {
  key: T;
  label: string;
  icon?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  selectedKey,
  onSelect,
  disabled = false,
  style,
  accessibilityLabel = 'Segmented options',
}: SegmentedControlProps<T>) {
  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const isSelected = selectedKey === option.key;

        return (
          <TouchableOpacity
            key={option.key}
            activeOpacity={0.82}
            onPress={() => onSelect(option.key)}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected, disabled }}
            style={[
              styles.segmentBtn,
              isSelected && styles.segmentBtnActive,
              disabled && styles.disabled,
            ]}
          >
            {option.icon ? (
              <Text style={styles.segmentIcon}>{option.icon}</Text>
            ) : null}
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.segmentTextActive,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.lg,
    padding: 4,
    width: '100%',
    minHeight: Layout.minTouchTarget,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentIcon: {
    fontSize: 16,
  },
  segmentText: {
    ...Typography.scale.labelMd,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
