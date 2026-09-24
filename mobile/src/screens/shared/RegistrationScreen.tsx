import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { TopBar } from '../../components/common/TopBar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import type { UserAccountType } from '@shared/types/enums';

type RegistrationScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Registration'>;
};

type AuthMethod = 'phone' | 'email';

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ navigation }) => {
  const {
    requestOtp,
    rateLimitState,
    formatPhoneNumber,
    loginWithSocial,
    registerWithEmail,
  } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserAccountType>('worker');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | 'linkedin' | null>(null);

  // Phone OTP Registration Flow
  const handleRegisterPhone = async () => {
    setError(null);
    if (!fullName.trim()) {
      setError('Please enter your full legal name.');
      return;
    }

    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10 || cleaned.length > 11) {
      setError('Please enter a valid 10 or 11-digit Nigerian phone number.');
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setLoading(true);
    const result = await requestOtp(phone);
    setLoading(false);

    if (result.success) {
      const formatted = formatPhoneNumber(phone);
      navigation.navigate('Verification', {
        phone: formatted,
        isRegistration: true,
      });
    } else {
      setError(result.error || 'Failed to dispatch verification code.');
    }
  };

  // Email Registration Flow
  const handleRegisterEmail = async () => {
    setError(null);
    if (!fullName.trim()) {
      setError('Please enter your full legal name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setLoading(true);
    const result = await registerWithEmail(email, password, fullName, selectedRole);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Registration failed.');
    }
  };

  // Social Sign Up Flow
  const handleSocialSignUp = async (provider: 'google' | 'facebook' | 'linkedin') => {
    setError(null);
    setSocialLoading(provider);
    const result = await loginWithSocial(provider, selectedRole);
    setSocialLoading(null);

    if (!result.success) {
      setError(result.error || `Unable to complete ${provider} registration.`);
    }
  };

  const getLockoutRemainingMinutes = () => {
    if (!rateLimitState.lockoutUntil) return 0;
    return Math.max(1, Math.ceil((rateLimitState.lockoutUntil - Date.now()) / 60000));
  };

  return (
    <View style={styles.container}>
      <TopBar title="Create Account" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand Logo & Header */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Join Menial</Text>
          <Text style={styles.subtitle}>
            Register with verified credentials to hire trusted workers or earn on verified jobs across Nigeria.
          </Text>
        </View>

        {/* Global Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Account Role Selector Card */}
        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>I WANT TO REGISTER AS:</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedRole('worker')}
              style={[
                styles.roleCard,
                selectedRole === 'worker' && styles.roleCardActive,
              ]}
            >
              <Text style={styles.roleEmoji}>👷</Text>
              <View style={styles.roleInfo}>
                <Text
                  style={[
                    styles.roleTitle,
                    selectedRole === 'worker' && styles.roleTitleActive,
                  ]}
                >
                  Worker / Artisan
                </Text>
                <Text style={styles.roleDesc}>Find jobs &amp; get paid</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedRole('employer')}
              style={[
                styles.roleCard,
                selectedRole === 'employer' && styles.roleCardActive,
              ]}
            >
              <Text style={styles.roleEmoji}>🏢</Text>
              <View style={styles.roleInfo}>
                <Text
                  style={[
                    styles.roleTitle,
                    selectedRole === 'employer' && styles.roleTitleActive,
                  ]}
                >
                  Employer / Hirer
                </Text>
                <Text style={styles.roleDesc}>Post jobs &amp; hire</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 43 Rate-limit Alert Banner */}
        {rateLimitState.isLocked && authMethod === 'phone' && (
          <View style={styles.rateLimitCard}>
            <Text style={styles.rateLimitIcon}>⏳</Text>
            <View style={styles.rateLimitContent}>
              <Text style={styles.rateLimitTitle}>Request Limit Reached (Section 43)</Text>
              <Text style={styles.rateLimitText}>
                {rateLimitState.message ||
                  `Maximum 3 requests reached. Please wait ${getLockoutRemainingMinutes()} minute(s) before requesting another code.`}
              </Text>
            </View>
          </View>
        )}

        {/* Social Sign Up (Google / Gmail, Facebook, LinkedIn) */}
        <View style={styles.socialSection}>
          <SocialAuthButtons
            onSelectProvider={handleSocialSignUp}
            loadingProvider={socialLoading}
            mode="signup"
          />
        </View>

        {/* Or Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Auth Method Segmented Tabs: Phone vs Email */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAuthMethod('phone');
              setError(null);
            }}
            style={[
              styles.segmentBtn,
              authMethod === 'phone' && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                authMethod === 'phone' && styles.segmentTextActive,
              ]}
            >
              📱 Mobile Phone (SMS)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAuthMethod('email');
              setError(null);
            }}
            style={[
              styles.segmentBtn,
              authMethod === 'email' && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                authMethod === 'email' && styles.segmentTextActive,
              ]}
            >
              ✉️ Email &amp; Password
            </Text>
          </TouchableOpacity>
        </View>

        {/* Common Legal Name Input */}
        <Input
          label="Full Legal Name (as on Government ID)"
          placeholder="e.g. Chukwuma Adeleke"
          value={fullName}
          onChangeText={(val) => {
            setFullName(val);
            if (error) setError(null);
          }}
          onClear={() => setFullName('')}
        />

        {/* Dynamic Form based on Auth Method */}
        {authMethod === 'phone' ? (
          <View style={styles.formGroup}>
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
              editable={!rateLimitState.isLocked}
            />

            {/* Terms of Service Checkbox */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              style={styles.termsRow}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
                {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms of Service</Text>,{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>, and NDPA data protection standards.
              </Text>
            </TouchableOpacity>

            <Button
              title={
                rateLimitState.isLocked
                  ? `Locked (${getLockoutRemainingMinutes()}m wait)`
                  : 'Continue to Phone Verification'
              }
              onPress={handleRegisterPhone}
              loading={loading}
              disabled={rateLimitState.isLocked || !fullName.trim() || phone.length < 10 || !agreedToTerms}
              style={styles.submitButton}
            />
          </View>
        ) : (
          <View style={styles.formGroup}>
            <Input
              label="Email Address"
              placeholder="e.g. name@domain.com"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (error) setError(null);
              }}
              onClear={() => setEmail('')}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.passwordWrapper}>
              <Input
                label="Create Password (min 6 characters)"
                placeholder="Choose a strong password"
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (error) setError(null);
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeToggle}
              >
                <Text style={styles.eyeText}>{showPassword ? '👁️' : '🔒'}</Text>
              </TouchableOpacity>
            </View>

            {/* Terms of Service Checkbox */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              style={styles.termsRow}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
                {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms of Service</Text>,{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>, and NDPA data protection standards.
              </Text>
            </TouchableOpacity>

            <Button
              title="Create Account with Email"
              onPress={handleRegisterEmail}
              loading={loading}
              disabled={!fullName.trim() || !email || password.length < 6 || !agreedToTerms}
              style={styles.submitButton}
            />
          </View>
        )}

        {/* Footer Link to Login */}
        <View style={styles.footerLinkRow}>
          <Text style={styles.footerPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>

        {/* Compliance Note */}
        <Text style={styles.complianceNote}>
          Menial adheres to the Nigeria Data Protection Act (NDPA 2023) Section 80 with national identity privacy masking.
        </Text>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  logo: {
    width: 140,
    height: 38,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.scale.headlineMd,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },
  roleContainer: {
    marginBottom: Spacing.md,
  },
  roleLabel: {
    ...Typography.scale.labelSm,
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 6,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    gap: 8,
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  roleEmoji: {
    fontSize: 22,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    ...Typography.scale.labelSm,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  roleTitleActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  roleDesc: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerContainer,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    ...Typography.scale.bodySm,
    color: Colors.dangerText,
    flex: 1,
    fontWeight: '600',
  },
  rateLimitCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dangerContainer,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    padding: Spacing.md,
    marginBottom: Spacing.md,
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
  socialSection: {
    marginBottom: Spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...Typography.scale.labelSm,
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.lg,
    padding: 3,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
  },
  segmentBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    ...Typography.scale.labelSm,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  segmentTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  formGroup: {
    gap: Spacing.xs,
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeToggle: {
    position: 'absolute',
    right: 14,
    top: 36,
    padding: 6,
    zIndex: 10,
  },
  eyeText: {
    fontSize: 16,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  termsText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  footerPrompt: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  footerLink: {
    ...Typography.scale.labelMd,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  complianceNote: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 14,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
});
