import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { EmployerNavigator } from './EmployerNavigator';
import { WorkerNavigator } from './WorkerNavigator';

export const RootNavigator: React.FC = () => {
  const { session, activeRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {/* 
        Strict Role Isolation Architecture:
        The component tree branches completely at the root level based on authentication and active role.
        An Employer will never mount Worker tabs, and a Worker will never mount Employer tabs.
      */}
      {!session || !activeRole ? (
        <AuthNavigator />
      ) : activeRole === 'employer' ? (
        <EmployerNavigator />
      ) : (
        <WorkerNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.canvas,
  },
});
