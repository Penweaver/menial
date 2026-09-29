/**
 * Menial Platform - Mock Verification Provider
 * 
 * Development implementation of IVerificationProvider supporting:
 * - Standard identity verification (NIN masking, NDPA compliance §80)
 * - Care tier verification (Police cert + minimum 2 contactable references §B.2)
 * - Technical trade verification (Experience + work portfolio + optional Trade Test cert §B.3)
 * - Tiered administrative reviews (§B, §D)
 * 
 * Reference: menial-master-spec-v2.md (§22, §25, §61, §80, §94) & Spec Addendum v3 (§B, §C)
 */

import type {
  IVerificationProvider,
  VerificationSubmissionData,
  VerificationSubmissionResult,
  VerificationReviewResult,
  CareVerificationSubmissionData,
  TechnicalVerificationSubmissionData,
  ReviewTieredSubmissionData,
  CareReferenceInput,
} from './VerificationService';
import { VerificationService } from './VerificationService';
import type {
  VerificationAction,
  VerificationStatus,
  VerificationTier,
  TechnicalSubStatus,
} from '../../types/enums';
import type { CareReferenceContact } from '../../types/database';

interface StoredSubmission {
  id: string;
  userId: string;
  categoryId?: string;
  tier: VerificationTier;
  verificationType: string;
  documentType?: string;
  documentUrl?: string;
  maskedIdNumber?: string;
  metadata?: Record<string, unknown>;
  status: VerificationStatus;
  subStatus?: TechnicalSubStatus;
  references?: CareReferenceContact[];
  experienceYears?: number;
  portfolioUrls?: string[];
  certificateType?: string;
  certificateGrade?: string;
  submittedAt: string;
  reviewerId?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  referenceCallNotes?: string;
}

