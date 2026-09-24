import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { TopBar } from '../components/common/TopBar';
import { ScreenFooter } from '../components/common/ScreenFooter';
import { useAuth } from '../context/AuthContext';
import { JobCreationProvider, useJobCreation } from '../context/JobCreationContext';
import {
  EmployerTabParamList,
  EmployerCreateJobStackParamList,
  EmployerDiscoverStackParamList,
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

const Tab = createBottomTabNavigator<EmployerTabParamList>();
const CreateJobStack = createNativeStackNavigator<EmployerCreateJobStackParamList>();
const DiscoverStack = createNativeStackNavigator<EmployerDiscoverStackParamList>();

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

const EmployerMyJobsPlaceholder: React.FC = () => (
  <View style={styles.screen}>
    <TopBar title="My Jobs" />
    <View style={styles.center}>
      <Text style={styles.sectionEmoji}>📋</Text>
      <Text style={styles.title}>Active & Past Jobs</Text>
      <Text style={styles.subtitle}>
        Real-time tracking, SOS, and completion flow will be implemented in Slices 5 and 6.
      </Text>
    </View>
  </View>
);

const EmployerProfileScreen: React.FC = () => {
  const { session, selectRole, logout } = useAuth();

  return (
    <View style={styles.screen}>
      <TopBar title="Employer Profile" />
      <ScrollView contentContainerStyle={styles.profileContent}>
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>💼</Text>
          </View>
          <Text style={styles.profileName}>Employer Account</Text>
          <Text style={styles.profilePhone}>{session?.phone || 'No phone'}</Text>
          <Badge label="ACTIVE EMPLOYER" type="verified" style={styles.roleBadge} />
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.cardHeaderTitle}>Role Management</Text>
          <Text style={styles.cardHeaderDesc}>
            Switch role to access the Worker dashboard and job feed.
          </Text>
          <Button
            title="Switch to Worker Mode"
            variant="outline"
            onPress={() => selectRole('worker')}
            style={styles.switchButton}
          />
        </View>

        <Button
          title="Sign Out"
          variant="danger"
          onPress={logout}
          style={styles.logoutButton}
        />

        {/* Clean Standardized Screen Footer */}
        <ScreenFooter variant="compact" />
      </ScrollView>
    </View>
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

export const EmployerNavigator: React.FC = () => {
  return (
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
          component={EmployerProfileScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
          }}
        />
      </Tab.Navigator>
    </JobCreationProvider>
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
  },
  profilePhone: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    marginTop: Spacing.sm,
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
