/**
 * Menial Platform - Job & Marketplace Service
 * 
 * Implements job lifecycle management, per-worker pricing calculation in kobo,
 * hiring validations, worker assignments, cancellation windows, and no-shows.
 * Reference: menial-master-spec-v2.md (§29, §30, §31, §32, §33, §35, §36, §40)
 */

import type { IDatabaseClient } from '../admin/AdminService';
import type { JobStatus, ActorPartyType } from '../../types/enums';

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
   * Creates a job listing draft in the database (§29, §30).
   */
  public async createJob(params: CreateJobParams): Promise<{
    jobId: string;
    publicJobId: string;
    pricing: JobPricingBreakdown;
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
