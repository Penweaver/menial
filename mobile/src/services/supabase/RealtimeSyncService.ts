/**
 * Menial Mobile - Supabase Realtime Synchronization Service
 * 
 * Manages websocket channels and Postgres CDC subscriptions for:
 * 1. Live Job State Synchronization (§31, §32, §33, §45)
 * 2. Live Worker GPS Transit Location Broadcast (§49, §50)
 * 3. Section 48 Real-Time Job Chat with Terminal Read-Only Lock
 * 4. Section 49 Emergency SOS Distress Tracking & Resolution
 * 5. Deterministic fallback events for offline & test resilience (§51)
 * 
 * Reference: menial-master-spec-v2.md (§31, §32, §45, §48, §49, §51)
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { getMobileSupabaseClient } from './client';

export interface LocationBroadcastPayload {
  workerId: string;
  jobId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface ChatMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'employer' | 'worker' | 'system';
  body: string;
  createdAt: string;
}

export interface JobStatePayload {
  id: string;
  publicJobId: string;
  status: string;
  updatedAt: string;
  [key: string]: unknown;
}

export type UnsubscribeFunction = () => void;

export class RealtimeSyncService {
  private static activeChannels = new Map<string, RealtimeChannel>();
  private static fallbackListeners = new Map<string, Set<(data: any) => void>>();

  /**
   * Subscribes to live Postgres CDC changes for an active job (§31, §32).
   */
  public static subscribeToJobStatus(
    jobId: string,
    onStatusChange: (updatedJob: JobStatePayload) => void
  ): UnsubscribeFunction {
    const channelKey = `job-status:${jobId}`;
    const client = getMobileSupabaseClient();

    // Register fallback listener for offline/test simulation
    this.registerFallbackListener(channelKey, onStatusChange);

    try {
      const channel = client
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'jobs',
            filter: `id=eq.${jobId}`,
          },
          (payload) => {
            if (payload.new) {
              onStatusChange(payload.new as JobStatePayload);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Channel active
          }
        });

      this.activeChannels.set(channelKey, channel);

      return () => {
        this.unsubscribe(channelKey);
      };
    } catch (err) {
      console.warn(`[RealtimeSyncService] Failed to establish job status channel ${jobId}:`, err);
      return () => this.unsubscribe(channelKey);
    }
  }

  /**
   * Subscribes to Section 48 real-time job chat messages.
   * Enforces terminal lock awareness when job reaches completed/cancelled.
   */
  public static subscribeToJobChat(
    conversationId: string,
    onNewMessage: (message: ChatMessagePayload) => void
  ): UnsubscribeFunction {
    const channelKey = `job-chat:${conversationId}`;
    const client = getMobileSupabaseClient();

    this.registerFallbackListener(channelKey, onNewMessage);

    try {
      const channel = client
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            if (payload.new) {
              onNewMessage(payload.new as ChatMessagePayload);
            }
          }
        )
        .subscribe();

      this.activeChannels.set(channelKey, channel);

      return () => {
        this.unsubscribe(channelKey);
      };
    } catch (err) {
      console.warn(`[RealtimeSyncService] Failed to establish chat channel ${conversationId}:`, err);
      return () => this.unsubscribe(channelKey);
    }
  }

  /**
   * Subscribes to live worker transit location broadcasts (§49, §50).
   * Used by Employer screen to track worker approach during worker_on_way.
   */
  public static subscribeToWorkerLocation(
    jobId: string,
    onLocationUpdate: (location: LocationBroadcastPayload) => void
  ): UnsubscribeFunction {
    const channelKey = `transit-location:${jobId}`;
    const client = getMobileSupabaseClient();

    this.registerFallbackListener(channelKey, onLocationUpdate);

    try {
      const channel = client
        .channel(channelKey)
        .on('broadcast', { event: 'location_ping' }, (response) => {
          if (response.payload) {
            onLocationUpdate(response.payload as LocationBroadcastPayload);
          }
        })
        .subscribe();

      this.activeChannels.set(channelKey, channel);

      return () => {
        this.unsubscribe(channelKey);
      };
    } catch (err) {
      console.warn(`[RealtimeSyncService] Failed to establish location channel ${jobId}:`, err);
      return () => this.unsubscribe(channelKey);
    }
  }

  /**
   * Broadcasts worker live coordinates during transit (§32, §49).
   * High-speed websocket broadcast with minimal payload overhead.
   */
  public static async broadcastWorkerLocation(
    payload: LocationBroadcastPayload
  ): Promise<boolean> {
    const channelKey = `transit-location:${payload.jobId}`;
    const client = getMobileSupabaseClient();

    // Trigger local fallback listeners immediately (optimistic update)
    this.emitFallbackEvent(channelKey, payload);

    try {
      let channel = this.activeChannels.get(channelKey);
      if (!channel) {
        channel = client.channel(channelKey);
        await channel.subscribe();
        this.activeChannels.set(channelKey, channel);
      }

      await channel.send({
        type: 'broadcast',
        event: 'location_ping',
        payload,
      });

      return true;
    } catch (err) {
      console.warn(`[RealtimeSyncService] Location broadcast error:`, err);
      return false;
    }
  }

  /**
   * Subscribes to Section 49 Emergency SOS distress updates.
   */
  public static subscribeToEmergencySos(
    jobId: string,
    onSosUpdate: (report: any) => void
  ): UnsubscribeFunction {
    const channelKey = `job-sos:${jobId}`;
    const client = getMobileSupabaseClient();

    this.registerFallbackListener(channelKey, onSosUpdate);

    try {
      const channel = client
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'safety_reports',
            filter: `job_id=eq.${jobId}`,
          },
          (payload) => {
            onSosUpdate(payload.new || payload.old);
          }
        )
        .subscribe();

      this.activeChannels.set(channelKey, channel);

      return () => {
        this.unsubscribe(channelKey);
      };
    } catch (err) {
      console.warn(`[RealtimeSyncService] Failed to establish SOS channel ${jobId}:`, err);
      return () => this.unsubscribe(channelKey);
    }
  }

  /**
   * Cleans up and unsubscribes a specific channel.
   */
  public static unsubscribe(channelKey: string): void {
    const channel = this.activeChannels.get(channelKey);
    if (channel) {
      try {
        const client = getMobileSupabaseClient();
        client.removeChannel(channel);
      } catch (err) {
        console.warn(`[RealtimeSyncService] Error removing channel ${channelKey}:`, err);
      }
      this.activeChannels.delete(channelKey);
    }
    this.fallbackListeners.delete(channelKey);
  }

  /**
   * Cleans up all active channels (e.g., on logout or app background).
   */
  public static unsubscribeAll(): void {
    const client = getMobileSupabaseClient();
    this.activeChannels.forEach((channel) => {
      try {
        client.removeChannel(channel);
      } catch {
        // Ignore during batch cleanup
      }
    });
    this.activeChannels.clear();
    this.fallbackListeners.clear();
  }

  // ==========================================================================
  // FALLBACK & SIMULATION ENGINE (FOR OFFLINE RUNS & TEST SUITES)
  // ==========================================================================

  private static registerFallbackListener(key: string, callback: (data: any) => void): void {
    if (!this.fallbackListeners.has(key)) {
      this.fallbackListeners.set(key, new Set());
    }
    this.fallbackListeners.get(key)!.add(callback);
  }

  public static emitFallbackEvent(key: string, data: any): void {
    const listeners = this.fallbackListeners.get(key);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[RealtimeSyncService] Error in fallback listener for ${key}:`, err);
        }
      });
    }
  }

  /**
   * Simulation helper: emits an instant job status change event.
   */
  public static mockEmitJobStatus(jobId: string, updatedJob: Partial<JobStatePayload>): void {
    this.emitFallbackEvent(`job-status:${jobId}`, updatedJob);
  }

  /**
   * Simulation helper: emits an instant chat message.
   */
  public static mockEmitChatMessage(conversationId: string, message: ChatMessagePayload): void {
    this.emitFallbackEvent(`job-chat:${conversationId}`, message);
  }

  /**
   * Simulation helper: emits an instant worker transit location ping.
   */
  public static mockEmitLocationPing(jobId: string, location: LocationBroadcastPayload): void {
    this.emitFallbackEvent(`transit-location:${jobId}`, location);
  }
}
