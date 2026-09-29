/**
 * Menial Platform - Job & Marketplace Service
 * 
 * Implements job lifecycle management, per-worker pricing calculation in kobo,
 * category wage bounds validation (§G), tiered hiring eligibility checks (§B),
 * hiring validations, worker assignments, cancellation windows, and safety checklists.
 * Reference: menial-master-spec-v2.md (§29, §30, §31, §32, §33, §35, §36, §40) & Spec Addendum v3 (§B, §G)
 */

import type { IDatabaseClient } from '../admin/AdminService';
import type { JobStatus, ActorPartyType, VerificationTier } from '../../types/enums';

export interface CreateJobParams {
  categoryId: string;
  title: string;
  description: string;
  locationText: string;
  latitude?: number;
  longitude?: number;
  scheduledDate: string; // YYYY-MM-DD
  startTime?: string;    // HH:MM:SS
  durationMinutes?: number;
  numberOfWorkers: number;
  workerPayKobo: number;  // Per-worker pay in kobo (§29)
}

export interface JobPricingBreakdown {
  workerPayKobo: number;
  numberOfWorkers: number;
  subtotalKobo: number;
  platformFeeKobo: number;
  totalAmountKobo: number;
  currency: 'NGN';
}

export interface WageBoundsCheckResult {
  isValid: boolean;
  isBelowFloor: boolean;
  isAboveCeiling: boolean;
  minPayKobo: number | null;
  maxPayKobo: number | null;
  error?: string;
  warning?: string;
}

export interface CategorySafetyConfig {
  tier: VerificationTier;
  requiresFirstBookingNotice?: boolean;
  firstBookingNoticeText?: string;
  elevatedCheckInThresholdHours?: number;
  disclaimer?: string;
  preJobChecklist?: string[];
}

export interface HireWorkerParams {
  jobId: string;
  workerId: string;
  agreedAmountKobo?: number;
}

export interface CancelJobResult {
  jobId: string;
  status: JobStatus;
  hoursUntilStart: number;
  cancellationFeeKobo: number;
  freeCancellation: boolean;
}

export class JobService {
  private db: IDatabaseClient;

  constructor(db: IDatabaseClient) {
    this.db = db;
  }

  /**
   * Pure pricing calculator enforcing the per-worker pay rule (§29, §40):
   * "proposed pay is a per-worker amount, not a total budget to be split.
   *  total cost is proposed pay × number_of_workers + platform_fee"
   */
  public static calculateJobPricing(
    workerPayKobo: number,
    numberOfWorkers: number,
    feePercentage: number = 10.0
  ): JobPricingBreakdown {
    const validCount = Math.max(1, Math.floor(numberOfWorkers));
    const validRate = Math.max(0, Math.floor(workerPayKobo));
    
    const subtotalKobo = validRate * validCount;
    const platformFeeKobo = Math.round((subtotalKobo * feePercentage) / 100);
    const totalAmountKobo = subtotalKobo + platformFeeKobo;

    return {
      workerPayKobo: validRate,
      numberOfWorkers: validCount,
      subtotalKobo,
      platformFeeKobo,
      totalAmountKobo,
      currency: 'NGN',
    };
  }

