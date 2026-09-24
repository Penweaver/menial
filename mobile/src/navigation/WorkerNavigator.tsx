import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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

const Tab = createBottomTabNavigator<WorkerTabParamList>();
const Stack = createNativeStackNavigator<WorkerProfileStackParamList>();

type ProfileHomeScreenProps = {
  navigation: NativeStackNavigationProp<WorkerProfileStackParamList, 'ProfileHome'>;
};

const WorkerProfileHomeScreen: React.FC<ProfileHomeScreenProps> = ({ navigation }) => {
  const { session, selectRole, logout } = useAuth();
  const { profile, verification, categories } = useWorker();

  const activeCategories = categories.filter((c) =>
    profile.categoryIds.includes(c.id)
  );

  return (
    <View style={styles.screen}>
      <TopBar title="Worker Profile" />
      <ScrollView contentContainerStyle={styles.profileContent}>
        {/* Worker Identity Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>👷</Text>
          </View>
          <Text style={styles.profileName}>Worker Account</Text>
          <Text style={styles.profilePhone}>{session?.phone || 'No phone'}</Text>
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
            style={styles.roleBadge}
          />
        </View>

        {/* Section 25: Identity Verification Status Card */}
        <Card
          style={styles.verificationCard}
          onPress={() => {
            if (verification.status === 'unverified') {
              navigation.navigate('NINVerification');
            } else {
              navigation.navigate('VerificationStatus');
            }
          }}
        >
          <View style={styles.verificationCardHeader}>
            <Text style={styles.verificationCardIcon}>
              {verification.status === 'verified'
                ? '🛡️'
                : verification.status === 'pending'
                ? '⏳'
                : verification.status === 'rejected'
                ? '❌'
                : '📋'}
            </Text>
            <View style={styles.verificationCardTextGroup}>
              <Text style={styles.verificationCardTitle}>
                {verification.status === 'verified'
                  ? 'Government ID Verified (NIN)'
                  : verification.status === 'pending'
                  ? 'NIN Verification Under Review'
                  : verification.status === 'rejected'
                  ? 'Verification Rejected'
                  : 'NIN Verification Required'}
              </Text>
              <Text style={styles.verificationCardSubtitle}>
                {verification.status === 'verified'
                  ? 'Confirmed via NIMC civic database'
                  : verification.status === 'pending'
                  ? 'Review completes in < 24 hours'
                  : verification.status === 'rejected'
                  ? 'Tap to view reason and resubmit'
                  : 'Earn 3x more by verifying your identity'}
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </Card>

        {/* Section 22: Profile & Wage Rates Card */}
        <Card
          style={styles.profileDetailsCard}
          onPress={() => navigation.navigate('ProfileSetup')}
        >
          <View style={styles.detailsHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Work Profile & Skills</Text>
            <Text style={styles.editActionText}>Edit</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Indicative Rate:</Text>
            <Text style={styles.detailValue}>
              {formatKoboToNaira(profile.indicativeRateKobo || 350000)} / hr
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service Radius:</Text>
            <Text style={styles.detailValue}>{profile.serviceRadiusKm || 15} km</Text>
          </View>

          <View style={styles.categoriesContainer}>
            <Text style={styles.detailLabel}>Categories:</Text>
            <View style={styles.categoryChipsRow}>
              {activeCategories.length > 0 ? (
                activeCategories.map((c) => (
                  <Badge key={c.id} label={`${c.icon} ${c.name}`} type="neutral" />
                ))
              ) : (
                <Text style={styles.emptyCategoriesText}>
                  No categories selected. Tap Edit to add skills.
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Role Switching */}
        <View style={styles.actionCard}>
          <Text style={styles.cardHeaderTitle}>Role Management</Text>
          <Text style={styles.cardHeaderDesc}>
            Switch role to access Employer job posting and worker hiring.
          </Text>
          <Button
            title="Switch to Employer Mode"
            variant="outline"
            onPress={() => selectRole('employer')}
            style={styles.switchButton}
          />
        </View>

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
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sectionEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    backgroundColor: Colors.secondaryContainer,
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
  },
  profilePhone: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    marginTop: Spacing.sm,
  },
  verificationCard: {
    marginBottom: Spacing.lg,
  },
  verificationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationCardIcon: {
    fontSize: 26,
    marginRight: Spacing.md,
  },
  verificationCardTextGroup: {
    flex: 1,
  },
  verificationCardTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  verificationCardSubtitle: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  profileDetailsCard: {
    marginBottom: Spacing.lg,
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  editActionText: {
    ...Typography.scale.labelMd,
    color: Colors.primary,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
  },
  detailValue: {
    ...Typography.scale.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  categoriesContainer: {
    paddingTop: Spacing.sm,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  emptyCategoriesText: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  cardHeaderTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardHeaderDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  switchButton: {
    height: 48,
  },
  logoutButton: {
    marginTop: Spacing.sm,
  },
});
