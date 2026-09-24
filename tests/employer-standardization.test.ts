/**
 * Menial Mobile - Employer Account Standardization Test Suite
 * 
 * Verifies complete standardization of Employer account features, including:
 * 1. Profile & Company Details Management (§22)
 * 2. CBN-Compliant Escrow Billing & Saved Funding Methods (§38, §39)
 * 3. Hiring History & Invoices View (§32, §44)
 * 4. Dispatch Tracking & Operational Preferences (§49)
 * 5. 24/7 Lagos Ops Hotline & Section 47 Dispute Arbitration (§47)
 * 6. Explicit Logout Confirmation Workflow
 * 7. NDPA 2023 §80 Right to Erasure & CBN Financial Retention Compliance
 */

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

async function runEmployerStandardizationTests() {
  console.log('\n====================================================');
  console.log('  MENIAL MOBILE — EMPLOYER STANDARDIZATION TESTS   ');
  console.log('====================================================\n');

  const { ApiService, DEFAULT_EMPLOYER_PROFILE } = await import('../mobile/src/services/api');

  // --------------------------------------------------------------------------
  console.log('--- 1. EMPLOYER PROFILE & COMPANY DETAILS API (§22) ---');
  // --------------------------------------------------------------------------
  const initialProfile = ApiService.getEmployerProfile();
  assert(
    typeof initialProfile.fullName === 'string' && initialProfile.fullName.length > 0,
    'getEmployerProfile returns valid contact person fullName'
  );
  assert(
    typeof initialProfile.companyName === 'string' && initialProfile.companyName.includes('Estates'),
    'getEmployerProfile includes companyName'
  );
  assert(
    initialProfile.defaultLocationAddress.includes('Lekki Phase 1'),
    'Default site address is set to Lekki Phase 1, Lagos'
  );
  assert(
    initialProfile.defaultLga.includes('Eti-Osa'),
    'Default LGA is set to Eti-Osa, Lagos'
  );

  const updateRes = await ApiService.updateEmployerProfile('employer_default', {
    companyName: 'Victoria Island Holdings Ltd',
    defaultLocationAddress: 'Adeola Odeku Street, Victoria Island, Lagos',
    defaultLga: 'Iru-Victoria Island, Lagos',
  });
  assert(updateRes.success === true, 'updateEmployerProfile returns success: true');

  const updatedProfile = ApiService.getEmployerProfile();
  assert(
    updatedProfile.companyName === 'Victoria Island Holdings Ltd',
    'Updated companyName was persisted in employer store'
  );
  assert(
    updatedProfile.defaultLocationAddress.includes('Adeola Odeku'),
    'Updated defaultLocationAddress was persisted'
  );

  // Restore baseline
  await ApiService.updateEmployerProfile('employer_default', DEFAULT_EMPLOYER_PROFILE);

  // --------------------------------------------------------------------------
  console.log('\n--- 2. ESCROW BILLING & HIRING SUMMARY (§38, §39, §44) ---');
  // --------------------------------------------------------------------------
  const hiringSummary = ApiService.getEmployerHiringSummary();
  assert(hiringSummary.totalJobsPosted >= 1, 'Hiring summary reports posted jobs count');
  assert(hiringSummary.totalWorkersHired >= 1, 'Hiring summary reports workers hired count');
  assert(
    hiringSummary.totalEscrowFundedKobo >= 40000000,
    'Hiring summary reports cumulative escrow spend in kobo'
  );

  const paymentMethods = ApiService.getEmployerPaymentMethods();
  assert(paymentMethods.length >= 2, 'Returns at least 2 saved funding sources');
  const cardMethod = paymentMethods.find((p) => p.type === 'card');
  const bankMethod = paymentMethods.find((p) => p.type === 'bank_transfer');
  assert(!!cardMethod && cardMethod.isDefault === true, 'Card funding method is default');
  assert(!!bankMethod && bankMethod.details.includes('Wema Bank'), 'Dedicated NIP virtual account is available');

  // --------------------------------------------------------------------------
  console.log('\n--- 3. PRE-FLIGHT CHECKS & NDPA ACCOUNT DELETION (§80) ---');
  // --------------------------------------------------------------------------
  // Should fail because activeJob is in createdJobsStore
  const activeDeleteRes = await ApiService.deleteEmployerAccount('employer_default', 'Moving away');
  assert(
    activeDeleteRes.success === false,
    'Account deletion is BLOCKED when active funded jobs exist (§38, §80)'
  );
  assert(
    typeof activeDeleteRes.error === 'string' && activeDeleteRes.error.includes('active job'),
    'Informs user about ongoing assignments blocking deletion'
  );

  // --------------------------------------------------------------------------
  console.log('\n--- 4. SCREEN & CONTEXT INTEGRATION INVARIANTS ---');
  // --------------------------------------------------------------------------
  const screensDir = path.join(__dirname, '../mobile/src/screens/employer/settings');
  const contextDir = path.join(__dirname, '../mobile/src/context');
  const navDir = path.join(__dirname, '../mobile/src/navigation');

  const companyDetailsScreenCode = fs.readFileSync(
    path.join(screensDir, 'EmployerCompanyDetailsScreen.tsx'),
    'utf-8'
  );
  assert(
    companyDetailsScreenCode.includes('EmployerCompanyDetailsScreen') &&
      companyDetailsScreenCode.includes('Lagos Local Government Area') &&
      companyDetailsScreenCode.includes('ScreenFooter'),
    'EmployerCompanyDetailsScreen renders Lagos address controls and ScreenFooter'
  );

  const billingScreenCode = fs.readFileSync(
    path.join(screensDir, 'EmployerBillingPaymentsScreen.tsx'),
    'utf-8'
  );
  assert(
    billingScreenCode.includes('EmployerBillingPaymentsScreen') &&
      billingScreenCode.includes('CBN-Licensed Escrow Protection') &&
      billingScreenCode.includes('Wema Bank Virtual Account') &&
      billingScreenCode.includes('PCI-DSS Level 1'),
    'EmployerBillingPaymentsScreen complies with CBN §38 Escrow and PCI-DSS disclosures'
  );

  const historyScreenCode = fs.readFileSync(
    path.join(screensDir, 'EmployerHiringHistoryScreen.tsx'),
    'utf-8'
  );
  assert(
    historyScreenCode.includes('EmployerHiringHistoryScreen') &&
      historyScreenCode.includes('Tax Invoice & Escrow Receipt') &&
      historyScreenCode.includes('Cumulative Escrow Spend'),
    'EmployerHiringHistoryScreen provides tax invoices and escrow expenditure history'
  );

  const preferencesScreenCode = fs.readFileSync(
    path.join(screensDir, 'EmployerPreferencesScreen.tsx'),
    'utf-8'
  );
  assert(
    preferencesScreenCode.includes('EmployerPreferencesScreen') &&
      preferencesScreenCode.includes('Worker Arrival') &&
      preferencesScreenCode.includes('Biometric Escrow Confirmation'),
    'EmployerPreferencesScreen supports §49 arrival notifications and biometric auth'
  );

  const supportScreenCode = fs.readFileSync(
    path.join(screensDir, 'EmployerSupportScreen.tsx'),
    'utf-8'
  );
  assert(
    supportScreenCode.includes('0800-MENIAL-NG') &&
      supportScreenCode.includes('Escrow Dispute Mediation (§47)') &&
      supportScreenCode.includes('NDPA 2023 Data Archive'),
    'EmployerSupportScreen provides 24/7 Lagos Ops hotline, §47 dispute mediation, and NDPA export'
  );

  const deleteAccountScreenCode = fs.readFileSync(
    path.join(screensDir, 'EmployerDeleteAccountScreen.tsx'),
    'utf-8'
  );
  assert(
    deleteAccountScreenCode.includes('EmployerDeleteAccountScreen') &&
      deleteAccountScreenCode.includes('Type DELETE to confirm') &&
      deleteAccountScreenCode.includes('CBN Anti-Money Laundering') &&
      deleteAccountScreenCode.includes('Deletion Blocked: Active Job in Progress'),
    'EmployerDeleteAccountScreen enforces pre-flight checks, typing validation, and CBN disclosures'
  );

  const employerContextCode = fs.readFileSync(
    path.join(contextDir, 'EmployerContext.tsx'),
    'utf-8'
  );
  assert(
    employerContextCode.includes('EmployerProvider') &&
      employerContextCode.includes('useEmployer') &&
      employerContextCode.includes('updateProfile') &&
      employerContextCode.includes('arrivalAlerts'),
    'EmployerContext exports EmployerProvider and useEmployer hook'
  );

  // --------------------------------------------------------------------------
  console.log('\n--- 5. EMPLOYER NAVIGATOR ARCHITECTURE ---');
  // --------------------------------------------------------------------------
  const employerNavCode = fs.readFileSync(
    path.join(navDir, 'EmployerNavigator.tsx'),
    'utf-8'
  );
  assert(
    employerNavCode.includes('EmployerProvider') &&
      employerNavCode.includes('JobCreationProvider'),
    'EmployerNavigator wraps tree in EmployerProvider and JobCreationProvider'
  );
  assert(
    employerNavCode.includes('EmployerProfileStackNavigator') &&
      employerNavCode.includes('component={EmployerProfileStackNavigator}'),
    'EmployerNavigator mounts EmployerProfileStackNavigator on Profile tab'
  );
  assert(
    employerNavCode.includes('Log Out of Employer Account?') &&
      employerNavCode.includes('Confirm Log Out'),
    'EmployerNavigator implements explicit Sign Out confirmation modal'
  );
  assert(
    employerNavCode.includes('Permanent Account Deletion (NDPA §80)'),
    'EmployerNavigator includes NDPA §80 Danger Zone navigation'
  );
  assert(
    employerNavCode.includes('name="Discover"') &&
      employerNavCode.includes('name="CreateJob"') &&
      employerNavCode.includes('name="MyJobs"') &&
      employerNavCode.includes('name="Profile"'),
    'EmployerNavigator maintains all standard Employer tabs'
  );
  assert(
    !employerNavCode.includes('name="JobFeed"') &&
      !employerNavCode.includes('name="ActiveJob"') &&
      !employerNavCode.includes('name="Wallet"'),
    'Strict role isolation: Zero Worker tabs in EmployerNavigator'
  );

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEmployerStandardizationTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
