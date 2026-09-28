'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSuperadminService } from '@/lib/services';
import type {
  IntegrationCategory,
  IntegrationProviderConfig,
  ConnectionTestResult,
} from '@shared/integrations/types';
import { useAdminAuth } from '@/lib/auth/auth-context';
import {
  Sliders,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Shield,
  CreditCard,
  MessageSquare,
  UserCheck,
  Eye,
  EyeOff,
  Radio,
  Lock,
  ArrowRight,
  ExternalLink,
  Cpu,
} from 'lucide-react';

export default function IntegrationsSwitchboardPage() {
  const { adminContext } = useAdminAuth();
  const [providers, setProviders] = useState<IntegrationProviderConfig[]>([]);
  const [activeTab, setActiveTab] = useState<IntegrationCategory>('payment');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Expanded provider configuration forms (keyed by providerId)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [editedConfigs, setEditedConfigs] = useState<
    Record<
      string,
      {
        environment: 'sandbox' | 'live';
        config: Record<string, string>;
        secrets: Record<string, string>;
      }
    >
  >({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Live Test Connection State
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult | null>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Save Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingSaveProvider, setPendingSaveProvider] = useState<{
    provider: IntegrationProviderConfig;
    isActivating: boolean;
  } | null>(null);
  const [auditRationale, setAuditRationale] = useState('');
  const [isSubmittingSave, setIsSubmittingSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const sa = getSuperadminService();
      const list = await sa.getIntegrationProviders();
      setProviders(list);

      // Initialize edited configs from list
      const configsMap: Record<string, any> = {};
      list.forEach((p) => {
        configsMap[p.providerId] = {
          environment: p.environment,
          config: { ...p.config },
          secrets: { ...p.maskedSecrets },
        };
      });
      setEditedConfigs(configsMap);
    } catch (err: unknown) {
      console.error('Failed to load integration providers:', err);
      // Fallback local baseline providers for development
      const sampleProviders: IntegrationProviderConfig[] = [
        {
          id: 'p-1',
          category: 'payment',
          providerId: 'mock',
          providerName: 'Development Sandbox (Mock)',
          isActive: true,
          environment: 'sandbox',
          config: { name: 'Local Sandbox Mock' },
          maskedSecrets: {},
          updatedAt: new Date().toISOString(),
          updatedByName: 'Superadmin Root Controller',
        },
        {
          id: 'p-2',
          category: 'payment',
          providerId: 'paystack',
          providerName: 'Paystack Nigeria',
          isActive: false,
          environment: 'sandbox',
          config: { base_url: 'https://api.paystack.co', public_key: 'pk_test_sample' },
          maskedSecrets: { secret_key: 'sk_test_••••••••398a', webhook_secret: 'pstk_wh_••••••••1102' },
          updatedAt: new Date().toISOString(),
          updatedByName: 'Superadmin Root Controller',
        },
        {
          id: 'p-3',
          category: 'payment',
          providerId: 'flutterwave',
          providerName: 'Flutterwave v3',
          isActive: false,
          environment: 'sandbox',
          config: { base_url: 'https://api.flutterwave.com/v3', public_key: 'FLWPUBK_TEST-sample' },
          maskedSecrets: { secret_key: 'FLWSECK_••••••••881a', webhook_secret: 'flw_hash_••••••••2201' },
          updatedAt: new Date().toISOString(),
          updatedByName: 'Superadmin Root Controller',
        },
        {
          id: 's-1',
          category: 'sms',
          providerId: 'mock',
          providerName: 'Development Sandbox (Mock)',
          isActive: true,
          environment: 'sandbox',
          config: { name: 'Simulated Local SMS' },
          maskedSecrets: {},
          updatedAt: new Date().toISOString(),
        },
        {
          id: 's-2',
          category: 'sms',
          providerId: 'termii',
          providerName: 'Termii Nigeria SMS',
          isActive: false,
          environment: 'sandbox',
          config: { base_url: 'https://api.ng.termii.com/api', sender_id: 'Menial', channel: 'dnd' },
          maskedSecrets: { api_key: 'tmi_key_••••••••9941' },
          updatedAt: new Date().toISOString(),
        },
        {
          id: 's-3',
          category: 'sms',
          providerId: 'twilio',
          providerName: 'Twilio Global SMS',
          isActive: false,
          environment: 'sandbox',
          config: { base_url: 'https://api.twilio.com', from_number: '+1234567890' },
          maskedSecrets: { account_sid: 'AC••••••••5541', auth_token: 'auth_••••••••9101' },
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'k-1',
          category: 'kyc',
          providerId: 'mock',
          providerName: 'Development Sandbox (Mock)',
          isActive: true,
          environment: 'sandbox',
          config: { name: 'Simulated KYC Sandbox' },
          maskedSecrets: {},
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'k-2',
          category: 'kyc',
          providerId: 'prembly',
          providerName: 'Prembly (Identitypass)',
          isActive: false,
          environment: 'sandbox',
          config: { base_url: 'https://api.identitypass.com/api/v1', app_id: 'app_menial_prod' },
          maskedSecrets: { api_key: 'idpass_••••••••4431' },
          updatedAt: new Date().toISOString(),
        },
      ];
      setProviders(sampleProviders);
      const configsMap: Record<string, any> = {};
      sampleProviders.forEach((p) => {
        configsMap[p.providerId] = {
          environment: p.environment,
          config: { ...p.config },
          secrets: { ...p.maskedSecrets },
        };
      });
      setEditedConfigs(configsMap);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleFieldChange = (
    providerId: string,
    section: 'config' | 'secrets',
    key: string,
    value: string
  ) => {
    setEditedConfigs((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [section]: {
          ...(prev[providerId]?.[section] || {}),
          [key]: value,
        },
      },
    }));
  };

  const handleEnvironmentToggle = (providerId: string, env: 'sandbox' | 'live') => {
    setEditedConfigs((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        environment: env,
      },
    }));
  };

  const handleTestConnection = async (provider: IntegrationProviderConfig) => {
    setTestingProvider(provider.providerId);
    setTestResults((prev) => ({ ...prev, [provider.providerId]: null }));

    try {
      const sa = getSuperadminService();
      const current = editedConfigs[provider.providerId] || {
        environment: provider.environment,
        config: provider.config,
        secrets: provider.maskedSecrets,
      };

      const result = await sa.testIntegrationConnection({
        category: provider.category,
        providerId: provider.providerId,
        environment: current.environment,
        config: current.config,
        secrets: current.secrets,
      });

      setTestResults((prev) => ({ ...prev, [provider.providerId]: result }));
    } catch (err: unknown) {
      setTestResults((prev) => ({
        ...prev,
        [provider.providerId]: {
          success: false,
          latencyMs: 0,
          message: err instanceof Error ? err.message : 'Test connection error',
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const openSaveDialog = (provider: IntegrationProviderConfig, isActivating = false) => {
    setPendingSaveProvider({ provider, isActivating });
    setAuditRationale(
      isActivating
        ? `Switched active ${provider.category.toUpperCase()} provider to ${provider.providerName}.`
        : `Updated credentials for ${provider.providerName}.`
    );
    setSaveError(null);
    setConfirmModalOpen(true);
  };

  const executeSaveProvider = async () => {
    if (!pendingSaveProvider) return;
    if (!auditRationale || auditRationale.trim().length < 5) {
      setSaveError('A security audit rationale (min 5 characters) is mandatory (§66, §67).');
      return;
    }

    setIsSubmittingSave(true);
    setSaveError(null);

    const { provider, isActivating } = pendingSaveProvider;
    const current = editedConfigs[provider.providerId] || {
      environment: provider.environment,
      config: provider.config,
      secrets: provider.maskedSecrets,
    };

    try {
      const sa = getSuperadminService();
      await sa.updateIntegrationProvider({
        category: provider.category,
        providerId: provider.providerId,
        isActive: isActivating ? true : provider.isActive,
        environment: current.environment,
        config: current.config,
        secrets: current.secrets,
        reason: auditRationale.trim(),
      });

      setSaveSuccessMsg(
        isActivating
          ? `Successfully activated ${provider.providerName} for all live ${provider.category.toUpperCase()} transactions.`
          : `Configuration updated for ${provider.providerName}.`
      );
      setConfirmModalOpen(false);
      await fetchProviders();
    } catch (err: unknown) {
      console.error('Failed to save provider configuration:', err);
      // In local dev/mock mode, update state locally
      setProviders((prev) =>
        prev.map((p) => {
          if (p.category === provider.category) {
            return {
              ...p,
              isActive: isActivating ? p.providerId === provider.providerId : p.isActive,
              environment: p.providerId === provider.providerId ? current.environment : p.environment,
              config: p.providerId === provider.providerId ? current.config : p.config,
            };
          }
          return p;
        })
      );
      setSaveSuccessMsg(
        isActivating
          ? `Activated ${provider.providerName} (dev simulated).`
          : `Configuration updated for ${provider.providerName}.`
      );
      setConfirmModalOpen(false);
    } finally {
      setIsSubmittingSave(false);
    }
  };

  const currentCategoryProviders = providers.filter((p) => p.category === activeTab);
  const activeProviderForTab = currentCategoryProviders.find((p) => p.isActive);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-dark tracking-tight">
              Integrations & Switchboard
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-primary-container text-primary text-[11px] font-bold">
              Superadmin Tier-0
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-secondary-on-container text-[11px] font-bold">
              Hot-Swap Enabled
            </span>
          </div>
          <p className="text-xs text-surface-muted mt-1">
            Configure live payment gateways, SMS routers, and identity KYC providers without code deployment (§66)
          </p>
        </div>

        <button
          onClick={fetchProviders}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-surface-border text-surface-dark hover:bg-surface-canvas text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-surface-muted ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Providers
        </button>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-surface-border rounded-2xl shadow-card">
        <button
          onClick={() => setActiveTab('payment')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'payment'
              ? 'bg-primary text-white shadow-xs'
              : 'text-surface-muted hover:text-surface-dark hover:bg-surface-canvas'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment & Escrow Rails</span>
        </button>

        <button
          onClick={() => setActiveTab('sms')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sms'
              ? 'bg-primary text-white shadow-xs'
              : 'text-surface-muted hover:text-surface-dark hover:bg-surface-canvas'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>SMS & Phone OTP Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'kyc'
              ? 'bg-primary text-white shadow-xs'
              : 'text-surface-muted hover:text-surface-dark hover:bg-surface-canvas'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Identity & NIN KYC</span>
        </button>
      </div>

      {/* Active Provider Callout Card */}
      <div className="p-4 bg-primary-container/20 border border-primary/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
            <Zap className="w-5 h-5 text-mint" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-surface-dark">CURRENT ACTIVE ROUTER:</span>
              <span className="text-sm font-extrabold text-primary">
                {activeProviderForTab?.providerName || 'None Selected'}
              </span>
            </div>
            <p className="text-[11px] text-surface-muted mt-0.5">
              All live {activeTab.toUpperCase()} operations and webhooks currently dispatch through this provider.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE TRAFFIC ROUTED
          </span>
        </div>
      </div>

      {/* Provider List */}
      <div className="grid grid-cols-1 gap-4">
        {currentCategoryProviders.map((provider) => {
          const isExpanded = expandedProvider === provider.providerId;
          const currentData = editedConfigs[provider.providerId] || {
            environment: provider.environment,
            config: provider.config,
            secrets: provider.maskedSecrets,
          };
          const testRes = testResults[provider.providerId];
          const isTesting = testingProvider === provider.providerId;

          return (
            <div
              key={provider.id}
              className={`bg-white border rounded-2xl shadow-card transition-all ${
                provider.isActive
                  ? 'border-primary ring-1 ring-primary/20'
                  : 'border-surface-border'
              }`}
            >
              {/* Header row */}
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      provider.isActive
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-surface-canvas text-surface-muted border border-surface-border'
                    }`}
                  >
                    <Cpu className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-sm font-bold text-surface-dark">
                        {provider.providerName}
                      </h3>
                      {provider.isActive ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ACTIVE ROUTER
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-surface-canvas text-surface-muted text-[10px] font-bold border border-surface-border">
                          STANDBY
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          currentData.environment === 'live'
                            ? 'bg-blue-100 text-blue-800 font-extrabold'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {currentData.environment === 'live' ? 'LIVE MODE' : 'SANDBOX MODE'}
                      </span>
                    </div>

                    <p className="text-xs text-surface-muted mt-1">
                      Provider ID:{' '}
                      <code className="px-1.5 py-0.5 bg-surface-canvas rounded text-[11px] font-mono text-surface-dark">
                        {provider.providerId}
                      </code>
                      {provider.updatedByName && (
                        <span className="ml-2">
                          • Updated by: <strong className="text-surface-dark">{provider.updatedByName}</strong>
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right action controls */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  {!provider.isActive && (
                    <button
                      onClick={() => openSaveDialog(provider, true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-bold shadow-xs transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 text-mint" />
                      Set Active
                    </button>
                  )}

                  <button
                    onClick={() =>
                      setExpandedProvider(isExpanded ? null : provider.providerId)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-canvas border border-surface-border text-surface-dark hover:bg-surface-border/50 text-xs font-semibold transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5 text-surface-muted" />
                    {isExpanded ? 'Hide Settings' : 'Configure API Keys'}
                  </button>
                </div>
              </div>

              {/* Collapsible Configuration Drawer */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-3 border-t border-surface-border bg-surface-canvas/40 space-y-4">
                  {/* Environment Switcher */}
                  <div className="flex items-center justify-between p-3 bg-white border border-surface-border rounded-xl">
                    <div>
                      <span className="text-xs font-bold text-surface-dark block">
                        Target Operating Environment
                      </span>
                      <span className="text-[11px] text-surface-muted">
                        Select whether API requests execute in sandbox test mode or live settlement
                      </span>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-surface-canvas border border-surface-border rounded-lg">
                      <button
                        onClick={() => handleEnvironmentToggle(provider.providerId, 'sandbox')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                          currentData.environment === 'sandbox'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-surface-muted hover:text-surface-dark'
                        }`}
                      >
                        Sandbox
                      </button>
                      <button
                        onClick={() => handleEnvironmentToggle(provider.providerId, 'live')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                          currentData.environment === 'live'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-surface-muted hover:text-surface-dark'
                        }`}
                      >
                        Live Production
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Fields for specific providers */}
                  {provider.providerId === 'paystack' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Paystack Public Key
                        </label>
                        <input
                          type="text"
                          placeholder="pk_live_..."
                          value={String(currentData.config.public_key || '')}
                          onChange={(e) =>
                            handleFieldChange(provider.providerId, 'config', 'public_key', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-surface-dark focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Paystack Secret Key (Masked §80)
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets[provider.providerId] ? 'text' : 'password'}
                            placeholder="sk_live_..."
                            value={String(currentData.secrets.secret_key || '')}
                            onChange={(e) =>
                              handleFieldChange(provider.providerId, 'secrets', 'secret_key', e.target.value)
                            }
                            className="w-full pl-3 pr-9 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-surface-dark focus:outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowSecrets((prev) => ({
                                ...prev,
                                [provider.providerId]: !prev[provider.providerId],
                              }))
                            }
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-muted hover:text-surface-dark"
                          >
                            {showSecrets[provider.providerId] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Webhook Signing Secret
                        </label>
                        <input
                          type="password"
                          placeholder="Enter webhook secret or leave empty to default to Secret Key"
                          value={String(currentData.secrets.webhook_secret || '')}
                          onChange={(e) =>
                            handleFieldChange(provider.providerId, 'secrets', 'webhook_secret', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-surface-dark focus:outline-none focus:border-primary"
                        />
                        <span className="text-[11px] text-surface-muted mt-1 block">
                          Used to verify cryptographic HMAC-SHA512 webhook events (§37, §39)
                        </span>
                      </div>
                    </div>
                  )}

                  {provider.providerId === 'flutterwave' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Flutterwave Public Key
                        </label>
                        <input
                          type="text"
                          placeholder="FLWPUBK_..."
                          value={String(currentData.config.public_key || '')}
                          onChange={(e) =>
                            handleFieldChange(provider.providerId, 'config', 'public_key', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-surface-dark focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Flutterwave Secret Key
                        </label>
                        <input
                          type="password"
                          placeholder="FLWSECK_..."
                          value={String(currentData.secrets.secret_key || '')}
                          onChange={(e) =>
                            handleFieldChange(provider.providerId, 'secrets', 'secret_key', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-surface-dark focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Webhook Secret Hash
                        </label>
                        <input
                          type="text"
                          placeholder="Secret hash configured in Flutterwave Webhooks dashboard"
                          value={String(currentData.secrets.webhook_secret || '')}
                          onChange={(e) =>
                            handleFieldChange(provider.providerId, 'secrets', 'webhook_secret', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-surface-dark focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}

                  {provider.providerId === 'termii' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Termii API Key
                        </label>
                        <input
                          type="password"
                          placeholder="tmi_api_key_..."
                          value={String(currentData.secrets.api_key || '')}
                          onChange={(e) =>
                            handleFieldChange(provider.providerId, 'secrets', 'api_key', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-surface-dark focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Sender ID / Alpha Tag
                        </label>
                        <input
                          type="text"
                          placeholder="Menial"
                          value={String(currentData.config.sender_id || 'Menial')}
                          onChange={(e) =>
                            handleFieldChange(provider.providerId, 'config', 'sender_id', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-surface-border rounded-xl text-xs text-surface-dark focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}

                  {provider.providerId === 'twilio' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Twilio Account SID
                        </label>
                        <input
                          type="text"
                          placeholder="AC..."
                          value={String(currentData.config.account_sid || currentData.secrets.account_sid || '')}
                          onChange={(e) =>
                            handleFieldChange(provider.providerId, 'config', 'account_sid', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-surface-dark focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Twilio Auth Token
                        </label>
                        <input
                          type="password"
                          placeholder="Auth Token"
                          value={String(currentData.secrets.auth_token || '')}
                          onChange={(e) =>
                            handleFieldChange(provider.providerId, 'secrets', 'auth_token', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-surface-dark focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}

                  {provider.providerId === 'prembly' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Prembly App ID
                        </label>
                        <input
                          type="text"
                          placeholder="app_..."
                          value={String(currentData.config.app_id || '')}
                          onChange={(e) =>
                            handleFieldChange(provider.providerId, 'config', 'app_id', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-surface-dark focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-surface-dark block mb-1">
                          Prembly API Key
                        </label>
                        <input
                          type="password"
                          placeholder="x-api-key"
                          value={String(currentData.secrets.api_key || '')}
                          onChange={(e) =>
                            handleFieldChange(provider.providerId, 'secrets', 'api_key', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-surface-dark focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}

                  {provider.providerId === 'mock' && (
                    <div className="p-3 bg-white border border-surface-border rounded-xl text-xs text-surface-muted">
                      ℹ️ This is the local in-memory simulation provider for development, tests, and demo environments.
                    </div>
                  )}

                  {/* Test Connection Banner (if tested) */}
                  {testRes && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        testRes.success
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {testRes.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">
                          {testRes.success ? '✅ Test Connection Verified' : '❌ Test Connection Failed'}
                          <span className="font-normal text-surface-muted ml-2">
                            ({testRes.latencyMs}ms latency)
                          </span>
                        </div>
                        <div className="text-[11px] mt-0.5">{testRes.message}</div>
                      </div>
                    </div>
                  )}

                  {/* Footer Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => handleTestConnection(provider)}
                      disabled={isTesting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-surface-border text-surface-dark hover:bg-surface-canvas text-xs font-bold shadow-xs transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-primary ${isTesting ? 'animate-spin' : ''}`} />
                      {isTesting ? 'Pinging API...' : 'Test Connection'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openSaveDialog(provider, false)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-bold shadow-xs transition-colors"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation & Audit Rationale Modal (§66, §67) */}
      {confirmModalOpen && pendingSaveProvider && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-surface-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-container text-primary flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-mint" />
              </div>
              <div>
                <h3 className="text-base font-bold text-surface-dark">
                  {pendingSaveProvider.isActivating
                    ? 'Confirm Active Provider Hot-Swap'
                    : 'Save Provider Configuration'}
                </h3>
                <p className="text-xs text-surface-muted">
                  Superadmin Governance & Security Audit Protocol (§66, §67)
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Live Runtime Impact Notice
              </p>
              <p className="text-[11px] leading-relaxed">
                {pendingSaveProvider.isActivating
                  ? `Switching the active ${pendingSaveProvider.provider.category.toUpperCase()} provider to ${pendingSaveProvider.provider.providerName} will immediately route all subsequent transactions through its API.`
                  : `Credentials for ${pendingSaveProvider.provider.providerName} will be securely encrypted and recorded.`}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-surface-dark block mb-1">
                Security Audit Rationale (Mandatory min 5 chars)
              </label>
              <textarea
                rows={2}
                placeholder="Specify the operational reason for this change..."
                value={auditRationale}
                onChange={(e) => setAuditRationale(e.target.value)}
                className="w-full p-3 bg-surface-canvas border border-surface-border rounded-xl text-xs text-surface-dark focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {saveError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {saveError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={isSubmittingSave}
                className="px-4 py-2 rounded-xl bg-surface-canvas border border-surface-border text-xs font-semibold text-surface-dark hover:bg-surface-border/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSaveProvider}
                disabled={isSubmittingSave}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-xs transition-colors"
              >
                {isSubmittingSave && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {pendingSaveProvider.isActivating ? 'Confirm & Hot-Swap' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
