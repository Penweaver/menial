import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

export interface SocialAuthButtonsProps {
  onSelectProvider: (provider: 'google' | 'facebook' | 'linkedin') => void;
  loadingProvider?: 'google' | 'facebook' | 'linkedin' | null;
  mode?: 'signin' | 'signup';
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onSelectProvider,
  loadingProvider = null,
  mode = 'signin',
}) => {
  const actionPrefix = mode === 'signin' ? 'Sign in with' : 'Sign up with';

  return (
    <View style={styles.container}>
      {/* Google / Gmail Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onSelectProvider('google')}
        disabled={!!loadingProvider}
        style={[styles.socialBtn, styles.googleBtn]}
      >
        {loadingProvider === 'google' ? (
          <ActivityIndicator size="small" color={Colors.textPrimary} />
        ) : (
          <View style={styles.btnContent}>
            <View style={styles.googleIconBox}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleBtnText}>{actionPrefix} Google</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Dual Row for Facebook and LinkedIn */}
      <View style={styles.dualRow}>
        {/* Facebook */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelectProvider('facebook')}
          disabled={!!loadingProvider}
          style={[styles.socialBtn, styles.halfBtn, styles.facebookBtn]}
        >
          {loadingProvider === 'facebook' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.btnContent}>
              <View style={styles.facebookIconBox}>
                <Text style={styles.facebookF}>f</Text>
              </View>
              <Text style={styles.facebookBtnText}>Facebook</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* LinkedIn */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelectProvider('linkedin')}
          disabled={!!loadingProvider}
          style={[styles.socialBtn, styles.halfBtn, styles.linkedinBtn]}
        >
          {loadingProvider === 'linkedin' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.btnContent}>
              <View style={styles.linkedinIconBox}>
                <Text style={styles.linkedinIn}>in</Text>
              </View>
              <Text style={styles.linkedinBtnText}>LinkedIn</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    width: '100%',
  },
  socialBtn: {
    height: 50,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  googleBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EA4335',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 16,
    fontFamily: Typography.fontFamily,
  },
  googleBtnText: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  dualRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  halfBtn: {
    flex: 1,
  },
  facebookBtn: {
    backgroundColor: '#1877F2',
  },
  facebookIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  facebookF: {
    color: '#1877F2',
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 16,
    fontFamily: Typography.fontFamily,
  },
  facebookBtnText: {
    ...Typography.scale.labelMd,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  linkedinBtn: {
    backgroundColor: '#0A66C2',
  },
  linkedinIconBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkedinIn: {
    color: '#0A66C2',
    fontWeight: '900',
    fontSize: 11,
    lineHeight: 13,
    fontFamily: Typography.fontFamily,
  },
  linkedinBtnText: {
    ...Typography.scale.labelMd,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
