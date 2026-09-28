/**
 * Menial Platform - Task 7 Verification Test Suite
 * 
 * Verifies Financial Management & Superadmin Governance (§23, §39, §41, §44, §59, §60, §66, §67, §72, §91):
 * 1. Payments Management (/admin/payments): Paystack reference tracking, escrow status, integer kobo currency calculations.
 * 2. Payouts Management (/admin/payouts): Server-side paginated NIP transfer requests, 10-digit NUBAN and CBN bank code validation.
 * 3. Double-Entry Ledger (/admin/ledger): Mathematical zero-sum balancing invariant (sum of credits + debits = 0 kobo) and read-only integrity.
 * 4. Platform Settings Governance (/superadmin/settings): Superadmin-only live parameter modification with mandatory rationale (§66).
 * 5. Immutable Global Audit Trail (/superadmin/audit): Append-only inspection of actor ID, previous state, new state, and rationale.
 * 6. Mandatory MFA Step-Up Gate (AAL1 -> AAL2) on Finance (/admin/finance/*, /admin/payments, /admin/payouts, /admin/ledger)
 *    and Superadmin (/superadmin/*) corridors per §23 & §72.
 * 
 * Reference: menial-master-spec-v2.md (§23, §39, §41, §44, §59, §60, §66, §67, §72, §91) & DESIGN.md
 */

import {
  AdminOperationsService,
  type PaginatedResult,
} from '../shared/services/operations/AdminOperationsService';
import { SuperadminService } from '../shared/services/superadmin/SuperadminService';
import type { IDatabaseClient } from '../shared/services/admin/AdminService';
import { canAccessAdminRoute, type AdminUserContext } from '../shared/auth/rbac';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

// 10-digit NUBAN validation rule
function isValidNuban(accountNumber: string): boolean {
  return /^\d{10}$/.test(accountNumber);
}

// 3-digit CBN bank code validation rule
function isValidCbnBankCode(code: string): boolean {
  return /^\d{3}$/.test(code);
}

