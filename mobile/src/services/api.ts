/**
 * Menial Mobile - Backend Service Bridge
 * 
 * Calls the existing verified domain services in shared/services/ exclusively.
 * Zero duplicate auth or database logic from the client.
 */

import { AuthService } from '@shared/services/auth/AuthService';
import { MockSmsProvider } from '@shared/services/sms/MockSmsProvider';
import { ProfileService, CompleteWorkerOnboardingParams } from '@shared/services/profile/ProfileService';
import { JobService, CreateJobParams, JobPricingBreakdown } from '@shared/services/job/JobService';
import { MockVerificationProvider } from '@shared/services/verification/MockVerificationProvider';
import { MockPaymentProvider } from '@shared/services/payment/MockPaymentProvider';
import { MockPayoutProvider } from '@shared/services/payment/MockPayoutProvider';
import { JobExecutionService } from '@shared/services/execution/JobExecutionService';
import { TrustSafetyService, EmergencySosParams, JobShareDetails, SubmitRatingParams, RatingSubmissionResult } from '@shared/services/trust/TrustSafetyService';
import type { InitializePaymentOptions, PaymentInitializationResult } from '@shared/services/payment/PaymentService';
import type { BankAccountDetails, PayoutDisbursementResult } from '@shared/services/payment/PayoutService';
import type { DiscoveredWorker } from '@shared/services/profile/ProfileService';
import type { IDatabaseClient } from '@shared/services/admin/AdminService';
import type { PhoneAuthSession } from '@shared/services/auth/AuthService';
import type { UserAccountType, VerificationStatus, VerificationAction, DisputeReason } from '@shared/types/enums';
import type { VerificationSubmissionData, VerificationSubmissionResult } from '@shared/services/verification/VerificationService';

// Singletons for mobile service layer
export const smsProvider = new MockSmsProvider({ enableDevLogging: true });
export const authService = new AuthService(smsProvider);
export const verificationProvider = new MockVerificationProvider();
export const paymentProvider = new MockPaymentProvider();
export const payoutProvider = new MockPayoutProvider();

// In-memory / simulated client RPC bridge satisfying IDatabaseClient
const workerProfilesStore = new Map<string, CompleteWorkerOnboardingParams>();
const createdJobsStore = new Map<string, any>();
const sosReportsStore = new Map<string, any>();
const ratingsStore = new Map<string, any>();
let activePlatformFeePercent = 10.0;

export interface MockLedgerEntry {
  id: string;
  relatedType: 'payment' | 'payout' | 'fee' | 'refund';
  relatedId: string;
  jobId: string;
  actorId: string;
  amountKobo: number; // positive = credit, negative = debit
  currency: 'NGN';
  description: string;
  createdAt: string;
}

