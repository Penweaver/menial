/**
 * Menial Platform - Profile & Worker Discovery Service
 * 
 * Manages marketplace profiles and proximity-based worker discovery.
 * Reference: menial-master-spec-v2.md (§21, §22, §24, §27, §28, §34)
 */

import type { VerificationStatus } from '../../types/enums';
import type { IDatabaseClient } from '../admin/AdminService';

export interface CompleteWorkerOnboardingParams {
  bio: string;
  indicativeRateKobo: number; // integer kobo per §4, §22
  serviceRadiusKm: number;
  categoryIds: string[];
  latitude?: number;
  longitude?: number;
}

export interface CompleteEmployerOnboardingParams {
  companyName?: string;
  isBusiness: boolean;
}

export interface WorkerDiscoveryQuery {
  categoryId: string;
  latitude: number;
  longitude: number;
  radiusKm?: number; // default 15km
  verifiedOnly?: boolean; // default true for consumer discovery
}

export interface DiscoveredWorker {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  indicativeRateKobo: number | null;
  currency: string;
  ratingAvg: number | null;
  completedJobsCount: number;
  verificationStatus: VerificationStatus;
  distanceKm: number;
}

export class ProfileService {
  private db: IDatabaseClient;

  constructor(db: IDatabaseClient) {
    this.db = db;
  }

  /**
   * Completes worker onboarding profile setup (§22).
   */
  public async completeWorkerOnboarding(
    params: CompleteWorkerOnboardingParams
  ): Promise<void> {
    const { error } = await this.db.rpc('complete_worker_onboarding', {
      p_bio: params.bio,
      p_indicative_rate: params.indicativeRateKobo,
      p_service_radius_km: params.serviceRadiusKm,
      p_category_ids: params.categoryIds,
      p_latitude: params.latitude,
      p_longitude: params.longitude,
    });

    if (error) {
      throw new Error(`Failed to complete worker onboarding: ${error.message}`);
    }
  }

  /**
   * Completes employer onboarding profile setup (§24).
   */
  public async completeEmployerOnboarding(
    params: CompleteEmployerOnboardingParams
  ): Promise<void> {
    const { error } = await this.db.rpc('complete_employer_onboarding', {
      p_company_name: params.companyName,
      p_is_business: params.isBusiness,
    });

    if (error) {
      throw new Error(`Failed to complete employer onboarding: ${error.message}`);
    }
  }

  /**
   * Toggles worker on-demand availability (§27).
   */
  public async toggleAvailability(isAvailable: boolean): Promise<boolean> {
    const { data, error } = await this.db.rpc<boolean>('toggle_worker_availability', {
      p_is_available: isAvailable,
    });

    if (error) {
      throw new Error(`Failed to update worker availability: ${error.message}`);
    }

    return Boolean(data);
  }

  /**
   * Calculates great-circle distance between two geographic coordinates in kilometers
   * using the Haversine formula (§28).
   */
  public static calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * Evaluates worker suitability for on-demand discovery (§28, §34):
   * - Must be active and available (`is_available = true`)
   * - Must match target category
   * - Must be within service radius
   * - Verification status filter
   * 
   * Returns sorted list: nearest first, breaking ties by rating.
   */
  public filterAndRankWorkers(
    workers: Array<{
      id: string;
      fullName: string;
      avatarUrl: string | null;
      bio: string | null;
      indicativeRate: number | null;
      ratingAvg: number | null;
      completedJobsCount: number;
      verificationStatus: VerificationStatus;
      isAvailable: boolean;
      serviceRadiusKm: number | null;
      latitude: number | null;
      longitude: number | null;
      categoryIds: string[];
    }>,
    query: WorkerDiscoveryQuery
  ): DiscoveredWorker[] {
    const maxRadius = query.radiusKm ?? 15;
    const verifiedOnly = query.verifiedOnly ?? true;

    const matched: DiscoveredWorker[] = [];

    for (const worker of workers) {
      // 1. Availability check (§27)
      if (!worker.isAvailable) continue;

      // 2. Category match (§28)
      if (!worker.categoryIds.includes(query.categoryId)) continue;

      // 3. Verification filter (§25)
      if (verifiedOnly && worker.verificationStatus !== 'verified') continue;

      // 4. Proximity calculation (§28)
      if (worker.latitude == null || worker.longitude == null) continue;

      const distance = ProfileService.calculateDistanceKm(
        query.latitude,
        query.longitude,
        worker.latitude,
        worker.longitude
      );

      const workerRadius = worker.serviceRadiusKm ?? maxRadius;
      if (distance > maxRadius || distance > workerRadius) continue;

      matched.push({
        id: worker.id,
        fullName: worker.fullName,
        avatarUrl: worker.avatarUrl,
        bio: worker.bio,
        indicativeRateKobo: worker.indicativeRate,
        currency: 'NGN',
        ratingAvg: worker.ratingAvg,
        completedJobsCount: worker.completedJobsCount,
        verificationStatus: worker.verificationStatus,
        distanceKm: distance,
      });
    }

    // Sort: Nearest distance ascending, then rating descending (§28)
    return matched.sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
    });
  }
}