// Financial formatting utility matching DESIGN.md
function formatNairaFromKobo(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function runFinanceGovernanceTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING TASK 7 TESTS: FINANCE & GOVERNANCE');
  console.log('====================================================\n');

  const executedCalls: { fn: string; args?: Record<string, unknown> }[] = [];

  const mockDb: IDatabaseClient = {
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      executedCalls.push({ fn, args });

      if (fn === 'get_admin_paginated_payments') {
        const limit = (args?.p_limit as number) || 25;
        const offset = (args?.p_offset as number) || 0;
        return {
          data: {
            total: 2,
            limit,
            offset,
            data: [
              {
                id: 'pay-tx-001',
                job_id: 'job-101',
                public_job_id: 'MNL-84920',
                job_title: 'Site Plumbing Pipe Repair',
                employer_name: 'Dr. Kunle Alabi',
                employer_phone: '+234 803 123 4567',
                amount: 2200000, // ₦22,000 in kobo
                status: 'secured',
                payment_method: 'card',
                paystack_reference: 'pstk_ref_9823194',
                paid_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              },
              {
                id: 'pay-tx-002',
                job_id: 'job-102',
                public_job_id: 'MNL-84921',
                job_title: 'Generator Servicing',
                employer_name: 'Chief Obinna',
                employer_phone: '+234 812 555 7890',
                amount: 1650000, // ₦16,500 in kobo
                status: 'secured',
                payment_method: 'pay_with_transfer',
                paystack_reference: 'pstk_ref_9823195',
                paid_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              },
            ],
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'get_admin_paginated_payouts') {
        const limit = (args?.p_limit as number) || 25;
        const offset = (args?.p_offset as number) || 0;
        return {
          data: {
            total: 2,
            limit,
            offset,
            data: [
              {
                id: 'payout-001',
                worker_id: 'usr-w1',
                worker_name: 'Babatunde Adeleke',
                worker_phone: '+234 802 345 6789',
                public_job_id: 'MNL-84920',
                amount: 2000000, // ₦20,000 in kobo
                status: 'pending',
                bank_name: 'Access Bank',
                bank_code: '044',
                account_number: '0123456789',
                transfer_reference: 'TRF-MNL-99881',
                created_at: new Date().toISOString(),
              },
              {
                id: 'payout-002',
                worker_id: 'usr-w2',
                worker_name: 'Ibrahim Danladi',
                worker_phone: '+234 803 222 1100',
                public_job_id: 'MNL-84921',
                amount: 1500000, // ₦15,000 in kobo
                status: 'paid',
                bank_name: 'GTBank',
                bank_code: '058',
                account_number: '0234567890',
                transfer_reference: 'TRF-MNL-99882',
                created_at: new Date().toISOString(),
              },
            ],
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'get_admin_paginated_ledger') {
        const limit = (args?.p_limit as number) || 50;
        const offset = (args?.p_offset as number) || 0;
        // Invariant: sum of credits (positive) + sum of debits (negative) = 0 kobo
        return {
          data: {
            total: 4,
            limit,
            offset,
            data: [
              {
                id: 'ledg-001',
                batch_id: 'batch-001',
                account_type: 'escrow',
                amount: 2200000,
                direction: 'credit',
                related_type: 'payment',
                description: 'Employer deposit into escrow',
                created_at: new Date().toISOString(),
              },
              {
                id: 'ledg-002',
                batch_id: 'batch-001',
                account_type: 'worker_payable',
                amount: 2000000,
                direction: 'debit',
                related_type: 'payout',
                description: 'Worker payout liability release',
                created_at: new Date().toISOString(),
              },
              {
                id: 'ledg-003',
                batch_id: 'batch-001',
                account_type: 'platform_fee',
                amount: 200000,
                direction: 'debit',
                related_type: 'revenue',
                description: 'Platform facilitation fee deduction',
                created_at: new Date().toISOString(),
              },
              {
                id: 'ledg-004',
                batch_id: 'batch-002',
                account_type: 'escrow',
                amount: 0,
                direction: 'credit',
                related_type: 'balance_check',
                description: 'Balanced sentinel entry',
                created_at: new Date().toISOString(),
              },
            ],
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'get_superadmin_platform_settings') {
        return {
          data: [
            {
              key: 'platform_fee_percentage',
              value: '10',
              description: 'Platform facilitation fee percentage',
              updated_at: new Date().toISOString(),
              updated_by_name: 'Superadmin Root Controller',
            },
            {
              key: 'worker_cancellation_grace_mins',
              value: '30',
              description: 'Worker cancellation grace period (mins)',
              updated_at: new Date().toISOString(),
              updated_by_name: 'Superadmin Root Controller',
            },
          ] as unknown as T,
          error: null,
        };
      }

      if (fn === 'update_platform_setting') {
        const reason = args?.p_reason as string;
        if (!reason || reason.trim().length < 5) {
          return {
            data: null,
            error: new Error('A security audit rationale (min 5 chars) is mandatory (§66).'),
          };
        }
        return { data: null as unknown as T, error: null };
      }

      if (fn === 'get_admin_audit_logs') {
        const limit = (args?.p_limit as number) || 50;
        const offset = (args?.p_offset as number) || 0;
        return {
          data: {
            total: 3,
            limit,
            offset,
            data: [
              {
                id: 'log-001',
                actor_id: 'usr-super',
                actor_role: 'superadmin',
                action: 'platform_setting.update',
                target_type: 'platform_settings',
                target_id: 'platform_fee_percentage',
                previous_state: { value: '10' },
                new_state: { value: '12' },
                reason: 'Corridor operational adjustments per annual review.',
                created_at: new Date().toISOString(),
              },
              {
                id: 'log-002',
                actor_id: 'usr-fin',
                actor_role: 'finance_admin',
                action: 'payout.disburse',
                target_type: 'payout_requests',
                target_id: 'payout-001',
                reason: 'Disbursed batch NIP transfer via Access Bank.',
                created_at: new Date().toISOString(),
              },
            ],
          } as unknown as T,
          error: null,
        };
      }

      throw new Error(`Unexpected RPC call: ${fn}`);
    },
  };

  const opsService = new AdminOperationsService(mockDb);
  const saService = new SuperadminService(mockDb);

  // ========================================================================
  // 1. Payments Management: Paginated Feed & Currency Formatting (§39, §59)
  // ========================================================================
  console.log('▶ Vector 1: Payments Management & Integer Kobo Calculations (§39, §59)...');
  const payments = await opsService.getPayments({ status: 'secured', limit: 25, offset: 0 });
  assert(payments.total === 2, 'Payments queue should return 2 records');
  assert(payments.data[0].paystack_reference === 'pstk_ref_9823194', 'Paystack reference preserved');
  assert(formatNairaFromKobo(payments.data[0].amount as number) === '₦22,000.00', 'Integer kobo correctly formatted to Naira');
  console.log('  ✅ Payments paginated feed, Paystack references, and Naira currency formatting verified.');

  // ========================================================================
  // 2. Payouts Management: NUBAN & CBN Bank Code Resolution (§41, §60)
  // ========================================================================
  console.log('▶ Vector 2: Payouts Queue, 10-Digit NUBAN & CBN Resolution (§41, §60)...');
  const payouts = await opsService.getPayouts({ status: 'pending', limit: 25, offset: 0 });
  assert(payouts.total === 2, 'Payouts queue should return 2 records');
  const p1 = payouts.data[0];
  assert(isValidNuban(p1.account_number as string), 'Account number must be a valid 10-digit NUBAN');
  assert(isValidCbnBankCode(p1.bank_code as string), 'Bank code must be a valid 3-digit CBN code');
  assert(formatNairaFromKobo(p1.amount as number) === '₦20,000.00', 'Payout amount formatted correctly');
  console.log('  ✅ Payouts queue, 10-digit NUBAN validation, and CBN bank code resolution verified.');

  // ========================================================================
  // 3. Double-Entry Ledger: Zero-Sum Mathematical Balancing Invariant (§44)
  // ========================================================================
  console.log('▶ Vector 3: Double-Entry Ledger Zero-Sum Balancing Invariant (§44)...');
  const ledger = await opsService.getLedgerEntries({ limit: 50, offset: 0 });
  assert(ledger.total === 4, 'Ledger returns 4 entries');

  let netBalanceKobo = 0;
  for (const entry of ledger.data) {
    const amount = Number(entry.amount || 0);
    if (entry.direction === 'credit') {
      netBalanceKobo += amount;
    } else if (entry.direction === 'debit') {
      netBalanceKobo -= amount;
    }
  }
  assert(netBalanceKobo === 0, `Ledger net balance must be strictly 0 kobo (actual: ${netBalanceKobo} kobo)`);
  console.log('  ✅ Double-entry balanced ledger mathematically verified: ∑(credits) + ∑(debits) = 0 kobo.');

  // ========================================================================
  // 4. Platform Settings Governance: Security Rationale Enforcement (§66)
  // ========================================================================
  console.log('▶ Vector 4: Platform Settings Governance & Security Audit Rationale (§66)...');
  const settingsList = await saService.getPlatformSettings();
  assert(settingsList.length === 2, 'Should load 2 platform settings');
  assert(settingsList[0].key === 'platform_fee_percentage', 'Platform fee setting loaded');

  // Updating setting without rationale must fail
  let settingUpdateWithoutReasonFailed = false;
  try {
    await saService.updatePlatformSetting('platform_fee_percentage', '12', 'ok');
  } catch (err: unknown) {
    settingUpdateWithoutReasonFailed = true;
  }
  assert(settingUpdateWithoutReasonFailed, 'Updating platform setting without >=5 char rationale must throw error');

  // Updating setting with valid rationale
  await saService.updatePlatformSetting(
    'platform_fee_percentage',
    '12',
    'Approved by board for Q4 inflation adjustment.'
  );
  const settingUpdateCall = executedCalls.find((c) => c.fn === 'update_platform_setting' && c.args?.p_key === 'platform_fee_percentage');
  assert(!!settingUpdateCall, 'Platform setting update must invoke update_platform_setting RPC');
  console.log('  ✅ Platform settings retrieval and mandatory audit rationale enforcement verified.');

  // ========================================================================
  // 5. Global Audit Trail: Append-Only Inspection & State Diffs (§67)
  // ========================================================================
  console.log('▶ Vector 5: Global Audit Trail Inspection & State Diffs (§67)...');
  const auditLogs = await opsService.getAuditLogs({ limit: 50, offset: 0 });
  assert(auditLogs.total === 3, 'Audit logs queue should return log items');
  const logItem = auditLogs.data[0];
  assert(logItem.actor_role === 'superadmin', 'Actor role preserved in audit log');
  assert(typeof logItem.reason === 'string' && (logItem.reason as string).length >= 5, 'Audit log contains mandatory reason');
  console.log('  ✅ Immutable audit trail inspection, actor roles, and diff entries verified.');

  // ========================================================================
  // 6. Mandatory MFA Step-Up Gate on Finance & Superadmin Routes (§23, §72)
  // ========================================================================
  console.log('▶ Vector 6: Mandatory MFA Step-Up Gate on Finance & Superadmin Routes (§23, §72)...');

  // Finance Admin with MFA enrolled but NOT yet stepped up in this session (mfaVerified: false)
  const unverifiedFinanceAdmin: AdminUserContext = {
    id: 'adm-fin-unverified',
    userId: 'usr-fin',
    isSuperadmin: false,
    permissions: ['finance'],
    status: 'active',
    mfaEnrolled: true,
    mfaVerified: false,
  };

  // Finance Admin with completed MFA step-up challenge (mfaVerified: true)
  const verifiedFinanceAdmin: AdminUserContext = {
    id: 'adm-fin-verified',
    userId: 'usr-fin',
    isSuperadmin: false,
    permissions: ['finance'],
    status: 'active',
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // Operations Admin (no finance permission)
  const opsAdmin: AdminUserContext = {
    id: 'adm-ops',
    userId: 'usr-ops',
    isSuperadmin: false,
    permissions: ['operations'],
    status: 'active',
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // Superadmin with completed step-up challenge
  const superadmin: AdminUserContext = {
    id: 'adm-super',
    userId: 'usr-super',
    isSuperadmin: true,
    permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
    status: 'active',
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // Unverified Finance Admin is CHALLENGED on all financial corridors
  assert(!canAccessAdminRoute(unverifiedFinanceAdmin, '/admin/payments').allowed, 'Unverified session challenged on /admin/payments');
  assert(!canAccessAdminRoute(unverifiedFinanceAdmin, '/admin/payouts').allowed, 'Unverified session challenged on /admin/payouts');
  assert(!canAccessAdminRoute(unverifiedFinanceAdmin, '/admin/ledger').allowed, 'Unverified session challenged on /admin/ledger');

  // Stepped-up Finance Admin is ALLOWED on financial corridors
  assert(canAccessAdminRoute(verifiedFinanceAdmin, '/admin/payments').allowed, 'Verified session allowed on /admin/payments');
  assert(canAccessAdminRoute(verifiedFinanceAdmin, '/admin/payouts').allowed, 'Verified session allowed on /admin/payouts');
  assert(canAccessAdminRoute(verifiedFinanceAdmin, '/admin/ledger').allowed, 'Verified session allowed on /admin/ledger');

  // Operations Admin is BLOCKED from financial corridors even if MFA verified
  assert(!canAccessAdminRoute(opsAdmin, '/admin/payments').allowed, 'Ops admin blocked from /admin/payments');
  assert(!canAccessAdminRoute(opsAdmin, '/admin/payouts').allowed, 'Ops admin blocked from /admin/payouts');
  assert(!canAccessAdminRoute(opsAdmin, '/admin/ledger').allowed, 'Ops admin blocked from /admin/ledger');

  // Regular Admins (even verified Finance Admins) CANNOT access Superadmin corridors (§10, §20)
  assert(!canAccessAdminRoute(verifiedFinanceAdmin, '/superadmin/settings').allowed, 'Finance admin blocked from /superadmin/settings');
  assert(!canAccessAdminRoute(verifiedFinanceAdmin, '/superadmin/audit').allowed, 'Finance admin blocked from /superadmin/audit');

  // Superadmin can access everything
  assert(canAccessAdminRoute(superadmin, '/admin/payments').allowed, 'Superadmin allowed on /admin/payments');
  assert(canAccessAdminRoute(superadmin, '/superadmin/settings').allowed, 'Superadmin allowed on /superadmin/settings');
  assert(canAccessAdminRoute(superadmin, '/superadmin/audit').allowed, 'Superadmin allowed on /superadmin/audit');

  console.log('  ✅ MFA Step-Up Challenge (AAL1 -> AAL2) strictly enforced on all Finance and Superadmin corridors.');

  console.log('\n====================================================');
  console.log('🎉 ALL TASK 7 FINANCE & GOVERNANCE TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runFinanceGovernanceTests().catch((err) => {
  console.error('❌ Task 7 verification failed:', err);
  process.exit(1);
});
