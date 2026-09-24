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
import { useWorker } from '../../../context/WorkerContext';
import { WorkerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<WorkerProfileStackParamList, 'Preferences'>;
};

export const WorkerPreferencesScreen: React.FC<Props> = ({ navigation }) => {
  const { settings, updateSettings } = useWorker();

  return (
    <View style={styles.container}>
      <TopBar title="Work & App Preferences" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Availability Section */}
        <Text style={styles.sectionHeader}>DISPATCH AVAILABILITY</Text>
        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Available for Instant Dispatch</Text>
              <Text style={styles.settingDesc}>
                When enabled, employers within your service radius can discover your profile and send job requests.
              </Text>
            </View>
            <Switch
              value={settings.availableForDispatch}
              onValueChange={(val) => updateSettings({ availableForDispatch: val })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Notifications Section */}
        <Text style={styles.sectionHeader}>JOB ALERTS &amp; NOTIFICATIONS</Text>
        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Instant Push Notifications</Text>
              <Text style={styles.settingDesc}>
                Real-time alerts for nearby job postings matching your trade categories.
              </Text>
            </View>
            <Switch
              value={settings.pushAlerts}
              onValueChange={(val) => updateSettings({ pushAlerts: val })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>SMS Notification Backup</Text>
              <Text style={styles.settingDesc}>
                Receive SMS alerts for job offers when your mobile data is turned off (§2).
              </Text>
            </View>
            <Switch
              value={settings.smsAlerts}
              onValueChange={(val) => updateSettings({ smsAlerts: val })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Security & Wallet Protection */}
        <Text style={styles.sectionHeader}>WALLET &amp; SECURITY PROTECTION</Text>
        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Biometric Withdrawal Lock</Text>
              <Text style={styles.settingDesc}>
                Require Fingerprint or Face ID confirmation before disbursing wallet funds to your bank (§41).
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
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  settingCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingDesc: {
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
});
