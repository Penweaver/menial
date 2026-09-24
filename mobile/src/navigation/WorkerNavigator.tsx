import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii, formatKoboToNaira } from '../constants/theme';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { TopBar } from '../components/common/TopBar';
import { useAuth } from '../context/AuthContext';
import { WorkerProvider, useWorker } from '../context/WorkerContext';
import { WorkerTabParamList, WorkerProfileStackParamList } from './types';
import { WorkerProfileSetupScreen } from '../screens/worker/WorkerProfileSetupScreen';
import { WorkerVerificationScreen } from '../screens/worker/WorkerVerificationScreen';
import { VerificationStatusScreen } from '../screens/worker/VerificationStatusScreen';
import { WorkerActiveJobScreen } from '../screens/worker/execution/WorkerActiveJobScreen';
import { WorkerWalletScreen } from '../screens/worker/wallet/WorkerWalletScreen';
import { WorkerJobHistoryScreen } from '../screens/worker/wallet/WorkerJobHistoryScreen';
import { WorkerPayoutSettingsScreen } from '../screens/worker/settings/WorkerPayoutSettingsScreen';
import { WorkerPreferencesScreen } from '../screens/worker/settings/WorkerPreferencesScreen';
import { WorkerSupportScreen } from '../screens/worker/settings/WorkerSupportScreen';

const Tab = createBottomTabNavigator<WorkerTabParamList>();
const Stack = createNativeStackNavigator<WorkerProfileStackParamList>();

type ProfileHomeScreenProps = {
  navigation: NativeStackNavigationProp<WorkerProfileStackParamList, 'ProfileHome'>;
};

const WorkerProfileHomeScreen: React.FC<ProfileHomeScreenProps> = ({ navigation }) => {
  const { session, selectRole, logout } = useAuth();
  const { profile, verification, categories, payoutBank, settings, updateSettings } = useWorker();

  const activeCategories = categories.filter((c) =>
    profile.categoryIds.includes(c.id)
  );

  return (
    <View style={styles.screen}>
      <TopBar title="Worker Account & Settings" />
      <ScrollView contentContainerStyle={styles.profileContent} showsVerticalScrollIndicator={false}>
        {/* Worker Identity Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>👷</Text>
          </View>
          <Text style={styles.profileName}>Verified Professional Worker</Text>
          <Text style={styles.profilePhone}>{session?.phone || '+234 803 333 4444'}</Text>
          
          <View style={styles.ratingAndBadgeRow}>
            <Badge
              label={
                verification.status === 'verified'
                  ? 'VERIFIED PRO'
                  : verification.status.toUpperCase()
              }
              type={
                verification.status === 'verified'
                  ? 'verified'
                  : verification.status === 'pending'
                  ? 'pending'
                  : verification.status === 'rejected'
                  ? 'rejected'
                  : 'neutral'
              }
            />
            <Badge label="★ 4.9 (42 jobs)" type="rating" />
          </View>

          {/* Quick Availability Switch in Header */}
          <View style={styles.availabilityHeaderRow}>
            <View style={styles.availabilityTextGroup}>
              <View style={styles.onlineStatusRow}>
                <View
                  style={[
                    styles.onlineDot,
                    { backgroundColor: settings.availableForDispatch ? Colors.secondary : Colors.textMuted },
                  ]}
                />
                <Text style={styles.availabilityTitle}>
                  {settings.availableForDispatch ? 'Available for Dispatch' : 'Currently Offline'}
                </Text>
              </View>
              <Text style={styles.availabilitySub}>
                {settings.availableForDispatch ? 'Visible to nearby employers' : 'Hidden from search'}
              </Text>
            </View>
            <Switch
              value={settings.availableForDispatch}
              onValueChange={(val) => updateSettings({ availableForDispatch: val })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* 1. Identity & Government Verification Card */}
        <Card
          style={styles.menuCard}
          onPress={() => {
            if (verification.status === 'unverified') {
              navigation.navigate('NINVerification');
            } else {
              navigation.navigate('VerificationStatus');
            }
          }}
        >
          <View style={styles.menuCardRow}>
            <Text style={styles.menuIcon}>
              {verification.status === 'verified' ? '🛡️' : '📋'}
            </Text>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Identity &amp; NIN Verification</Text>
              <Text style={styles.menuDesc}>
                {verification.status === 'verified'
                  ? 'NIMC Verified • NDPA masked (Section 80)'
                  : 'Submit National Identity Number to unlock jobs'}
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </Card>

        {/* 2. Work Profile, Trades & Rates */}
        <Card
          style={styles.menuCard}
          onPress={() => navigation.navigate('ProfileSetup')}
        >
          <View style={styles.menuCardRow}>
            <Text style={styles.menuIcon}>💼</Text>
            <View style={styles.menuTextGroup}>
              <View style={styles.menuTitleRow}>
                <Text style={styles.menuTitle}>Work Profile &amp; Trade Skills</Text>
                <Text style={styles.editActionText}>Edit</Text>
              </View>
              <Text style={styles.menuDesc}>
                {formatKoboToNaira(profile.indicativeRateKobo || 350000)} / hr • {profile.serviceRadiusKm || 15} km radius
              </Text>
              <View style={styles.categoryChipsRow}>
                {activeCategories.length > 0 ? (
                  activeCategories.slice(0, 3).map((c) => (
                    <Badge key={c.id} label={`${c.icon} ${c.name}`} type="neutral" />
                  ))
                ) : (
                  <Badge label="🧹 Cleaning" type="neutral" />
                )}
                {activeCategories.length > 3 && (
                  <Badge label={`+${activeCategories.length - 3} more`} type="neutral" />
                )}
              </View>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </Card>

        {/* 3. Bank Account & Payouts (NIP Transfer) */}
        <Card
          style={styles.menuCard}
          onPress={() => navigation.navigate('PayoutSettings')}
        >
          <View style={styles.menuCardRow}>
            <Text style={styles.menuIcon}>🏦</Text>
            <View style={styles.menuTextGroup}>
              <View style={styles.menuTitleRow}>
                <Text style={styles.menuTitle}>Bank Account &amp; Payouts</Text>
                <Badge label="NIP READY" type="verified" />
              </View>
              <Text style={styles.menuDesc}>
                {payoutBank
                  ? `${payoutBank.bankName} • ******${payoutBank.accountNumber.slice(-4)}`
                  : 'Link 10-digit NUBAN account for instant cashout'}
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </Card>

        {/* 4. App & Job Preferences */}
        <Card
          style={styles.menuCard}
          onPress={() => navigation.navigate('Preferences')}
        >
          <View style={styles.menuCardRow}>
            <Text style={styles.menuIcon}>⚙️</Text>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Work &amp; App Preferences</Text>
              <Text style={styles.menuDesc}>
                Push alerts, SMS notification backup, biometric app lock
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </Card>

        {/* 5. Safety, 24/7 Helpline & NDPA Legal */}
        <Card
          style={styles.menuCard}
          onPress={() => navigation.navigate('Support')}
        >
          <View style={styles.menuCardRow}>
            <Text style={styles.menuIcon}>📞</Text>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Safety, Support &amp; Legal</Text>
              <Text style={styles.menuDesc}>
                24/7 Lagos Ops Center (0800-MENIAL-NG), NDPA privacy rights
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </Card>

        {/* Role Switching */}
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Role Management</Text>
          <Text style={styles.actionDesc}>
            Need to hire workers for your own home or project?
          </Text>
          <Button
            title="Switch to Employer Mode"
            variant="outline"
            onPress={() => selectRole('employer')}
            style={styles.switchButton}
          />
        </View>

        {/* Sign Out */}
        <Button
          title="Sign Out"
          variant="danger"
          onPress={logout}
          style={styles.logoutButton}
        />
      </ScrollView>
    </View>
  );
};

const WorkerProfileStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={WorkerProfileHomeScreen} />
      <Stack.Screen name="ProfileSetup">
        {({ navigation }) => (
          <WorkerProfileSetupScreen
            onComplete={() => navigation.navigate('NINVerification')}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="NINVerification">
        {({ navigation }) => (
          <WorkerVerificationScreen
            onSuccess={() => navigation.navigate('VerificationStatus')}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="VerificationStatus">
        {({ navigation }) => (
          <VerificationStatusScreen
            onStartVerification={() => navigation.navigate('NINVerification')}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="PayoutSettings" component={WorkerPayoutSettingsScreen} />
      <Stack.Screen name="Preferences" component={WorkerPreferencesScreen} />
      <Stack.Screen name="Support" component={WorkerSupportScreen} />
    </Stack.Navigator>
  );
};

export const WorkerNavigator: React.FC = () => {
  return (
    <WorkerProvider>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            ...Typography.scale.labelSm,
            textTransform: 'none',
          },
        }}
      >
        <Tab.Screen
          name="JobFeed"
          component={WorkerJobHistoryScreen}
          options={{
            tabBarLabel: 'History',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📋</Text>,
          }}
        />
        <Tab.Screen
          name="ActiveJob"
          component={WorkerActiveJobScreen}
          options={{
            tabBarLabel: 'Active Job',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📍</Text>,
          }}
        />
        <Tab.Screen
          name="Wallet"
          component={WorkerWalletScreen}
          options={{
            tabBarLabel: 'Earnings',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>💰</Text>,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={WorkerProfileStackNavigator}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text>,
          }}
        />
      </Tab.Navigator>
    </WorkerProvider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  profileContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  profileHeaderCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  avatarText: {
    fontSize: 34,
  },
  profileName: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  profilePhone: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ratingAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  availabilityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  availabilityTextGroup: {
    flex: 1,
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  availabilitySub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  menuCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  menuCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  menuIcon: {
    fontSize: 24,
  },
  menuTextGroup: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  menuTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  editActionText: {
    ...Typography.scale.labelSm,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  menuDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  chevron: {
    fontSize: 18,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  switchButton: {
    height: 48,
  },
  logoutButton: {
    marginBottom: Spacing.xl,
  },
});
