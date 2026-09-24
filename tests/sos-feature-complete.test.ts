/**
 * Comprehensive Automated Test Suite: Section 49 Emergency SOS & Safety Feature
 * 
 * Verifies:
 * 1. Emergency incident categories, dossiers, and emergency hotlines.
 * 2. Emergency contacts management (CRUD) in ApiService.
 * 3. High-urgency distress message formatting with live GPS coordinates.
 * 4. SOS dispatching with GPS, battery, silent mode, and contacts notification.
 * 5. Persistent active SOS tracking per job.
 * 6. Non-silent audit-logged resolution compliance (§49, §63).
 * 7. Mobile UI components (EmergencySosModal, ActiveSosBanner, SafetyCenterScreen) and screen mounts.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  TrustSafetyService,
  EMERGENCY_HOTLINES,
  EmergencyIncidentCategory,
  EmergencyContact,
} from '../shared/services/trust/TrustSafetyService';
import { ApiService } from '../mobile/src/services/api';

async function runSosCompleteTests() {
  console.log('\n====================================================');
  console.log('   MENIAL — SECTION 49 EMERGENCY SOS FULL TEST SUITE');
  console.log('====================================================\n');

  // ========================================================================
  // 1. EMERGENCY CONSTANTS, HOTLINES & TYPES
  // ========================================================================
  console.log('--- 1. EMERGENCY CONSTANTS & HOTLINES ---');

  assert(Array.isArray(EMERGENCY_HOTLINES), 'EMERGENCY_HOTLINES is exported as an array');
  assert(EMERGENCY_HOTLINES.length >= 3, 'Includes at least 3 emergency hotlines');

  const nat112 = EMERGENCY_HOTLINES.find((h) => h.number === '112');
  assert(nat112 !== undefined, '112 (National Emergency) is present');
  assert(nat112.tollFree, '112 is marked toll-free');

  const lagos767 = EMERGENCY_HOTLINES.find((h) => h.number === '767');
  assert(lagos767 !== undefined, '767 (Lagos State Emergency) is present');
  assert(lagos767.tollFree, '767 is marked toll-free');

  const menialHQ = EMERGENCY_HOTLINES.find((h) => h.number === '080063642564');
  assert(menialHQ !== undefined, '0800-MENIAL-NG Operations Center hotline is present');

  console.log('✅ PASS: All required emergency hotlines (112, 767, 0800-MENIAL-NG) verified');

  // ========================================================================
  // 2. EMERGENCY CONTACTS MANAGEMENT (CRUD)
  // ========================================================================
  console.log('\n--- 2. EMERGENCY CONTACTS MANAGEMENT ---');

  const initialContacts = ApiService.getEmergencyContacts();
  assert(Array.isArray(initialContacts), 'getEmergencyContacts returns an array');
  assert(initialContacts.length >= 1, 'Initial trusted contacts populated');

  // Add new contact
  const newContact = ApiService.saveEmergencyContact({
    name: 'Olumide Bakare',
    phone: '+2348055551234',
    relationship: 'Sister',
    isPrimary: false,
  });
  assert(!!newContact.id, 'New contact receives a unique ID');
  assert(newContact.name === 'Olumide Bakare', 'Contact name matches');

  // Verify retrieval
  const updatedContacts = ApiService.getEmergencyContacts();
  const found = updatedContacts.find((c) => c.id === newContact.id);
  assert(found !== undefined, 'Newly added contact is retrievable');

  // Update existing contact
  const modified = ApiService.saveEmergencyContact({
    id: newContact.id,
    name: 'Olumide Bakare-Johnson',
    phone: '+2348055551234',
    relationship: 'Sister',
  });
  assert(modified.name === 'Olumide Bakare-Johnson', 'Contact updated successfully');

  // Delete contact
  const deleted = ApiService.deleteEmergencyContact(newContact.id);
  assert(deleted, 'Contact deleted successfully');
  const afterDelete = ApiService.getEmergencyContacts();
  assert(!afterDelete.some((c) => c.id === newContact.id), 'Deleted contact is no longer present');

  console.log('✅ PASS: Emergency contacts CRUD operations verified');

  // ========================================================================
  // 3. DISTRESS MESSAGE FORMATTING WITH GPS & HOTLINES
  // ========================================================================
  console.log('\n--- 3. DISTRESS MESSAGE FORMATTING ---');

  const distressMsg = ApiService.formatEmergencyDistressMessage({
    publicJobId: 'MNL-2026-9901',
    jobTitle: 'Generator Electrical Repair',
    locationText: '15 Bishop Oluwole St, Victoria Island, Lagos',
    latitude: 6.4281,
    longitude: 3.4219,
    reporterName: 'Babatunde Fashola',
    reporterRole: 'Worker',
    category: 'physical_threat',
    dossierRef: 'SOS-9901-ALPHA',
  });

  assert(distressMsg.includes('🚨 MENIAL EMERGENCY DISTRESS ALERT'), 'Contains emergency alert header');
  assert(distressMsg.includes('SOS-9901-ALPHA'), 'Contains dossier reference');
  assert(distressMsg.includes('PHYSICAL THREAT'), 'Contains uppercase category');
  assert(distressMsg.includes('Babatunde Fashola (Worker)'), 'Contains reporter name and role');
  assert(distressMsg.includes('MNL-2026-9901'), 'Contains public job ID');
  assert(distressMsg.includes('15 Bishop Oluwole St'), 'Contains location text');
  assert(distressMsg.includes('https://maps.google.com/?q=6.4281,3.4219'), 'Contains live Google Maps GPS coordinate link');
  assert(distressMsg.includes('767') && distressMsg.includes('112'), 'Contains Nigeria emergency numbers');
  assert(distressMsg.includes('0800-MENIAL-NG'), 'Contains Menial safety hotline');

  console.log('✅ PASS: High-urgency distress message formatting verified');

  // ========================================================================
  // 4. EMERGENCY SOS DISPATCH & INCIDENT DOSSIER
  // ========================================================================
  console.log('\n--- 4. EMERGENCY SOS DISPATCH & INCIDENT DOSSIER ---');

  const testJobId = 'job_active_sos_test_01';
  const sosRes = await ApiService.triggerEmergencySos({
    jobId: testJobId,
    publicJobId: 'MNL-2026-9901',
    category: 'physical_threat',
    description: 'On-site physical threat encountered at Lekki Phase 1',
    locationText: 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos',
    latitude: 6.4380,
    longitude: 3.4280,
    isSilent: false,
    batteryLevel: 78,
    emergencyContactsNotified: true,
    reporterRole: 'worker',
  });

  assert(!!sosRes.reportId, 'SOS dispatch returns unique report ID');
  const dossier = ApiService.getSosReport(sosRes.reportId);
  assert(dossier !== undefined, 'SOS dossier saved in memory store');
  assert(dossier.status === 'dispatched', 'Initial dossier status is dispatched');
  assert(dossier.category === 'physical_threat', 'Category matches physical_threat');
  assert(dossier.latitude === 6.4380 && dossier.longitude === 3.4280, 'GPS coordinates captured');
  assert(dossier.batteryLevel === 78, 'Battery level captured');
  assert(dossier.emergencyContactsNotified === true, 'Emergency contacts notified flag set');
  assert(dossier.hotlines.includes('112') && dossier.hotlines.includes('767'), 'Hotlines present in dossier');

  console.log('✅ PASS: SOS dispatch and comprehensive dossier generation verified');

  // ========================================================================
  // 5. PERSISTENT ACTIVE SOS TRACKING ON ACTIVE JOBS
  // ========================================================================
  console.log('\n--- 5. PERSISTENT ACTIVE SOS TRACKING ---');

  const activeSos = ApiService.getActiveSosForJob(testJobId);
  assert(activeSos !== undefined, 'getActiveSosForJob returns the ongoing SOS dossier');
  assert(activeSos?.reportId === sosRes.reportId, 'Report ID matches active incident');

  const noSosJob = ApiService.getActiveSosForJob('job_without_any_sos_999');
  assert(noSosJob === undefined, 'getActiveSosForJob returns undefined for peaceful jobs');

  console.log('✅ PASS: Persistent active SOS tracking per job verified');

  // ========================================================================
  // 6. NON-SILENT RESOLUTION ENFORCEMENT (§49, §63)
  // ========================================================================
  console.log('\n--- 6. NON-SILENT RESOLUTION ENFORCEMENT ---');

  // Attempt silent resolution without notes
  let silentErrorCaught = false;
  try {
    await ApiService.resolveEmergencySos(sosRes.reportId, '   ');
  } catch (err) {
    silentErrorCaught = true;
    assert((err as Error).message.includes('detailed resolution note'), 'Error message states resolution note required');
  }
  assert(silentErrorCaught, 'Silent resolution without audit notes must be prohibited (§49)');

  // Attempt resolution with trivial note (< 5 chars)
  let trivialErrorCaught = false;
  try {
    await ApiService.resolveEmergencySos(sosRes.reportId, 'ok');
  } catch (err) {
    trivialErrorCaught = true;
  }
  assert(trivialErrorCaught, 'Resolution with trivial notes (< 5 chars) must be prohibited');

  // Valid resolution with full audit note
  const resolved = await ApiService.resolveEmergencySos(
    sosRes.reportId,
    'Client de-escalated safely; local security confirmed safe departure of worker.'
  );
  assert(resolved === true, 'Valid resolution succeeds');

  const resolvedDossier = ApiService.getSosReport(sosRes.reportId);
  assert(resolvedDossier?.status === 'resolved', 'Dossier status updated to resolved');
  assert(!!resolvedDossier?.resolvedAt, 'resolvedAt timestamp recorded');
  assert(
    resolvedDossier?.resolutionNote?.includes('local security confirmed safe departure'),
    'Audit resolution note persisted in dossier'
  );

  // Active SOS for job must now be cleared
  const clearedActiveSos = ApiService.getActiveSosForJob(testJobId);
  assert(clearedActiveSos === undefined, 'Active SOS cleared from job after resolution');

  console.log('✅ PASS: Non-silent resolution and audit logging policy verified');

  // ========================================================================
  // 7. MOBILE UI FILES & SCREEN INTEGRATION
  // ========================================================================
  console.log('\n--- 7. MOBILE UI COMPONENTS & SCREEN INTEGRATION ---');

  const mobileRoot = path.join(__dirname, '..', 'mobile', 'src');

  // 1. EmergencySosModal.tsx
  const sosModalPath = path.join(mobileRoot, 'components', 'safety', 'EmergencySosModal.tsx');
  assert(fs.existsSync(sosModalPath), 'EmergencySosModal.tsx exists');
  const sosModalContent = fs.readFileSync(sosModalPath, 'utf8');
  assert(sosModalContent.includes('physical_threat'), 'EmergencySosModal includes physical_threat category');
  assert(sosModalContent.includes('medical_emergency'), 'EmergencySosModal includes medical_emergency category');
  assert(sosModalContent.includes('harassment'), 'EmergencySosModal includes harassment category');
  assert(sosModalContent.includes('tel:112') || sosModalContent.includes('112'), 'EmergencySosModal includes 112 hotline link');
  assert(sosModalContent.includes('tel:767') || sosModalContent.includes('767'), 'EmergencySosModal includes 767 hotline link');
  assert(sosModalContent.includes('tel:080063642564') || sosModalContent.includes('0800'), 'EmergencySosModal includes Menial 0800 hotline link');

  // 2. ActiveSosBanner.tsx
  const bannerPath = path.join(mobileRoot, 'components', 'safety', 'ActiveSosBanner.tsx');
  assert(fs.existsSync(bannerPath), 'ActiveSosBanner.tsx exists');
  const bannerContent = fs.readFileSync(bannerPath, 'utf8');
  assert(bannerContent.includes('ActiveSosBanner'), 'Exports ActiveSosBanner component');
  assert(bannerContent.includes('accessibilityRole'), 'Includes accessibility role on alert banner');

  // 3. SafetyCenterScreen.tsx
  const safetyCenterPath = path.join(mobileRoot, 'screens', 'shared', 'SafetyCenterScreen.tsx');
  assert(fs.existsSync(safetyCenterPath), 'SafetyCenterScreen.tsx exists');
  const safetyCenterContent = fs.readFileSync(safetyCenterPath, 'utf8');
  assert(safetyCenterContent.includes('SafetyCenterScreen'), 'Exports SafetyCenterScreen component');
  assert(safetyCenterContent.includes('Emergency Contacts') || safetyCenterContent.includes('Emergency contacts') || safetyCenterContent.includes('EMERGENCY CONTACTS'), 'Includes Emergency Contacts section');
  assert(safetyCenterContent.includes('112') && safetyCenterContent.includes('767'), 'Includes emergency hotline dialers');

  // 4. Worker & Employer Active Job Screen Integration
  const workerActiveJobPath = path.join(mobileRoot, 'screens', 'worker', 'execution', 'WorkerActiveJobScreen.tsx');
  const workerActiveJobContent = fs.readFileSync(workerActiveJobPath, 'utf8');
  assert(workerActiveJobContent.includes('EmergencySosModal'), 'WorkerActiveJobScreen mounts EmergencySosModal');

  const employerActiveJobPath = path.join(mobileRoot, 'screens', 'employer', 'execution', 'EmployerActiveJobScreen.tsx');
  const employerActiveJobContent = fs.readFileSync(employerActiveJobPath, 'utf8');
  assert(employerActiveJobContent.includes('EmergencySosModal'), 'EmployerActiveJobScreen mounts EmergencySosModal');

  // 5. Worker & Employer Navigator Safety Center Integration
  const workerNavPath = path.join(mobileRoot, 'navigation', 'WorkerNavigator.tsx');
  const workerNavContent = fs.readFileSync(workerNavPath, 'utf8');
  assert(workerNavContent.includes('SafetyCenter'), 'WorkerNavigator includes SafetyCenter route');

  const employerNavPath = path.join(mobileRoot, 'navigation', 'EmployerNavigator.tsx');
  const employerNavContent = fs.readFileSync(employerNavPath, 'utf8');
  assert(employerNavContent.includes('SafetyCenter'), 'EmployerNavigator includes SafetyCenter route');

  console.log('✅ PASS: Mobile UI component architecture and screen integration verified');

  console.log('\n====================================================');
  console.log('  ALL SECTION 49 EMERGENCY SOS TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runSosCompleteTests().catch((err) => {
  console.error('\n❌ SOS TEST FAILED:', err);
  process.exit(1);
});
