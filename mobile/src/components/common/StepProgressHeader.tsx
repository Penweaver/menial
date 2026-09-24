import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';

interface StepProgressHeaderProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  onBack?: () => void;
}

export const StepProgressHeader: React.FC<StepProgressHeaderProps> = ({
  currentStep,
  totalSteps,
  stepTitle,
  onBack,
}) => {
  const progressPercent = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
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

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Create a Job</Text>
          <Text style={styles.stepSubtitle}>
            Step {currentStep} of {totalSteps} • {stepTitle}
          </Text>
        </View>

        <View style={styles.placeholder} />
      </View>

      {/* Progress Track */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.primary,
  },
  stepSubtitle: {
    ...Typography.scale.labelSm,
    color: Colors.secondaryText,
    marginTop: 1,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.surfaceSubtle,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
});
