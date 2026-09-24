import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

export interface SocialAuthButtonsProps {
  onSelectProvider: (provider: 'google' | 'facebook' | 'linkedin') => void;
  loadingProvider?: 'google' | 'facebook' | 'linkedin' | null;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onSelectProvider,
  loadingProvider = null,
}) => {
  return (
    <View style={styles.container}>
      {/* Google (Gmail) Icon Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelectProvider('google')}
        disabled={!!loadingProvider}
        style={[styles.iconBtn, styles.googleBtn]}
        accessibilityLabel="Sign in with Google"
      >
        {loadingProvider === 'google' ? (
          <ActivityIndicator size="small" color={Colors.textPrimary} />
        ) : (
          <View style={styles.googleIconBox}>
            <Text style={styles.googleG}>G</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Facebook Icon Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelectProvider('facebook')}
        disabled={!!loadingProvider}
        style={[styles.iconBtn, styles.facebookBtn]}
        accessibilityLabel="Sign in with Facebook"
      >
        {loadingProvider === 'facebook' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.facebookF}>f</Text>
        )}
      </TouchableOpacity>

      {/* LinkedIn Icon Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelectProvider('linkedin')}
        disabled={!!loadingProvider}
        style={[styles.iconBtn, styles.linkedinBtn]}
        accessibilityLabel="Sign in with LinkedIn"
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
    gap: Spacing.lg,
  },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  googleBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
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
    fontSize: 17,
    lineHeight: 20,
    fontFamily: Typography.fontFamily,
  },
});
