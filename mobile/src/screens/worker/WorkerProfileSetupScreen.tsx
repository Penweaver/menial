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
import type { EmergencyContact } from '@shared/services/trust/TrustSafetyService';

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>(profile.categoryIds || []);
  const [categoryRatesNaira, setCategoryRatesNaira] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (profile.categoryRates) {
      for (const [catId, kobo] of Object.entries(profile.categoryRates)) {
        initial[catId] = String(Math.floor(kobo / 100));
      }
    }
    return initial;
  });
  const [rateNaira, setRateNaira] = useState(
    profile.indicativeRateKobo ? String(Math.floor(profile.indicativeRateKobo / 100)) : '3500'
  );
  const [rateUnit, setRateUnit] = useState<'hour' | 'day'>('hour');
  const [serviceRadius, setServiceRadius] = useState<number>(profile.serviceRadiusKm || 15);
  
  // Emergency contact state (§L)
  const [emergencyName, setEmergencyName] = useState(profile.emergencyContact?.name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(profile.emergencyContact?.phone || '');
  const [emergencyRelationship, setEmergencyRelationship] = useState(profile.emergencyContact?.relationship || 'Spouse');
  
  const [error, setError] = useState<string | null>(null);

  const MAX_CATEGORIES = 5;

  const toggleCategory = (catId: string) => {
    setError(null);
    if (selectedCategories.includes(catId)) {
      setSelectedCategories((prev) => prev.filter((id) => id !== catId));
    } else {
      if (selectedCategories.length >= MAX_CATEGORIES) {
        Alert.alert(
          'Category Limit Reached',
          `You can select a maximum of ${MAX_CATEGORIES} categories per worker profile (§I). Deselect an existing category first.`
        );
        setError(`Category limit reached: Maximum ${MAX_CATEGORIES} categories allowed (§I).`);
        return;
      }
      setSelectedCategories((prev) => [...prev, catId]);
    }
  };

  const handleCategoryRateChange = (catId: string, val: string) => {
    const clean = val.replace(/\D/g, '');
    setCategoryRatesNaira((prev) => ({ ...prev, [catId]: clean }));
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

    if (selectedCategories.length > MAX_CATEGORIES) {
      setError(`Maximum ${MAX_CATEGORIES} categories allowed (§I).`);
      return;
    }

    const parsedRateNaira = parseInt(rateNaira.replace(/\D/g, ''), 10);
    if (isNaN(parsedRateNaira) || parsedRateNaira < 500) {
      setError('Please enter a valid baseline indicative wage (minimum ₦500).');
      return;
    }

    // Validate emergency contact details (§L)
    if (!emergencyName.trim()) {
      setError('Emergency contact name is required for safety protocols (§L).');
      return;
    }
    const cleanPhone = emergencyPhone.replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid emergency contact phone number (at least 10 digits).');
      return;
    }

    // Convert integer Naira to integer kobo per §4, §22
    const indicativeRateKobo = parsedRateNaira * 100;

    const categoryRatesKobo: Record<string, number> = {};
    for (const catId of selectedCategories) {
      const customRate = categoryRatesNaira[catId];
      if (customRate) {
        const parsed = parseInt(customRate, 10);
        if (!isNaN(parsed) && parsed >= 500) {
          categoryRatesKobo[catId] = parsed * 100;
        }
      }
    }

    const emergencyContact: EmergencyContact = {
      id: profile.emergencyContact?.id || `emc_${Date.now()}`,
      name: emergencyName.trim(),
      phone: cleanPhone,
      relationship: emergencyRelationship.trim(),
      isPrimary: true,
    };

    const result = await saveProfile({
      bio: bio.trim(),
      indicativeRateKobo,
      serviceRadiusKm: serviceRadius,
      categoryIds: selectedCategories,
      categoryRates: categoryRatesKobo,
      emergencyContact,
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
              Selected: {selectedCategories.length} / {MAX_CATEGORIES} (Max 5 categories per worker)
            </Text>
          </View>
          <Text style={styles.sectionHint}>
            Choose up to 5 categories you are qualified to perform (§I). Enhanced categories require tiered verification.
          </Text>

          <View style={styles.categoryChipsContainer}>
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              const isCare = cat.verificationTier === 'care';
              const isTechnical =
                cat.verificationTier === 'technical_trade' || (cat.verificationTier as string) === 'technical';

              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => toggleCategory(cat.id)}
                  activeOpacity={0.8}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected,
                    (isCare || isTechnical) && styles.categoryChipTiered,
                  ]}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <View style={styles.categoryChipTextGroup}>
                    <Text
                      style={[
                        styles.categoryName,
                        isSelected && styles.categoryNameSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                    {isCare && <Text style={styles.tierPillCare}>Care Tier</Text>}
                    {isTechnical && <Text style={styles.tierPillTech}>Technical</Text>}
                  </View>
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
            label="Baseline Rate in Naira (₦)"
            placeholder="3500"
            value={rateNaira}
            onChangeText={(val) => setRateNaira(val.replace(/\D/g, ''))}
            keyboardType="number-pad"
            style={styles.rateInput}
          />
          <Text style={styles.ratePreviewText}>
            Default displayed as:{' '}
            <Text style={styles.ratePreviewHighlight}>
              ₦{parseInt(rateNaira || '0', 10).toLocaleString('en-NG')} / {rateUnit}
            </Text>
          </Text>

          {/* Optional Individual Indicative Rates per Category (§I) */}
          {selectedCategories.length > 0 && (
            <View style={styles.customRatesSection}>
              <Text style={styles.customRatesTitle}>Category-Specific Rates (Optional)</Text>
              <Text style={styles.customRatesHint}>
                Specify custom rates for specific trades if they differ from your baseline.
              </Text>
              {selectedCategories.map((catId) => {
                const cat = categories.find((c) => c.id === catId);
                if (!cat) return null;
                return (
                  <View key={catId} style={styles.customRateRow}>
                    <Text style={styles.customRateLabel}>{cat.name}</Text>
                    <View style={styles.customRateInputWrapper}>
                      <Text style={styles.customRateCurrency}>₦</Text>
                      <Input
                        placeholder={rateNaira || '3500'}
                        value={categoryRatesNaira[catId] || ''}
                        onChangeText={(val) => handleCategoryRateChange(catId, val)}
                        keyboardType="number-pad"
                        style={styles.customRateInput}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
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

        {/* Section 5: Emergency Contact (§L) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact (§L)</Text>
          <Text style={styles.sectionHint}>
            Required for on-duty safety monitoring, check-ins, and emergency dispatch protocols.
          </Text>

          <Input
            label="Contact Full Name"
            placeholder="e.g. Chioma Adebayo"
            value={emergencyName}
            onChangeText={setEmergencyName}
            style={styles.fieldInput}
          />

          <Input
            label="Relationship"
            placeholder="e.g. Spouse, Brother, Sister, Parent"
            value={emergencyRelationship}
            onChangeText={setEmergencyRelationship}
            style={styles.fieldInput}
          />

          <Input
            label="Contact Phone Number"
            placeholder="e.g. +2348012345678"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            keyboardType="phone-pad"
            style={styles.fieldInput}
          />
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
  categoryChipTiered: {
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryChipTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierPillCare: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondary,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  tierPillTech: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.tertiary,
    backgroundColor: Colors.tertiaryContainer,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  customRatesSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  customRatesTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  customRatesHint: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  customRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  customRateLabel: {
    ...Typography.scale.bodyMd,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  customRateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 130,
  },
  customRateCurrency: {
    ...Typography.scale.headlineSm,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  customRateInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    fontWeight: '600',
  },
  fieldInput: {
    marginBottom: Spacing.md,
  },
});
