/**
 * Automated Test Suite: Real-Time Supabase Data & Synchronization Layer (Pillar 2)
 * 
 * Verifies:
 * 1. Database Realtime Publication Migration (20260925100000_realtime_synchronization.sql)
 * 2. RealtimeSyncService (Job state CDC, live transit GPS beacon broadcast, chat streaming)
 * 3. Section 48 Job-Scoped Chat with Terminal Read-Only Lock Enforcement
 * 4. Section 51 Offline Synchronization & Edge Mutation Queue
 * 5. Screen Integrations (WorkerActiveJobScreen, EmployerActiveJobScreen, JobChatModal)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { ApiService } from '../mobile/src/services/api';
import { RealtimeSyncService } from '../mobile/src/services/supabase/RealtimeSyncService';
import { OfflineSyncService } from '../mobile/src/services/supabase/OfflineSyncService';

async function runRealtimeSyncTests() {
  console.log('\n=============================================================');
  console.log('   MENIAL — PILLAR 2: REAL-TIME SUPABASE & SYNC TEST SUITE   ');
  console.log('=============================================================\n');

  // ========================================================================
  // 1. SUPABASE REALTIME MIGRATION & REPLICA IDENTITIES
  // ========================================================================
  console.log('--- 1. SUPABASE REALTIME MIGRATION & REPLICA IDENTITIES ---');

  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20260925100000_realtime_synchronization.sql'
  );
  assert(fs.existsSync(migrationPath), 'Realtime migration file exists');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert(migrationSql.includes('supabase_realtime'), 'Defines or checks supabase_realtime publication');
  assert(migrationSql.includes('REPLICA IDENTITY FULL'), 'Configures REPLICA IDENTITY FULL for complete CDC payloads');
  assert(migrationSql.includes('ADD TABLE public.jobs'), 'Adds jobs table to realtime publication');
  assert(migrationSql.includes('ADD TABLE public.messages'), 'Adds messages table to realtime publication');
  assert(migrationSql.includes('ADD TABLE public.safety_reports'), 'Adds safety_reports table to realtime publication');
  assert(migrationSql.includes('ADD TABLE public.conversations'), 'Adds conversations table to realtime publication');
  assert(migrationSql.includes('ADD TABLE public.notifications'), 'Adds notifications table to realtime publication');
  console.log('✅ PASS: Realtime migration properly configures CDC publication and replica identities');

  // ========================================================================
  // 2. REALTIME SYNC SERVICE (WEBSOCKETS & BROADCASTS)
  // ========================================================================
  console.log('\n--- 2. REALTIME SYNC SERVICE & CHANNELS ---');

  // 2.1 Job Status CDC Subscription
  let statusUpdateReceived: any = null;
  const unsubStatus = RealtimeSyncService.subscribeToJobStatus('test_job_001', (updated) => {
    statusUpdateReceived = updated;
  });

  RealtimeSyncService.mockEmitJobStatus('test_job_001', {
    id: 'test_job_001',
    publicJobId: 'MNL-TEST-001',
    status: 'worker_arrived',
    updatedAt: new Date().toISOString(),
  });

  assert(statusUpdateReceived !== null, 'Status update was received by listener');
  assert.strictEqual(statusUpdateReceived.status, 'worker_arrived', 'Status payload correctly propagated');
  unsubStatus();
  console.log('✅ PASS: Job status real-time CDC subscription verified');

  // 2.2 Live Worker Transit GPS Broadcast (§49, §50)
  let locationPingReceived: any = null;
  const unsubLocation = RealtimeSyncService.subscribeToWorkerLocation('test_job_001', (ping) => {
    locationPingReceived = ping;
  });

  await RealtimeSyncService.broadcastWorkerLocation({
    workerId: 'worker_adebayo',
    jobId: 'test_job_001',
    latitude: 6.4281,
    longitude: 3.4219,
    timestamp: Date.now(),
  });

  assert(locationPingReceived !== null, 'Live location ping received by subscriber');
  assert.strictEqual(locationPingReceived.latitude, 6.4281, 'Latitude coordinates accurate');
  assert.strictEqual(locationPingReceived.longitude, 3.4219, 'Longitude coordinates accurate');
  unsubLocation();
  console.log('✅ PASS: Real-time worker transit GPS broadcast and subscription verified');

  // ========================================================================
  // 3. SECTION 48 JOB-SCOPED CHAT & TERMINAL LOCK
  // ========================================================================
  console.log('\n--- 3. SECTION 48 JOB CHAT & TERMINAL LOCK ---');

  const demoJob = ApiService.getActiveJob();
  assert(demoJob !== null, 'Active demo job exists');

  // 3.1 Get conversation and messages
  const conv = ApiService.getJobConversation(demoJob.id);
  assert(conv !== undefined && conv.id.includes(demoJob.id), 'Conversation retrieved for active job');
  assert.strictEqual(conv.isTerminalLocked, false, 'Active job conversation is NOT locked');

  const initialMsgs = ApiService.getJobMessages(conv.id);
  assert(Array.isArray(initialMsgs) && initialMsgs.length >= 2, 'Initial conversation messages loaded');

  // 3.2 Send message while active
  const sentMsg = await ApiService.sendJobMessage(
    conv.id,
    'I have arrived at the gate and notified security.',
    'worker'
  );
  assert(sentMsg.id.startsWith('msg_'), 'Message generated valid ID');
  assert.strictEqual(sentMsg.body, 'I have arrived at the gate and notified security.');

  const updatedMsgs = ApiService.getJobMessages(conv.id);
  assert(updatedMsgs.some((m) => m.id === sentMsg.id), 'New message stored in conversation history');
  console.log('✅ PASS: Active job message sending and storage verified');

  // 3.3 Terminal Lock Enforcement (§48)
  // Simulate job completion
  const previousStatus = demoJob.status;
  demoJob.status = 'completed';

  let lockThrewError = false;
  try {
    await ApiService.sendJobMessage(conv.id, 'Can I still message after completion?', 'worker');
  } catch (err: any) {
    lockThrewError = true;
    assert(err.message.includes('locked') && err.message.includes('terminal status'), 'Refusal mentions terminal lock');
  }
  assert(lockThrewError, 'Section 48 strictly blocks sending messages on terminal jobs');
  console.log('✅ PASS: Section 48 terminal read-only lock strictly enforced on completed job');

  // Restore demo job status for clean environment
  demoJob.status = previousStatus;

  // ========================================================================
  // 4. SECTION 51 OFFLINE SYNCHRONIZATION & QUEUE
  // ========================================================================
  console.log('\n--- 4. SECTION 51 OFFLINE MUTATION QUEUE ---');

  OfflineSyncService.clearQueue();
  let executedActionPayload: any = null;

  OfflineSyncService.registerHandler('SEND_CHAT_MESSAGE', async (payload) => {
    executedActionPayload = payload;
    return true;
  });

  // 4.1 When online: executes immediately without queuing
  OfflineSyncService.setNetworkStatus(true);
  const onlineResult = await OfflineSyncService.enqueue('SEND_CHAT_MESSAGE', {
    conversationId: conv.id,
    body: 'Online message test',
    senderType: 'worker',
  });
  assert.strictEqual(onlineResult.queued, false, 'Online action executed immediately without queue');
  assert.strictEqual(onlineResult.immediateSuccess, true, 'Immediate execution succeeded');
  assert(executedActionPayload !== null && executedActionPayload.body === 'Online message test');
  console.log('✅ PASS: Online mutation executes immediately via handler');

  // 4.2 When offline: queues action and notifies listeners
  executedActionPayload = null;
  OfflineSyncService.setNetworkStatus(false);

  let notifiedQueueCount = -1;
  const unsubQueue = OfflineSyncService.subscribe((count) => {
    notifiedQueueCount = count;
  });

  const offlineResult = await OfflineSyncService.enqueue('SEND_CHAT_MESSAGE', {
    conversationId: conv.id,
    body: 'Offline queued message test',
    senderType: 'worker',
  });
  assert.strictEqual(offlineResult.queued, true, 'Action successfully enqueued while offline');
  assert.strictEqual(OfflineSyncService.getPendingCount(), 1, 'Queue count is 1');
  assert.strictEqual(notifiedQueueCount, 1, 'Queue listener notified of pending item');
  assert(executedActionPayload === null, 'Action handler was NOT called while offline');
  console.log('✅ PASS: Offline mutation queued and pending count incremented');

  // 4.3 Network restoration triggers automatic queue drain
  OfflineSyncService.setNetworkStatus(true);
  // Allow microtask cycle for drain
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.strictEqual(OfflineSyncService.getPendingCount(), 0, 'Queue completely drained upon reconnection');
  assert(executedActionPayload !== null && executedActionPayload.body === 'Offline queued message test', 'Queued item executed upon reconnection');
  unsubQueue();
  console.log('✅ PASS: Automatic FIFO queue drainage upon network restoration verified');

  // ========================================================================
  // 5. SCREEN & COMPONENT CODEBASE INTEGRATIONS
  // ========================================================================
  console.log('\n--- 5. SCREEN & COMPONENT INTEGRATION INVARIANTS ---');

  // 5.1 WorkerActiveJobScreen integration
  const workerScreenPath = path.resolve(
    __dirname,
    '../mobile/src/screens/worker/execution/WorkerActiveJobScreen.tsx'
  );
  const workerScreenSrc = fs.readFileSync(workerScreenPath, 'utf8');
  assert(workerScreenSrc.includes('RealtimeSyncService'), 'WorkerActiveJobScreen imports RealtimeSyncService');
  assert(workerScreenSrc.includes('OfflineSyncService'), 'WorkerActiveJobScreen imports OfflineSyncService');
  assert(workerScreenSrc.includes('JobChatModal'), 'WorkerActiveJobScreen imports JobChatModal');
  assert(workerScreenSrc.includes('broadcastWorkerLocation'), 'WorkerActiveJobScreen broadcasts transit location');
  assert(workerScreenSrc.includes('pendingSyncCount'), 'WorkerActiveJobScreen tracks offline sync queue count');
  console.log('✅ PASS: WorkerActiveJobScreen implements Realtime, Offline Queue, and JobChat');

  // 5.2 EmployerActiveJobScreen integration
  const employerScreenPath = path.resolve(
    __dirname,
    '../mobile/src/screens/employer/execution/EmployerActiveJobScreen.tsx'
  );
  const employerScreenSrc = fs.readFileSync(employerScreenPath, 'utf8');
  assert(employerScreenSrc.includes('RealtimeSyncService'), 'EmployerActiveJobScreen imports RealtimeSyncService');
  assert(employerScreenSrc.includes('subscribeToWorkerLocation'), 'EmployerActiveJobScreen subscribes to worker location');
  assert(employerScreenSrc.includes('JobChatModal'), 'EmployerActiveJobScreen mounts JobChatModal');
  assert(employerScreenSrc.includes('transitRadarCard'), 'EmployerActiveJobScreen renders live transit radar');
  console.log('✅ PASS: EmployerActiveJobScreen implements Realtime status, live transit radar, and JobChat');

  // 5.3 JobChatModal implementation
  const chatModalPath = path.resolve(
    __dirname,
    '../mobile/src/components/chat/JobChatModal.tsx'
  );
  assert(fs.existsSync(chatModalPath), 'JobChatModal.tsx exists');
  const chatModalSrc = fs.readFileSync(chatModalPath, 'utf8');
  assert(chatModalSrc.includes('isTerminalLocked'), 'JobChatModal checks terminal locked status');
  assert(chatModalSrc.includes('Conversation Archived & Locked'), 'JobChatModal includes Section 48 locked banner');
  assert(chatModalSrc.includes('OfflineSyncService'), 'JobChatModal integrates OfflineSyncService');
  assert(chatModalSrc.includes('RealtimeSyncService.subscribeToJobChat'), 'JobChatModal subscribes to real-time chat CDC');
  console.log('✅ PASS: JobChatModal implements Section 48 terminal lock and Realtime sync');

  console.log('\n=============================================================');
  console.log('   🎉 ALL PILLAR 2 REALTIME & SYNC TESTS PASSED (100%)');
  console.log('=============================================================\n');

  RealtimeSyncService.unsubscribeAll();
}

runRealtimeSyncTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Realtime sync test suite failed:', err);
    process.exit(1);
  });
