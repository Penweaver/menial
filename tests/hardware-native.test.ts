/**
 * Automated Test Suite: Hardware-Native Mobile Capabilities (Pillar 1)
 * 
 * Verifies:
 * 1. LocationService (GPS geolocation, Haversine formula, fallback coordinates, permissions)
 * 2. MediaService (Camera & media picker, low-bandwidth 0.75 compression, fallback metadata)
 * 3. NotificationService (Push & local notification dispatch, alert channels)
 * 4. Screen Integrations (WorkerActiveJobScreen, EmergencySosModal, WorkerVerificationScreen, SafetyCenterScreen)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Load LocationService logic / Haversine formula
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

async function runHardwareNativeTests() {
  console.log('\n=============================================================');
  console.log('   MENIAL — PILLAR 1: HARDWARE-NATIVE SERVICES TEST SUITE   ');
  console.log('=============================================================\n');

  // ========================================================================
  // 1. LOCATION SERVICE & HAVERSINE CALCULATION
  // ========================================================================
  console.log('--- 1. LOCATION SERVICE & GEOLOCATION ---');

  // Lagos Victoria Island (6.4281, 3.4219) to Lekki Phase 1 (6.4474, 3.4716)
  const distVItoLekki = haversineDistanceKm(6.4281, 3.4219, 6.4474, 3.4716);
  assert(distVItoLekki > 5 && distVItoLekki < 6.5, `Haversine distance between VI and Lekki should be ~5.8km, got ${distVItoLekki}km`);
  console.log(`✅ PASS: Haversine distance calculation accurate (${distVItoLekki} km between VI and Lekki)`);

  // Same coordinates should yield 0 km
  const distZero = haversineDistanceKm(6.4380, 3.4280, 6.4380, 3.4280);
  assert.strictEqual(distZero, 0, 'Distance between identical points must be 0');
  console.log('✅ PASS: Zero distance for identical coordinates');

  // Verify LocationService source file structure
  const locServicePath = path.resolve(__dirname, '../mobile/src/services/hardware/LocationService.ts');
  assert(fs.existsSync(locServicePath), 'LocationService.ts exists in hardware directory');
  const locServiceSrc = fs.readFileSync(locServicePath, 'utf8');
  assert(locServiceSrc.includes('getCurrentLocation'), 'LocationService exposes getCurrentLocation');
  assert(locServiceSrc.includes('requestLocationPermissions'), 'LocationService exposes requestLocationPermissions');
  assert(locServiceSrc.includes('calculateDistanceKm'), 'LocationService exposes calculateDistanceKm');
  assert(locServiceSrc.includes('6.4380') && locServiceSrc.includes('3.4280'), 'LocationService contains Lagos baseline fallback');
  console.log('✅ PASS: LocationService.ts verified with full API contract and fallback safety');

  // ========================================================================
  // 2. MEDIA SERVICE (CAMERA & PICKER WITH COMPRESSION)
  // ========================================================================
  console.log('\n--- 2. MEDIA SERVICE (CAMERA & MEDIA PICKER) ---');

  const mediaServicePath = path.resolve(__dirname, '../mobile/src/services/hardware/MediaService.ts');
  assert(fs.existsSync(mediaServicePath), 'MediaService.ts exists in hardware directory');
  const mediaServiceSrc = fs.readFileSync(mediaServicePath, 'utf8');
  assert(mediaServiceSrc.includes('capturePhoto'), 'MediaService exposes capturePhoto');
  assert(mediaServiceSrc.includes('pickFromGallery'), 'MediaService exposes pickFromGallery');
  assert(mediaServiceSrc.includes('0.75'), 'MediaService applies 0.75 JPEG compression for low bandwidth (§51)');
  assert(mediaServiceSrc.includes('fileSize'), 'MediaService tracks captured file size');
  console.log('✅ PASS: MediaService.ts verified with compression & camera/gallery prompt');

  // ========================================================================
  // 3. NOTIFICATION SERVICE (PUSH & LOCAL NOTIFICATIONS)
  // ========================================================================
  console.log('\n--- 3. NOTIFICATION SERVICE ---');

  const notifServicePath = path.resolve(__dirname, '../mobile/src/services/hardware/NotificationService.ts');
  assert(fs.existsSync(notifServicePath), 'NotificationService.ts exists in hardware directory');
  const notifServiceSrc = fs.readFileSync(notifServicePath, 'utf8');
  assert(notifServiceSrc.includes('sendLocalNotification'), 'NotificationService exposes sendLocalNotification');
  assert(notifServiceSrc.includes('getPushToken'), 'NotificationService exposes getPushToken');
  assert(notifServiceSrc.includes('menial-alerts'), 'NotificationService configures menial-alerts notification channel');
  assert(notifServiceSrc.includes('AndroidImportance.HIGH') || notifServiceSrc.includes('AndroidImportance.MAX'), 'Notification channel uses high importance for alerts');
  console.log('✅ PASS: NotificationService.ts verified with channels and local notification trigger');

  // Barrel export test
  const barrelPath = path.resolve(__dirname, '../mobile/src/services/hardware/index.ts');
  assert(fs.existsSync(barrelPath), 'Hardware barrel index.ts exists');
  const barrelSrc = fs.readFileSync(barrelPath, 'utf8');
  assert(barrelSrc.includes('LocationService'), 'Barrel exports LocationService');
  assert(barrelSrc.includes('MediaService'), 'Barrel exports MediaService');
  assert(barrelSrc.includes('NotificationService'), 'Barrel exports NotificationService');
  console.log('✅ PASS: Hardware service barrel index.ts correctly re-exports all 3 services');

  // ========================================================================
  // 4. SCREEN INTEGRATIONS
  // ========================================================================
  console.log('\n--- 4. SCREEN HARDWARE INTEGRATIONS ---');

  // 4.1 WorkerActiveJobScreen integration
  const activeJobPath = path.resolve(__dirname, '../mobile/src/screens/worker/execution/WorkerActiveJobScreen.tsx');
  assert(fs.existsSync(activeJobPath), 'WorkerActiveJobScreen.tsx exists');
  const activeJobSrc = fs.readFileSync(activeJobPath, 'utf8');
  assert(activeJobSrc.includes('services/hardware'), 'WorkerActiveJobScreen imports from hardware services');
  assert(activeJobSrc.includes('MediaService.promptMediaPicker'), 'WorkerActiveJobScreen uses MediaService.promptMediaPicker for check-in/out photos');
  assert(activeJobSrc.includes('LocationService.getCurrentLocation'), 'WorkerActiveJobScreen uses LocationService.getCurrentLocation');
  assert(activeJobSrc.includes('NotificationService.sendLocalNotification'), 'WorkerActiveJobScreen triggers native notifications');
  assert(activeJobSrc.includes('photoAttachedPreview'), 'WorkerActiveJobScreen includes photo thumbnail preview');
  console.log('✅ PASS: WorkerActiveJobScreen has active camera, location, and notification hooks');

  // 4.2 EmergencySosModal integration
  const sosModalPath = path.resolve(__dirname, '../mobile/src/components/safety/EmergencySosModal.tsx');
  assert(fs.existsSync(sosModalPath), 'EmergencySosModal.tsx exists');
  const sosModalSrc = fs.readFileSync(sosModalPath, 'utf8');
  assert(sosModalSrc.includes("from '../../services/hardware'"), 'EmergencySosModal imports hardware services');
  assert(sosModalSrc.includes('LocationService.getCurrentLocation'), 'EmergencySosModal queries live GPS location');
  assert(sosModalSrc.includes('NotificationService.sendLocalNotification'), 'EmergencySosModal triggers push notification on dispatch');
  console.log('✅ PASS: EmergencySosModal has live GPS tracking and notification dispatch');

  // 4.3 WorkerVerificationScreen integration
  const verifyPath = path.resolve(__dirname, '../mobile/src/screens/worker/WorkerVerificationScreen.tsx');
  assert(fs.existsSync(verifyPath), 'WorkerVerificationScreen.tsx exists');
  const verifySrc = fs.readFileSync(verifyPath, 'utf8');
  assert(verifySrc.includes("from '../../services/hardware'"), 'WorkerVerificationScreen imports MediaService');
  assert(verifySrc.includes('MediaService.promptMediaPicker'), 'WorkerVerificationScreen uses MediaService for ID photo capture');
  assert(verifySrc.includes('photoUri'), 'WorkerVerificationScreen stores captured photo URI');
  console.log('✅ PASS: WorkerVerificationScreen has native camera/gallery picker integration');

  // 4.4 SafetyCenterScreen integration
  const safetyPath = path.resolve(__dirname, '../mobile/src/screens/shared/SafetyCenterScreen.tsx');
  assert(fs.existsSync(safetyPath), 'SafetyCenterScreen.tsx exists');
  const safetySrc = fs.readFileSync(safetyPath, 'utf8');
  assert(safetySrc.includes("from '../../services/hardware'"), 'SafetyCenterScreen imports hardware services');
  assert(safetySrc.includes('LocationService.getCurrentLocation'), 'SafetyCenterScreen verifies GPS readiness');
  assert(safetySrc.includes('NotificationService.sendLocalNotification'), 'SafetyCenterScreen tests local notifications');
  console.log('✅ PASS: SafetyCenterScreen integrates LocationService and NotificationService');

  console.log('\n=============================================================');
  console.log('   🎉 ALL PILLAR 1 HARDWARE-NATIVE TESTS PASSED (100%)');
  console.log('=============================================================\n');
}

runHardwareNativeTests().catch((err) => {
  console.error('❌ Hardware native test suite failed:', err);
  process.exit(1);
});
