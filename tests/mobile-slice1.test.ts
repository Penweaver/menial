/**
 * Slice 1 Verification Test Suite
 * 
 * Verifies the 5 core mandates for Slice 1:
 * 1. Token storage uses encrypted storage abstractions (StorageService / expo-secure-store).
 * 2. Zero duplicated auth logic — calls flow exclusively through shared AuthService.
 * 3. Section 52 Shared screen coverage (Splash, Welcome, Login, Registration, Verification, RoleSelection).
 * 4. Section 43 Rate-limit UX handling (3 requests / 10-15m window, explicit lockout states).
 * 5. Clean role isolation — EmployerNavigator and WorkerNavigator are strictly separated.
 * 6. DESIGN.md design tokens and tabular Naira currency formatting.
 */

import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from '../mobile/src/services/storage';
import { ApiService, authService, smsProvider } from '../mobile/src/services/api';
import { AuthService } from '../shared/services/auth/AuthService';
import { MockSmsProvider } from '../shared/services/sms/MockSmsProvider';
import { Colors, formatKoboToNaira } from '../mobile/src/constants/theme';
import type { PhoneAuthSession } from '../shared/services/auth/AuthService';

async function runSlice1Tests() {
  console.log('====================================================');
  console.log('  MENIAL MOBILE — SLICE 1 VERIFICATION TEST SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Token & Session Storage (Encrypted Storage)
  // --------------------------------------------------------------------------
  console.log('--- 1. ENCRYPTED TOKEN & SESSION STORAGE ---');
  await StorageService.clearAuthSession();
  await StorageService.clearActiveRole();

  const mockSession: PhoneAuthSession = {
    userId: 'user_phone_2348012345678',
    phone: '+2348012345678',
    token: 'jwt_secure_token_abc123',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    accountType: 'employer',
  };

  await StorageService.saveAuthSession(mockSession);
  const retrievedSession = await StorageService.getAuthSession();
  assert(
    retrievedSession !== null && retrievedSession.token === 'jwt_secure_token_abc123',
    'Auth session saved and retrieved via StorageService'
  );

  await StorageService.saveActiveRole('employer');
  const retrievedRole = await StorageService.getActiveRole();
  assert(retrievedRole === 'employer', 'Active role persisted as employer');

  await StorageService.clearAuthSession();
  const clearedSession = await StorageService.getAuthSession();
  assert(clearedSession === null, 'Auth session cleanly wiped on logout');

  // Verify storage.ts specifically uses expo-secure-store and not AsyncStorage
  const storageCode = fs.readFileSync(
    path.join(__dirname, '../mobile/src/services/storage.ts'),
    'utf-8'
  );
  assert(
    storageCode.includes('expo-secure-store') &&
      !storageCode.includes('@react-native-async-storage/async-storage') &&
      !storageCode.includes('AsyncStorage.getItem') &&
      !storageCode.includes('AsyncStorage.setItem'),
    'storage.ts enforces expo-secure-store and bans AsyncStorage'
  );

  // --------------------------------------------------------------------------
  // TEST 2: Zero Duplicated Auth Logic (AuthService Delegation)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. ZERO DUPLICATED AUTH LOGIC (AuthService DELEGATION) ---');
  assert(authService instanceof AuthService, 'ApiService uses shared AuthService instance');
  assert(smsProvider instanceof MockSmsProvider, 'AuthService uses MockSmsProvider instance');

  // Test phone OTP dispatch via ApiService -> AuthService
  const testPhone = '+2348099990001';
  const otpRes = await ApiService.requestPhoneOtp(testPhone);
  assert(otpRes.success === true, 'ApiService.requestPhoneOtp succeeds via shared AuthService');

  // Verify OTP via ApiService -> AuthService
  const storedOtp = (smsProvider as any).otpStore?.get(testPhone);
  assert(storedOtp !== undefined && storedOtp.code.length === 6, 'MockSmsProvider generated 6-digit OTP');

  const verifyRes = await ApiService.verifyPhoneOtp(testPhone, storedOtp.code, 'worker');
  assert(verifyRes.success === true, 'ApiService.verifyPhoneOtp verifies code via shared AuthService');
  assert(
    verifyRes.session?.accountType === 'worker',
    'Session returned with specified worker account type'
  );

  // Verify mobile screens don't duplicate auth with direct supabase calls
  const screensDir = path.join(__dirname, '../mobile/src/screens/shared');
  const screenFiles = fs.readdirSync(screensDir);
  let hasDirectSupabaseAuthCall = false;
  for (const file of screenFiles) {
    const content = fs.readFileSync(path.join(screensDir, file), 'utf-8');
    if (content.includes('supabase.auth.')) {
      hasDirectSupabaseAuthCall = true;
    }
  }
  assert(!hasDirectSupabaseAuthCall, 'Zero direct supabase.auth calls in any mobile screens');

  // --------------------------------------------------------------------------
  // TEST 3: Section 52 Shared Screen Coverage
  // --------------------------------------------------------------------------
  console.log('\n--- 3. SECTION 52 SHARED SCREEN COVERAGE ---');
  const requiredScreens = [
    'SplashScreen.tsx',
    'WelcomeScreen.tsx',
    'LoginScreen.tsx',
    'RegistrationScreen.tsx',
    'VerificationScreen.tsx',
    'RoleSelectionScreen.tsx',
  ];

  for (const screenName of requiredScreens) {
    const screenPath = path.join(screensDir, screenName);
    const exists = fs.existsSync(screenPath);
    assert(exists, `Section 52 screen exists: ${screenName}`);

    if (exists) {
      const code = fs.readFileSync(screenPath, 'utf-8');
      const exportName = screenName.replace('.tsx', '');
      assert(
        code.includes(`export const ${exportName}`),
        `Screen exports component: ${exportName}`
      );
    }
  }

  // --------------------------------------------------------------------------
  // TEST 4: Section 43 Rate-Limit Handling (3 attempts / 10-15m window)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. SECTION 43 RATE-LIMIT HANDLING ---');
  const rateLimitPhone = '+2348077778888';
  // Attempt 1
  const req1 = await ApiService.requestPhoneOtp(rateLimitPhone);
  assert(req1.success === true, 'Attempt 1 of 3: Allowed');

  // Attempt 2
  const req2 = await ApiService.requestPhoneOtp(rateLimitPhone);
  assert(req2.success === true, 'Attempt 2 of 3: Allowed');

  // Attempt 3
  const req3 = await ApiService.requestPhoneOtp(rateLimitPhone);
  assert(req3.success === true, 'Attempt 3 of 3: Allowed (Window Cap Reached)');

  // Attempt 4 (Blocked by Section 43)
  const req4 = await ApiService.requestPhoneOtp(rateLimitPhone);
  assert(req4.success === false, 'Attempt 4 of 3: Blocked by Section 43 rate limit');
  assert(req4.isRateLimited === true, 'isRateLimited flag correctly detected');
  assert(
    req4.error !== undefined && req4.error.includes('wait') && req4.error.includes('minute'),
    'Error message contains explicit wait time instructions for UI'
  );

  // Check UI rate limit banners exist in LoginScreen and VerificationScreen
  const loginCode = fs.readFileSync(path.join(screensDir, 'LoginScreen.tsx'), 'utf-8');
  assert(
    loginCode.includes('Section 43 Rate-limit Alert Banner') &&
      loginCode.includes('rateLimitState.isLocked'),
    'LoginScreen includes dedicated Section 43 lockout banner and disabled CTA'
  );

  const verifyCode = fs.readFileSync(
    path.join(screensDir, 'VerificationScreen.tsx'),
    'utf-8'
  );
  assert(
    verifyCode.includes('Section 43 Rate-limit Alert Banner') &&
      verifyCode.includes('rateLimitState.isLocked'),
    'VerificationScreen includes dedicated Section 43 lockout banner'
  );

  // --------------------------------------------------------------------------
  // TEST 5: Clean Role Isolation (Navigators)
  // --------------------------------------------------------------------------
  console.log('\n--- 5. CLEAN ROLE ISOLATION NAVIGATORS ---');
  const navDir = path.join(__dirname, '../mobile/src/navigation');
  const employerNavCode = fs.readFileSync(
    path.join(navDir, 'EmployerNavigator.tsx'),
    'utf-8'
  );
  const workerNavCode = fs.readFileSync(
    path.join(navDir, 'WorkerNavigator.tsx'),
    'utf-8'
  );
  const rootNavCode = fs.readFileSync(
    path.join(navDir, 'RootNavigator.tsx'),
    'utf-8'
  );

  // EmployerNavigator checks
  assert(
    employerNavCode.includes('name="Discover"') &&
      employerNavCode.includes('name="CreateJob"') &&
      employerNavCode.includes('name="MyJobs"'),
    'EmployerNavigator configures Employer tabs (Discover, CreateJob, MyJobs)'
  );
  assert(
    !employerNavCode.includes('name="JobFeed"') &&
      !employerNavCode.includes('name="ActiveJob"') &&
      !employerNavCode.includes('name="Wallet"'),
    'EmployerNavigator contains ZERO Worker tabs (Clean isolation)'
  );

  // WorkerNavigator checks
  assert(
    workerNavCode.includes('name="JobFeed"') &&
      workerNavCode.includes('name="ActiveJob"') &&
      workerNavCode.includes('name="Wallet"'),
    'WorkerNavigator configures Worker tabs (JobFeed, ActiveJob, Wallet)'
  );
  assert(
    !workerNavCode.includes('name="Discover"') &&
      !workerNavCode.includes('name="CreateJob"') &&
      !workerNavCode.includes('name="MyJobs"'),
    'WorkerNavigator contains ZERO Employer tabs (Clean isolation)'
  );

  // RootNavigator checks
  assert(
    rootNavCode.includes("activeRole === 'employer' ?") &&
      rootNavCode.includes('<EmployerNavigator />') &&
      rootNavCode.includes('<WorkerNavigator />') &&
      rootNavCode.includes('<AuthNavigator />'),
    'RootNavigator branches cleanly into separate navigator trees at the root level'
  );

  // --------------------------------------------------------------------------
  // TEST 6: Design System & Currency Formatting (DESIGN.md)
  // --------------------------------------------------------------------------
  console.log('\n--- 6. DESIGN SYSTEM TOKENS (DESIGN.md) ---');
  assert(Colors.primary === '#1A4FEE', 'Primary brand color is #1A4FEE (Electric Royal Cobalt)');
  assert(Colors.secondary === '#0284C7', 'Secondary color is #0284C7 (Verified Sky Blue)');
  assert(Colors.tertiary === '#F59E0B', 'Tertiary color is #F59E0B (Amber Gold)');
  assert(Colors.canvas === '#F8FAFC', 'Canvas color is #F8FAFC (Slate-50 Warm Off-White)');
  assert(formatKoboToNaira(250000) === '₦2,500', 'formatKoboToNaira formats 250,000 kobo as ₦2,500');

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSlice1Tests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
