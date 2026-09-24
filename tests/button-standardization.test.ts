/**
 * Menial Mobile - Button Standardization & UI/UX Global Best Practices Test Suite
 * 
 * Verifies complete standardization of buttons across the mobile client:
 * 1. Button Design System Tokens & Hierarchy (Apple HIG, Material Design 3, WCAG 2.2).
 * 2. Semantic Variants: 'primary', 'secondary', 'outline', 'danger', 'danger-outline', 'ghost', 'kinetic'.
 * 3. Standard Sizing Tiers: 'sm' (38px with hitSlop), 'md' (48px standard), 'lg' (54px CTA).
 * 4. Dedicated IconButton & SegmentedControl component architecture.
 * 5. Minimalist SocialAuthButtons supporting Google, Apple, Facebook, LinkedIn with 50x50 touch targets.
 * 6. Auth Screens button standardization (Login, Registration, Welcome, Verification, Role Selection).
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

async function runButtonStandardizationTests() {
  console.log('\n====================================================');
  console.log('  MENIAL MOBILE — BUTTON STANDARDIZATION TESTS     ');
  console.log('====================================================\n');

  const componentsDir = path.join(__dirname, '../mobile/src/components/common');
  const authCompDir = path.join(__dirname, '../mobile/src/components/auth');
  const sharedScreensDir = path.join(__dirname, '../mobile/src/screens/shared');
  const contextDir = path.join(__dirname, '../mobile/src/context');

  // --------------------------------------------------------------------------
  console.log('--- 1. CORE BUTTON COMPONENT ARCHITECTURE ---');
  // --------------------------------------------------------------------------
  const buttonCode = fs.readFileSync(path.join(componentsDir, 'Button.tsx'), 'utf-8');
  assert(
    buttonCode.includes("'primary'") &&
      buttonCode.includes("'secondary'") &&
      buttonCode.includes("'outline'") &&
      buttonCode.includes("'danger'") &&
      buttonCode.includes("'danger-outline'") &&
      buttonCode.includes("'ghost'") &&
      buttonCode.includes("'kinetic'"),
    'Button supports all 7 semantic design system variants'
  );

  assert(
    buttonCode.includes("'sm'") &&
      buttonCode.includes("'md'") &&
      buttonCode.includes("'lg'"),
    'Button supports sm, md, and lg sizing tiers'
  );

  assert(
    buttonCode.includes('minTouchTarget') && buttonCode.includes('hitSlop'),
    'Button enforces 48dp minimum touch target ergonomics (WCAG 2.5.5)'
  );

  assert(
    buttonCode.includes('accessibilityRole="button"') &&
      buttonCode.includes('accessibilityState') &&
      buttonCode.includes('busy: loading'),
    'Button includes full accessibility role and busy state'
  );

  assert(
    buttonCode.includes('iconOnly') &&
      buttonCode.includes('iconPosition'),
    'Button supports icon positioning and dedicated iconOnly layout'
  );

  // --------------------------------------------------------------------------
  console.log('\n--- 2. ICON BUTTON & SEGMENTED CONTROL COMPONENTS ---');
  // --------------------------------------------------------------------------
  const iconButtonCode = fs.readFileSync(path.join(componentsDir, 'IconButton.tsx'), 'utf-8');
  assert(
    iconButtonCode.includes('IconButton') &&
      iconButtonCode.includes('accessibilityLabel') &&
      iconButtonCode.includes('minTouchTarget'),
    'IconButton enforces accessible label and min 48dp ergonomics'
  );

  const segmentedControlCode = fs.readFileSync(
    path.join(componentsDir, 'SegmentedControl.tsx'),
    'utf-8'
  );
  assert(
    segmentedControlCode.includes('SegmentedControl') &&
      segmentedControlCode.includes('accessibilityRole="tablist"') &&
      segmentedControlCode.includes('accessibilityRole="tab"') &&
      segmentedControlCode.includes('minTouchTarget'),
    'SegmentedControl implements tablist/tab accessibility and min touch target'
  );

  const indexCode = fs.readFileSync(path.join(componentsDir, 'index.ts'), 'utf-8');
  assert(
    indexCode.includes("export * from './Button'") &&
      indexCode.includes("export * from './IconButton'") &&
      indexCode.includes("export * from './SegmentedControl'"),
    'Common component index re-exports Button, IconButton, and SegmentedControl'
  );

  // --------------------------------------------------------------------------
  console.log('\n--- 3. MINIMALIST SOCIAL AUTH BUTTONS ---');
  // --------------------------------------------------------------------------
  const socialAuthCode = fs.readFileSync(
    path.join(authCompDir, 'SocialAuthButtons.tsx'),
    'utf-8'
  );
  assert(
    socialAuthCode.includes("'google'") &&
      socialAuthCode.includes("'apple'") &&
      socialAuthCode.includes("'facebook'") &&
      socialAuthCode.includes("'linkedin'"),
    'SocialAuthButtons supports Google, Apple, Facebook, and LinkedIn'
  );

  assert(
    socialAuthCode.includes('width: 50') && socialAuthCode.includes('height: 50'),
    'Social buttons are ergonomically sized at 50x50dp (>48dp WCAG minimum)'
  );

  assert(
    socialAuthCode.includes('accessibilityLabel="Sign in with Google"') &&
      socialAuthCode.includes('accessibilityLabel="Sign in with Apple"') &&
      socialAuthCode.includes('accessibilityLabel="Sign in with Facebook"') &&
      socialAuthCode.includes('accessibilityLabel="Sign in with LinkedIn"'),
    'All social auth buttons include descriptive accessibility labels'
  );

  const authContextCode = fs.readFileSync(path.join(contextDir, 'AuthContext.tsx'), 'utf-8');
  assert(
    authContextCode.includes("'google' | 'facebook' | 'linkedin' | 'apple'"),
    'AuthContext supports Apple alongside Google, Facebook, and LinkedIn in loginWithSocial'
  );

  // --------------------------------------------------------------------------
  console.log('\n--- 4. AUTHENTICATION SCREENS STANDARDIZATION ---');
  // --------------------------------------------------------------------------
  const loginCode = fs.readFileSync(path.join(sharedScreensDir, 'LoginScreen.tsx'), 'utf-8');
  assert(
    loginCode.includes('SegmentedControl') &&
      loginCode.includes('SocialAuthButtons') &&
      loginCode.includes('size="lg"') &&
      loginCode.includes('hitSlop'),
    'LoginScreen uses SegmentedControl, SocialAuthButtons, and size="lg" button'
  );

  const regCode = fs.readFileSync(path.join(sharedScreensDir, 'RegistrationScreen.tsx'), 'utf-8');
  assert(
    regCode.includes('SegmentedControl') &&
      regCode.includes('SocialAuthButtons') &&
      regCode.includes('size="lg"') &&
      regCode.includes('hitSlop'),
    'RegistrationScreen uses SegmentedControl, SocialAuthButtons, and size="lg" button'
  );

  const welcomeCode = fs.readFileSync(path.join(sharedScreensDir, 'WelcomeScreen.tsx'), 'utf-8');
  assert(
    welcomeCode.includes('size="lg"') &&
      welcomeCode.includes('minTouchTarget') &&
      welcomeCode.includes('accessibilityRole="button"'),
    'WelcomeScreen standardizes CTAs with size="lg" and accessible demo buttons'
  );

  const verifyCode = fs.readFileSync(path.join(sharedScreensDir, 'VerificationScreen.tsx'), 'utf-8');
  assert(
    verifyCode.includes('size="lg"') &&
      verifyCode.includes('hitSlop') &&
      verifyCode.includes('accessibilityRole="button"'),
    'VerificationScreen standardizes Verify button and accessible Resend Code'
  );

  const roleCode = fs.readFileSync(path.join(sharedScreensDir, 'RoleSelectionScreen.tsx'), 'utf-8');
  assert(
    roleCode.includes('size="lg"'),
    'RoleSelectionScreen standardizes Continue button with size="lg"'
  );

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runButtonStandardizationTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
