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

  const [filterTier, setFilterTier] = React.useState<'all' | 'standard' | 'care' | 'technical'>('all');

  const filteredCategories = React.useMemo(() => {
    if (filterTier === 'all') return categories;
    if (filterTier === 'technical') {
      return categories.filter(
        (c) => c.verificationTier === 'technical_trade' || (c.verificationTier as string) === 'technical'
      );
    }
    return categories.filter((c) => c.verificationTier === filterTier);
  }, [categories, filterTier]);

  const handleSelect = (cat: typeof categories[0]) => {
    updateDraft({
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      workerPayKobo: cat.suggestedRateKobo ?? draft.workerPayKobo ?? 350000,
      categoryTier: cat.verificationTier,
      minPayKobo: cat.minPayKobo ?? null,
      maxPayKobo: cat.maxPayKobo ?? null,
      aboveCategoryCeiling: false,
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
            Choose from {categories.length} verified manual and artisan trades. Enhanced categories require verified credentials.
          </Text>
        </View>

        {/* Filter Tier Tabs */}
        <View style={styles.filterRow}>
          {(['all', 'standard', 'care', 'technical'] as const).map((tier) => (
            <TouchableOpacity
              key={tier}
              style={[styles.filterPill, filterTier === tier && styles.filterPillActive]}
              onPress={() => setFilterTier(tier)}
            >
              <Text style={[styles.filterPillText, filterTier === tier && styles.filterPillTextActive]}>
                {tier === 'all'
                  ? `All (${categories.length})`
                  : tier === 'standard'
                  ? 'Standard'
                  : tier === 'care'
                  ? 'Care Tier'
                  : 'Technical'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.grid}>
          {filteredCategories.map((cat) => {
            const isSelected = draft.categoryId === cat.id;
            const isCare = cat.verificationTier === 'care';
            const isTechnical =
              cat.verificationTier === 'technical_trade' || (cat.verificationTier as string) === 'technical';

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
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.categoryName,
                        isSelected && styles.categoryNameSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                    {isCare && <Text style={styles.tierBadgeCare}>Care Tier</Text>}
                    {isTechnical && <Text style={styles.tierBadgeTech}>Technical</Text>}
                  </View>
                  <Text style={styles.categoryDescription} numberOfLines={2}>
                    {cat.description}
                  </Text>
                  {cat.suggestedRateKobo != null && (
                    <Text style={styles.suggestedRateText}>
                      From {formatKoboToNaira(cat.suggestedRateKobo)}
                    </Text>
                  )}
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
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText: {
    ...Typography.scale.labelSm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: Colors.primaryOn,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  tierBadgeCare: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondary,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  tierBadgeTech: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.tertiary,
    backgroundColor: Colors.tertiaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
});
