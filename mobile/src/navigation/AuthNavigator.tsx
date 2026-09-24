import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { SplashScreen } from '../screens/shared/SplashScreen';
import { WelcomeScreen } from '../screens/shared/WelcomeScreen';
import { LoginScreen } from '../screens/shared/LoginScreen';
import { RegistrationScreen } from '../screens/shared/RegistrationScreen';
import { VerificationScreen } from '../screens/shared/VerificationScreen';
import { RoleSelectionScreen } from '../screens/shared/RoleSelectionScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Registration" component={RegistrationScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    </Stack.Navigator>
  );
};
