import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../../../constants/theme';
import { StepProgressHeader } from '../../../components/common/StepProgressHeader';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { useJobCreation } from '../../../context/JobCreationContext';

interface JobDetailsLocationScreenProps {
  onNext: () => void;
  onBack: () => void;
}

const LAGOS_LGAS = [
  'Eti-Osa (Lekki / VI / Ikoyi)',
  'Ikeja (Alausa / GRA)',
  'Surulere / Bode Thomas',
  'Yaba / Ebute Metta',
  'Lagos Island (Marina)',
  'Kosofe (Gbagada / Magodo)',
  'Ikorodu Central',
  'Alimosho / Egbeda',
];

export const JobDetailsLocationScreen: React.FC<JobDetailsLocationScreenProps> = ({
  onNext,
  onBack,
}) => {
  const { draft, updateDraft } = useJobCreation();

  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [locationText, setLocationText] = useState(draft.locationText);
  const [lga, setLga] = useState(draft.lga || LAGOS_LGAS[0]);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setError(null);
    if (!title.trim() || title.trim().length < 5) {
      setError('Please enter a descriptive job title (minimum 5 characters).');
      return;
    }

    if (!description.trim() || description.trim().length < 15) {
      setError('Please provide detailed instructions for the worker (minimum 15 characters).');
      return;
    }

    if (!locationText.trim()) {
      setError('Please enter the street address or nearest landmark.');
      return;
    }

    updateDraft({
      title: title.trim(),
      description: description.trim(),
      locationText: locationText.trim(),
      lga,
    });

    onNext();
  };

  return (
    <View style={styles.container}>
      <StepProgressHeader
        currentStep={2}
        totalSteps={5}
        stepTitle="Details & Location"
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Describe the Job</Text>
          <Text style={styles.subtitle}>
            Be clear about physical requirements, tools needed, and exact location in Lagos.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Input
            label="Job Title"
            placeholder={`e.g. ${draft.categoryName} for 3-Bedroom Flat`}
            value={title}
            onChangeText={(val) => {
              setTitle(val);
              if (error) setError(null);
            }}
          />

          <Input
            label="Work Instructions & Scope"
            placeholder="Describe what the worker will do, items to carry, tools provided vs needed..."
            value={description}
            onChangeText={(val) => {
              setDescription(val);
              if (error) setError(null);
            }}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Job Location in Lagos</Text>

          <Input
            label="Street Address / Landmark"
            placeholder="e.g. Plot 14, Admiralty Way, Lekki Phase 1"
            value={locationText}
            onChangeText={(val) => {
              setLocationText(val);
              if (error) setError(null);
            }}
          />

          <Text style={styles.lgaLabel}>Select Area / LGA</Text>
          <View style={styles.lgaGrid}>
            {LAGOS_LGAS.map((item) => {
              const isSelected = lga === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.lgaChip, isSelected && styles.lgaChipSelected]}
                  onPress={() => setLga(item)}
                >
                  <Text
                    style={[styles.lgaText, isSelected && styles.lgaTextSelected]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button
          title="Next: Schedule & Time"
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
  errorBanner: {
    backgroundColor: Colors.dangerContainer,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    ...Typography.scale.bodySm,
    color: Colors.dangerText,
    fontWeight: '500',
  },
  section: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  lgaLabel: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  lgaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  lgaChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
  },
  lgaChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  lgaText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
  },
  lgaTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});
