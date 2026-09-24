import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';

type SplashScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Splash'>;
};

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { session, activeRole, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Small delay to allow splash animation to settle
    const timer = setTimeout(() => {
      if (session && activeRole) {
        // Authenticated and role assigned -> RootNavigator automatically switches to Employer/Worker tree
      } else if (session && !activeRole) {
        navigation.replace('RoleSelection', { phone: session.phone });
      } else {
        navigation.replace('Welcome');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [isLoading, session, activeRole, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.brandContainer}>
        <Text style={styles.brandTitle}>menial</Text>
        <Text style={styles.brandTagline}>Dignified Utility</Text>
      </View>
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={Colors.primaryOn} />
        <Text style={styles.loadingText}>Securing local session...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxl * 2,
  },
  brandContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '800',
    color: Colors.primaryOn,
    letterSpacing: -1,
  },
  brandTagline: {
    ...Typography.scale.labelLg,
    color: Colors.secondary,
    marginTop: Spacing.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.scale.bodySm,
    color: Colors.primaryOn,
    opacity: 0.8,
  },
});
