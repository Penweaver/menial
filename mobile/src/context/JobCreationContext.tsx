import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ApiService, ServiceCategory } from '../services/api';
import type { JobPricingBreakdown } from '@shared/services/job/JobService';

export interface JobDraft {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  title: string;
  description: string;
  locationText: string;
  lga: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string;    // HH:MM
  durationMinutes: number;
  numberOfWorkers: number;
  workerPayKobo: number; // Per-worker pay in kobo (§29)
}

interface JobCreationContextType {
  draft: JobDraft;
  pricing: JobPricingBreakdown;
  platformFeePercent: number;
  isLoading: boolean;
  categories: ServiceCategory[];
  updateDraft: (updates: Partial<JobDraft>) => void;
  resetDraft: () => void;
  submitAndPublishJob: () => Promise<{
    success: boolean;
    jobId?: string;
    publicJobId?: string;
    error?: string;
  }>;
}

const defaultDraft: JobDraft = {
  categoryId: 'cat_cleaning',
  categoryName: 'House Cleaning',
  categoryIcon: '🧹',
  title: '',
  description: '',
  locationText: '',
  lga: 'Eti-Osa (Lekki / VI)',
  scheduledDate: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  durationMinutes: 240, // 4 hours
  numberOfWorkers: 1,
  workerPayKobo: 350000, // Default ₦3,500/worker
};

const JobCreationContext = createContext<JobCreationContextType | undefined>(undefined);

export const JobCreationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draft, setDraft] = useState<JobDraft>(defaultDraft);
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(10.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const categories = useMemo(() => ApiService.getCategories(), []);

  // Fetch live configurable platform fee from platform settings
  useEffect(() => {
    let isMounted = true;
    ApiService.getPlatformFeePercentage().then((fee) => {
      if (isMounted) setPlatformFeePercent(fee);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const updateDraft = useCallback((updates: Partial<JobDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(defaultDraft);
  }, []);

  // Section 29 Pure pricing calculation:
  // "proposed pay is a per-worker amount, not a total budget to be split.
  // total cost is proposed pay × number_of_workers + platform_fee"
  const pricing = useMemo(() => {
    return ApiService.calculateJobPricing(
      draft.workerPayKobo,
      draft.numberOfWorkers,
      platformFeePercent
    );
  }, [draft.workerPayKobo, draft.numberOfWorkers, platformFeePercent]);

  const submitAndPublishJob = useCallback(async (): Promise<{
    success: boolean;
    jobId?: string;
    publicJobId?: string;
    error?: string;
  }> => {
    try {
      setIsLoading(true);

      // 1. Create job listing (§29, §30)
      const created = await ApiService.createJob({
        categoryId: draft.categoryId,
        title: draft.title || `${draft.categoryName} Task`,
        description: draft.description,
        locationText: `${draft.locationText}, ${draft.lga}`,
        scheduledDate: draft.scheduledDate,
        startTime: `${draft.startTime}:00`,
        durationMinutes: draft.durationMinutes,
        numberOfWorkers: draft.numberOfWorkers,
        workerPayKobo: draft.workerPayKobo,
      });

      // 2. Publish job (§32)
      await ApiService.publishJob(created.jobId);

      return {
        success: true,
        jobId: created.jobId,
        publicJobId: created.publicJobId,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to publish job',
      };
    } finally {
      setIsLoading(false);
    }
  }, [draft]);

  return (
    <JobCreationContext.Provider
      value={{
        draft,
        pricing,
        platformFeePercent,
        isLoading,
        categories,
        updateDraft,
        resetDraft,
        submitAndPublishJob,
      }}
    >
      {children}
    </JobCreationContext.Provider>
  );
};

export function useJobCreation(): JobCreationContextType {
  const context = useContext(JobCreationContext);
  if (!context) {
    throw new Error('useJobCreation must be used within a JobCreationProvider');
  }
  return context;
}
