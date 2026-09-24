import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ApiService,
  EmployerProfileDetails,
  EmployerHiringSummary,
  EmployerPaymentMethod,
  DEFAULT_EMPLOYER_PROFILE,
} from '../services/api';
import { useAuth } from './AuthContext';

export interface EmployerSettingsState {
  arrivalAlerts: boolean; // §49 real-time worker check-in alerts
  smsReceipts: boolean;
  emailInvoices: boolean;
  biometricAuth: boolean;
  instantEscrowFunding: boolean;
}

interface EmployerContextType {
  profile: EmployerProfileDetails;
  hiringSummary: EmployerHiringSummary;
  paymentMethods: EmployerPaymentMethod[];
  settings: EmployerSettingsState;
  isLoading: boolean;
  updateProfile: (details: Partial<EmployerProfileDetails>) => Promise<{ success: boolean; error?: string }>;
  updateSettings: (newSettings: Partial<EmployerSettingsState>) => Promise<void>;
  refreshProfile: () => void;
}

const EmployerContext = createContext<EmployerContextType | undefined>(undefined);

export const EmployerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const employerId = session?.userId || 'employer_default';

  const [profile, setProfile] = useState<EmployerProfileDetails>(() =>
    ApiService.getEmployerProfile(employerId)
  );
  const [hiringSummary, setHiringSummary] = useState<EmployerHiringSummary>(() =>
    ApiService.getEmployerHiringSummary(employerId)
  );
  const [paymentMethods, setPaymentMethods] = useState<EmployerPaymentMethod[]>(() =>
    ApiService.getEmployerPaymentMethods(employerId)
  );
  const [settings, setSettings] = useState<EmployerSettingsState>({
    arrivalAlerts: true,
    smsReceipts: true,
    emailInvoices: true,
    biometricAuth: false,
    instantEscrowFunding: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshProfile = useCallback(() => {
    const updatedProfile = ApiService.getEmployerProfile(employerId);
    const updatedSummary = ApiService.getEmployerHiringSummary(employerId);
    const updatedMethods = ApiService.getEmployerPaymentMethods(employerId);
    setProfile(updatedProfile);
    setHiringSummary(updatedSummary);
    setPaymentMethods(updatedMethods);
  }, [employerId]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const updateProfile = useCallback(
    async (details: Partial<EmployerProfileDetails>): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsLoading(true);
        const res = await ApiService.updateEmployerProfile(employerId, details);
        if (res.success) {
          setProfile((prev) => ({ ...prev, ...details }));
        }
        setIsLoading(false);
        return res;
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err.message || 'Failed to update employer profile.' };
      }
    },
    [employerId]
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<EmployerSettingsState>): Promise<void> => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
    },
    []
  );

  return (
    <EmployerContext.Provider
      value={{
        profile,
        hiringSummary,
        paymentMethods,
        settings,
        isLoading,
        updateProfile,
        updateSettings,
        refreshProfile,
      }}
    >
      {children}
    </EmployerContext.Provider>
  );
};

export const useEmployer = (): EmployerContextType => {
  const context = useContext(EmployerContext);
  if (!context) {
    throw new Error('useEmployer must be used within an EmployerProvider');
  }
  return context;
};
