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

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

type AuthMethod = 'phone' | 'email';

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const {
    requestOtp,
    rateLimitState,
    formatPhoneNumber,
    loginWithSocial,
    loginWithEmail,
    loginAsDemo,
  } = useAuth();

  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | 'linkedin' | null>(null);

  // Phone OTP Flow
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

  // Email & Password Flow
  const handleEmailLogin = async () => {
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const result = await loginWithEmail(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid email or password.');
    }
  };

  // Social Auth Flow
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'linkedin') => {
    setError(null);
    setSocialLoading(provider);
    const result = await loginWithSocial(provider);
    setSocialLoading(null);

    if (!result.success) {
      setError(result.error || `Unable to complete ${provider} login.`);
    }
  };

  const getLockoutRemainingMinutes = () => {
    if (!rateLimitState.lockoutUntil) return 0;
    return Math.max(1, Math.ceil((rateLimitState.lockoutUntil - Date.now()) / 60000));
  };

  return (
    <View style={styles.container}>
      <TopBar title="Sign In" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand Logo & Header */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to access verified marketplace jobs, active escrows, and instant cashouts.
          </Text>
        </View>

        {/* Global Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

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

        {/* Social Logins (Google / Gmail, Facebook, LinkedIn) */}
        <View style={styles.socialSection}>
          <SocialAuthButtons
            onSelectProvider={handleSocialLogin}
            loadingProvider={socialLoading}
            mode="signin"
          />
        </View>

        {/* Or Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
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
                label="Password"
                placeholder="Enter your password"
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

            <Button
              title="Sign In with Email"
              onPress={handleEmailLogin}
              loading={loading}
              disabled={!email || password.length < 6}
              style={styles.submitButton}
            />
          </View>
        )}

        {/* Quick Demo Shortcuts for Reviewers */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>⚡ INSTANT DEMO EVALUATION</Text>
          <View style={styles.demoRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => loginAsDemo('employer')}
              style={styles.demoBtn}
            >
              <Text style={styles.demoEmoji}>🏢</Text>
              <Text style={styles.demoBtnText}>Employer Demo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => loginAsDemo('worker')}
              style={styles.demoBtn}
            >
              <Text style={styles.demoEmoji}>👷</Text>
              <Text style={styles.demoBtnText}>Worker Demo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Link to Registration */}
        <View style={styles.footerLinkRow}>
          <Text style={styles.footerPrompt}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Registration')}>
            <Text style={styles.footerLink}>Create an account</Text>
          </TouchableOpacity>
        </View>

        {/* Compliance Note */}
        <Text style={styles.complianceNote}>
          Protected by NDPA 2023 privacy masking standards and CBN-compliant double-entry escrow security.
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
  submitButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  demoSection: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  demoTitle: {
    ...Typography.scale.labelSm,
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    fontWeight: '700',
  },
  demoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  demoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingVertical: 9,
    gap: 6,
  },
  demoEmoji: {
    fontSize: 15,
  },
  demoBtnText: {
    ...Typography.scale.labelSm,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
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
