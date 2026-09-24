import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { TopBar } from '../../components/common/TopBar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';

type VerificationScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Verification'>;
  route: RouteProp<AuthStackParamList, 'Verification'>;
};

export const VerificationScreen: React.FC<VerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { phone, isRegistration, role } = route.params;
  const { verifyOtp, requestOtp, rateLimitState } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  // 60-second resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await verifyOtp(phone, code, role);
    setLoading(false);

    if (result.success) {
      if (role) {
        // Authenticated and role already known -> RootNavigator automatically switches
      } else {
        // Unassigned role -> navigate to RoleSelection
        navigation.replace('RoleSelection', { phone });
      }
    } else {
      setError(result.error || 'Verification code failed.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || rateLimitState.isLocked) return;
    setError(null);
    const result = await requestOtp(phone);
    if (result.success) {
      setResendCooldown(60);
    } else {
      setError(result.error || 'Failed to resend code.');
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Verify Phone" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Enter 6-Digit Code</Text>
          <Text style={styles.subtitle}>
            We sent a verification passcode via SMS to{' '}
            <Text style={styles.phoneHighlight}>{phone}</Text>.
          </Text>
        </View>

        {/* Section 43 Rate-limit Alert Banner */}
        {rateLimitState.isLocked && (
          <View style={styles.rateLimitCard}>
            <Text style={styles.rateLimitIcon}>⚠️</Text>
            <View style={styles.rateLimitContent}>
              <Text style={styles.rateLimitTitle}>Request Limit Reached (Section 43)</Text>
              <Text style={styles.rateLimitText}>
                {rateLimitState.message ||
                  'Too many requests. Please wait before requesting another code.'}
              </Text>
            </View>
          </View>
        )}

        <Input
          label="Verification Code (OTP)"
          placeholder="123456"
          value={code}
          onChangeText={(val) => {
            const numeric = val.replace(/\D/g, '').slice(0, 6);
            setCode(numeric);
            if (error) setError(null);
          }}
          onClear={() => setCode('')}
          keyboardType="number-pad"
          maxLength={6}
          error={error || undefined}
          style={styles.otpInput}
        />

        <Button
          title="Verify & Continue"
          onPress={handleVerify}
          variant="primary"
          size="lg"
          loading={loading}
          disabled={code.length !== 6}
          style={styles.submitButton}
        />

        <View style={styles.resendContainer}>
          <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
          {resendCooldown > 0 ? (
            <Text style={styles.cooldownText}>Resend in {resendCooldown}s</Text>
          ) : (
            <TouchableOpacity
              onPress={handleResend}
              disabled={rateLimitState.isLocked}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Resend verification code"
              accessibilityState={{ disabled: rateLimitState.isLocked }}
            >
              <Text
                style={[
                  styles.resendAction,
                  rateLimitState.isLocked && styles.resendDisabled,
                ]}
              >
                Resend Code
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
  },
  header: {
    marginBottom: Spacing.xl,
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
  phoneHighlight: {
    fontWeight: '700',
    color: Colors.primary,
  },
  rateLimitCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dangerContainer,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
  },
  rateLimitIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  rateLimitContent: {
    flex: 1,
  },
  rateLimitTitle: {
    ...Typography.scale.labelMd,
    color: Colors.dangerText,
    fontWeight: '700',
    marginBottom: 2,
  },
  rateLimitText: {
    ...Typography.scale.bodySm,
    color: Colors.dangerText,
    lineHeight: 18,
  },
  otpInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  submitButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendPrompt: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
  },
  cooldownText: {
    ...Typography.scale.labelMd,
    color: Colors.textMuted,
  },
  resendAction: {
    ...Typography.scale.labelMd,
    color: Colors.primary,
    fontWeight: '700',
  },
  resendDisabled: {
    color: Colors.textMuted,
  },
});