  /**
   * Evaluates category wage bounds (§G):
   * - min_pay_kobo: Hard block if proposed pay is below floor. Only active when NOT NULL.
   * - max_pay_kobo: Soft warning ceiling if proposed pay exceeds typical rates. Only active when NOT NULL.
   * - Skips gracefully without error if bounds are NULL.
   */
  public static validateCategoryWageBounds(
    workerPayKobo: number,
    category: {
      name: string;
      min_pay_kobo?: number | null;
      max_pay_kobo?: number | null;
    }
  ): WageBoundsCheckResult {
    const minPay = category.min_pay_kobo ?? null;
    const maxPay = category.max_pay_kobo ?? null;

    // Hard floor check: strictly active ONLY if min_pay_kobo is NOT NULL (§G)
    if (minPay !== null && workerPayKobo < minPay) {
      return {
        isValid: false,
        isBelowFloor: true,
        isAboveCeiling: false,
        minPayKobo: minPay,
        maxPayKobo: maxPay,
        error: `Proposed pay of ₦${(workerPayKobo / 100).toLocaleString()} is below the required minimum wage floor for ${category.name} (minimum: ₦${(minPay / 100).toLocaleString()}) (§G).`,
      };
    }

    // Soft warning ceiling: strictly active ONLY if max_pay_kobo is NOT NULL (§G)
    if (maxPay !== null && workerPayKobo > maxPay) {
      return {
        isValid: true, // Not blocked!
        isBelowFloor: false,
        isAboveCeiling: true,
        minPayKobo: minPay,
        maxPayKobo: maxPay,
        warning: `This proposed rate (₦${(workerPayKobo / 100).toLocaleString()}) is higher than usual for ${category.name}. Please confirm this amount is intended (§G).`,
      };
    }

    return {
      isValid: true,
      isBelowFloor: false,
      isAboveCeiling: false,
      minPayKobo: minPay,
      maxPayKobo: maxPay,
    };
  }

  /**
   * Retrieves category-specific safety safeguards, checklists, and disclaimers (§B.2, §B.3).
   */
  public static getCategorySafetyConfig(
    categoryName: string,
    tier: VerificationTier
  ): CategorySafetyConfig {
    if (tier === 'care') {
      return {
        tier: 'care',
        requiresFirstBookingNotice: true,
        firstBookingNoticeText:
          'First-booking safeguard: An adult should be present or reachable on-site for the duration of this care service (§B.2).',
        elevatedCheckInThresholdHours: 3,
      };
    }

    if (tier === 'technical_trade') {
      const lower = categoryName.toLowerCase();
      const isElectrical = lower.includes('electric');
      const isPlumbing = lower.includes('plumb');

      let checklist: string[] | undefined;
      if (isElectrical) {
        checklist = [
          'Confirm main electrical breaker / distribution panel is accessible and can be shut off.',
          'Ensure work area is dry and clear of moisture or standing water.',
          'Verify generator or inverter transfer switches are isolated before electrical work begins.',
        ];
      } else if (isPlumbing) {
        checklist = [
          'Confirm main water supply shutoff / stopcock valve is accessible and functional.',
          'Identify location of water storage tanks and overflow pathways.',
        ];
      }

      return {
        tier: 'technical_trade',
        disclaimer:
          'Menial verifies worker identity and, where provided, trade credentials; Menial is not a party to the technical work performed (§B.3).',
        preJobChecklist: checklist,
      };
    }

    return {
      tier: 'standard',
    };
  }

  /**
   * Validates if a worker is verified for the target category tier before booking (§B.2, §B.3).
   */
  public static checkWorkerCategoryEligibility(
    category: { id: string; name: string; verification_tier: VerificationTier },
    workerCategoryVerification?: { status: string; tier: VerificationTier; subStatus?: string }
  ): { eligible: boolean; error?: string } {
    if (category.verification_tier === 'care') {
      if (!workerCategoryVerification || workerCategoryVerification.status !== 'verified') {
        return {
          eligible: false,
          error: `Worker does not hold required CARE_VERIFIED status for ${category.name} (§B.2). Requires Police Character Certificate and verified references.`,
        };
      }
    } else if (category.verification_tier === 'technical_trade') {
      if (!workerCategoryVerification || workerCategoryVerification.status !== 'verified') {
        return {
          eligible: false,
          error: `Worker does not hold required TECHNICAL_VERIFIED status for ${category.name} (§B.3). Requires experience and work proof review.`,
        };
      }
    }

    return { eligible: true };
  }

