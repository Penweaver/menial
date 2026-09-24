/**
 * Menial Platform - Verification Service Interface
 * 
 * Abstract interface for worker identity, background, and document verifications.
 * Reference: menial-master-spec-v2.md (§22, §25, §61, §80, §94)
 */

import type { VerificationAction, VerificationStatus } from '../../types/enums';

export interface VerificationSubmissionData {
  verificationType: 'phone' | 'id_document' | 'skill_certificate' | 'address';
  documentType?: 'nin' | 'voters_card' | 'drivers_license' | 'international_passport';
  documentUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface VerificationSubmissionResult {
  success: boolean;
  verificationId: string;
  status: VerificationStatus;
  error?: string;
}

export interface VerificationReviewResult {
  success: boolean;
  status: VerificationStatus;
  reviewedAt: string;
  error?: string;
}

export interface IVerificationProvider {
  /**
   * Submits identity documents or verification data for worker onboarding.
   */
  submitVerification(
    userId: string,
    data: VerificationSubmissionData
  ): Promise<VerificationSubmissionResult>;

  /**
   * Administrative decision on a pending verification submission.
   */
  reviewSubmission(
    adminId: string,
    verificationId: string,
    action: VerificationAction,
    reason?: string
  ): Promise<VerificationReviewResult>;

  /**
   * Evaluates identity document syntax and validity (e.g. NIN 11-digit check).
   * Implements NDPA data privacy (§80) by sanitizing sensitive numbers.
   */
  validateDocumentNumber(
    documentType: string,
    idNumber: string
  ): { valid: boolean; maskedNumber: string; error?: string };
}
