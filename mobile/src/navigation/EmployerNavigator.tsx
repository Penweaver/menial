import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii, formatKoboToNaira } from '../constants/theme';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { TopBar } from '../components/common/TopBar';
import { ScreenFooter } from '../components/common/ScreenFooter';
import { useAuth } from '../context/AuthContext';
import { JobCreationProvider, useJobCreation } from '../context/JobCreationContext';
import { EmployerProvider, useEmployer } from '../context/EmployerContext';
import {
  EmployerTabParamList,
  EmployerCreateJobStackParamList,
  EmployerDiscoverStackParamList,
  EmployerProfileStackParamList,
} from './types';
import { SelectCategoryScreen } from '../screens/employer/create/SelectCategoryScreen';
import { JobDetailsLocationScreen } from '../screens/employer/create/JobDetailsLocationScreen';
import { ScheduleScreen } from '../screens/employer/create/ScheduleScreen';
import { PricingWorkerCountScreen } from '../screens/employer/create/PricingWorkerCountScreen';
import { ReviewPublishScreen } from '../screens/employer/create/ReviewPublishScreen';
import { WorkerDiscoveryScreen } from '../screens/employer/discover/WorkerDiscoveryScreen';
import { WorkerDetailScreen } from '../screens/employer/discover/WorkerDetailScreen';
import { HireWorkerScreen } from '../screens/employer/discover/HireWorkerScreen';
import { EscrowPaymentScreen } from '../screens/employer/discover/EscrowPaymentScreen';
import { EmployerActiveJobScreen } from '../screens/employer/execution/EmployerActiveJobScreen';
import { EmployerCompanyDetailsScreen } from '../screens/employer/settings/EmployerCompanyDetailsScreen';
import { EmployerBillingPaymentsScreen } from '../screens/employer/settings/EmployerBillingPaymentsScreen';
import { EmployerHiringHistoryScreen } from '../screens/employer/settings/EmployerHiringHistoryScreen';
import { EmployerPreferencesScreen } from '../screens/employer/settings/EmployerPreferencesScreen';
import { EmployerSupportScreen } from '../screens/employer/settings/EmployerSupportScreen';
import { EmployerDeleteAccountScreen } from '../screens/employer/settings/EmployerDeleteAccountScreen';

const Tab = createBottomTabNavigator<EmployerTabParamList>();
const CreateJobStack = createNativeStackNavigator<EmployerCreateJobStackParamList>();
const DiscoverStack = createNativeStackNavigator<EmployerDiscoverStackParamList>();
const ProfileStack = createNativeStackNavigator<EmployerProfileStackParamList>();

// Worker Discovery & Escrow Hiring Stack (Slice 4)
export const WorkerDiscoveryStackNavigator: React.FC = () => {
  return (
    <DiscoverStack.Navigator screenOptions={{ headerShown: false }}>
      <DiscoverStack.Screen name="WorkerDiscovery" component={WorkerDiscoveryScreen} />
      <DiscoverStack.Screen name="WorkerDetail" component={WorkerDetailScreen} />
      <DiscoverStack.Screen name="HireWorker" component={HireWorkerScreen} />
      <DiscoverStack.Screen name="EscrowPayment" component={EscrowPaymentScreen} />
    </DiscoverStack.Navigator>
  );
};