export class MockVerificationProvider implements IVerificationProvider {
  private submissions: Map<string, StoredSubmission> = new Map();
  private userStatusMap: Map<string, VerificationStatus> = new Map();
  // Map of `${userId}:${categoryId}` -> { status, subStatus, tier }
  private userCategoryStatusMap: Map<string, { status: VerificationStatus; subStatus?: TechnicalSubStatus; tier: VerificationTier }> = new Map();

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
          tier: 'standard',
          error: validation.error,
        };
      }
      maskedNumber = validation.maskedNumber;
    }

    const record: StoredSubmission = {
      id: verificationId,
      userId,
      tier: 'standard',
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
      tier: 'standard',
    };
  }

  public validateCareReferences(
    references: CareReferenceInput[]
  ): { valid: boolean; error?: string } {
    return VerificationService.validateCareReferences(references);
  }

  /**
   * Submits Care tier verification vetting (§B.2).
   * Enforces mandatory Police Character Certificate and minimum 2 contactable references.
   */
  public async submitCareVerification(
    userId: string,
    data: CareVerificationSubmissionData
  ): Promise<VerificationSubmissionResult> {
    // 1. Mandatory Application-Layer Validation: at least 2 references (§B.2)
    const refValidation = this.validateCareReferences(data.references);
    if (!refValidation.valid) {
      return {
        success: false,
        verificationId: '',
        status: 'unverified',
        tier: 'care',
        error: refValidation.error,
      };
    }

    // 2. Mandatory Police Character Certificate (§B.2)
    if (!data.policeCertUrl || data.policeCertUrl.trim().length === 0) {
      return {
        success: false,
        verificationId: '',
        status: 'unverified',
        tier: 'care',
        error: 'Police Character Certificate is required for Care verification (§B.2).',
      };
    }

    const verificationId = `care_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mappedReferences: CareReferenceContact[] = data.references.map((r) => ({
      name: r.name.trim(),
      relationship: r.relationship.trim(),
      phone: r.phone.trim(),
      admin_contact_outcome: null,
      contacted_at: null,
    }));

    const record: StoredSubmission = {
      id: verificationId,
      userId,
      categoryId: data.categoryId,
      tier: 'care',
      verificationType: 'care_vetting',
      documentType: 'police_character_certificate',
      documentUrl: data.policeCertUrl,
      references: mappedReferences,
      status: 'pending', // Strictly no auto-progression per §B.2
      submittedAt: new Date().toISOString(),
    };

    this.submissions.set(verificationId, record);
    this.userCategoryStatusMap.set(`${userId}:${data.categoryId}`, {
      status: 'pending',
      tier: 'care',
    });

    return {
      success: true,
      verificationId,
      status: 'pending',
      tier: 'care',
    };
  }

  /**
   * Submits Technical Trade verification vetting (§B.3).
   * Enforces self-declared experience and >=1 portfolio work photo.
   */
  public async submitTechnicalVerification(
    userId: string,
    data: TechnicalVerificationSubmissionData
  ): Promise<VerificationSubmissionResult> {
    // 1. Validate experience & portfolio photo (§B.3)
    const techValidation = VerificationService.validateTechnicalSubmission(data);
    if (!techValidation.valid) {
      return {
        success: false,
        verificationId: '',
        status: 'unverified',
        tier: 'technical_trade',
        error: techValidation.error,
      };
    }

    const verificationId = `tech_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: StoredSubmission = {
      id: verificationId,
      userId,
      categoryId: data.categoryId,
      tier: 'technical_trade',
      verificationType: 'trade_credentials',
      documentType: data.certificateType || 'work_portfolio',
      documentUrl: data.certificateUrl,
      experienceYears: data.experienceYears,
      portfolioUrls: data.portfolioUrls,
      certificateType: data.certificateType,
      certificateGrade: data.certificateGrade,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    this.submissions.set(verificationId, record);
    this.userCategoryStatusMap.set(`${userId}:${data.categoryId}`, {
      status: 'pending',
      tier: 'technical_trade',
    });

    return {
      success: true,
      verificationId,
      status: 'pending',
      tier: 'technical_trade',
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

  public async reviewTieredSubmission(
    data: ReviewTieredSubmissionData
  ): Promise<VerificationReviewResult> {
    const submission = this.submissions.get(data.verificationId);
    if (!submission) {
      return {
        success: false,
        status: 'unverified',
        reviewedAt: new Date().toISOString(),
        error: 'Verification record not found.',
      };
    }

    const reviewedAt = new Date().toISOString();
    submission.reviewerId = data.adminId;
    submission.reviewedAt = reviewedAt;
    if (data.referenceCallNotes) {
      submission.referenceCallNotes = data.referenceCallNotes;
    }

    if (data.action === 'approve') {
      submission.status = 'verified';
      if (submission.tier === 'technical_trade') {
        submission.subStatus = data.subStatus || 'experience_verified';
      }
      if (submission.tier === 'care' && data.referencesOutcome) {
        submission.references = data.referencesOutcome;
      }
      if (submission.categoryId) {
        this.userCategoryStatusMap.set(`${submission.userId}:${submission.categoryId}`, {
          status: 'verified',
          subStatus: submission.subStatus,
          tier: submission.tier,
        });
      }
    } else if (data.action === 'reject') {
      submission.status = 'rejected';
      submission.rejectionReason = data.rejectionReason || 'Tiered vetting failed.';
      if (submission.categoryId) {
        this.userCategoryStatusMap.set(`${submission.userId}:${submission.categoryId}`, {
          status: 'rejected',
          tier: submission.tier,
        });
      }
    } else {
      submission.status = 'pending';
    }

    return {
      success: true,
      status: submission.status,
      subStatus: submission.subStatus,
      reviewedAt,
    };
  }

  public validateDocumentNumber(
    documentType: string,
    idNumber: string
  ): { valid: boolean; maskedNumber: string; error?: string } {
    return VerificationService.validateDocumentNumber(documentType, idNumber);
  }

  public getUserStatus(userId: string): VerificationStatus {
    return this.userStatusMap.get(userId) || 'unverified';
  }

  public getUserCategoryVerification(
    userId: string,
    categoryId: string
  ): { status: VerificationStatus; subStatus?: TechnicalSubStatus; tier: VerificationTier } | undefined {
    return this.userCategoryStatusMap.get(`${userId}:${categoryId}`);
  }

  public getSubmission(verificationId: string): StoredSubmission | undefined {
    return this.submissions.get(verificationId);
  }

  public reset(): void {
    this.submissions.clear();
    this.userStatusMap.clear();
    this.userCategoryStatusMap.clear();
  }
}
