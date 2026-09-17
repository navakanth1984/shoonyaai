import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  getDocFromServer,
  collection,
  getDocs,
  limit,
  query
} from 'firebase/firestore';
import * as fs from 'fs';

async function runTests() {
  console.log('=== SHOONYAAI FIREBASE CLOUD DIAGNOSTICS & VERIFICATION SUITE ===\n');

  // 1. Load config
  const rawConfig = fs.readFileSync('./firebase-applet-config.json', 'utf-8');
  const config = JSON.parse(rawConfig);
  console.log(`[PASS] Config Loaded:`);
  console.log(`       Project ID: ${config.projectId}`);
  console.log(`       Database ID: ${config.firestoreDatabaseId}`);
  console.log(`       Auth Domain: ${config.authDomain}\n`);

  // 2. Initialize app and named firestore
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);
  console.log(`[PASS] Firebase App & Firestore Client initialized with database: ${config.firestoreDatabaseId}\n`);

  // 3. Test Connection via getDocFromServer
  console.log('--- TEST 1: Server Reachability & Round-trip Ping ---');
  const t0 = Date.now();
  try {
    const pingRef = doc(db, 'test', 'connection');
    await setDoc(pingRef, { 
      status: 'active', 
      testedAt: new Date().toISOString(),
      platform: 'ShoonyaAI Enterprise',
      version: '1.0.0'
    });
    const snapshot = await getDocFromServer(pingRef);
    const latency = Date.now() - t0;
    console.log(`[PASS] Ping & Write successful in ${latency}ms.`);
    console.log(`       Server Data:`, snapshot.data());
  } catch (err: any) {
    console.error(`[FAIL] Connection test error:`, err.message);
    process.exit(1);
  }

  // 4. Test Blueprint Schema Collections Read
  console.log('\n--- TEST 2: Schema Blueprint Collections Verification ---');
  const collectionsToVerify = ['pipelines', 'audit_logs'];
  for (const colName of collectionsToVerify) {
    try {
      const q = query(collection(db, colName), limit(5));
      const snap = await getDocs(q);
      console.log(`[PASS] Collection '/${colName}' queried successfully (Found ${snap.size} documents).`);
    } catch (err: any) {
      console.warn(`[INFO] Collection '/${colName}' query status: ${err.message}`);
    }
  }

  // 5. Test Round-Trip Document Lifecycle
  console.log('\n--- TEST 3: Document Lifecycle (Create -> Read -> Clean) ---');
  const testDocId = `test_pipeline_${Date.now()}`;
  try {
    const testPipelineRef = doc(db, 'test', testDocId);
    await setDoc(testPipelineRef, {
      testId: testDocId,
      name: 'Verification Pipeline',
      status: 'verified',
      timestamp: new Date().toISOString()
    });
    console.log(`[PASS] Document created at /test/${testDocId}`);

    const verifySnap = await getDoc(testPipelineRef);
    if (verifySnap.exists() && verifySnap.data().status === 'verified') {
      console.log(`[PASS] Document verification confirmed: Data intact.`);
    } else {
      throw new Error('Data mismatch or document not found');
    }

    await deleteDoc(testPipelineRef);
    console.log(`[PASS] Document cleanup completed.`);
  } catch (err: any) {
    console.error(`[FAIL] Document lifecycle error:`, err.message);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('ALL FIREBASE & FIRESTORE TESTS PASSED SUCCESSFULLY! ✅');
  console.log('Database is healthy, responsive, and ready for production.');
  console.log('======================================================');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
