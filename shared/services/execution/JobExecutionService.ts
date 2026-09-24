/**
 * Menial Platform - Job Execution Service
 * 
 * Provides client operations for mobile apps managing real-time job execution:
 * travel, arrival, photo check-in/out (§49), work commencement, completion confirmation (§45),
 * and dispute escalations (§47).
 * Reference: menial-master-spec-v2.md (§31, §32, §33, §45, §47, §49)
 */

import type { IDatabaseClient } from '../admin/AdminService';
import type { DisputeReason } from '../../types/enums';

export interface CheckinPhotoParams {
  jobId: string;
  photoUrl?: string; // Supabase Storage public/signed URL (§75)
}

export interface CheckoutPhotoParams {
  jobId: string;
  photoUrl?: string;
  completionNotes?: string;
}

export interface DisputeParams {
  jobId: string;
  reason: DisputeReason;
  description: string;
}

export class JobExecutionService {
  private db: IDatabaseClient;

  constructor(db: IDatabaseClient) {
    this.db = db;
  }

  /**
   * Worker signals that travel has started towards job location (§32).
   */
  public async startTravel(jobId: string): Promise<void> {
    const { error } = await this.db.rpc('mark_worker_on_way', {
      p_job_id: jobId,
    });

    if (error) {
      throw new Error(`Failed to start travel: ${error.message}`);
    }
  }

  /**
   * Worker signals arrival at the job site with optional photo check-in (§32, §49).
   */
  public async arriveAtJob(params: CheckinPhotoParams): Promise<void> {
    const { error } = await this.db.rpc('mark_worker_arrived', {
      p_job_id: params.jobId,
      p_checkin_photo_url: params.photoUrl,
    });

    if (error) {
      throw new Error(`Failed to record arrival: ${error.message}`);
    }
  }

  /**
   * Worker signals that work has started on site (§32).
   */
  public async startWork(jobId: string): Promise<void> {
    const { error } = await this.db.rpc('start_job_work', {
      p_job_id: jobId,
    });

    if (error) {
      throw new Error(`Failed to start work: ${error.message}`);
    }
  }

  /**
   * Worker signals completion of physical labor with optional photo check-out (§45, §49).
   */
  public async completeWork(params: CheckoutPhotoParams): Promise<void> {
    const { error } = await this.db.rpc('complete_job_by_worker', {
      p_job_id: params.jobId,
      p_checkout_photo_url: params.photoUrl,
      p_completion_notes: params.completionNotes,
    });

    if (error) {
      throw new Error(`Failed to complete work: ${error.message}`);
    }
  }

  /**
   * Employer inspects and confirms satisfactory work completion (§45).
   */
  public async confirmCompletion(jobId: string): Promise<void> {
    const { error } = await this.db.rpc('confirm_job_completion', {
      p_job_id: jobId,
    });

    if (error) {
      throw new Error(`Failed to confirm completion: ${error.message}`);
    }
  }

  /**
   * Employer or Worker raises a formal dispute on completion or execution (§45, §47).
   */
  public async raiseDispute(params: DisputeParams): Promise<{ disputeId: string }> {
    const { data, error } = await this.db.rpc<string>('raise_completion_dispute', {
      p_job_id: params.jobId,
      p_reason: params.reason,
      p_description: params.description,
    });

    if (error || !data) {
      throw new Error(`Failed to raise dispute: ${error?.message || 'No ID returned'}`);
    }

    return { disputeId: data };
  }
}
