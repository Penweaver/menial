import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../../../constants/theme';
import { StepProgressHeader } from '../../../components/common/StepProgressHeader';
import { Button } from '../../../components/common/Button';
import { useJobCreation } from '../../../context/JobCreationContext';

interface ScheduleScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  onNext,
  onBack,
}) => {
  const { draft, updateDraft } = useJobCreation();

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const [dateType, setDateType] = useState<'today' | 'tomorrow' | 'other'>(
    draft.scheduledDate === todayStr
      ? 'today'
      : draft.scheduledDate === tomorrowStr
      ? 'tomorrow'
      : 'other'
  );
  const [selectedTime, setSelectedTime] = useState<string>(draft.startTime || '09:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(draft.durationMinutes || 240);

  const timeOptions = [
    { label: '08:00 AM (Early)', value: '08:00' },
    { label: '10:00 AM (Mid-Morning)', value: '10:00' },
    { label: '01:00 PM (Afternoon)', value: '13:00' },
    { label: '03:30 PM (Late Afternoon)', value: '15:30' },
  ];

  const durationOptions = [
    { label: '2 Hours (Quick Task)', minutes: 120 },
    { label: '4 Hours (Half Day)', minutes: 240 },
    { label: '8 Hours (Full Day)', minutes: 480 },
  ];

  const handleNext = () => {
    let resolvedDate = draft.scheduledDate;
    if (dateType === 'today') resolvedDate = todayStr;
    if (dateType === 'tomorrow') resolvedDate = tomorrowStr;

    updateDraft({
      scheduledDate: resolvedDate,
      startTime: selectedTime,
      durationMinutes,
    });

    onNext();
  };

  return (
    <View style={styles.container}>
      <StepProgressHeader
        currentStep={3}
        totalSteps={5}
        stepTitle="Schedule & Time"
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>When is the work needed?</Text>
          <Text style={styles.subtitle}>
            Set the start date and expected time so nearby workers receive instant alerts.
          </Text>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Scheduled Date</Text>
          <View style={styles.dateOptionRow}>
            <TouchableOpacity
              style={[styles.dateCard, dateType === 'today' && styles.dateCardActive]}
              onPress={() => setDateType('today')}
            >
              <Text style={[styles.dateEmoji, dateType === 'today' && styles.dateEmojiActive]}>
                ⚡
              </Text>
              <Text style={[styles.dateTitle, dateType === 'today' && styles.dateTitleActive]}>
                Today
              </Text>
              <Text style={[styles.dateSub, dateType === 'today' && styles.dateSubActive]}>
                Immediate / Urgent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateCard, dateType === 'tomorrow' && styles.dateCardActive]}
              onPress={() => setDateType('tomorrow')}
            >
              <Text style={[styles.dateEmoji, dateType === 'tomorrow' && styles.dateEmojiActive]}>
                📅
              </Text>
              <Text style={[styles.dateTitle, dateType === 'tomorrow' && styles.dateTitleActive]}>
                Tomorrow
              </Text>
              <Text style={[styles.dateSub, dateType === 'tomorrow' && styles.dateSubActive]}>
                Next Morning
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Start Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Start Time</Text>
          <View style={styles.timeList}>
            {timeOptions.map((opt) => {
              const isSelected = selectedTime === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.timeRow, isSelected && styles.timeRowActive]}
                  onPress={() => setSelectedTime(opt.value)}
                >
                  <Text style={[styles.timeLabel, isSelected && styles.timeLabelActive]}>
                    {opt.label}
                  </Text>
                  {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Estimated Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Estimated Duration</Text>
          <View style={styles.durationRow}>
            {durationOptions.map((opt) => {
              const isSelected = durationMinutes === opt.minutes;
              return (
                <TouchableOpacity
                  key={opt.minutes}
                  style={[
                    styles.durationPill,
                    isSelected && styles.durationPillActive,
                  ]}
                  onPress={() => setDurationMinutes(opt.minutes)}
                >
                  <Text
                    style={[
                      styles.durationText,
                      isSelected && styles.durationTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button
          title="Next: Worker Count & Pay"
          onPress={handleNext}
          style={styles.submitButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.scale.headlineLgMobile,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  dateOptionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dateCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
  },
  dateCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  dateEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  dateEmojiActive: {
    transform: [{ scale: 1.1 }],
  },
  dateTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
  },
  dateTitleActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  dateSub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  dateSubActive: {
    color: Colors.primary,
  },
  timeList: {
    gap: Spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
  },
  timeRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  timeLabel: {
    ...Typography.scale.bodyMd,
    color: Colors.textPrimary,
  },
  timeLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  checkIcon: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  durationRow: {
    gap: Spacing.xs,
  },
  durationPill: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
  },
  durationPillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  durationText: {
    ...Typography.scale.bodyMd,
    color: Colors.textPrimary,
  },
  durationTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});
