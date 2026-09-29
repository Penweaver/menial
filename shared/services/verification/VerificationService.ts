/**
 * Menial Platform - Verification Service Interface & Domain Logic
 * 
 * Abstract interface and domain validators for worker identity, background,
 * and tiered verification workflows (Standard, Care, Technical Trades).
 * Reference: menial-master-spec-v2.md (§22, §25, §61, §80, §94) & Spec Addendum v3 (§B, §C)
 */

import type {
  VerificationAction,
  VerificationStatus,
  VerificationTier,
  TechnicalSubStatus,
} from '../../types/enums';
import type { CareReferenceContact } from '../../types/database';

export interface VerificationSubmissionData {
  verificationType: 'phone' | 'id_document' | 'skill_certificate' | 'address';
  documentType?: 'nin' | 'voters_card' | 'drivers_license' | 'international_passport';
  documentUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CareReferenceInput {
  name: string;
  relationship: string;
  phone: string;
}

export interface CareVerificationSubmissionData {
  categoryId: string;
  policeCertUrl: string;
  references: CareReferenceInput[];
}

export interface TechnicalVerificationSubmissionData {
  categoryId: string;
  experienceYears: number;
  portfolioUrls: string[];
  certificateType?: string;
  certificateGrade?: string;
  certificateUrl?: string;
}

export interface ReviewTieredSubmissionData {
  adminId: string;
  verificationId: string;
  action: VerificationAction;
  rejectionReason?: string;
  subStatus?: TechnicalSubStatus;
  referencesOutcome?: CareReferenceContact[];
  referenceCallNotes?: string;
}

export interface VerificationSubmissionResult {
  success: boolean;
  verificationId: string;
  status: VerificationStatus;
  tier?: VerificationTier;
  error?: string;
}

export interface VerificationReviewResult {
  success: boolean;
  status: VerificationStatus;
  reviewedAt: string;
  subStatus?: TechnicalSubStatus;
  error?: string;
}

export interface IVerificationProvider {
  /**
   * Submits standard identity documents or verification data for worker onboarding (§25).
   */
  submitVerification(
    userId: string,
    data: VerificationSubmissionData
  ): Promise<VerificationSubmissionResult>;

  /**
   * Submits Care tier verification vetting (§B.2).
   * Enforces mandatory Police Character Certificate and minimum 2 contactable references.
   */
  submitCareVerification(
    userId: string,
    data: CareVerificationSubmissionData
  ): Promise<VerificationSubmissionResult>;

  /**
   * Submits Technical Trade verification vetting (§B.3).
   * Enforces self-declared experience and >=1 portfolio work photo, plus optional trade test certs.
   */
  submitTechnicalVerification(
    userId: string,
    data: TechnicalVerificationSubmissionData
  ): Promise<VerificationSubmissionResult>;

  /**
   * Administrative decision on a standard verification submission.
   */
  reviewSubmission(
    adminId: string,
    verificationId: string,
    action: VerificationAction,
    reason?: string
  ): Promise<VerificationReviewResult>;

  /**
   * Administrative decision on a tiered verification submission (§B, §D).
   */
  reviewTieredSubmission(
    data: ReviewTieredSubmissionData
  ): Promise<VerificationReviewResult>;

  /**
   * Evaluates identity document syntax and validity (e.g. NIN 11-digit check).
   * Implements NDPA data privacy (§80) by sanitizing sensitive numbers.
   */
  validateDocumentNumber(
    documentType: string,
    idNumber: string
  ): { valid: boolean; maskedNumber: string; error?: string };

  /**
   * Application-layer validation for Care tier references (§B.2).
   * Strictly enforces minimum two contactable references with valid details.
   */
  validateCareReferences(
    references: CareReferenceInput[]
  ): { valid: boolean; error?: string };
}

/**
 * Domain service providing standalone application-layer validation and utilities
 * for tiered verification workflows across mobile, admin, and backend layers.
 */
export class VerificationService {
  /**
   * Application-layer enforcement of Care tier minimum-two-references rule (§B.2).
   * Flags missing references, inadequate count, or malformed contact info.
   */
  public static validateCareReferences(
    references: CareReferenceInput[]
  ): { valid: boolean; error?: string } {
    if (!references || !Array.isArray(references)) {
      return {
        valid: false,
        error: 'References must be provided as a list with at least two contacts (§B.2).',
      };
    }

    // Flagged rule: Care tier strictly requires at least two references
    if (references.length < 2) {
      return {
        valid: false,
        error: `Care verification requires a minimum of two contactable references (received ${references.length}) (§B.2).`,
      };
    }

    for (let i = 0; i < references.length; i++) {
      const ref = references[i];
      if (!ref.name || ref.name.trim().length < 2) {
        return {
          valid: false,
          error: `Reference #${i + 1} is missing a valid contact name.`,
        };
      }
      if (!ref.relationship || ref.relationship.trim().length < 2) {
        return {
          valid: false,
          error: `Reference #${i + 1} (${ref.name}) is missing a stated relationship.`,
        };
      }
      const cleanedPhone = (ref.phone || '').replace(/\D/g, '');
      if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
        return {
          valid: false,
          error: `Reference #${i + 1} (${ref.name}) has an invalid telephone number: '${ref.phone}'. Must be a valid 10-15 digit telephone line.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Application-layer enforcement of Technical Trade requirements (§B.3).
   */
  public static validateTechnicalSubmission(
    data: TechnicalVerificationSubmissionData
  ): { valid: boolean; error?: string } {
    if (data.experienceYears === undefined || data.experienceYears === null || data.experienceYears < 0) {
      return {
        valid: false,
        error: 'Self-declared years of experience is required for technical trades (§B.3).',
      };
    }

    if (!data.portfolioUrls || !Array.isArray(data.portfolioUrls) || data.portfolioUrls.length < 1) {
      return {
        valid: false,
        error: 'At least one photo or portfolio example of prior work is required for technical trade verification (§B.3).',
      };
    }

    return { valid: true };
  }

  /**
   * Evaluates identity document syntax and validity (e.g. NIN 11-digit check) per NDPA (§80).
   */
  public static validateDocumentNumber(
    documentType: string,
    idNumber: string
  ): { valid: boolean; maskedNumber: string; error?: string } {
    const cleaned = idNumber.replace(/\D/g, '');

    switch (documentType) {
      case 'nin':
        if (cleaned.length !== 11) {
          return {
            valid: false,
            maskedNumber: '',
            error: 'National Identity Number (NIN) must be exactly 11 digits.',
          };
        }
        return {
          valid: true,
          maskedNumber: `*******${cleaned.slice(-4)}`,
        };

      case 'voters_card':
        if (idNumber.trim().length < 10) {
          return {
            valid: false,
            maskedNumber: '',
            error: 'Voter Identification Number must be at least 10 characters.',
          };
        }
        return {
          valid: true,
          maskedNumber: `*******${idNumber.trim().slice(-4)}`,
        };

      case 'drivers_license':
        if (cleaned.length < 8) {
          return {
            valid: false,
            maskedNumber: '',
            error: 'Driver License number must be at least 8 characters.',
          };
        }
        return {
          valid: true,
          maskedNumber: `*******${cleaned.slice(-4)}`,
        };

      default:
        if (idNumber.trim().length < 5) {
          return {
            valid: false,
            maskedNumber: '',
            error: 'Document number must be at least 5 characters.',
          };
        }
        return {
          valid: true,
          maskedNumber: `*******${idNumber.trim().slice(-4)}`,
        };
    }
  }
}
