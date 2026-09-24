import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radii, formatKoboToNaira } from '../../../constants/theme';
import { StepProgressHeader } from '../../../components/common/StepProgressHeader';
import { Button } from '../../../components/common/Button';
import { useJobCreation } from '../../../context/JobCreationContext';

interface SelectCategoryScreenProps {
  onNext: () => void;
  onBack?: () => void;
}

export const SelectCategoryScreen: React.FC<SelectCategoryScreenProps> = ({
  onNext,
  onBack,
}) => {
  const { draft, updateDraft, categories } = useJobCreation();

  const handleSelect = (cat: typeof categories[0]) => {
    updateDraft({
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      workerPayKobo: cat.suggestedRateKobo,
    });
  };

  return (
    <View style={styles.container}>
      <StepProgressHeader
        currentStep={1}
        totalSteps={5}
        stepTitle="Select Category"
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>What service do you need?</Text>
          <Text style={styles.subtitle}>
            Choose the category of manual or artisan work required for your task.
          </Text>
        </View>

        <View style={styles.grid}>
          {categories.map((cat) => {
            const isSelected = draft.categoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleSelect(cat)}
                activeOpacity={0.85}
                style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    isSelected && styles.iconCircleSelected,
                  ]}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                </View>
                <View style={styles.textGroup}>
                  <Text
                    style={[
                      styles.categoryName,
                      isSelected && styles.categoryNameSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                  <Text style={styles.categoryDescription} numberOfLines={2}>
                    {cat.description}
                  </Text>
                  <Text style={styles.suggestedRateText}>
                    From {formatKoboToNaira(cat.suggestedRateKobo)}
                  </Text>
                </View>
                {isSelected && <Text style={styles.selectedCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title="Next: Location & Details"
          onPress={onNext}
          disabled={!draft.categoryId}
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
  grid: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconCircleSelected: {
    backgroundColor: Colors.surface,
  },
  categoryIcon: {
    fontSize: 24,
  },
  textGroup: {
    flex: 1,
  },
  categoryName: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    fontSize: 16,
    marginBottom: 2,
  },
  categoryNameSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  categoryDescription: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  suggestedRateText: {
    ...Typography.scale.labelSm,
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  selectedCheck: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.xs,
  },
});
