import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { TopBar } from '../../components/common/TopBar';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import type { UserAccountType } from '@shared/types/enums';

type RoleSelectionScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'RoleSelection'>;
  route: RouteProp<AuthStackParamList, 'RoleSelection'>;
};

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
  navigation,
  route,
}) => {
  const { selectRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserAccountType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirmRole = async () => {
    if (!selectedRole) return;
    setLoading(true);
    await selectRole(selectedRole);
    setLoading(false);
    // Once role is set in AuthContext, RootNavigator switches automatically
  };

  return (
    <View style={styles.container}>
      <TopBar title="Choose Your Role" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>How will you use Menial?</Text>
          <Text style={styles.subtitle}>
            Select your primary role. You can switch or add another role later from your profile.
          </Text>
        </View>

        {/* Employer Card */}
        <Card
          selected={selectedRole === 'employer'}
          onPress={() => setSelectedRole('employer')}
          style={styles.roleCard}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Text style={styles.roleIcon}>💼</Text>
            </View>
            <Badge
              label="Hire & Pay"
              type={selectedRole === 'employer' ? 'verified' : 'neutral'}
            />
          </View>
          <Text style={styles.roleTitle}>I am an Employer</Text>
          <Text style={styles.roleDescription}>
            I want to post short-term jobs, find nearby verified artisans and laborers, and secure work with escrow payments.
          </Text>
          <View style={styles.perkList}>
            <Text style={styles.perkItem}>✓ Post jobs in 2 minutes</Text>
            <Text style={styles.perkItem}>✓ 100% Escrow refund protection</Text>
            <Text style={styles.perkItem}>✓ Direct photo check-in tracking</Text>
          </View>
        </Card>

        {/* Worker Card */}
        <Card
          selected={selectedRole === 'worker'}
          onPress={() => setSelectedRole('worker')}
          style={styles.roleCard}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Text style={styles.roleIcon}>🔨</Text>
            </View>
            <Badge
              label="Work & Earn"
              type={selectedRole === 'worker' ? 'verified' : 'neutral'}
            />
          </View>
          <Text style={styles.roleTitle}>I am a Worker</Text>
          <Text style={styles.roleDescription}>
            I want to offer my physical or artisan services, receive nearby job alerts, and withdraw my earnings directly to my Nigerian bank.
          </Text>
          <View style={styles.perkList}>
            <Text style={styles.perkItem}>✓ Set your own hourly & daily rates</Text>
            <Text style={styles.perkItem}>✓ Guaranteed pay held in escrow before work</Text>
            <Text style={styles.perkItem}>✓ Instant NIP cashout to any bank</Text>
          </View>
        </Card>

        <Button
          title={selectedRole ? `Continue as ${selectedRole === 'employer' ? 'Employer' : 'Worker'}` : 'Select a Role'}
          onPress={handleConfirmRole}
          loading={loading}
          disabled={!selectedRole}
          style={styles.submitButton}
        />
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
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.scale.headlineLgMobile,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  roleCard: {
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIcon: {
    fontSize: 24,
  },
  roleTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  roleDescription: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  perkList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    gap: 4,
  },
  perkItem: {
    ...Typography.scale.bodySm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});
