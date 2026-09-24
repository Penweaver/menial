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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | 'linkedin' | null>(null);

  // Phone OTP Flow
  const handleRegisterPhone = async () => {
    setError(null);
    if (!fullName.trim()) {
      setError('Please enter your full legal name.');
      return;
    }

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
        isRegistration: true,
        role: selectedRole,
      });
    } else {
      setError(result.error || 'Failed to dispatch verification code.');
    }
  };

  // Email Flow
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
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = await registerWithEmail(email, password, fullName, selectedRole);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Registration failed.');
    }
  };

  // Social Auth Flow (Icon-only)
  const handleSocialSignUp = async (provider: 'google' | 'facebook' | 'linkedin') => {
    setError(null);
    setSocialLoading(provider);
    const result = await loginWithSocial(provider, selectedRole);
    setSocialLoading(null);

    if (!result.success) {
      setError(result.error || `Unable to register with ${provider}.`);
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
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join Nigeria's verified artisan marketplace</Text>
        </View>

        {/* Global Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Minimal Role Pill Selector */}
        <View style={styles.roleToggle}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedRole('worker')}
            style={[styles.roleBtn, selectedRole === 'worker' && styles.roleBtnActive]}
          >
            <Text
              style={[
                styles.roleText,
                selectedRole === 'worker' && styles.roleTextActive,
              ]}
            >
              👷 I Want to Work
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedRole('employer')}
            style={[styles.roleBtn, selectedRole === 'employer' && styles.roleBtnActive]}
          >
            <Text
              style={[
                styles.roleText,
                selectedRole === 'employer' && styles.roleTextActive,
              ]}
            >
              🏢 I Want to Hire
            </Text>
          </TouchableOpacity>
        </View>

        {/* Full Legal Name */}
        <Input
          label="Legal Name"
          placeholder="e.g. Chukwuma Adeleke"
          value={fullName}
          onChangeText={(val) => {
            setFullName(val);
            if (error) setError(null);
          }}
          onClear={() => setFullName('')}
        />

        {/* Method Toggle: Phone vs Email */}
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

        {/* Dynamic Fields */}
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
              onPress={handleRegisterPhone}
              loading={loading}
              disabled={rateLimitState.isLocked || !fullName.trim() || phone.length < 10}
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
                label="Password (min 6 chars)"
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
              title="Create Account"
              onPress={handleRegisterEmail}
              loading={loading}
              disabled={!fullName.trim() || !email || password.length < 6}
              style={styles.primaryBtn}
            />
          </View>
        )}

        {/* Minimal Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign up with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Icon-Only Social Buttons */}
        <View style={styles.socialRow}>
          <SocialAuthButtons
            onSelectProvider={handleSocialSignUp}
            loadingProvider={socialLoading}
          />
        </View>

        {/* Minimal Terms Note */}
        <Text style={styles.termsNote}>
          By signing up, you agree to our Terms of Service &amp; NDPA Privacy Policy.
        </Text>

        {/* Footer Link to Login */}
        <View style={styles.footerLinkRow}>
          <Text style={styles.footerPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
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
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.lg,
    padding: 3,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  roleBtnActive: {
    backgroundColor: Colors.primaryContainer,
  },
  roleText: {
    ...Typography.scale.labelSm,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  roleTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.full,
    padding: 3,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 7,
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
    marginBottom: Spacing.md,
  },
  termsNote: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerPrompt: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  footerLink: {
    ...Typography.scale.labelMd,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
