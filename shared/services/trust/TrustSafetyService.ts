/**
 * Menial Platform - Trust & Safety Service
 * 
 * Manages user ratings, running averages, emergency SOS dispatching,
 * non-silent safety report closures, job-scoped chat locks, and native external sharing.
 * Reference: menial-master-spec-v2.md (§46, §47, §48, §49, §62, §63, §67)
 */

import type { IDatabaseClient } from '../admin/AdminService';
import type { SafetyReportStatus } from '../../types/enums';

export interface SubmitRatingParams {
  jobId: string;
  stars: number; // 1-5
  reviewText?: string;
}

export interface RatingSubmissionResult {
  ratingId: string;
  jobId: string;
  raterId: string;
  rateeId: string;
  stars: number;
  newAverageRating: number;
}

export type EmergencyIncidentCategory =
  | 'physical_threat'
  | 'medical_emergency'
  | 'harassment'
  | 'theft_robbery'
  | 'safety_hazard'
  | 'other';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary?: boolean;
}

export interface EmergencyHotline {
  name: string;
  number: string;
  description: string;
  tollFree: boolean;
}

export const EMERGENCY_HOTLINES: EmergencyHotline[] = [
  {
    name: 'National Emergency',
    number: '112',
    description: 'Police, Fire Service, Ambulance across Nigeria',
    tollFree: true,
  },
  {
    name: 'Lagos Emergency (LASEMA)',
    number: '767',
    description: 'Rapid response command center for Lagos State incidents',
    tollFree: true,
  },
  {
    name: 'Menial Rapid Incident Center',
    number: '080063642564',
    description: '24/7 Menial HQ Lagos operations & security dispatch',
    tollFree: true,
  },
  {
    name: 'FRSC Road Safety',
    number: '122',
    description: 'Federal Road Safety Corps for transit emergencies',
    tollFree: true,
  },
];

export interface EmergencySosParams {
  jobId: string;
  publicJobId?: string;
  category?: EmergencyIncidentCategory;
  description: string;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  isSilent?: boolean;
  batteryLevel?: number;
  emergencyContactsNotified?: boolean;
  reporterRole?: 'worker' | 'employer';
  reporterId?: string;
}

export interface EmergencyDistressDetails {
  contactName?: string;
  publicJobId: string;
  jobTitle: string;
  locationText: string;
  latitude?: number;
  longitude?: number;
  reporterName: string;
  reporterRole: string;
  category?: EmergencyIncidentCategory;
  dossierRef?: string;
}

export interface JobShareDetails {
  shareText: string;
  jobTitle: string;
  locationText: string;
  scheduledTime: string;
  counterpartyName: string;
  counterpartyRole: 'Employer' | 'Worker';
}

export class TrustSafetyService {
  private db: IDatabaseClient;

  constructor(db: IDatabaseClient) {
    this.db = db;
  }

