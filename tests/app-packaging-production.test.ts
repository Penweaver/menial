/**
 * Automated Test Suite: Production App Store & EAS Packaging Hardening (Pillar 4)
 * 
 * Verifies:
 * 1. Expo app.json schema, manifest, branding, and orientation
 * 2. Hardware permissions for Android (GPS, Camera, Notifications, Dialing, Vibrate)
 * 3. iOS Info.plist privacy usage descriptions (Camera, Photo Library, Location)
 * 4. Expo Config Plugins (expo-location, expo-image-picker, expo-notifications)
 * 5. Production bundle identifiers (com.menial.app) & versionCode
 * 6. EAS Build profiles in eas.json (development APK, preview, production AAB for Google Play)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

async function runPackagingProductionTests() {
  console.log('\n=============================================================');
  console.log('  MENIAL — PILLAR 4: APP PACKAGING & EAS HARDENING TEST      ');
  console.log('=============================================================\n');

  // ========================================================================
  // 1. EXPO APP.JSON MANIFEST & BRANDING
  // ========================================================================
  console.log('--- 1. APP MANIFEST & BRANDING CONFIGURATION ---');

  const appJsonPath = path.resolve(__dirname, '../mobile/app.json');
  assert(fs.existsSync(appJsonPath), 'mobile/app.json exists');
  const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

  assert(appConfig.expo, 'expo key exists in app.json');
  assert.strictEqual(appConfig.expo.name, 'Menial', 'App name configured as Menial');
  assert.strictEqual(appConfig.expo.slug, 'menial', 'Slug is menial');
  assert.strictEqual(appConfig.expo.orientation, 'portrait', 'Orientation locked to portrait');
  assert.strictEqual(appConfig.expo.scheme, 'menial', 'Deep-linking URL scheme is menial');
  assert.strictEqual(appConfig.expo.userInterfaceStyle, 'light', 'Default theme is light');
  console.log('✅ PASS: Core app manifest, orientation, and scheme verified');

  // ========================================================================
  // 2. ANDROID HARDWARE PERMISSIONS (GOOGLE PLAY COMPLIANCE)
  // ========================================================================
  console.log('\n--- 2. ANDROID HARDWARE PERMISSIONS ---');

  const androidPermissions: string[] = appConfig.expo.android?.permissions || [];
  const requiredPermissions = [
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.CAMERA',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.CALL_PHONE',
    'android.permission.VIBRATE',
  ];

  for (const perm of requiredPermissions) {
    assert(
      androidPermissions.includes(perm),
      `Required Android permission missing: ${perm}`
    );
  }

  assert.strictEqual(
    appConfig.expo.android?.package,
    'com.menial.app',
    'Android package name is com.menial.app'
  );
  assert(
    typeof appConfig.expo.android?.versionCode === 'number' && appConfig.expo.android.versionCode >= 1,
    'Android versionCode configured'
  );
  console.log('✅ PASS: All 7 required Android hardware permissions and package ID verified');

  // ========================================================================
  // 3. IOS INFO.PLIST PRIVACY DESCRIPTIONS (APPLE APP STORE)
  // ========================================================================
  console.log('\n--- 3. IOS PRIVACY USAGE DESCRIPTIONS ---');

  const infoPlist = appConfig.expo.ios?.infoPlist || {};
  assert(infoPlist.NSCameraUsageDescription, 'NSCameraUsageDescription present');
  assert(infoPlist.NSPhotoLibraryUsageDescription, 'NSPhotoLibraryUsageDescription present');
  assert(infoPlist.NSLocationWhenInUseUsageDescription, 'NSLocationWhenInUseUsageDescription present');
  assert(infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription, 'NSLocationAlwaysAndWhenInUseUsageDescription present');
  assert(
    Array.isArray(infoPlist.UIBackgroundModes) && infoPlist.UIBackgroundModes.includes('location'),
    'UIBackgroundModes includes location for safety tracking'
  );
  assert.strictEqual(appConfig.expo.ios?.bundleIdentifier, 'com.menial.app', 'iOS bundleIdentifier is com.menial.app');
  console.log('✅ PASS: iOS Info.plist privacy descriptions and background modes verified');

  // ========================================================================
  // 4. EXPO CONFIG PLUGINS
  // ========================================================================
  console.log('\n--- 4. EXPO CONFIG PLUGINS ---');

  const plugins: any[] = appConfig.expo.plugins || [];
  const pluginNames = plugins.map((p) => (Array.isArray(p) ? p[0] : p));

  assert(pluginNames.includes('expo-location'), 'expo-location plugin configured');
  assert(pluginNames.includes('expo-image-picker'), 'expo-image-picker plugin configured');
  assert(pluginNames.includes('expo-notifications'), 'expo-notifications plugin configured');
  console.log('✅ PASS: All hardware config plugins properly registered in app.json');

  // ========================================================================
  // 5. EAS BUILD CONFIGURATION (EAS.JSON)
  // ========================================================================
  console.log('\n--- 5. EAS BUILD PROFILES (EAS.JSON) ---');

  const easJsonPath = path.resolve(__dirname, '../mobile/eas.json');
  assert(fs.existsSync(easJsonPath), 'mobile/eas.json exists');
  const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));

  assert(easConfig.build?.development, 'Development build profile configured');
  assert.strictEqual(easConfig.build?.development?.android?.buildType, 'apk', 'Dev profile builds APK');

  assert(easConfig.build?.preview, 'Preview build profile configured');
  assert.strictEqual(easConfig.build?.preview?.android?.buildType, 'apk', 'Preview profile builds APK');

  assert(easConfig.build?.production, 'Production build profile configured');
  assert.strictEqual(
    easConfig.build?.production?.android?.buildType,
    'app-bundle',
    'Production profile builds Google Play AAB (app-bundle)'
  );
  console.log('✅ PASS: EAS development, preview (APK), and production (AAB) profiles verified');

  console.log('\n=============================================================');
  console.log('   🎉 ALL PILLAR 4 APP PACKAGING TESTS PASSED (100%)         ');
  console.log('=============================================================\n');
}

runPackagingProductionTests().catch((err) => {
  console.error('\n❌ PILLAR 4 PACKAGING TEST SUITE FAILED:', err);
  process.exit(1);
});
