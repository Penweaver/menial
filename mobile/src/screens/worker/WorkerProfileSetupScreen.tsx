import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors, Typography, Spacing, Radii, Layout, formatKoboToNaira } from '../../constants/theme';
import { TopBar } from '../../components/common/TopBar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { useWorker } from '../../context/WorkerContext';

interface WorkerProfileSetupScreenProps {
  onComplete?: () => void;
  onBack?: () => void;
}

export const WorkerProfileSetupScreen: React.FC<WorkerProfileSetupScreenProps> = ({
  onComplete,
  onBack,
}) => {
  const { profile, categories, saveProfile, isLoading } = useWorker();

  const [bio, setBio] = useState(profile.bio);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(profile.categoryIds);
  const [rateNaira, setRateNaira] = useState(
    profile.indicativeRateKobo ? String(Math.floor(profile.indicativeRateKobo / 100)) : '3500'
  );
  const [rateUnit, setRateUnit] = useState<'hour' | 'day'>('hour');
  const [serviceRadius, setServiceRadius] = useState<number>(profile.serviceRadiusKm || 15);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSave = async () => {
    setError(null);
    if (!bio.trim() || bio.trim().length < 15) {
      setError('Please provide a brief bio (minimum 15 characters) describing your experience.');
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Please select at least one service category.');
      return;
    }

    const parsedRateNaira = parseInt(rateNaira.replace(/\D/g, ''), 10);
    if (isNaN(parsedRateNaira) || parsedRateNaira < 500) {
      setError('Please enter a valid indicative wage (minimum ₦500).');
      return;
    }

    // Convert integer Naira to integer kobo per §4, §22
    const indicativeRateKobo = parsedRateNaira * 100;

    const result = await saveProfile({
      bio: bio.trim(),
      indicativeRateKobo,
      serviceRadiusKm: serviceRadius,
      categoryIds: selectedCategories,
    });

    if (result.success) {
      if (onComplete) onComplete();
    } else {
      setError(result.error || 'Failed to save profile.');
    }
  };

  const radiusOptions = [5, 10, 15, 25, 50];

  return (
    <View style={styles.container}>
      <TopBar title="Worker Profile Setup" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Set Up Your Work Profile</Text>
          <Text style={styles.subtitle}>
            Provide your skills and hourly or daily expectations to appear on the marketplace feed.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Section 1: Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Select Your Service Categories</Text>
            <Text style={styles.categoryCountBadge}>
              {selectedCategories.length} selected
            </Text>
          </View>
          <Text style={styles.sectionHint}>
            Choose all areas of manual or artisan work you are qualified to perform.
          </Text>

          <View style={styles.categoryChipsContainer}>
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => toggleCategory(cat.id)}
                  activeOpacity={0.8}
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryName,
                      isSelected && styles.categoryNameSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: Wage Expectations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicative Wage Rate</Text>
          <Text style={styles.sectionHint}>
            Suggested baseline pay employers see on your card. Stored in integer kobo per §4.
          </Text>

          <View style={styles.rateToggleRow}>
            <TouchableOpacity
              style={[styles.unitToggle, rateUnit === 'hour' && styles.unitToggleActive]}
              onPress={() => setRateUnit('hour')}
            >
              <Text
                style={[
                  styles.unitToggleText,
                  rateUnit === 'hour' && styles.unitToggleTextActive,
                ]}
              >
                Per Hour (/hr)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitToggle, rateUnit === 'day' && styles.unitToggleActive]}
              onPress={() => setRateUnit('day')}
            >
              <Text
                style={[
                  styles.unitToggleText,
                  rateUnit === 'day' && styles.unitToggleTextActive,
                ]}
              >
                Per Day (/day)
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Rate in Naira (₦)"
            placeholder="3500"
            value={rateNaira}
            onChangeText={(val) => setRateNaira(val.replace(/\D/g, ''))}
            keyboardType="number-pad"
            style={styles.rateInput}
          />
          <Text style={styles.ratePreviewText}>
            Displayed as:{' '}
            <Text style={styles.ratePreviewHighlight}>
              ₦{parseInt(rateNaira || '0', 10).toLocaleString('en-NG')} / {rateUnit}
            </Text>
          </Text>
        </View>

        {/* Section 3: Service Radius */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Maximum Service Radius</Text>
          <Text style={styles.sectionHint}>
            How far are you willing to travel from your base location for jobs?
          </Text>

          <View style={styles.radiusPillRow}>
            {radiusOptions.map((km) => {
              const isActive = serviceRadius === km;
              return (
                <TouchableOpacity
                  key={km}
                  style={[styles.radiusPill, isActive && styles.radiusPillActive]}
                  onPress={() => setServiceRadius(km)}
                >
                  <Text
                    style={[
                      styles.radiusPillText,
                      isActive && styles.radiusPillTextActive,
                    ]}
                  >
                    {km} km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 4: Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Bio</Text>
          <Text style={styles.sectionHint}>
            Introduce your work experience, reliability, and tools you possess.
          </Text>
          <Input
            placeholder="e.g. Reliable and punctual house painter and general cleaner with 4+ years of residential experience in Lagos..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            style={styles.bioInput}
          />
          <Text style={styles.bioCharCount}>{bio.length} characters</Text>
        </View>

        <Button
          title="Save & Proceed to Verification"
          onPress={handleSave}
          loading={isLoading}
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
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
  },
  categoryCountBadge: {
    ...Typography.scale.labelSm,
    color: Colors.primary,
    fontWeight: '700',
  },
  sectionHint: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryName: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
  },
  categoryNameSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  checkMark: {
    marginLeft: 6,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  rateToggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  unitToggle: {
    flex: 1,
    height: 42,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSubtle,
  },
  unitToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitToggleText: {
    ...Typography.scale.labelMd,
    color: Colors.textSecondary,
  },
  unitToggleTextActive: {
    color: Colors.primaryOn,
    fontWeight: '700',
  },
  rateInput: {
    ...Typography.scale.headlineSm,
    fontWeight: '700',
  },
  ratePreviewText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginTop: -Spacing.xs,
  },
  ratePreviewHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  radiusPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  radiusPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSubtle,
  },
  radiusPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radiusPillText: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
  },
  radiusPillTextActive: {
    color: Colors.primaryOn,
    fontWeight: '700',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  bioCharCount: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});
