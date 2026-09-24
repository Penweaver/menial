/**
 * Menial Mobile - Employer App & Operational Preferences Screen
 * 
 * Standardized configuration for dispatch tracking notifications, escrow release alerts,
 * and security controls. Conforms to Master Specification §49 and CBN Consumer Protection.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../../constants/theme';
import { TopBar } from '../../../components/common/TopBar';
import { Card } from '../../../components/common/Card';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { useEmployer } from '../../../context/EmployerContext';
import { EmployerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<EmployerProfileStackParamList, 'Preferences'>;
};

export const EmployerPreferencesScreen: React.FC<Props> = ({ navigation }) => {
  const { settings, updateSettings } = useEmployer();

  return (
    <View style={styles.container}>
      <TopBar title="Employer Preferences" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 1. Job Dispatch & Tracking Alerts */}
        <Text style={styles.sectionHeader}>DISPATCH &amp; SITE ALERTS (§49)</Text>
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Worker Arrival &amp; Check-In Alerts</Text>
              <Text style={styles.settingDesc}>
                Receive immediate push alert and photo verification when your hired worker arrives at the job site.
              </Text>
            </View>
            <Switch
              value={settings.arrivalAlerts}
              onValueChange={(val) => updateSettings({ arrivalAlerts: val })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>SMS Escrow Notifications</Text>
              <Text style={styles.settingDesc}>
                Real-time SMS updates when escrow funds are secured or released to the worker.
              </Text>
            </View>
            <Switch
              value={settings.smsReceipts}
              onValueChange={(val) => updateSettings({ smsReceipts: val })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* 2. Billing & Invoicing Preferences */}
        <Text style={styles.sectionHeader}>BILLING &amp; TAX RECEIPTS</Text>
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Automated Email VAT Invoices</Text>
              <Text style={styles.settingDesc}>
                Automatically deliver detailed Nigerian tax invoices (FIRS compliant) to your email upon job completion.
              </Text>
            </View>
            <Switch
              value={settings.emailInvoices}
              onValueChange={(val) => updateSettings({ emailInvoices: val })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Instant Escrow Authorization</Text>
              <Text style={styles.settingDesc}>
                Permit 1-click escrow funding for recurring jobs under ₦50,000 using your default saved card.
              </Text>
            </View>
            <Switch
              value={settings.instantEscrowFunding}
              onValueChange={(val) => updateSettings({ instantEscrowFunding: val })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* 3. Security & App Access */}
        <Text style={styles.sectionHeader}>SECURITY &amp; ACCESS CONTROL</Text>
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Biometric Escrow Confirmation</Text>
              <Text style={styles.settingDesc}>
                Require Fingerprint or FaceID before authorizing final escrow release to workers.
              </Text>
            </View>
            <Switch
              value={settings.biometricAuth}
              onValueChange={(val) => updateSettings({ biometricAuth: val })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  settingTextGroup: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  settingDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
});
