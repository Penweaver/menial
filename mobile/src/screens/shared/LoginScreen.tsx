import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { TopBar } from '../../components/common/TopBar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ScreenFooter } from '../../components/common/ScreenFooter';
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
      setError('Please enter a valid 10 or 11-digit phone number.');
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

  // Email Flow
  const handleEmailLogin = async () => {
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = await loginWithEmail(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid credentials.');
    }
  };

  // Social Auth Flow (Icon-only)
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'linkedin') => {
    setError(null);
    setSocialLoading(provider);
    const result = await loginWithSocial(provider);
    setSocialLoading(null);

    if (!result.success) {
      setError(result.error || `Unable to sign in with ${provider}.`);
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Enter your details to sign in</Text>
        </View>

        {/* Global Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Section 43 Rate-limit Alert Banner */}
        {rateLimitState.isLocked && (
          <View style={styles.rateLimitCard}>
            <Text style={styles.rateLimitIcon}>⏳</Text>
            <View style={styles.rateLimitContent}>
              <Text style={styles.rateLimitTitle}>Request Limit Reached (Section 43)</Text>
              <Text style={styles.rateLimitText}>
                {rateLimitState.message || 'Maximum 3 requests reached. Please wait before requesting another code.'}
              </Text>
            </View>
          </View>
        )}

        {/* Minimal Method Selector */}
        <View style={styles.methodToggle}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAuthMethod('phone');
              setError(null);
            }}
            style={[styles.toggleBtn, authMethod === 'phone' && styles.toggleBtnActive]}
          >
            <Text
              style={[
                styles.toggleText,
                authMethod === 'phone' && styles.toggleTextActive,
              ]}
            >
              Phone Number
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAuthMethod('email');
              setError(null);
            }}
            style={[styles.toggleBtn, authMethod === 'email' && styles.toggleBtnActive]}
          >
            <Text
              style={[
                styles.toggleText,
                authMethod === 'email' && styles.toggleTextActive,
              ]}
            >
              Email Address
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input Fields */}
        {authMethod === 'phone' ? (
          <View style={styles.formGroup}>
            <Input
              label="Phone Number"
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
              title="Continue"
              onPress={handleSendOtp}
              loading={loading}
              disabled={rateLimitState.isLocked || phone.length < 10}
              style={styles.primaryBtn}
            />
          </View>
        ) : (
          <View style={styles.formGroup}>
            <Input
              label="Email"
              placeholder="you@domain.com"
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
                placeholder="••••••••"
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
              title="Sign In"
              onPress={handleEmailLogin}
              loading={loading}
              disabled={!email || password.length < 6}
              style={styles.primaryBtn}
            />
          </View>
        )}

        {/* Minimal Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Icon-Only Social Buttons */}
        <View style={styles.socialRow}>
          <SocialAuthButtons
            onSelectProvider={handleSocialLogin}
            loadingProvider={socialLoading}
          />
        </View>

        {/* Clean Standardized Auth Screen Footer */}
        <ScreenFooter
          variant="auth"
          authPrompt="Don't have an account?"
          authActionText="Sign up"
          onAuthAction={() => navigation.navigate('Registration')}
          demoLinks={[
            { label: 'Worker', onPress: () => loginAsDemo('worker'), emoji: '👷' },
            { label: 'Employer', onPress: () => loginAsDemo('employer'), emoji: '🏢' },
          ]}
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 130,
    height: 36,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.scale.headlineMd,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  errorBanner: {
    backgroundColor: Colors.dangerContainer,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  errorText: {
    ...Typography.scale.bodySm,
    color: Colors.dangerText,
    fontWeight: '600',
    fontSize: 12,
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.full,
    padding: 3,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radii.full,
  },
  toggleBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    ...Typography.scale.labelSm,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  toggleTextActive: {
    color: Colors.primary,
    fontWeight: '700',
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
    fontSize: 15,
  },
  primaryBtn: {
    marginTop: Spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
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
    fontSize: 11,
    fontWeight: '500',
  },
  socialRow: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },

  rateLimitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  rateLimitIcon: {
    fontSize: 20,
  },
  rateLimitContent: {
    flex: 1,
  },
  rateLimitTitle: {
    ...Typography.scale.labelMd,
    color: '#991B1B',
    fontWeight: '700',
    fontSize: 13,
  },
  rateLimitText: {
    ...Typography.scale.bodySm,
    color: '#B91C1C',
    fontSize: 12,
    marginTop: 2,
  },
});
