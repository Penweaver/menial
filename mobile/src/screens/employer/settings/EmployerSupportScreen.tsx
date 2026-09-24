/**
 * Menial Mobile - Employer Safety, Support & Legal Screen
 * 
 * Standardized 24/7 Lagos Ops Center access, dispute arbitration (Section 47),
 * and NDPA 2023 data compliance for employers.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../../constants/theme';
import { TopBar } from '../../../components/common/TopBar';
import { Card } from '../../../components/common/Card';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { EmployerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<EmployerProfileStackParamList, 'Support'>;
};

export const EmployerSupportScreen: React.FC<Props> = ({ navigation }) => {
  const handleCallSupport = () => {
    Alert.alert(
      '24/7 Lagos Operations Center',
      'Dial 0800-MENIAL-NG (0800-636425-64) for rapid response, security coordination, or escrow mediation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Toll-Free', onPress: () => Linking.openURL('tel:080063642564').catch(() => {}) },
      ]
    );
  };

  const handleWhatsAppSupport = () => {
    Alert.alert(
      'Menial WhatsApp Desk',
      'Connect with a dedicated Menial Lagos Support Agent on WhatsApp for real-time site assistance.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open WhatsApp', onPress: () => Linking.openURL('https://wa.me/23480063642564').catch(() => {}) },
      ]
    );
  };

  const handleDisputeMediation = () => {
    Alert.alert(
      'Section 47 Escrow Dispute Arbitration',
      'If work is incomplete or substandard, do not release escrow. You can raise a formal dispute directly on the active job screen. Our mediation team reviews site photos and resolves claims within 24 hours under Master Spec §47.',
      [{ text: 'Understood' }]
    );
  };

  const handleDataExport = () => {
    Alert.alert(
      'NDPA 2023 Data Archive',
      'Your request for an official NDPA personal data export (posted jobs, escrow records, and invoices) has been initiated. A password-protected ZIP archive will be sent to your registered email address within 24 hours.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <TopBar title="Safety, Support & Legal" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Rapid Support Card */}
        <Card style={styles.emergencyCard}>
          <Text style={styles.emergencyEmoji}>🚨</Text>
          <View style={styles.emergencyTextGroup}>
            <Text style={styles.emergencyTitle}>24/7 Lagos Ops Center</Text>
            <Text style={styles.emergencyDesc}>
              Toll-free hotline for on-site emergencies, safety verification, and operational escalations.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCallSupport}
            activeOpacity={0.8}
          >
            <Text style={styles.callButtonText}>📞 0800-MENIAL-NG</Text>
          </TouchableOpacity>
        </Card>

        {/* 1. Direct Assistance Channels */}
        <Text style={styles.sectionHeader}>SUPPORT CHANNELS</Text>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleWhatsAppSupport}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>💬</Text>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Live WhatsApp Support</Text>
              <Text style={styles.menuDesc}>Instant chat with our Lagos operations desk</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleDisputeMediation}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>⚖️</Text>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Escrow Dispute Mediation (§47)</Text>
              <Text style={styles.menuDesc}>How escrow funds are arbitrated during disagreements</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('SafetyCenter')}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>🛡️</Text>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Emergency SOS &amp; Trusted Contacts</Text>
              <Text style={styles.menuDesc}>Manage emergency contacts, 112/767 hotlines, SOS test mode</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        </Card>

        {/* 2. Privacy & Regulatory Compliance */}
        <Text style={styles.sectionHeader}>NDPA 2023 &amp; REGULATORY</Text>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleDataExport}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>📦</Text>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Export Personal Data Archive</Text>
              <Text style={styles.menuDesc}>Section 80 Right to Data Portability (JSON/CSV archive)</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              Alert.alert(
                'NDPA 2023 Compliance',
                'Menial is registered and compliant with the Nigeria Data Protection Act 2023. All identity and transaction records are encrypted using AES-256 with role-restricted administrative access.',
                [{ text: 'Close' }]
              );
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>📜</Text>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Terms of Service &amp; Privacy Policy</Text>
              <Text style={styles.menuDesc}>NDPA 2023 §80 • CBN Escrow Guidelines</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
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
  emergencyCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emergencyEmoji: {
    fontSize: 36,
    marginBottom: Spacing.xs,
  },
  emergencyTextGroup: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emergencyTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
  },
  emergencyDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  callButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  callButtonText: {
    ...Typography.scale.labelLg,
    color: '#FFFFFF',
    fontWeight: '700',
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
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  menuIcon: {
    fontSize: 24,
  },
  menuTextGroup: {
    flex: 1,
  },
  menuTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
  },
  menuDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
});
