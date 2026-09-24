import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { AuthStackParamList } from '../../navigation/types';

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>menial</Text>
        <Badge label="Dignified Utility" type="verified" icon="🛡️" style={styles.brandBadge} />
      </View>

      <View style={styles.heroSection}>
        <Text style={styles.headline}>Direct manual labour on demand.</Text>
        <Text style={styles.subheadline}>
          Hire verified physical and service workers nearby with secure escrow protection, or find verified daily jobs and get paid immediately.
        </Text>
      </View>

      <View style={styles.featuresCard}>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🔒</Text>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Escrow Guaranteed</Text>
            <Text style={styles.featureDescription}>
              Funds held securely until work is completed and confirmed.
            </Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🇳🇬</Text>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>NIN-Verified Workforce</Text>
            <Text style={styles.featureDescription}>
              Every artisan and laborer undergoes government ID verification.
            </Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>⚡</Text>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Instant Transparent Pay</Text>
            <Text style={styles.featureDescription}>
              Clear per-worker rates with direct bank cashout.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <Button
          title="Create New Account"
          onPress={() => navigation.navigate('Registration')}
          style={styles.primaryButton}
        />
        <Button
          title="Log In with Phone"
          onPress={() => navigation.navigate('Login')}
          variant="outline"
          style={styles.secondaryButton}
        />
      </View>

      <Text style={styles.privacyNote}>
        By continuing, you agree to Menial's Terms of Service and NDPA-compliant privacy policy.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl * 1.5,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -1,
  },
  brandBadge: {
    marginTop: Spacing.xs,
  },
  heroSection: {
    marginBottom: Spacing.xl,
  },
  headline: {
    ...Typography.scale.headlineLgMobile,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subheadline: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
  },
  featuresCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  featureIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDescription: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionContainer: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  primaryButton: {
    marginBottom: Spacing.md,
  },
  secondaryButton: {
    marginBottom: Spacing.sm,
  },
  privacyNote: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
  },
});
