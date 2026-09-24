import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { TopBar } from '../../components/common/TopBar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { requestOtp, rateLimitState, formatPhoneNumber } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    setError(null);
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10 || cleaned.length > 11) {
      setError('Please enter a valid 10 or 11-digit Nigerian phone number.');
      return;
    }

    setLoading(true);
    const result = await requestOtp(phone);
    setLoading(false);

    if (result.success) {
      const formatted = formatPhoneNumber(phone);
      navigation.navigate('Verification', {
        phone: formatted,
        isRegistration: false,
      });
    } else {
      setError(result.error || 'Failed to dispatch verification code.');
    }
  };

  const getLockoutRemainingMinutes = () => {
    if (!rateLimitState.lockoutUntil) return 0;
    return Math.max(1, Math.ceil((rateLimitState.lockoutUntil - Date.now()) / 60000));
  };

  return (
    <View style={styles.container}>
      <TopBar title="Log In" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Enter your mobile number to receive a 6-digit verification code.
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
                  `Maximum 3 requests reached. Please wait ${getLockoutRemainingMinutes()} minute(s) before requesting another code.`}
              </Text>
            </View>
          </View>
        )}

        <Input
          label="Mobile Phone Number"
          placeholder="801 234 5678"
          value={phone}
          onChangeText={(val) => {
            setPhone(val);
            if (error) setError(null);
          }}
          onClear={() => setPhone('')}
          isPhone
          maxLength={11}
          error={error || undefined}
          editable={!rateLimitState.isLocked}
        />

        <Button
          title={
            rateLimitState.isLocked
              ? `Locked (${getLockoutRemainingMinutes()}m wait)`
              : 'Send Verification Code'
          }
          onPress={handleSendOtp}
          loading={loading}
          disabled={rateLimitState.isLocked || phone.length < 10}
          style={styles.submitButton}
        />

        <View style={styles.footerLinkRow}>
          <Text style={styles.footerPrompt}>New to Menial? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Registration')}>
            <Text style={styles.footerLink}>Create an account</Text>
          </TouchableOpacity>
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
  submitButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerPrompt: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
  },
  footerLink: {
    ...Typography.scale.labelMd,
    color: Colors.primary,
    fontWeight: '700',
  },
});
