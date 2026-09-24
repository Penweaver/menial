/**
 * Menial Platform - Mock Verification Provider
 * 
 * Development implementation of IVerificationProvider.
 * Enforces:
 * - Nigeria Data Protection Act (NDPA) privacy rules: masks PII ID numbers (§80).
 * - Real verification state machine: UNVERIFIED -> PENDING -> VERIFIED / REJECTED (§22, §25).
 * - Explicit administrative review actions: APPROVE, REJECT, REQUEST_INFO (§25, §61).
 * 
 * Reference: menial-master-spec-v2.md (§22, §25, §61, §80, §94)
 */

import type {
  IVerificationProvider,
  VerificationSubmissionData,
  VerificationSubmissionResult,
  VerificationReviewResult,
} from './VerificationService';
import type { VerificationAction, VerificationStatus } from '../../types/enums';

interface StoredSubmission {
  id: string;
  userId: string;
  verificationType: string;
  documentType?: string;
  documentUrl?: string;
  maskedIdNumber?: string;
  metadata?: Record<string, unknown>;
  status: VerificationStatus;
  submittedAt: string;
  reviewerId?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export class MockVerificationProvider implements IVerificationProvider {
  private submissions: Map<string, StoredSubmission> = new Map();
  private userStatusMap: Map<string, VerificationStatus> = new Map();

  public async submitVerification(
    userId: string,
    data: VerificationSubmissionData
  ): Promise<VerificationSubmissionResult> {
    const verificationId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let maskedNumber: string | undefined;
    if (data.metadata?.idNumber && data.documentType) {
      const validation = this.validateDocumentNumber(
        data.documentType,
        String(data.metadata.idNumber)
      );
      if (!validation.valid) {
        return {
          success: false,
          verificationId: '',
          status: 'unverified',
          error: validation.error,
        };
      }
      maskedNumber = validation.maskedNumber;
    }

    const record: StoredSubmission = {
      id: verificationId,
      userId,
      verificationType: data.verificationType,
      documentType: data.documentType,
      documentUrl: data.documentUrl,
      maskedIdNumber: maskedNumber,
      metadata: data.metadata ? { ...data.metadata, idNumber: maskedNumber } : undefined,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    this.submissions.set(verificationId, record);
    this.userStatusMap.set(userId, 'pending');

    return {
      success: true,
      verificationId,
      status: 'pending',
    };
  }

  public async reviewSubmission(
    adminId: string,
    verificationId: string,
    action: VerificationAction,
    reason?: string
  ): Promise<VerificationReviewResult> {
    const submission = this.submissions.get(verificationId);
    if (!submission) {
      return {
        success: false,
        status: 'unverified',
        reviewedAt: new Date().toISOString(),
        error: 'Verification record not found.',
      };
    }

    const reviewedAt = new Date().toISOString();
    submission.reviewerId = adminId;
    submission.reviewedAt = reviewedAt;

    if (action === 'approve') {
      submission.status = 'verified';
      this.userStatusMap.set(submission.userId, 'verified');
    } else if (action === 'reject') {
      submission.status = 'rejected';
      submission.rejectionReason = reason || 'Document validation failed.';
      this.userStatusMap.set(submission.userId, 'rejected');
    } else if (action === 'request_info') {
      submission.status = 'pending';
      submission.rejectionReason = reason || 'Additional documentation requested.';
      this.userStatusMap.set(submission.userId, 'pending');
    }

    return {
      success: true,
      status: submission.status,
      reviewedAt,
    };
  }

  public validateDocumentNumber(
    documentType: string,
    idNumber: string
  ): { valid: boolean; maskedNumber: string; error?: string } {
    const cleaned = idNumber.replace(/\D/g, '');

    switch (documentType) {
      case 'nin':
        // Nigerian National Identity Number is strictly 11 digits
        if (cleaned.length !== 11) {
          return {
            valid: false,
            maskedNumber: '',
            error: 'National Identity Number (NIN) must be exactly 11 digits.',
          };
        }
        return {
          valid: true,
          // Mask all but last 4 digits per NDPA (§80)
          maskedNumber: `*******${cleaned.slice(-4)}`,
        };

      case 'voters_card':
        // Nigerian VIN is alphanumeric, minimum 19 characters
        if (idNumber.trim().length < 10) {
          return {
            valid: false,
            maskedNumber: '',
            error: "Voter's card identifier is invalid.",
          };
        }
        return {
          valid: true,
          maskedNumber: `*****${idNumber.trim().slice(-4)}`,
        };

      default:
        if (idNumber.trim().length < 5) {
          return {
            valid: false,
            maskedNumber: '',
            error: 'Provided document identification is too short.',
          };
        }
        return {
          valid: true,
          maskedNumber: `****${idNumber.trim().slice(-4)}`,
        };
    }
  }

  public getUserStatus(userId: string): VerificationStatus {
    return this.userStatusMap.get(userId) || 'unverified';
  }

  public getSubmission(verificationId: string): StoredSubmission | undefined {
    return this.submissions.get(verificationId);
  }

  public reset(): void {
    this.submissions.clear();
    this.userStatusMap.clear();
  }
}