  /**
   * Creates a job listing draft in the database with wage bounds validation (§29, §30, §G).
   */
  public async createJob(params: CreateJobParams): Promise<{
    jobId: string;
    publicJobId: string;
    pricing: JobPricingBreakdown;
    aboveCategoryCeiling?: boolean;
  }> {
    const { data, error } = await this.db.rpc<Record<string, unknown>>(
      'create_job_listing',
      {
        p_category_id: params.categoryId,
        p_title: params.title,
        p_description: params.description,
        p_location_text: params.locationText,
        p_latitude: params.latitude,
        p_longitude: params.longitude,
        p_scheduled_date: params.scheduledDate,
        p_start_time: params.startTime,
        p_duration_minutes: params.durationMinutes,
        p_number_of_workers: params.numberOfWorkers,
        p_worker_pay_kobo: params.workerPayKobo,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to create job: ${error?.message || 'No data returned'}`);
    }

    return {
      jobId: String(data.job_id),
      publicJobId: String(data.public_job_id),
      aboveCategoryCeiling: Boolean(data.above_category_ceiling),
      pricing: {
        workerPayKobo: Number(data.worker_pay_kobo),
        numberOfWorkers: Number(data.number_of_workers),
        subtotalKobo: Number(data.worker_pay_kobo) * Number(data.number_of_workers),
        platformFeeKobo: Number(data.platform_fee_kobo),
        totalAmountKobo: Number(data.total_amount_kobo),
        currency: 'NGN',
      },
    };
  }

  /**
   * Publishes a draft job for worker discovery (§32).
   */
  public async publishJob(jobId: string): Promise<void> {
    const { error } = await this.db.rpc('publish_job', {
      p_job_id: jobId,
    });

    if (error) {
      throw new Error(`Failed to publish job: ${error.message}`);
    }
  }

  /**
   * Extends a hiring offer to an eligible worker (§35).
   */
  public async hireWorker(params: HireWorkerParams): Promise<{ assignmentId: string }> {
    const { data, error } = await this.db.rpc<string>('hire_worker_for_job', {
      p_job_id: params.jobId,
      p_worker_id: params.workerId,
      p_agreed_amount_kobo: params.agreedAmountKobo,
    });

    if (error || !data) {
      throw new Error(`Failed to hire worker: ${error?.message || 'No ID returned'}`);
    }

    return { assignmentId: data };
  }

  /**
   * Worker responds to an invitation offer (§31, §32).
   */
  public async respondToInvitation(
    jobId: string,
    accept: boolean,
    rejectionReason?: string
  ): Promise<void> {
    const { error } = await this.db.rpc('respond_to_job_invitation', {
      p_job_id: jobId,
      p_accept: accept,
      p_rejection_reason: rejectionReason,
    });

    if (error) {
      throw new Error(`Failed to respond to job invitation: ${error.message}`);
    }
  }

  /**
   * Cancels a job adhering to the Section 36 2-hour window policy.
   */
  public async cancelJob(jobId: string, reason: string): Promise<CancelJobResult> {
    const { data, error } = await this.db.rpc<Record<string, unknown>>(
      'cancel_job_listing',
      {
        p_job_id: jobId,
        p_reason: reason,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to cancel job: ${error?.message || 'No data returned'}`);
    }

    return {
      jobId: String(data.job_id),
      status: 'cancelled',
      hoursUntilStart: Number(data.hours_until_start),
      cancellationFeeKobo: Number(data.cancellation_fee_kobo),
      freeCancellation: Boolean(data.free_cancellation),
    };
  }

  /**
   * Symmetrically reports a no-show incident per Section 36.
   */
  public async reportNoShow(
    jobId: string,
    partyType: ActorPartyType,
    partyId: string,
    reason: string
  ): Promise<void> {
    const { error } = await this.db.rpc('report_no_show', {
      p_job_id: jobId,
      p_party_type: partyType,
      p_party_id: partyId,
      p_reason: reason,
    });

    if (error) {
      throw new Error(`Failed to report no-show: ${error.message}`);
    }
  }
}
