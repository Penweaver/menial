/**
 * Menial Mobile - Worker Personal Details & Profile Screen
 * 
 * Standardized personal profile management conforming to Master Specification §22 and NDPA §80.
 * Allows verified workers to manage identity presentation, coverage area, and emergency contacts.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../../constants/theme';
import { TopBar } from '../../../components/common/TopBar';
import { Card } from '../../../components/common/Card';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { useWorker } from '../../../context/WorkerContext';
import { WorkerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<WorkerProfileStackParamList, 'PersonalDetails'>;
};

export const WorkerPersonalDetailsScreen: React.FC<Props> = ({ navigation }) => {
  const { personalDetails, updatePersonalDetails, isLoading } = useWorker();

  const [fullName, setFullName] = useState(personalDetails.fullName);
  const [bio, setBio] = useState(personalDetails.bio);
  const [locationName, setLocationName] = useState(personalDetails.locationName);
  const [emergencyName, setEmergencyName] = useState(personalDetails.emergencyContactName);
  const [emergencyPhone, setEmergencyPhone] = useState(personalDetails.emergencyContactPhone);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSavedSuccess(false);

    if (!fullName.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!locationName.trim()) {
      setError('Please specify your primary service location.');
      return;
    }

    const result = await updatePersonalDetails({
      fullName: fullName.trim(),
      bio: bio.trim(),
      locationName: locationName.trim(),
      emergencyContactName: emergencyName.trim(),
      emergencyContactPhone: emergencyPhone.trim(),
    });

    if (result.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } else {
      setError(result.error || 'Failed to update personal details.');
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Personal Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👷</Text>
          </View>
          <Text style={styles.avatarTitle}>{fullName || 'Worker Profile'}</Text>
          <Text style={styles.avatarSub}>Verified Service Provider</Text>
        </View>

        {savedSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ Personal details successfully saved.</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Basic Information */}
        <Text style={styles.sectionHeader}>BASIC IDENTIFICATION</Text>
        <Card style={styles.card}>
          <Input
            label="Full Legal Name"
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              setSavedSuccess(false);
            }}
            placeholder="e.g. Adebayo Ogunlesi"
          />

          <View style={styles.inputSpacing} />

          <Input
            label="Phone Number (Verified via OTP)"
            value={personalDetails.phone}
            editable={false}
          />
          <Text style={styles.phoneHelperText}>
            Account security: phone number changes require re-verification.
          </Text>

          <View style={styles.inputSpacing} />

          <Input
            label="Primary Base / Location"
            value={locationName}
            onChangeText={(t) => {
              setLocationName(t);
              setSavedSuccess(false);
            }}
            placeholder="e.g. Lekki Phase 1, Lagos"
          />
        </Card>

        {/* Professional Bio */}
        <Text style={styles.sectionHeader}>PROFESSIONAL SUMMARY</Text>
        <Card style={styles.card}>
          <Input
            label="About Your Work Experience"
            value={bio}
            onChangeText={(t) => {
              setBio(t);
              setSavedSuccess(false);
            }}
            placeholder="Describe your trade experience and dependability..."
            multiline
            numberOfLines={4}
          />
        </Card>

        {/* Emergency Contact */}
        <Text style={styles.sectionHeader}>SAFETY &amp; EMERGENCY CONTACT (§49)</Text>
        <Card style={styles.card}>
          <Input
            label="Emergency Contact Name"
            value={emergencyName}
            onChangeText={(t) => {
              setEmergencyName(t);
              setSavedSuccess(false);
            }}
            placeholder="e.g. Next of Kin / Spouse"
          />

          <View style={styles.inputSpacing} />

          <Input
            label="Emergency Contact Phone"
            value={emergencyPhone}
            onChangeText={(t) => {
              setEmergencyPhone(t);
              setSavedSuccess(false);
            }}
            placeholder="e.g. 0802 111 2222"
            keyboardType="phone-pad"
          />
        </Card>

        {/* Save Button */}
        <Button
          title="Save Details"
          onPress={handleSave}
          loading={isLoading}
          style={styles.saveBtn}
        />

        {/* Clean Standardized Screen Footer */}
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
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  avatarTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 2,
  },
  avatarSub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  sectionHeader: {
    ...Typography.scale.labelSm,
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  card: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputSpacing: {
    height: Spacing.md,
  },
  saveBtn: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  successBanner: {
    backgroundColor: Colors.secondaryContainer,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    alignItems: 'center',
  },
  successText: {
    ...Typography.scale.labelSm,
    color: Colors.secondaryText,
    fontWeight: '700',
    fontSize: 12,
  },
  errorBanner: {
    backgroundColor: Colors.dangerContainer,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    alignItems: 'center',
  },
  errorText: {
    ...Typography.scale.labelSm,
    color: Colors.dangerText,
    fontWeight: '700',
    fontSize: 12,
  },
  phoneHelperText: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});
