'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getAdminOperationsService } from '@/lib/services';
import {
  AlertOctagon,
  Volume2,
  VolumeX,
  CheckCircle,
  ExternalLink,
  MapPin,
  Phone,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface ActiveSosReport {
  id: string;
  job_id: string;
  public_job_id: string;
  job_title: string;
  reporter_name: string;
  reporter_phone: string;
  reporter_type: 'employer' | 'worker';
  description: string;
  location_text?: string;
  status: string;
  acknowledged_at?: string;
  created_at: string;
}

export function SosAlertBanner() {
  const [activeSosList, setActiveSosList] = useState<ActiveSosReport[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState<string | null>(null);
  const [acknowledgeError, setAcknowledgeError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for active unacknowledged SOS alerts
  const checkActiveSos = useCallback(async () => {
    try {
      const ops = getAdminOperationsService();
      const res = await ops.getSafetyReports({
        status: 'open',
        limit: 10,
        offset: 0,
      });

      const unacknowledged = (res.data || [])
        .filter((r) => !r.acknowledged_at && r.status === 'open')
        .map((r) => ({
          id: String(r.id),
          job_id: String(r.job_id),
          public_job_id: String(r.public_job_id || 'MNL-SOS'),
          job_title: String(r.job_title || 'Active Service Job'),
          reporter_name: String(r.reporter_name || 'Marketplace User'),
          reporter_phone: String(r.reporter_phone || '08000000000'),
          reporter_type: (r.reporter_type as 'employer' | 'worker') || 'worker',
          description: String(r.description || 'Emergency SOS signal dispatched.'),
          location_text: r.location_text ? String(r.location_text) : undefined,
          status: String(r.status),
          acknowledged_at: r.acknowledged_at ? String(r.acknowledged_at) : undefined,
          created_at: String(r.created_at || new Date().toISOString()),
        }));

      setActiveSosList(unacknowledged);
    } catch {
      // Graceful silence if unauthenticated or network unavailable
    }
  }, []);

  useEffect(() => {
    checkActiveSos();
    const interval = setInterval(checkActiveSos, 8000); // 8-second polling
    return () => clearInterval(interval);
  }, [checkActiveSos]);

  // Web Audio API synthesized repeating alarm (§L)
  const playAlarmTone = useCallback(() => {
    if (isMuted || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Generate dual-burst emergency siren: 880Hz -> 660Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.25);

      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      // Second burst
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.35);
      osc2.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.6);

      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.65);
    } catch {
      // AudioContext policy suppression fallback
    }
  }, [isMuted]);

  // Repeating alarm loop when unacknowledged SOS exists
  useEffect(() => {
    if (activeSosList.length > 0 && !isMuted) {
      playAlarmTone();
      timerRef.current = setInterval(playAlarmTone, 3500);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeSosList.length, isMuted, playAlarmTone]);

  // Handle manual interaction to initialize audio context
  const handleEnableAudio = () => {
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
        audioCtxRef.current.resume();
        setIsAudioInitialized(true);
        playAlarmTone();
      }
    }
  };

  const handleAcknowledgeSos = async (reportId: string) => {
    setIsAcknowledging(reportId);
    setAcknowledgeError(null);
    try {
      const ops = getAdminOperationsService();
      await ops.acknowledgeSafetySos({
        reportId,
        acknowledgementNote: 'Audible emergency alert acknowledged by Admin Console Operator.',
      });

      // Update state locally immediately
      setActiveSosList((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err: unknown) {
      setAcknowledgeError(err instanceof Error ? err.message : 'Failed to acknowledge alert.');
    } finally {
      setIsAcknowledging(null);
    }
  };

  if (activeSosList.length === 0) {
    return null;
  }

  const primaryIncident = activeSosList[0];

  return (
    <div
      role="alert"
      className="bg-red-600 text-white px-4 py-3 shadow-lg border-b-2 border-red-800 transition-all animate-pulse"
      style={{ animationDuration: '3s' }}
    >
      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Incident Signal */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-white/20 text-white shrink-0">
            <AlertOctagon className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold tracking-wider uppercase text-xs px-2 py-0.5 rounded bg-white text-red-700">
                CRITICAL IN-PERSON EMERGENCY SOS
              </span>
              <span className="font-mono text-xs font-bold underline">
                Job #{primaryIncident.public_job_id}
              </span>
              {activeSosList.length > 1 && (
                <span className="text-[11px] bg-red-900/60 px-2 py-0.5 rounded-full font-bold">
                  +{activeSosList.length - 1} more active alert{activeSosList.length > 2 ? 's' : ''}
                </span>
              )}
            </div>

            <p className="text-xs font-medium text-red-100 mt-1 flex items-center gap-3 flex-wrap">
              <span>
                <strong>{primaryIncident.reporter_name}</strong> ({primaryIncident.reporter_type.toUpperCase()})
              </span>
              <span className="inline-flex items-center gap-1 font-mono">
                <Phone className="w-3 h-3" /> {primaryIncident.reporter_phone}
              </span>
              {primaryIncident.location_text && (
                <span className="inline-flex items-center gap-1 truncate max-w-sm">
                  <MapPin className="w-3 h-3 shrink-0" /> {primaryIncident.location_text}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
          {/* Audio Mute/Unmute */}
          <button
            type="button"
            onClick={() => {
              if (!isAudioInitialized) handleEnableAudio();
              setIsMuted(!isMuted);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-700/80 hover:bg-red-700 text-white text-xs font-semibold border border-red-500 transition-colors"
            title={isMuted ? 'Unmute repeating alarm' : 'Mute repeating alarm'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-red-200" />}
            <span className="hidden sm:inline">{isMuted ? 'Unmute Alarm' : 'Mute Sound'}</span>
          </button>

          {/* View in Safety Centre */}
          <Link
            href="/admin/safety"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold border border-white/30 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Open Safety Centre</span>
          </Link>

          {/* Acknowledge SOS */}
          <button
            type="button"
            disabled={isAcknowledging === primaryIncident.id}
            onClick={() => handleAcknowledgeSos(primaryIncident.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-red-700 hover:bg-red-50 text-xs font-bold shadow-md transition-colors disabled:opacity-50"
          >
            {isAcknowledging === primaryIncident.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5 text-red-600" />
            )}
            <span>Acknowledge SOS</span>
          </button>
        </div>
      </div>

      {acknowledgeError && (
        <div className="mt-1 text-[11px] text-red-200 text-center font-semibold">
          Error acknowledging SOS: {acknowledgeError}
        </div>
      )}
    </div>
  );
}
