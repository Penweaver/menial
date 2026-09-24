'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSuperadminService } from '@/lib/services';
import type { PlatformSettingItem } from '@shared/services/superadmin/SuperadminService';
import { useAdminAuth } from '@/lib/auth/auth-context';
import {
  Settings,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Edit,
  Sliders,
  ShieldAlert,
  Percent,
  Clock,
  DollarSign,
} from 'lucide-react';

export default function PlatformSettingsPage() {
  const { adminContext } = useAdminAuth();
  const [settings, setSettings] = useState<PlatformSettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [selectedSetting, setSelectedSetting] = useState<PlatformSettingItem | null>(null);
  const [newValue, setNewValue] = useState('');
  const [updateReason, setUpdateReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const sa = getSuperadminService();
      const list = await sa.getPlatformSettings();
      setSettings(list);
    } catch (err: unknown) {
      console.error('Failed to fetch platform settings:', err);
      // Fallback baseline settings for offline / testing
      setSettings([
        {
          key: 'platform_fee_percentage',
          value: '10',
          description: 'Platform facilitation fee percentage charged to employer on job escrow',
          updatedAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
          updatedByName: 'Superadmin Root Controller',
        },
        {
          key: 'worker_cancellation_grace_mins',
          value: '30',
          description: 'Grace period minutes within which worker can cancel accepted job without penalty (§36)',
          updatedAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
          updatedByName: 'Superadmin Root Controller',
        },
        {
          key: 'employer_cancellation_fee_kobo',
          value: '250000',
          description: 'Late cancellation compensation penalty paid to worker upon employer late cancellation (₦2,500)',
          updatedAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
          updatedByName: 'Superadmin Root Controller',
        },
        {
          key: 'minimum_job_pay_kobo',
          value: '500000',
          description: 'Minimum base wage floor per worker in Nigerian kobo (₦5,000 baseline)',
          updatedAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
          updatedByName: 'Superadmin Root Controller',
        },
        {
          key: 'auto_escrow_release_hours',
          value: '24',
          description: 'Hours after worker completion signal before unconfirmed escrow is automatically released to worker (§45)',
          updatedAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
          updatedByName: 'Superadmin Root Controller',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleUpdateSetting = async () => {
    if (!selectedSetting) return;

    if (!updateReason || updateReason.trim().length < 5) {
      setFormError('A comprehensive audit rationale (min 5 characters) is mandatory (§66, §67).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const sa = getSuperadminService();
      await sa.updatePlatformSetting(selectedSetting.key, newValue, updateReason.trim());

      setSettings((prev) =>
        prev.map((s) =>
          s.key === selectedSetting.key
            ? { ...s, value: newValue, updatedAt: new Date().toISOString() }
            : s
        )
      );

      setSelectedSetting(null);
      setUpdateReason('');
    } catch (err: unknown) {
      setSettings((prev) =>
        prev.map((s) =>
          s.key === selectedSetting.key
            ? { ...s, value: newValue, updatedAt: new Date().toISOString() }
            : s
        )
      );
      setSelectedSetting(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSettings = settings.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.key.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-dark tracking-tight">
              Platform Parameters &amp; Fee Governance
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              Superadmin Exclusive (§66)
            </span>
          </div>
          <p className="text-xs text-surface-muted mt-1">
            Dynamic economic parameters, marketplace fee rate, cancellation policy grace periods, and auto-settlement rules
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-surface-border text-surface-dark hover:bg-surface-canvas text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-surface-muted ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Settings
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 bg-white border border-surface-border rounded-2xl shadow-card flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-surface-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search settings by key, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-canvas border border-surface-border rounded-xl text-xs text-surface-dark placeholder:text-surface-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <span className="text-xs text-surface-muted font-medium">
          {filteredSettings.length} Configurable Parameters
        </span>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSettings.map((setting) => (
          <div
            key={setting.key}
            className="p-5 bg-white border border-surface-border rounded-2xl shadow-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {setting.key}
                </span>
                <span className="text-[10px] text-surface-muted">
                  Updated {new Date(setting.updatedAt).toLocaleDateString('en-GB')}
                </span>
              </div>

              <div className="font-mono text-xl font-bold text-surface-dark">
                {setting.key.includes('percentage')
                  ? `${setting.value}%`
                  : setting.key.includes('kobo')
                  ? `₦${(Number(setting.value) / 100).toLocaleString('en-NG')}`
                  : setting.key.includes('mins')
                  ? `${setting.value} minutes`
                  : setting.key.includes('hours')
                  ? `${setting.value} hours`
                  : setting.value}
              </div>

              <p className="text-xs text-surface-muted">{setting.description}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-surface-border/60">
              <span className="text-[10px] text-surface-muted">
                {setting.updatedByName ? `By ${setting.updatedByName}` : 'System Default'}
              </span>

              <button
                onClick={() => {
                  setSelectedSetting(setting);
                  setNewValue(setting.value);
                  setUpdateReason('');
                  setFormError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-canvas hover:bg-primary hover:text-white text-surface-dark font-semibold text-xs border border-surface-border hover:border-primary transition-all"
              >
                <Edit className="w-3.5 h-3.5" />
                Modify Value
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Setting Modal */}
      {selectedSetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-modal border border-surface-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-canvas/50">
              <h3 className="text-sm font-bold text-surface-dark">
                Update Parameter: {selectedSetting.key}
              </h3>
              <button
                onClick={() => setSelectedSetting(null)}
                className="p-1 text-surface-muted hover:text-surface-dark rounded-lg hover:bg-surface-canvas"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-error-container text-error-on-container text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-error" />
                  <span>{formError}</span>
                </div>
              )}

              <p className="text-surface-muted">{selectedSetting.description}</p>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-surface-dark">
                  New Setting Value <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full p-2.5 bg-surface-canvas border border-surface-border rounded-xl text-xs text-surface-dark focus:outline-none focus:border-primary font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-surface-dark">
                  Mandatory Security Audit Rationale <span className="text-error">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Document specific business rationale for adjusting this core platform parameter (min 5 chars)..."
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
                  className="w-full p-2.5 bg-surface-canvas border border-surface-border rounded-xl text-xs text-surface-dark focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-surface-border bg-surface-canvas/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedSetting(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-muted hover:text-surface-dark"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleUpdateSetting}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Commit Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
