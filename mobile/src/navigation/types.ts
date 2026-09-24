import type { UserAccountType } from '@shared/types/enums';

export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Registration: undefined;
  Verification: {
    phone: string;
    isRegistration?: boolean;
    role?: UserAccountType;
  };
  RoleSelection: {
    phone: string;
  };
};

export type EmployerTabParamList = {
  Discover: undefined;
  CreateJob: undefined;
  MyJobs: undefined;
  Profile: undefined;
};

export type EmployerDiscoverStackParamList = {
  WorkerDiscovery: undefined;
  WorkerDetail: { workerId: string };
  HireWorker: { workerId: string };
  EscrowPayment: {
    jobId: string;
    publicJobId?: string;
    workerId: string;
    workerName: string;
    jobTitle: string;
    workerPayKobo: number;
    workerCount?: number;
    platformFeeKobo?: number;
    totalEscrowKobo?: number;
  };
};

export type EmployerCreateJobStackParamList = {
  SelectCategory: undefined;
  JobDetailsLocation: undefined;
  Schedule: undefined;
  PricingWorkerCount: undefined;
  ReviewPublish: undefined;
};

export type WorkerTabParamList = {
  JobFeed: undefined;
  ActiveJob: undefined;
  Wallet: undefined;
  Profile: undefined;
};

export type WorkerProfileStackParamList = {
  ProfileHome: undefined;
  ProfileSetup: undefined;
  NINVerification: undefined;
  VerificationStatus: undefined;
  PayoutSettings: undefined;
  Preferences: undefined;
  Support: undefined;
};