// 5-Step Guided Job Creation Stack (Slice 3)
const EmployerCreateJobStackNavigator: React.FC = () => {
  const { resetDraft } = useJobCreation();

  return (
    <CreateJobStack.Navigator screenOptions={{ headerShown: false }}>
      <CreateJobStack.Screen name="SelectCategory">
        {({ navigation }) => (
          <SelectCategoryScreen
            onNext={() => navigation.navigate('JobDetailsLocation')}
          />
        )}
      </CreateJobStack.Screen>

      <CreateJobStack.Screen name="JobDetailsLocation">
        {({ navigation }) => (
          <JobDetailsLocationScreen
            onNext={() => navigation.navigate('Schedule')}
            onBack={() => navigation.goBack()}
          />
        )}
      </CreateJobStack.Screen>

      <CreateJobStack.Screen name="Schedule">
        {({ navigation }) => (
          <ScheduleScreen
            onNext={() => navigation.navigate('PricingWorkerCount')}
            onBack={() => navigation.goBack()}
          />
        )}
      </CreateJobStack.Screen>

      <CreateJobStack.Screen name="PricingWorkerCount">
        {({ navigation }) => (
          <PricingWorkerCountScreen
            onNext={() => navigation.navigate('ReviewPublish')}
            onBack={() => navigation.goBack()}
          />
        )}
      </CreateJobStack.Screen>

      <CreateJobStack.Screen name="ReviewPublish">
        {({ navigation }) => (
          <ReviewPublishScreen
            onSuccess={(jobId, publicJobId) => {
              Alert.alert(
                'Job Published Successfully!',
                `Your job (${publicJobId}) is now published to nearby workers. Escrow will be funded during worker hiring (§38).`,
                [
                  {
                    text: 'Done',
                    onPress: () => {
                      resetDraft();
                      navigation.navigate('SelectCategory');
                    },
                  },
                ]
              );
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </CreateJobStack.Screen>
    </CreateJobStack.Navigator>
  );
};

// Standardized Employer Profile Hub Screen
type ProfileHomeScreenProps = {
  navigation: NativeStackNavigationProp<EmployerProfileStackParamList, 'ProfileHome'>;
};

const EmployerProfileHomeScreen: React.FC<ProfileHomeScreenProps> = ({ navigation }) => {
  const { session, selectRole, logout } = useAuth();
  const { profile, hiringSummary } = useEmployer();

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setLogoutModalVisible(false);
  };

  return (
    <View style={styles.screen}>
      <TopBar title="Employer Account & Settings" />
      <ScrollView contentContainerStyle={styles.profileContent} showsVerticalScrollIndicator={false}>
        {/* Employer Identity Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>💼</Text>
          </View>
          <Text style={styles.profileName}>{profile.companyName || 'Employer Account'}</Text>
          <Text style={styles.profileContact}>Contact: {profile.fullName || 'Authorized Representative'}</Text>
          <Text style={styles.profilePhone}>{profile.phone || session?.phone || '+234 802 999 8888'}</Text>
          <Text style={styles.profileLocation}>📍 {profile.defaultLocationAddress || 'Lekki Phase 1, Lagos'}</Text>

          <View style={styles.badgeRow}>
            <Badge label="ACTIVE EMPLOYER" type="verified" />
            <Badge label={profile.businessType || 'Verified Client'} type="neutral" />
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{hiringSummary.totalJobsPosted}</Text>
              <Text style={styles.metricLabel}>Posted</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{hiringSummary.totalWorkersHired}</Text>
              <Text style={styles.metricLabel}>Hired</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{hiringSummary.activeJobsCount}</Text>
              <Text style={styles.metricLabel}>Active</Text>
            </View>
          </View>
        </View>

        {/* 1. Account & Organization */}
        <Text style={styles.sectionHeader}>ORGANIZATION &amp; DISPATCH LOCATION</Text>
        <Card
          style={styles.menuCard}
          onPress={() => navigation.navigate('CompanyDetails')}
        >
          <View style={styles.menuCardRow}>
            <Text style={styles.menuIcon}>🏢</Text>
            <View style={styles.menuTextGroup}>
              <View style={styles.menuTitleRow}>
                <Text style={styles.menuTitle}>Company &amp; Site Details</Text>
                <Text style={styles.editActionText}>Manage</Text>
              </View>
              <Text style={styles.menuDesc}>
                Organization name, contact rep, default Lagos site address
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </Card>

        {/* 2. Billing & Escrow Funding */}
        <Text style={styles.sectionHeader}>BILLING &amp; ESCROW PROTECTION</Text>
        <Card
          style={styles.menuCard}
          onPress={() => navigation.navigate('BillingPayments')}
        >
          <View style={styles.menuCardRow}>
            <Text style={styles.menuIcon}>💳</Text>
            <View style={styles.menuTextGroup}>
              <View style={styles.menuTitleRow}>
                <Text style={styles.menuTitle}>Payment Methods &amp; Escrow</Text>
                <Badge label="CBN ESCROW" type="verified" />
              </View>
              <Text style={styles.menuDesc}>
                Saved cards, dedicated NIP virtual account, payment receipts
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </Card>

        <Card
          style={styles.menuCard}
          onPress={() => navigation.navigate('HiringHistory')}
        >
          <View style={styles.menuCardRow}>
            <Text style={styles.menuIcon}>📊</Text>
            <View style={styles.menuTextGroup}>
              <View style={styles.menuTitleRow}>
                <Text style={styles.menuTitle}>Hiring History &amp; Invoices</Text>
                <Text style={styles.editActionText}>View</Text>
              </View>
              <Text style={styles.menuDesc}>
                {formatKoboToNaira(hiringSummary.totalEscrowFundedKobo)} cumulative spend • Tax invoices
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </Card>

        {/* 3. Operational Preferences & Support */}
        <Text style={styles.sectionHeader}>PREFERENCES &amp; COMPLIANCE</Text>
        <Card
          style={styles.menuCard}
          onPress={() => navigation.navigate('Preferences')}
        >
          <View style={styles.menuCardRow}>
            <Text style={styles.menuIcon}>⚙️</Text>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Dispatch &amp; App Preferences</Text>
              <Text style={styles.menuDesc}>
                Worker arrival alerts (§49), SMS receipts, biometric lock
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </Card>

        <Card
          style={styles.menuCard}
          onPress={() => navigation.navigate('Support')}
        >
          <View style={styles.menuCardRow}>
            <Text style={styles.menuIcon}>📞</Text>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Safety, Support &amp; Disputes</Text>
              <Text style={styles.menuDesc}>
                24/7 Lagos Ops Center (0800-MENIAL-NG), §47 arbitration, NDPA export
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </Card>

        {/* 4. Danger Zone & Account Operations */}
        <Text style={styles.sectionHeader}>ACCOUNT MANAGEMENT &amp; SECURITY</Text>
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Role Switching</Text>
          <Text style={styles.actionDesc}>
            Looking to offer verified services or work on projects?
          </Text>
          <Button
            title="Switch to Worker Mode"
            variant="outline"
            size="md"
            onPress={() => selectRole('worker')}
            style={styles.switchButton}
          />
        </View>

        <View style={styles.dangerZoneCard}>
          <Text style={styles.dangerTitle}>Session &amp; Account Operations</Text>
          <Text style={styles.dangerDesc}>
            Sign out of your active session or request permanent account deletion under NDPA 2023 §80.
          </Text>

          <Button
            title="Sign Out"
            variant="outline"
            size="md"
            onPress={() => setLogoutModalVisible(true)}
            style={styles.logoutBtn}
          />

          <TouchableOpacity
            style={styles.deleteAccountLink}
            onPress={() => navigation.navigate('DeleteAccount')}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteAccountText}>
              Permanent Account Deletion (NDPA §80)
            </Text>
          </TouchableOpacity>
        </View>

        <ScreenFooter variant="compact" />
      </ScrollView>

      {/* Explicit Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.logoutModalCard}>
            <View style={styles.logoutIconCircle}>
              <Text style={styles.logoutEmoji}>🚪</Text>
            </View>
            <Text style={styles.logoutTitle}>Log Out of Employer Account?</Text>
            <Text style={styles.logoutMessage}>
              Your posted jobs, escrow guarantees, and saved payment methods are securely preserved. You can sign back in anytime with your verified phone number.
            </Text>

            <Button
              title={loggingOut ? 'Signing out...' : 'Confirm Log Out'}
              variant="danger"
              size="lg"
              onPress={handleConfirmLogout}
              loading={loggingOut}
              style={styles.modalLogoutBtn}
            />

            <Button
              title="Cancel"
              variant="outline"
              size="lg"
              onPress={() => setLogoutModalVisible(false)}
              disabled={loggingOut}
              style={styles.modalCancelBtn}
            />
          </Card>
        </View>
      </Modal>
    </View>
  );
};

// Employer Profile Stack Navigator
export const EmployerProfileStackNavigator: React.FC = () => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={EmployerProfileHomeScreen} />
      <ProfileStack.Screen name="CompanyDetails" component={EmployerCompanyDetailsScreen} />
      <ProfileStack.Screen name="BillingPayments" component={EmployerBillingPaymentsScreen} />
      <ProfileStack.Screen name="HiringHistory" component={EmployerHiringHistoryScreen} />
      <ProfileStack.Screen name="Preferences" component={EmployerPreferencesScreen} />
      <ProfileStack.Screen name="Support" component={EmployerSupportScreen} />
      <ProfileStack.Screen name="DeleteAccount" component={EmployerDeleteAccountScreen} />
    </ProfileStack.Navigator>
  );
};

export const EmployerNavigator: React.FC = () => {
  return (
    <EmployerProvider>
      <JobCreationProvider>
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
            name="Discover"
            component={WorkerDiscoveryStackNavigator}
            options={{
              tabBarLabel: 'Discover',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔍</Text>,
            }}
          />
          <Tab.Screen
            name="CreateJob"
            component={EmployerCreateJobStackNavigator}
            options={{
              tabBarLabel: 'Post Job',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>➕</Text>,
            }}
          />
          <Tab.Screen
            name="MyJobs"
            component={EmployerActiveJobScreen}
            options={{
              tabBarLabel: 'My Jobs',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📋</Text>,
            }}
          />
          <Tab.Screen
            name="Profile"
            component={EmployerProfileStackNavigator}
            options={{
              tabBarLabel: 'Settings',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text>,
            }}
          />
        </Tab.Navigator>
      </JobCreationProvider>
    </EmployerProvider>
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
    borderRadius: Radii.lg,
    padding: Spacing.xl,
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
    marginBottom: Spacing.sm,
  },
  avatarText: {
    fontSize: 32,
  },
  profileName: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  profileContact: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  profilePhone: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  profileLocation: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  metricsBar: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricNumber: {
    ...Typography.scale.labelLg,
    color: Colors.primary,
    fontWeight: '700',
  },
  metricLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
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
  menuCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  menuCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
  },
  editActionText: {
    ...Typography.scale.labelSm,
    color: Colors.primary,
    fontWeight: '600',
  },
  menuDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  chevron: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  actionTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  actionDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  switchButton: {
    height: 48,
  },
  dangerZoneCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  dangerTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  dangerDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  logoutBtn: {
    marginBottom: Spacing.md,
  },
  deleteAccountLink: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  deleteAccountText: {
    ...Typography.scale.bodySm,
    color: Colors.danger,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  logoutModalCard: {
    width: '100%',
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  logoutIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dangerContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoutEmoji: {
    fontSize: 28,
  },
  logoutTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  logoutMessage: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  modalLogoutBtn: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  modalCancelBtn: {
    width: '100%',
  },
});
