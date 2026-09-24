/**
 * Menial Mobile - Employer Company & Site Details Screen
 * 
 * Standardized employer identity and default job site management conforming to
 * Master Specification §22 and NDPA §80.
 * Configures contact individual, entity classification, and primary dispatch location in Lagos.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../../constants/theme';
import { TopBar } from '../../../components/common/TopBar';
import { Card } from '../../../components/common/Card';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { useEmployer } from '../../../context/EmployerContext';
import { EmployerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<EmployerProfileStackParamList, 'CompanyDetails'>;
};

const BUSINESS_TYPES = [
  'Individual / Homeowner',
  'Property Manager',
  'Corporate / SME',
  'Construction Contractor',
] as const;

const LAGOS_LGAS = [
  'Eti-Osa',
  'Ikeja',
  'Lagos Island',
  'Lagos Mainland',
  'Surulere',
  'Ibeju-Lekki',
  'Alimosho',
  'Kosofe',
];

export const EmployerCompanyDetailsScreen: React.FC<Props> = ({ navigation }) => {
  const { profile, updateProfile, isLoading } = useEmployer();

  const [fullName, setFullName] = useState(profile.fullName);
  const [companyName, setCompanyName] = useState(profile.companyName);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [locationAddress, setLocationAddress] = useState(profile.defaultLocationAddress);
  const [lga, setLga] = useState(profile.defaultLga);
  const [businessType, setBusinessType] = useState(profile.businessType);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSavedSuccess(false);

    if (!fullName.trim()) {
      setError('Please provide the primary contact person full name.');
      return;
    }
    if (!companyName.trim()) {
      setError('Please specify your entity or estate name.');
      return;
    }
    if (!locationAddress.trim()) {
      setError('Please provide a default job site address in Lagos.');
      return;
    }

    const result = await updateProfile({
      fullName: fullName.trim(),
      companyName: companyName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      defaultLocationAddress: locationAddress.trim(),
      defaultLga: lga,
      businessType,
    });

    if (result.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } else {
      setError(result.error || 'Failed to update employer details.');
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Company & Site Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>💼</Text>
          </View>
          <Text style={styles.avatarTitle}>{companyName || 'Employer Profile'}</Text>
          <Text style={styles.avatarSub}>{businessType} • Verified Employer</Text>
        </View>

        {savedSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ Company details successfully updated.</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 1. Entity Classification */}
        <Text style={styles.sectionHeader}>ENTITY TYPE</Text>
        <View style={styles.typePillsRow}>
          {BUSINESS_TYPES.map((type) => {
            const isSelected = businessType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typePill, isSelected && styles.typePillActive]}
                onPress={() => setBusinessType(type)}
                activeOpacity={0.7}
              >
                <Text style={[styles.typePillText, isSelected && styles.typePillTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Primary Contact & Organization */}
        <Text style={styles.sectionHeader}>PRIMARY CONTACT & ENTITY</Text>
        <Card style={styles.card}>
          <Input
            label="Organization / Household Name"
            placeholder="e.g. Bakare Estates & Properties"
            value={companyName}
            onChangeText={setCompanyName}
            containerStyle={styles.inputGap}
          />

          <Input
            label="Contact Person Name"
            placeholder="e.g. Olumide Bakare"
            value={fullName}
            onChangeText={setFullName}
            containerStyle={styles.inputGap}
          />

          <Input
            label="Official Email Address"
            placeholder="e.g. olumide@bakareestates.ng"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={styles.inputGap}
          />

          <Input
            label="Verified Phone Number"
            placeholder="+234 802 000 0000"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={false}
          />
          <Text style={styles.inputHelperText}>
            Phone verified via OTP (§9, §43). Contact support to change.
          </Text>
        </Card>

        {/* 3. Default Job Site Location */}
        <Text style={styles.sectionHeader}>DEFAULT LAGOS JOB SITE</Text>
        <Card style={styles.card}>
          <Input
            label="Street & Building Address"
            placeholder="e.g. Block 4, Admiralty Way, Lekki Phase 1"
            value={locationAddress}
            onChangeText={setLocationAddress}
            containerStyle={styles.inputGap}
          />
          <Text style={styles.inputHelperText}>
            Auto-fills dispatch location when creating new jobs (§29).
          </Text>

          <Text style={styles.subLabel}>Lagos Local Government Area (LGA)</Text>
          <View style={styles.lgaRow}>
            {LAGOS_LGAS.slice(0, 6).map((item) => {
              const isSelected = lga.toLowerCase().includes(item.toLowerCase());
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.lgaChip, isSelected && styles.lgaChipActive]}
                  onPress={() => setLga(`${item}, Lagos`)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.lgaChipText, isSelected && styles.lgaChipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Button
          title={isLoading ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          variant="primary"
          size="lg"
          loading={isLoading}
          style={styles.saveButton}
        />

        <ScreenFooter variant="compact" />
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
  avatarCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  avatarTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
  },
  avatarSub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  successBanner: {
    backgroundColor: Colors.secondaryContainer,
    borderColor: Colors.secondary,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  successText: {
    ...Typography.scale.bodySm,
    color: Colors.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: Colors.dangerContainer,
    borderColor: Colors.danger,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.scale.bodySm,
    color: Colors.danger,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputHelperText: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    ...Typography.scale.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
    marginLeft: 4,
    fontWeight: '600',
  },
  card: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  inputGap: {
    marginBottom: Spacing.md,
  },
  typePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  typePill: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  typePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typePillText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  typePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  subLabel: {
    ...Typography.scale.labelSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  lgaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  lgaChip: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  lgaChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  lgaChipText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
  },
  lgaChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
});
