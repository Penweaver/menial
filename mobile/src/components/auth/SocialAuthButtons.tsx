/**
 * Menial Mobile - Standardized Social Authentication Buttons
 * 
 * Minimalist, high-craft, icon-only social auth conforming to
 * Apple Human Interface Guidelines, Google Identity Standards, and WCAG 2.2 accessibility.
 * 
 * Supported Providers: Google (Gmail), Apple, Facebook, LinkedIn.
 * Ergonomics: 50x50dp touch targets (WCAG 2.5.5 minimum 48x48dp compliant).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

export type SocialProvider = 'google' | 'apple' | 'facebook' | 'linkedin';

export interface SocialAuthButtonsProps {
  onSelectProvider: (provider: SocialProvider) => void;
  loadingProvider?: SocialProvider | null;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onSelectProvider,
  loadingProvider = null,
}) => {
  const isAnyLoading = Boolean(loadingProvider);

  return (
    <View
      style={styles.container}
      accessibilityRole="toolbar"
      accessibilityLabel="Social authentication options"
    >
      {/* 1. Google (Gmail) Icon Button */}
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => onSelectProvider('google')}
        disabled={isAnyLoading}
        style={[
          styles.iconBtn,
          styles.googleBtn,
          loadingProvider === 'google' && styles.iconBtnActive,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Sign in with Google"
        accessibilityHint="Authenticate using your Google account"
        accessibilityState={{ disabled: isAnyLoading, busy: loadingProvider === 'google' }}
      >
        {loadingProvider === 'google' ? (
          <ActivityIndicator size="small" color="#EA4335" />
        ) : (
          <View style={styles.googleIconBox}>
            <Text style={styles.googleG}>G</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 2. Apple Icon Button */}
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => onSelectProvider('apple')}
        disabled={isAnyLoading}
        style={[
          styles.iconBtn,
          styles.appleBtn,
          loadingProvider === 'apple' && styles.iconBtnActive,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Sign in with Apple"
        accessibilityHint="Authenticate securely using your Apple ID"
        accessibilityState={{ disabled: isAnyLoading, busy: loadingProvider === 'apple' }}
      >
        {loadingProvider === 'apple' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.appleIcon}></Text>
        )}
      </TouchableOpacity>

      {/* 3. Facebook Icon Button */}
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => onSelectProvider('facebook')}
        disabled={isAnyLoading}
        style={[
          styles.iconBtn,
          styles.facebookBtn,
          loadingProvider === 'facebook' && styles.iconBtnActive,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Sign in with Facebook"
        accessibilityHint="Authenticate using your Facebook account"
        accessibilityState={{ disabled: isAnyLoading, busy: loadingProvider === 'facebook' }}
      >
        {loadingProvider === 'facebook' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.facebookF}>f</Text>
        )}
      </TouchableOpacity>

      {/* 4. LinkedIn Icon Button */}
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => onSelectProvider('linkedin')}
        disabled={isAnyLoading}
        style={[
          styles.iconBtn,
          styles.linkedinBtn,
          loadingProvider === 'linkedin' && styles.iconBtnActive,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Sign in with LinkedIn"
        accessibilityHint="Authenticate using your professional LinkedIn profile"
        accessibilityState={{ disabled: isAnyLoading, busy: loadingProvider === 'linkedin' }}
      >
        {loadingProvider === 'linkedin' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.linkedinIn}>in</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBtnActive: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  googleBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1.2,
    borderColor: Colors.border,
  },
  googleIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EA4335',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    lineHeight: 18,
    fontFamily: Typography.fontFamily,
  },
  appleBtn: {
    backgroundColor: '#000000',
  },
  appleIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '700',
    fontFamily: Typography.fontFamily,
  },
  facebookBtn: {
    backgroundColor: '#1877F2',
  },
  facebookF: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    lineHeight: 24,
    fontFamily: Typography.fontFamily,
  },
  linkedinBtn: {
    backgroundColor: '#0A66C2',
  },
  linkedinIn: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 20,
    fontFamily: Typography.fontFamily,
  },
});