  /**
   * Submits a 1-5 star review after job completion and updates the running average (§46).
   */
  public async submitRating(params: SubmitRatingParams): Promise<RatingSubmissionResult> {
    if (params.stars < 1 || params.stars > 5) {
      throw new Error('Rating stars must be between 1 and 5 (§46).');
    }

    const { data, error } = await this.db.rpc<Record<string, unknown>>(
      'submit_job_rating',
      {
        p_job_id: params.jobId,
        p_stars: params.stars,
        p_review_text: params.reviewText,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to submit rating: ${error?.message || 'No data returned'}`);
    }

    return {
      ratingId: String(data.rating_id),
      jobId: String(data.job_id),
      raterId: String(data.rater_id),
      rateeId: String(data.ratee_id),
      stars: Number(data.stars),
      newAverageRating: Number(data.new_average_rating),
    };
  }

  /**
   * Triggers an Emergency SOS report from the Active Job screen (§49).
   */
  public async triggerEmergencySos(params: EmergencySosParams): Promise<{ reportId: string }> {
    const { data, error } = await this.db.rpc<string>('trigger_emergency_sos', {
      p_job_id: params.jobId,
      p_description: params.description,
      p_location_text: params.locationText,
      p_latitude: params.latitude,
      p_longitude: params.longitude,
      p_category: params.category,
      p_is_silent: params.isSilent,
      p_battery_level: params.batteryLevel,
      p_emergency_contacts_notified: params.emergencyContactsNotified,
      p_reporter_role: params.reporterRole,
      p_reporter_id: params.reporterId,
    });

    if (error || !data) {
      throw new Error(`Failed to trigger Emergency SOS: ${error?.message || 'No ID returned'}`);
    }

    return { reportId: data };
  }

  /**
   * Support-Admin-only: Resolves a safety report (§49, §63).
   * Note: Safety reports can never be closed without an audit-logged resolution note.
   */
  public async resolveSafetyReport(
    reportId: string,
    resolutionNote: string,
    newStatus: SafetyReportStatus = 'resolved'
  ): Promise<void> {
    if (!resolutionNote || resolutionNote.trim().length < 5) {
      throw new Error('A detailed resolution note is required to close safety reports (§49).');
    }

    const { error } = await this.db.rpc('resolve_safety_report', {
      p_report_id: reportId,
      p_resolution_note: resolutionNote,
      p_new_status: newStatus,
    });

    if (error) {
      throw new Error(`Failed to resolve safety report: ${error.message}`);
    }
  }

  /**
   * Sends a message within a job-scoped conversation (§48).
   * Enforces that chat becomes read-only once the job reaches terminal status.
   */
  public async sendMessage(conversationId: string, body: string): Promise<{ messageId: string }> {
    if (!body || body.trim().length === 0) {
      throw new Error('Message body cannot be empty.');
    }

    const { data, error } = await this.db.rpc<string>('send_job_message', {
      p_conversation_id: conversationId,
      p_body: body.trim(),
    });

    if (error || !data) {
      throw new Error(`Failed to send message: ${error?.message || 'No ID returned'}`);
    }

    return { messageId: data };
  }

  /**
   * Generates a pre-formatted safety share message for the native mobile share sheet
   * (WhatsApp / SMS) allowing workers or employers to inform their family/friends (§49).
   */
  public static generateJobShareDetails(options: {
    publicJobId: string;
    jobTitle: string;
    locationText: string;
    scheduledTime: string;
    counterpartyName: string;
    counterpartyRole: 'Employer' | 'Worker';
  }): JobShareDetails {
    const shareText = `🛡️ Menial Safety Share: I am on an active job (${options.publicJobId} - ${options.jobTitle}) at "${options.locationText}" scheduled for ${options.scheduledTime}. ${options.counterpartyRole}: ${options.counterpartyName}.`;

    return {
      shareText,
      jobTitle: options.jobTitle,
      locationText: options.locationText,
      scheduledTime: options.scheduledTime,
      counterpartyName: options.counterpartyName,
      counterpartyRole: options.counterpartyRole,
    };
  }

  /**
   * Formats an urgent emergency distress message for direct transmission to emergency contacts
   * via SMS or WhatsApp, including live GPS coordinates and emergency hotline references (§49).
   */
  public static formatEmergencyDistressMessage(details: EmergencyDistressDetails): string {
    const mapsLink =
      details.latitude && details.longitude
        ? `\n📍 Live GPS Coordinates: https://maps.google.com/?q=${details.latitude},${details.longitude}`
        : '';
    const refText = details.dossierRef ? ` [Ref: ${details.dossierRef}]` : '';
    const categoryText = details.category
      ? ` (${details.category.replace(/_/g, ' ').toUpperCase()})`
      : '';

    return (
      `🚨 MENIAL EMERGENCY DISTRESS ALERT${refText}${categoryText}\n` +
      `URGENT: ${details.reporterName} (${details.reporterRole}) has triggered an on-site emergency alert on active Menial job #${details.publicJobId} (${details.jobTitle}) at "${details.locationText}".` +
      `${mapsLink}\n\n` +
      `If you cannot establish immediate contact, dial Lagos Emergency 767 or National Emergency 112 immediately. Menial 24/7 Rapid Incident Command: 0800-MENIAL-NG (+234 1 800 636 425).`
    );
  }
}

export interface EmergencySosDossier {
  reportId: string;
  jobId: string;
  publicJobId?: string;
  category: EmergencyIncidentCategory;
  description: string;
  locationText: string;
  latitude: number;
  longitude: number;
  isSilent: boolean;
  batteryLevel?: number;
  status: 'open' | 'investigating' | 'dispatched' | 'resolved';
  createdAt: string;
  reporterRole?: 'worker' | 'employer';
  reporterId?: string;
  hotlines: string[];
  emergencyContactsNotified: boolean;
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