export const ledgerStore: MockLedgerEntry[] = [
  {
    id: 'ledg_init_1',
    relatedType: 'payment',
    relatedId: 'pay_past_01',
    jobId: 'job_past_demo_01',
    actorId: 'worker_adebayo',
    amountKobo: 350000, // ₦3,500
    currency: 'NGN',
    description: 'Escrow release: Move-In Deep Cleaning',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'ledg_init_2',
    relatedType: 'payment',
    relatedId: 'pay_past_02',
    jobId: 'job_past_demo_02',
    actorId: 'worker_adebayo',
    amountKobo: 500000, // ₦5,000
    currency: 'NGN',
    description: 'Escrow release: Window & Floor Cleaning',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'ledg_init_3',
    relatedType: 'payout',
    relatedId: 'mock_payout_nip_prev_01',
    jobId: 'manual_withdraw',
    actorId: 'worker_adebayo',
    amountKobo: -300000, // -₦3,000
    currency: 'NGN',
    description: 'NIP Bank Transfer to Access Bank (044)',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
];

// Seed past completed jobs for history & earnings demonstrations (§44, §45)
const pastDemoJob1 = {
  id: 'job_past_demo_01',
  publicJobId: 'MNL-2026-0982',
  categoryId: 'cat_cleaning',
  title: 'Move-In Deep Cleaning',
  description: 'Full scrubbing and sanitization of vacant 2-bedroom flat.',
  locationText: 'Admiralty Way, Lekki Phase 1, Lagos',
  scheduledDate: '2 days ago',
  startTime: '09:00 AM',
  durationMinutes: 180,
  numberOfWorkers: 1,
  workerPayKobo: 350000,
  platformFeeKobo: 35000,
  totalAmountKobo: 385000,
  status: 'completed',
  hiredWorkerId: 'worker_adebayo',
  employerPhone: '+2348011223344',
  employerName: 'Folake B.',
  workerName: 'Adebayo O.',
  isEscrowFunded: true,
  isEscrowReleased: true,
  rating: 5,
  reviewText: 'Adebayo was extremely punctual and thorough. My kitchen looks brand new!',
  createdAt: new Date(Date.now() - 172800000).toISOString(),
  completedAt: new Date(Date.now() - 172800000).toISOString(),
};

const pastDemoJob2 = {
  id: 'job_past_demo_02',
  publicJobId: 'MNL-2026-0814',
  categoryId: 'cat_cleaning',
  title: 'Post-Construction Window Cleaning',
  description: 'Careful removal of paint splatters and window polishing.',
  locationText: 'Victoria Island, Lagos',
  scheduledDate: '1 week ago',
  startTime: '11:00 AM',
  durationMinutes: 240,
  numberOfWorkers: 1,
  workerPayKobo: 500000,
  platformFeeKobo: 50000,
  totalAmountKobo: 550000,
  status: 'completed',
  hiredWorkerId: 'worker_adebayo',
  employerPhone: '+2348022334455',
  employerName: 'Tunde W.',
  workerName: 'Adebayo O.',
  isEscrowFunded: true,
  isEscrowReleased: true,
  rating: 5,
  reviewText: 'Very professional, verified pro. Highly recommended.',
  createdAt: new Date(Date.now() - 604800000).toISOString(),
  completedAt: new Date(Date.now() - 604800000).toISOString(),
};

createdJobsStore.set(pastDemoJob1.id, pastDemoJob1);
createdJobsStore.set(pastDemoJob2.id, pastDemoJob2);

// Seed active demonstration job for immediate execution simulation (§32, §45)
const defaultActiveJob = {
  id: 'job_active_demo_01',
  publicJobId: 'MNL-2026-1042',
  categoryId: 'cat_cleaning',
  title: 'Post-Renovation Apartment Deep Clean',
  description: 'Thorough cleaning for 3-bedroom flat including kitchen scrubbing and tile restoration.',
  locationText: 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos',
  scheduledDate: 'Today',
  startTime: '10:00 AM',
  durationMinutes: 240,
  numberOfWorkers: 1,
  workerPayKobo: 450000,
  platformFeeKobo: 45000,
  totalAmountKobo: 495000,
  status: 'payment_secured',
  hiredWorkerId: 'worker_adebayo',
  employerPhone: '+2348098765432',
  employerName: 'Chief Adeleke',
  workerName: 'Adebayo O.',
  isEscrowFunded: true,
  escrowReference: 'mock_ref_MNL-2026-1042_secured',
  createdAt: new Date().toISOString(),
};
createdJobsStore.set(defaultActiveJob.id, defaultActiveJob);

export const mockDbClient: IDatabaseClient = {
  async rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<{ data: T | null; error: Error | null }> {
    // 1. Worker Onboarding RPC
    if (fn === 'complete_worker_onboarding' && args) {
      const bio = String(args.p_bio || '');
      const indicativeRateKobo = Number(args.p_indicative_rate || 0);
      const serviceRadiusKm = Number(args.p_service_radius_km || 15);
      const categoryIds = (args.p_category_ids as string[]) || [];

      workerProfilesStore.set('current_worker', {
        bio,
        indicativeRateKobo,
        serviceRadiusKm,
        categoryIds,
        latitude: Number(args.p_latitude || 6.5244),
        longitude: Number(args.p_longitude || 3.3792),
      });

      return { data: true as unknown as T, error: null };
    }

    if (fn === 'toggle_worker_availability') {
      return { data: Boolean(args?.p_is_available) as unknown as T, error: null };
    }

    // 2. Job Creation RPC (§29, §30)
    if (fn === 'create_job_listing' && args) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const publicJobId = `MNL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const workerPayKobo = Number(args.p_worker_pay_kobo || 0);
      const numberOfWorkers = Number(args.p_number_of_workers || 1);

      // Section 29 Pricing calculation using active platform fee
      const pricing = JobService.calculateJobPricing(
        workerPayKobo,
        numberOfWorkers,
        activePlatformFeePercent
      );

      const jobRecord = {
        id: jobId,
        publicJobId,
        categoryId: args.p_category_id,
        title: args.p_title,
        description: args.p_description,
        locationText: args.p_location_text,
        scheduledDate: args.p_scheduled_date,
        startTime: args.p_start_time,
        durationMinutes: args.p_duration_minutes,
        numberOfWorkers,
        workerPayKobo,
        platformFeeKobo: pricing.platformFeeKobo,
        totalAmountKobo: pricing.totalAmountKobo,
        status: 'draft',
        createdAt: new Date().toISOString(),
      };

      createdJobsStore.set(jobId, jobRecord);

      return {
        data: {
          job_id: jobId,
          public_job_id: publicJobId,
          worker_pay_kobo: workerPayKobo,
          number_of_workers: numberOfWorkers,
          platform_fee_kobo: pricing.platformFeeKobo,
          total_amount_kobo: pricing.totalAmountKobo,
        } as unknown as T,
        error: null,
      };
    }

    // 3. Publish Job RPC (§32)
    if (fn === 'publish_job' && args) {
      const jobId = String(args.p_job_id);
      const job = createdJobsStore.get(jobId);
      if (job) {
        job.status = 'open';
        createdJobsStore.set(jobId, job);
      }
      return { data: true as unknown as T, error: null };
    }

    // 4. Platform Settings (§66)
    if (fn === 'get_platform_settings') {
      return {
        data: {
          platform_fee_percent: activePlatformFeePercent,
        } as unknown as T,
        error: null,
      };
    }

    // 5. Hire Worker RPC (§35)
    if (fn === 'hire_worker_for_job' && args) {
      const assignmentId = `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const jobId = String(args.p_job_id);
      const workerId = String(args.p_worker_id);
      const agreedAmountKobo = Number(args.p_agreed_amount_kobo || 0);

      const job = createdJobsStore.get(jobId);
      if (job) {
        job.hiredWorkerId = workerId;
        job.agreedAmountKobo = agreedAmountKobo;
        job.status = 'payment_pending';
        createdJobsStore.set(jobId, job);
      }
      return { data: assignmentId as unknown as T, error: null };
    }

    // 6. Real-Time Job Execution RPCs (§32, §45, §49)
    if (fn === 'mark_worker_on_way' && args) {
      const jobId = String(args.p_job_id);
      const job = createdJobsStore.get(jobId);
      if (job) {
        job.status = 'worker_on_way';
        job.startedTravelAt = new Date().toISOString();
        createdJobsStore.set(jobId, job);
      }
      return { data: true as unknown as T, error: null };
    }

    if (fn === 'mark_worker_arrived' && args) {
      const jobId = String(args.p_job_id);
      const job = createdJobsStore.get(jobId);
      if (job) {
        job.status = 'worker_arrived';
        job.arrivedAt = new Date().toISOString();
        job.checkinPhotoUrl = args.p_checkin_photo_url || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400';
        createdJobsStore.set(jobId, job);
      }
      return { data: true as unknown as T, error: null };
    }

    if (fn === 'start_job_work' && args) {
      const jobId = String(args.p_job_id);
      const job = createdJobsStore.get(jobId);
      if (job) {
        job.status = 'in_progress';
        job.startedWorkAt = new Date().toISOString();
        createdJobsStore.set(jobId, job);
      }
      return { data: true as unknown as T, error: null };
    }

    if (fn === 'complete_job_by_worker' && args) {
      const jobId = String(args.p_job_id);
      const job = createdJobsStore.get(jobId);
      if (job) {
        job.status = 'completed_by_worker';
        job.completedWorkAt = new Date().toISOString();
        job.checkoutPhotoUrl = args.p_checkout_photo_url || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400';
        job.completionNotes = args.p_completion_notes || 'All requested tasks completed satisfactorily.';
        createdJobsStore.set(jobId, job);
      }
      return { data: true as unknown as T, error: null };
    }

    if (fn === 'confirm_job_completion' && args) {
      const jobId = String(args.p_job_id);
      const job = createdJobsStore.get(jobId);
      if (job) {
        job.status = 'completed';
        job.confirmedAt = new Date().toISOString();
        job.isEscrowReleased = true;
        createdJobsStore.set(jobId, job);

        // Double-entry ledger: credit worker available balance upon completion (§44)
        const workerId = job.hiredWorkerId || 'worker_adebayo';
        const alreadyCredited = ledgerStore.some(
          (e) => e.jobId === jobId && e.relatedType === 'payment' && e.amountKobo > 0
        );
        if (!alreadyCredited && job.workerPayKobo) {
          ledgerStore.push({
            id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            relatedType: 'payment',
            relatedId: `pay_${jobId}`,
            jobId,
            actorId: workerId,
            amountKobo: job.workerPayKobo,
            currency: 'NGN',
            description: `Escrow release: ${job.title}`,
            createdAt: new Date().toISOString(),
          });
        }
      }
      return { data: true as unknown as T, error: null };
    }

    if (fn === 'raise_completion_dispute' && args) {
      const disputeId = `disp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const jobId = String(args.p_job_id);
      const job = createdJobsStore.get(jobId);
      if (job) {
        job.status = 'disputed';
        job.disputeId = disputeId;
        job.disputeReason = args.p_reason;
        job.disputeDescription = args.p_description;
        createdJobsStore.set(jobId, job);
      }
      return { data: disputeId as unknown as T, error: null };
    }

    // 7. Trust & Safety Emergency SOS (§49)
    if (fn === 'trigger_emergency_sos' && args) {
      const reportId = `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      sosReportsStore.set(reportId, {
        id: reportId,
        jobId: String(args.p_job_id),
        description: String(args.p_description),
        locationText: args.p_location_text,
        latitude: args.p_latitude,
        longitude: args.p_longitude,
        status: 'dispatched',
        createdAt: new Date().toISOString(),
      });
      return { data: reportId as unknown as T, error: null };
    }

    // 8. Mutual Post-Job Ratings & Running Average (§46)
    if (fn === 'submit_job_rating' && args) {
      const jobId = String(args.p_job_id);
      const stars = Number(args.p_stars);
      const reviewText = args.p_review_text ? String(args.p_review_text) : undefined;
      const job = createdJobsStore.get(jobId);

      if (stars < 1 || stars > 5) {
        return { data: null, error: new Error('Rating stars must be between 1 and 5 (§46).') };
      }

      const ratingId = `rate_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const workerId = job?.hiredWorkerId || 'worker_adebayo';
      const raterId = job?.employerId || 'current_employer';

      // Duplicate rating check (§46)
      const isDuplicate = Array.from(ratingsStore.values()).some(
        (r) => r.jobId === jobId && r.raterId === raterId
      );
      if (isDuplicate) {
        return { data: null, error: new Error('Duplicate rating: already reviewed this job (§46).') };
      }

      ratingsStore.set(ratingId, {
        ratingId,
        jobId,
        raterId,
        rateeId: workerId,
        stars,
        reviewText,
        createdAt: new Date().toISOString(),
      });

      if (job) {
        job.rating = stars;
        job.reviewText = reviewText;
        createdJobsStore.set(jobId, job);
      }

      // Recalculate running average for ratee
      const allWorkerRatings = Array.from(ratingsStore.values()).filter((r) => r.rateeId === workerId);
      // Include seed reviews for worker_adebayo if relevant
      const seedStars = workerId === 'worker_adebayo' ? [5, 5] : [];
      const combinedStars = [...seedStars, ...allWorkerRatings.map((r) => r.stars)];
      const newAverage = Number((combinedStars.reduce((sum, s) => sum + s, 0) / combinedStars.length).toFixed(2));

      return {
        data: {
          rating_id: ratingId,
          job_id: jobId,
          rater_id: raterId,
          ratee_id: workerId,
          stars,
          new_average_rating: newAverage,
        } as unknown as T,
        error: null,
      };
    }

    return { data: null, error: null };
  },
};

export const profileService = new ProfileService(mockDbClient);
export const jobService = new JobService(mockDbClient);
export const jobExecutionService = new JobExecutionService(mockDbClient);
export const trustSafetyService = new TrustSafetyService(mockDbClient);

export interface RequestOtpResult {
  success: boolean;
  rateLimitRemaining?: number;
  error?: string;
  isRateLimited?: boolean;
}

export interface VerifyOtpResult {
  success: boolean;
  session?: PhoneAuthSession;
  error?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  suggestedRateKobo: number;
}

// Master Spec Seed Categories (§26)
export const SEED_CATEGORIES: ServiceCategory[] = [
  {
    id: 'cat_cleaning',
    name: 'House Cleaning',
    description: 'Home, office, deep scrubbing, and move-in cleaning',
    icon: '🧹',
    suggestedRateKobo: 350000, // ₦3,500/hr
  },
  {
    id: 'cat_moving',
    name: 'Moving & Loading',
    description: 'Heavy lifting, truck loading, and item transfer',
    icon: '📦',
    suggestedRateKobo: 500000, // ₦5,000/hr
  },
  {
    id: 'cat_laundry',
    name: 'Laundry & Ironing',
    description: 'Hand washing, machine wash, and precision ironing',
    icon: '👕',
    suggestedRateKobo: 300000, // ₦3,000/task
  },
  {
    id: 'cat_gardening',
    name: 'Gardening & Compound',
    description: 'Lawn trimming, weeding, and yard maintenance',
    icon: '🌿',
    suggestedRateKobo: 400000, // ₦4,000/day
  },
  {
    id: 'cat_domestic',
    name: 'Domestic Assistance',
    description: 'Cooking support, kitchen help, and day assistance',
    icon: '🍳',
    suggestedRateKobo: 450000, // ₦4,500/day
  },
  {
    id: 'cat_construction',
    name: 'General & Site Labour',
    description: 'Manual site support, carrying, and masonry assistance',
    icon: '🧱',
    suggestedRateKobo: 600000, // ₦6,000/day
  },
  {
    id: 'cat_carwash',
    name: 'Car Washing',
    description: 'Vehicle interior and exterior mobile wash',
    icon: '🚗',
    suggestedRateKobo: 250000, // ₦2,500/wash
  },
  {
    id: 'cat_errands',
    name: 'Errands & Dispatch',
    description: 'Market shopping, package delivery, and queue assistance',
    icon: '🛵',
    suggestedRateKobo: 300000, // ₦3,000/errand
  },
];

// Seed Workers for Proximity Discovery (§28, §34) & Stitch Visual Fidelity
export interface MarketplaceWorker {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  indicativeRate: number; // in kobo
  ratingAvg: number;
  completedJobsCount: number;
  verificationStatus: VerificationStatus;
  isAvailable: boolean;
  serviceRadiusKm: number;
  latitude: number;
  longitude: number;
  categoryIds: string[];
  skills: string[];
  locationName: string;
  joinedYear: number;
  reviews: Array<{
    id: string;
    author: string;
    rating: number;
    date: string;
    comment: string;
  }>;
}

export const SEED_WORKERS: MarketplaceWorker[] = [
  {
    id: 'worker_adebayo',
    fullName: 'Adebayo O.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Specialized in deep kitchen sanitization, upholstery shampooing, and general post-renovation cleaning.',
    indicativeRate: 350000, // ₦3,500/hr
    ratingAvg: 4.9,
    completedJobsCount: 142,
    verificationStatus: 'verified',
    isAvailable: true,
    serviceRadiusKm: 20,
    latitude: 6.4380, // Lekki Phase 1
    longitude: 3.4280,
    categoryIds: ['cat_cleaning'],
    skills: ['Deep Cleaning', 'Sanitization', 'Office Maintenance'],
    locationName: 'Lekki Phase 1, Lagos',
    joinedYear: 2024,
    reviews: [
      { id: 'rev_1', author: 'Folake B.', rating: 5, date: '2 days ago', comment: 'Adebayo was extremely punctual and thorough. My kitchen looks brand new!' },
      { id: 'rev_2', author: 'Tunde W.', rating: 5, date: '1 week ago', comment: 'Very professional, verified pro. Highly recommended for post-construction cleaning.' },
    ],
  },
  {
    id: 'worker_musa',
    fullName: 'Musa Ibrahim',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    bio: 'Strong, reliable logistics handler. Experienced in residential moves, delicate furniture dismantling, and pallet loading.',
    indicativeRate: 500000, // ₦5,000/hr
    ratingAvg: 4.8,
    completedJobsCount: 98,
    verificationStatus: 'verified',
    isAvailable: true,
    serviceRadiusKm: 25,
    latitude: 6.4290, // Victoria Island
    longitude: 3.4210,
    categoryIds: ['cat_moving'],
    skills: ['Heavy Lifting', 'Furniture Packing', 'Truck Loading'],
    locationName: 'Victoria Island, Lagos',
    joinedYear: 2024,
    reviews: [
      { id: 'rev_3', author: 'Chinedu E.', rating: 5, date: '3 days ago', comment: 'Musa carried heavy sofa sets without a single scratch. Excellent work ethic.' },
    ],
  },
  {
    id: 'worker_chioma',
    fullName: 'Chioma Eze',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Meticulous fabric care specialist. Experienced with delicate traditional attire, steam pressing, and color sorting.',
    indicativeRate: 300000, // ₦3,000/task
    ratingAvg: 4.95,
    completedJobsCount: 87,
    verificationStatus: 'verified',
    isAvailable: true,
    serviceRadiusKm: 15,
    latitude: 6.4500, // Ikoyi
    longitude: 3.4350,
    categoryIds: ['cat_laundry'],
    skills: ['Fabric Care', 'Steam Ironing', 'Color Sorting'],
    locationName: 'Ikoyi, Lagos',
    joinedYear: 2024,
    reviews: [
      { id: 'rev_4', author: 'Dr. Alabi', rating: 5, date: 'Yesterday', comment: 'Chioma treated our bespoke native attires with immense care. Crisp folding.' },
    ],
  },
  {
    id: 'worker_babatunde',
    fullName: 'Babatunde Raji',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    bio: 'Professional compound and landscape maintainer. Expert lawn trimming, drainage clearance, and pest weed control.',
    indicativeRate: 400000, // ₦4,000/day
    ratingAvg: 4.75,
    completedJobsCount: 64,
    verificationStatus: 'verified',
    isAvailable: true,
    serviceRadiusKm: 20,
    latitude: 6.6018, // Ikeja
    longitude: 3.3515,
    categoryIds: ['cat_gardening'],
    skills: ['Lawn Mowing', 'Hedge Trimming', 'Drain Clearing'],
    locationName: 'Ikeja, Lagos',
    joinedYear: 2024,
    reviews: [
      { id: 'rev_5', author: 'Segun O.', rating: 5, date: '4 days ago', comment: 'Cleared our entire compound perimeter within hours. Very hardworking.' },
    ],
  },
  {
    id: 'worker_emeka',
    fullName: 'Emeka Nwosu',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    bio: 'Energetic manual site labourer. Block moving, sand mixing, debris evacuation, and warehouse unloading.',
    indicativeRate: 600000, // ₦6,000/day
    ratingAvg: 4.85,
    completedJobsCount: 115,
    verificationStatus: 'verified',
    isAvailable: true,
    serviceRadiusKm: 30,
    latitude: 6.5160, // Yaba
    longitude: 3.3850,
    categoryIds: ['cat_construction'],
    skills: ['Site Clearing', 'Material Transfer', 'Masonry Assist'],
    locationName: 'Yaba, Lagos',
    joinedYear: 2023,
    reviews: [
      { id: 'rev_6', author: 'Engr. Bello', rating: 5, date: '1 week ago', comment: 'Dependable and physically resilient. Helped complete our site delivery on time.' },
    ],
  },
  {
    id: 'worker_folashade',
    fullName: 'Folashade Adeleke',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    bio: 'Warm domestic assistant. Meal prep support, dishwashing, pantry organization, and day home assistance.',
    indicativeRate: 450000, // ₦4,500/day
    ratingAvg: 4.9,
    completedJobsCount: 73,
    verificationStatus: 'verified',
    isAvailable: true,
    serviceRadiusKm: 15,
    latitude: 6.4420, // Lekki Phase 1
    longitude: 3.4300,
    categoryIds: ['cat_domestic'],
    skills: ['Kitchen Prep', 'Pantry Care', 'Home Organization'],
    locationName: 'Lekki Phase 1, Lagos',
    joinedYear: 2024,
    reviews: [
      { id: 'rev_7', author: 'Kemi A.', rating: 5, date: '3 days ago', comment: 'Such a peaceful and respectful presence in our home. Food prep was clean and swift.' },
    ],
  },
];

// Employer Profile & Account Types (§22, §38, §80)
export interface EmployerProfileDetails {
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  defaultLocationAddress: string;
  defaultLga: string;
  businessType: 'Individual / Homeowner' | 'Property Manager' | 'Corporate / SME' | 'Construction Contractor';
  avatarUrl?: string | null;
}

export interface EmployerHiringSummary {
  totalJobsPosted: number;
  activeJobsCount: number;
  completedJobsCount: number;
  totalWorkersHired: number;
  totalEscrowFundedKobo: number;
}

export interface EmployerPaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer';
  label: string;
  details: string;
  isDefault: boolean;
  brand?: string;
  expiry?: string;
}

export const DEFAULT_EMPLOYER_PROFILE: EmployerProfileDetails = {
  fullName: 'Olumide Bakare',
  companyName: 'Bakare Estates & Properties',
  phone: '+234 802 999 8888',
  email: 'olumide@bakareestates.ng',
  defaultLocationAddress: 'Block 4, Admiralty Way, Lekki Phase 1',
  defaultLga: 'Eti-Osa, Lagos',
  businessType: 'Property Manager',
  avatarUrl: null,
};

let employerProfileStore: EmployerProfileDetails = { ...DEFAULT_EMPLOYER_PROFILE };

export const ApiService = {
  // Auth (§9, §43)
  async requestPhoneOtp(phone: string): Promise<RequestOtpResult> {
    const result = await authService.sendOtp(phone);
    if (!result.success) {
      const isRateLimited = result.error?.toLowerCase().includes('too many') ||
                            result.error?.toLowerCase().includes('rate limit');
      return {
        success: false,
        error: result.error,
        isRateLimited,
      };
    }
    return { success: true };
  },

  async verifyPhoneOtp(
    phone: string,
    code: string,
    accountType?: UserAccountType
  ): Promise<VerifyOtpResult> {
    return await authService.verifyOtpAndAuthenticate(phone, code, accountType);
  },

  // Worker Onboarding Profile (§22)
  async completeWorkerOnboarding(params: CompleteWorkerOnboardingParams): Promise<void> {
    await profileService.completeWorkerOnboarding(params);
  },

  getStoredWorkerProfile(): CompleteWorkerOnboardingParams | undefined {
    return workerProfilesStore.get('current_worker');
  },

  getCategories(): ServiceCategory[] {
    return SEED_CATEGORIES;
  },

  // Worker Identity Verification (§22, §25, §80)
  validateDocumentNumber(documentType: string, idNumber: string) {
    return verificationProvider.validateDocumentNumber(documentType, idNumber);
  },

  async submitWorkerVerification(
    userId: string,
    data: VerificationSubmissionData
  ): Promise<VerificationSubmissionResult> {
    return await verificationProvider.submitVerification(userId, data);
  },

  getWorkerVerificationStatus(userId: string): VerificationStatus {
    return verificationProvider.getUserStatus(userId);
  },

  async reviewVerificationSubmission(
    adminId: string,
    verificationId: string,
    action: VerificationAction,
    reason?: string
  ) {
    return await verificationProvider.reviewSubmission(adminId, verificationId, action, reason);
  },

  // Job Creation & Section 29 Pricing (§29, §30, §32)
  calculateJobPricing(
    workerPayKobo: number,
    numberOfWorkers: number,
    feePercentage: number = activePlatformFeePercent
  ): JobPricingBreakdown {
    return JobService.calculateJobPricing(workerPayKobo, numberOfWorkers, feePercentage);
  },

  async getPlatformFeePercentage(): Promise<number> {
    return activePlatformFeePercent;
  },

  setPlatformFeePercentage(percent: number): void {
    activePlatformFeePercent = percent;
  },

  async createJob(params: CreateJobParams): Promise<{
    jobId: string;
    publicJobId: string;
    pricing: JobPricingBreakdown;
  }> {
    return await jobService.createJob(params);
  },

  async publishJob(jobId: string): Promise<void> {
    await jobService.publishJob(jobId);
  },

  getCreatedJob(jobId: string) {
    return createdJobsStore.get(jobId);
  },

  getCreatedJobs() {
    return Array.from(createdJobsStore.values());
  },

  // Worker Discovery & Proximity Ranking (§28, §34)
  async discoverWorkers(params?: {
    categoryId?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    verifiedOnly?: boolean;
    searchQuery?: string;
  }): Promise<DiscoveredWorker[]> {
    const lat = params?.latitude ?? 6.4380; // Lekki default
    const lon = params?.longitude ?? 3.4280;
    const radius = params?.radiusKm ?? 25;
    const verified = params?.verifiedOnly ?? true;

    // Filter by search query if provided
    let pool = SEED_WORKERS;
    if (params?.searchQuery && params.searchQuery.trim().length > 0) {
      const q = params.searchQuery.toLowerCase().trim();
      pool = pool.filter(
        (w) =>
          w.fullName.toLowerCase().includes(q) ||
          w.skills.some((s) => s.toLowerCase().includes(q)) ||
          w.locationName.toLowerCase().includes(q) ||
          (w.bio && w.bio.toLowerCase().includes(q))
      );
    }

    // If specific category is requested, use ProfileService filterAndRankWorkers
    if (params?.categoryId && params.categoryId !== 'all') {
      return profileService.filterAndRankWorkers(pool, {
        categoryId: params.categoryId,
        latitude: lat,
        longitude: lon,
        radiusKm: radius,
        verifiedOnly: verified,
      });
    }

    // Across all categories: run proximity and ranking per §28
    const ranked: DiscoveredWorker[] = [];
    for (const w of pool) {
      if (!w.isAvailable) continue;
      if (verified && w.verificationStatus !== 'verified') continue;
      const distance = ProfileService.calculateDistanceKm(lat, lon, w.latitude, w.longitude);
      if (distance > radius || distance > w.serviceRadiusKm) continue;

      ranked.push({
        id: w.id,
        fullName: w.fullName,
        avatarUrl: w.avatarUrl,
        bio: w.bio,
        indicativeRateKobo: w.indicativeRate,
        currency: 'NGN',
        ratingAvg: w.ratingAvg,
        completedJobsCount: w.completedJobsCount,
        verificationStatus: w.verificationStatus,
        distanceKm: distance,
      });
    }

    return ranked.sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
    });
  },

  getWorkerById(workerId: string): MarketplaceWorker | undefined {
    return SEED_WORKERS.find((w) => w.id === workerId);
  },

  // Worker Hiring (§35)
  async hireWorker(params: {
    jobId: string;
    workerId: string;
    agreedAmountKobo: number;
  }): Promise<{ assignmentId: string }> {
    return await jobService.hireWorker(params);
  },

  // Paystack Escrow Payment Flow (§37, §39, §44)
  async initializeEscrowPayment(options: InitializePaymentOptions): Promise<PaymentInitializationResult> {
    return await paymentProvider.initializePayment(options);
  },

  async confirmEscrowPayment(
    providerReference: string,
    amountKobo: number,
    jobId?: string
  ): Promise<{ success: boolean; isIdempotentReplay?: boolean; error?: string }> {
    const result = await paymentProvider.handleWebhook({
      event: 'charge.success',
      providerReference,
      amountKobo,
      currency: 'NGN',
    });

    if (result.success && jobId) {
      const job = createdJobsStore.get(jobId);
      if (job) {
        job.status = 'payment_secured';
        job.isEscrowFunded = true;
        job.escrowReference = providerReference;
        createdJobsStore.set(jobId, job);
      }
    }

    return result;
  },

  // Active Job Execution (§32, §45, §49)
  async startTravel(jobId: string): Promise<void> {
    await jobExecutionService.startTravel(jobId);
  },

  async arriveAtJob(jobId: string, photoUrl?: string): Promise<void> {
    await jobExecutionService.arriveAtJob({ jobId, photoUrl });
  },

  async startWork(jobId: string): Promise<void> {
    await jobExecutionService.startWork(jobId);
  },

  async completeWork(jobId: string, photoUrl?: string, completionNotes?: string): Promise<void> {
    await jobExecutionService.completeWork({ jobId, photoUrl, completionNotes });
  },

  async confirmCompletion(jobId: string): Promise<void> {
    await jobExecutionService.confirmCompletion(jobId);
  },

  async raiseDispute(
    jobId: string,
    reason: DisputeReason,
    description: string
  ): Promise<{ disputeId: string }> {
    return await jobExecutionService.raiseDispute({ jobId, reason, description });
  },

  // Trust & Safety Emergency SOS & Share Sheet (§49)
  async triggerEmergencySos(params: EmergencySosParams): Promise<{ reportId: string }> {
    return await trustSafetyService.triggerEmergencySos(params);
  },

  generateJobShareDetails(options: {
    publicJobId: string;
    jobTitle: string;
    locationText: string;
    scheduledTime: string;
    counterpartyName: string;
    counterpartyRole: 'Employer' | 'Worker';
  }): JobShareDetails {
    return TrustSafetyService.generateJobShareDetails(options);
  },

  getActiveJob(jobId?: string) {
    if (jobId) {
      return createdJobsStore.get(jobId);
    }
    // Return first active job
    for (const job of createdJobsStore.values()) {
      if (
        job.status === 'payment_secured' ||
        job.status === 'worker_on_way' ||
        job.status === 'worker_arrived' ||
        job.status === 'in_progress' ||
        job.status === 'completed_by_worker'
      ) {
        return job;
      }
    }
    return defaultActiveJob;
  },

  getSosReport(reportId: string) {
    return sosReportsStore.get(reportId);
  },

  // --------------------------------------------------------------------------
  // Slice 6: Worker Earnings, NIP Bank Payouts, Ratings & Work History (§41, §44, §46)
  // --------------------------------------------------------------------------

  async validateNuban(
    accountNumber: string,
    bankCode: string
  ): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    return await payoutProvider.resolveBankAccount(accountNumber, bankCode);
  },

  getWorkerEarningsSummary(workerId: string = 'worker_adebayo'): WorkerEarningsSummary {
    const entries = ledgerStore.filter((e) => e.actorId === workerId);

    // Lifetime earnings = sum of all positive payment credits
    const lifetimeEarningsKobo = entries
      .filter((e) => e.relatedType === 'payment' && e.amountKobo > 0)
      .reduce((sum, e) => sum + e.amountKobo, 0);

    // Total withdrawn = sum of all absolute payout debits
    const totalWithdrawnKobo = Math.abs(
      entries
        .filter((e) => e.relatedType === 'payout' && e.amountKobo < 0)
        .reduce((sum, e) => sum + e.amountKobo, 0)
    );

    // Pending escrow = active jobs funded but not yet completed
    let pendingEscrowKobo = 0;
    for (const job of createdJobsStore.values()) {
      const isThisWorker = job.hiredWorkerId === workerId || (!job.hiredWorkerId && workerId === 'worker_adebayo');
      if (
        isThisWorker &&
        job.isEscrowFunded &&
        job.status !== 'completed' &&
        job.status !== 'cancelled'
      ) {
        pendingEscrowKobo += job.workerPayKobo || 0;
      }
    }

    const availableBalanceKobo = Math.max(0, lifetimeEarningsKobo - totalWithdrawnKobo);

    return {
      availableBalanceKobo,
      pendingEscrowKobo,
      lifetimeEarningsKobo,
      totalWithdrawnKobo,
    };
  },

  async withdrawEarnings(options: {
    workerId?: string;
    amountKobo: number;
    bankAccount: BankAccountDetails;
  }): Promise<PayoutDisbursementResult> {
    const workerId = options.workerId || 'worker_adebayo';
    const summary = this.getWorkerEarningsSummary(workerId);

    if (options.amountKobo <= 0) {
      return {
        success: false,
        payoutId: '',
        providerReference: '',
        status: 'failed',
        amountKobo: options.amountKobo,
        currency: 'NGN',
        error: 'Withdrawal amount must be greater than zero.',
      };
    }

    if (options.amountKobo > summary.availableBalanceKobo) {
      return {
        success: false,
        payoutId: '',
        providerReference: '',
        status: 'failed',
        amountKobo: options.amountKobo,
        currency: 'NGN',
        error: `Insufficient available balance. Requested: ₦${(options.amountKobo / 100).toLocaleString()}, Available: ₦${(summary.availableBalanceKobo / 100).toLocaleString()}`,
      };
    }

    const result = await payoutProvider.disbursePayout({
      jobId: `withdraw_${Date.now()}`,
      workerId,
      amountKobo: options.amountKobo,
      bankAccount: options.bankAccount,
    });

    if (result.success) {
      const bankName = SUPPORTED_NIGERIAN_BANKS.find((b) => b.code === options.bankAccount.bankCode)?.name || 'Bank';
      ledgerStore.push({
        id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        relatedType: 'payout',
        relatedId: result.providerReference,
        jobId: 'manual_withdraw',
        actorId: workerId,
        amountKobo: -options.amountKobo,
        currency: 'NGN',
        description: `NIP Bank Transfer to ${bankName} (${options.bankAccount.accountNumber})`,
        createdAt: new Date().toISOString(),
      });
    }

    return result;
  },

  getLedgerTransactions(workerId: string = 'worker_adebayo'): MockLedgerEntry[] {
    return ledgerStore
      .filter((e) => e.actorId === workerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async submitJobRating(params: SubmitRatingParams): Promise<RatingSubmissionResult> {
    return await trustSafetyService.submitRating(params);
  },

  getJobRating(jobId: string) {
    return Array.from(ratingsStore.values()).find((r) => r.jobId === jobId);
  },

  getWorkerJobHistory(workerId: string = 'worker_adebayo') {
    return Array.from(createdJobsStore.values())
      .filter((j) => j.hiredWorkerId === workerId || workerId === 'worker_adebayo')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  getSupportedBanks(): typeof SUPPORTED_NIGERIAN_BANKS {
    return SUPPORTED_NIGERIAN_BANKS;
  },

  async resolveNubanAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<{ success: boolean; accountName?: string; error?: string }> {
    const res = await payoutProvider.resolveBankAccount(accountNumber, bankCode);
    return {
      success: res.valid,
      accountName: res.accountName,
      error: res.error,
    };
  },

  getEmployerJobHistory(employerId?: string) {
    return Array.from(createdJobsStore.values())
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  // Employer Account Standardization & Lifecycle (§22, §38, §80)
  getEmployerProfile(employerId: string = 'employer_default'): EmployerProfileDetails {
    return { ...employerProfileStore };
  },

  async updateEmployerProfile(
    employerId: string = 'employer_default',
    details: Partial<EmployerProfileDetails>
  ): Promise<{ success: boolean; error?: string }> {
    employerProfileStore = {
      ...employerProfileStore,
      ...details,
    };
    return { success: true };
  },

  getEmployerHiringSummary(employerId?: string): EmployerHiringSummary {
    const jobs = Array.from(createdJobsStore.values());
    const activeJobs = jobs.filter((j) =>
      ['payment_secured', 'assigned', 'in_progress', 'travelling', 'arrived'].includes(j.status)
    );
    const completedJobs = jobs.filter((j) => j.status === 'completed');
    const totalEscrowFundedKobo = jobs.reduce(
      (sum, j) => sum + (j.isEscrowFunded ? (j.pricing?.totalEmployerChargeKobo || j.workerPayKobo || 0) : 0),
      0
    );

    return {
      totalJobsPosted: Math.max(jobs.length, 12),
      activeJobsCount: activeJobs.length,
      completedJobsCount: Math.max(completedJobs.length, 11),
      totalWorkersHired: Math.max(jobs.filter((j) => !!j.hiredWorkerId).length, 18),
      totalEscrowFundedKobo: Math.max(totalEscrowFundedKobo, 48500000), // baseline ₦485,000 funded
    };
  },

  getEmployerPaymentMethods(employerId?: string): EmployerPaymentMethod[] {
    return [
      {
        id: 'pm_card_01',
        type: 'card',
        label: 'Paystack Secured Card',
        details: 'Visa ending in 4242',
        brand: 'Visa',
        expiry: '08/28',
        isDefault: true,
      },
      {
        id: 'pm_bank_01',
        type: 'bank_transfer',
        label: 'NIP Direct Escrow Transfer',
        details: 'Wema Bank • Virtual Dedicated Account',
        isDefault: false,
      },
    ];
  },

  async deleteEmployerAccount(
    employerId: string = 'employer_default',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Check for active uncompleted/funded jobs (§32, §38)
    const activeJobs = Array.from(createdJobsStore.values()).filter(
      (j) => ['payment_secured', 'assigned', 'in_progress', 'travelling', 'arrived'].includes(j.status)
    );
    if (activeJobs.length > 0) {
      return {
        success: false,
        error: `Cannot delete account with ${activeJobs.length} active job(s) in progress. Please complete or cancel ongoing assignments first.`,
      };
    }

    // 2. Clear employer profile and purge jobs per NDPA Erasure §80
    employerProfileStore = { ...DEFAULT_EMPLOYER_PROFILE };
    for (const [id, job] of createdJobsStore.entries()) {
      if (['draft', 'published', 'completed', 'cancelled'].includes(job.status)) {
        createdJobsStore.delete(id);
      }
    }

    return { success: true };
  },

  // Worker Account Standardization & Lifecycle (§22, §44, §80)
  getWorkerPersonalDetails(workerId: string = 'worker_adebayo'): WorkerPersonalDetails {
    const worker = SEED_WORKERS.find((w) => w.id === workerId);
    return {
      fullName: worker?.fullName || 'Adebayo Ogunlesi',
      phone: '+234 803 333 4444',
      bio: worker?.bio || 'Dependable facility care technician. Specialized in deep cleaning, floor scrubbing, post-construction cleanup, and rapid residential service.',
      locationName: worker?.locationName || 'Lekki Phase 1, Lagos',
      emergencyContactName: 'Bolanle Ogunlesi',
      emergencyContactPhone: '+234 802 111 2222',
      avatarUrl: worker?.avatarUrl ?? undefined,
    };
  },

  async updateWorkerPersonalDetails(
    workerId: string = 'worker_adebayo',
    details: Partial<WorkerPersonalDetails>
  ): Promise<{ success: boolean; error?: string }> {
    const worker = SEED_WORKERS.find((w) => w.id === workerId);
    if (worker) {
      if (details.fullName) worker.fullName = details.fullName;
      if (details.bio) worker.bio = details.bio;
      if (details.locationName) worker.locationName = details.locationName;
    }
    return { success: true };
  },

  getWorkerReputation(workerId: string = 'worker_adebayo'): WorkerReputation {
    const worker = SEED_WORKERS.find((w) => w.id === workerId) || SEED_WORKERS[0];
    return {
      ratingAvg: worker.ratingAvg || 4.9,
      completedJobsCount: worker.completedJobsCount || 42,
      onTimeArrivalPercent: 98,
      reliabilityScore: 99,
      ratingsBreakdown: {
        fiveStar: 38,
        fourStar: 4,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0,
      },
      reviews: worker.reviews || [],
    };
  },

  async deleteWorkerAccount(
    workerId: string = 'worker_adebayo',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Check for active uncompleted job (§32)
    const activeJob = ApiService.getActiveJob();
    if (activeJob && !['completed', 'cancelled', 'expired'].includes(activeJob.status)) {
      return {
        success: false,
        error: 'Cannot delete account with an active job in progress. Please complete or resolve your ongoing assignment first.',
      };
    }

    // 2. Check for pending escrow funds (§44)
    const earnings = ApiService.getWorkerEarningsSummary(workerId);
    if (earnings.pendingEscrowKobo > 0) {
      return {
        success: false,
        error: 'You have pending escrow funds in progress. Please resolve or withdraw them before deleting your account.',
      };
    }

    // 3. Remove worker from discovery pool (NDPA Erasure §80)
    const index = SEED_WORKERS.findIndex((w) => w.id === workerId);
    if (index !== -1) {
      SEED_WORKERS.splice(index, 1);
    }
    workerProfilesStore.delete(workerId);

    return { success: true };
  },
};

export interface WorkerPersonalDetails {
  fullName: string;
  phone: string;
  bio: string;
  locationName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  avatarUrl?: string | null;
}

export interface WorkerReputation {
  ratingAvg: number;
  completedJobsCount: number;
  onTimeArrivalPercent: number;
  reliabilityScore: number;
  ratingsBreakdown: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
  };
  reviews: Array<{
    id: string;
    author: string;
    rating: number;
    date: string;
    comment: string;
  }>;
}

export const apiService = ApiService;

export interface WorkerEarningsSummary {
  availableBalanceKobo: number;
  pendingEscrowKobo: number;
  lifetimeEarningsKobo: number;
  totalWithdrawnKobo: number;
}

export const SUPPORTED_NIGERIAN_BANKS = [
  { code: '058', name: 'Guaranty Trust Bank (GTB)' },
  { code: '044', name: 'Access Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
];

