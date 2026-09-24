import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiService, ServiceCategory, WorkerPersonalDetails } from '../services/api';
import { useAuth } from './AuthContext';
import type { VerificationStatus } from '@shared/types/enums';

export interface WorkerProfileState {
  bio: string;
  indicativeRateKobo: number;
  serviceRadiusKm: number;
  categoryIds: string[];
  isComplete: boolean;
}

export interface WorkerVerificationState {
  status: VerificationStatus;
  verificationId?: string;
  documentType?: string;
  maskedIdNumber?: string;
  rejectionReason?: string;
  submittedAt?: string;
}

export interface WorkerPayoutBankState {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isVerified: boolean;
}

export interface WorkerSettingsState {
  availableForDispatch: boolean;
  pushAlerts: boolean;
  smsAlerts: boolean;
  biometricAuth: boolean;
}

interface WorkerContextType {
  profile: WorkerProfileState;
  verification: WorkerVerificationState;
  categories: ServiceCategory[];
  payoutBank: WorkerPayoutBankState | null;
  settings: WorkerSettingsState;
  personalDetails: WorkerPersonalDetails;
  isLoading: boolean;
  saveProfile: (params: {
    bio: string;
    indicativeRateKobo: number;
    serviceRadiusKm: number;
    categoryIds: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  submitVerification: (params: {
    documentType: 'nin' | 'voters_card' | 'drivers_license' | 'international_passport';
    idNumber: string;
    documentUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  saveBankDetails: (details: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updatePersonalDetails: (details: Partial<WorkerPersonalDetails>) => Promise<{ success: boolean; error?: string }>;
  updateSettings: (newSettings: Partial<WorkerSettingsState>) => Promise<void>;
  refreshStatus: () => void;
}

const WorkerContext = createContext<WorkerContextType | undefined>(undefined);

export const WorkerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const userId = session?.userId || 'anonymous_worker';

  const [categories] = useState<ServiceCategory[]>(() => ApiService.getCategories());
  const [profile, setProfile] = useState<WorkerProfileState>({
    bio: '',
    indicativeRateKobo: 350000, // Default ₦3,500
    serviceRadiusKm: 15,
    categoryIds: [],
    isComplete: false,
  });

  const [verification, setVerification] = useState<WorkerVerificationState>({
    status: 'unverified',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync verification status on load or user change
  const refreshStatus = useCallback(() => {
    if (!session) return;
    const currentStatus = ApiService.getWorkerVerificationStatus(userId);
    setVerification((prev) => ({ ...prev, status: currentStatus }));
  }, [session, userId]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const saveProfile = useCallback(
    async (params: {
      bio: string;
      indicativeRateKobo: number;
      serviceRadiusKm: number;
      categoryIds: string[];
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsLoading(true);
        await ApiService.completeWorkerOnboarding({
          bio: params.bio,
          indicativeRateKobo: params.indicativeRateKobo,
          serviceRadiusKm: params.serviceRadiusKm,
          categoryIds: params.categoryIds,
        });

        setProfile({
          ...params,
          isComplete: true,
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to save profile' };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const submitVerification = useCallback(
    async (params: {
      documentType: 'nin' | 'voters_card' | 'drivers_license' | 'international_passport';
      idNumber: string;
      documentUrl?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsLoading(true);

        // 1. Client-side NDPA validation check
        const validation = ApiService.validateDocumentNumber(
          params.documentType,
          params.idNumber
        );
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        // 2. Submit to service layer
        const result = await ApiService.submitWorkerVerification(userId, {
          verificationType: 'id_document',
          documentType: params.documentType,
          documentUrl: params.documentUrl || 'mock://storage/documents/nin_card.jpg',
          metadata: {
            idNumber: params.idNumber,
          },
        });

        if (!result.success) {
          return { success: false, error: result.error || 'Submission failed' };
        }

        setVerification({
          status: result.status,
          verificationId: result.verificationId,
          documentType: params.documentType,
          maskedIdNumber: validation.maskedNumber,
          submittedAt: new Date().toISOString(),
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Verification submission error' };
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  const [payoutBank, setPayoutBank] = useState<WorkerPayoutBankState | null>({
    bankCode: '044',
    bankName: 'Access Bank',
    accountNumber: '0123456789',
    accountName: 'VERIFIED WORKER HOLDER',
    isVerified: true,
  });

  const [settings, setSettings] = useState<WorkerSettingsState>({
    availableForDispatch: true,
    pushAlerts: true,
    smsAlerts: true,
    biometricAuth: false,
  });

  const saveBankDetails = useCallback(
    async (details: {
      bankCode: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsLoading(true);
        if (details.accountNumber.length !== 10) {
          return { success: false, error: 'Account number must be exactly 10 digits.' };
        }
        setPayoutBank({
          ...details,
          isVerified: true,
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to link bank account' };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const [personalDetails, setPersonalDetails] = useState<WorkerPersonalDetails>(() =>
    ApiService.getWorkerPersonalDetails(userId)
  );

  const updatePersonalDetails = useCallback(
    async (details: Partial<WorkerPersonalDetails>): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsLoading(true);
        const res = await ApiService.updateWorkerPersonalDetails(userId, details);
        if (res.success) {
          setPersonalDetails((prev) => ({
            ...prev,
            ...details,
          }));
        }
        return res;
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update personal details' };
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<WorkerSettingsState>): Promise<void> => {
      setSettings((prev) => ({
        ...prev,
        ...newSettings,
      }));
    },
    []
  );

  return (
    <WorkerContext.Provider
      value={{
        profile,
        verification,
        categories,
        payoutBank,
        settings,
        personalDetails,
        isLoading,
        saveProfile,
        submitVerification,
        saveBankDetails,
        updatePersonalDetails,
        updateSettings,
        refreshStatus,
      }}
    >
      {children}
    </WorkerContext.Provider>
  );
};

export function useWorker(): WorkerContextType {
  const context = useContext(WorkerContext);
  if (!context) {
    throw new Error('useWorker must be used within a WorkerProvider');
  }
  return context;
}
