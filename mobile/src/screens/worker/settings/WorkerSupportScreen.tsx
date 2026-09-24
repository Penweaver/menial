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
import { Button } from '../../../components/common/Button';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { WorkerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<WorkerProfileStackParamList, 'Support'>;
};

export const WorkerSupportScreen: React.FC<Props> = ({ navigation }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleCallSupport = () => {
    Alert.alert(
      '24/7 Operations Command',
      'Call Menial Lagos HQ Emergency Gateway: 0800-MENIAL-NG (+234 1 888 6364)?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Now', onPress: () => {} },
      ]
    );
  };

  const handleDownloadData = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <TopBar title="Safety, Support & Legal" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 24/7 Rapid Incident Command */}
        <Card style={styles.hotlineCard}>
          <View style={styles.hotlineIconCircle}>
            <Text style={styles.hotlineIcon}>📞</Text>
          </View>
          <Text style={styles.hotlineTitle}>24/7 Lagos HQ Operations Gateway</Text>
          <Text style={styles.hotlineDesc}>
            Immediate response for on-site physical disputes, safety emergencies, or payment settlement holds.
          </Text>
          <Button
            title="Call 0800-MENIAL-NG (Toll Free)"
            onPress={handleCallSupport}
            style={styles.hotlineBtn}
          />
          <Button
            title="🛡️ Emergency Contacts & SOS Center"
            variant="outline"
            onPress={() => navigation.navigate('SafetyCenter')}
            style={styles.safetyCenterBtn}
          />
        </Card>

        {/* Worker Bill of Rights */}
        <Text style={styles.sectionHeader}>WORKER PROTECTION STANDARDS</Text>
        <Card style={styles.rightsCard}>
          <View style={styles.rightItem}>
            <Text style={styles.rightEmoji}>🔒</Text>
            <View style={styles.rightInfo}>
              <Text style={styles.rightTitle}>100% Escrow Guarantee (§39)</Text>
              <Text style={styles.rightDesc}>
                Employer funds are locked securely before you begin traveling. No completed job goes unpaid.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.rightItem}>
            <Text style={styles.rightEmoji}>⚖️</Text>
            <View style={styles.rightInfo}>
              <Text style={styles.rightTitle}>Fair Minimum Wage (§40)</Text>
              <Text style={styles.rightDesc}>
                Zero undercutting: hourly and daily compensation floors are strictly protected across trades.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.rightItem}>
            <Text style={styles.rightEmoji}>🛡️</Text>
            <View style={styles.rightInfo}>
              <Text style={styles.rightTitle}>Non-Silent Dispute Resolution (§47)</Text>
              <Text style={styles.rightDesc}>
                Disputes are mediated by certified Menial Trust &amp; Safety officers with photographic evidence.
              </Text>
            </View>
          </View>
        </Card>

        {/* NDPA 2023 Data Privacy Rights */}
        <Text style={styles.sectionHeader}>NDPA DATA PRIVACY &amp; SECURITY (§80)</Text>
        <Card style={styles.privacyCard}>
          <Text style={styles.privacyDesc}>
            Under the Nigeria Data Protection Act 2023, your National Identity Number (NIN) is stored with irreversible masking and never revealed to employers or third parties.
          </Text>

          {downloadSuccess && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✓ Data archive generated and sent to registered phone!</Text>
            </View>
          )}

          <Button
            title={downloading ? 'Preparing Archive...' : 'Download My Personal Data Archive'}
            variant="outline"
            onPress={handleDownloadData}
            loading={downloading}
            style={styles.privacyBtn}
          />
        </Card>

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
  hotlineCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
  },
  hotlineIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  hotlineIcon: {
    fontSize: 22,
  },
  hotlineTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  hotlineDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  hotlineBtn: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  safetyCenterBtn: {
    width: '100%',
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
  rightsCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  rightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  rightEmoji: {
    fontSize: 20,
    marginTop: 2,
  },
  rightInfo: {
    flex: 1,
  },
  rightTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  rightDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  privacyCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  privacyDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  privacyBtn: {
    width: '100%',
  },
  successBox: {
    backgroundColor: Colors.secondaryContainer,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  successText: {
    ...Typography.scale.labelSm,
    color: Colors.secondaryText,
    fontWeight: '700',
    fontSize: 11,
  },
});
