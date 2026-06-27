import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { env, flags } from "../env.js";

// Firestore (durable storage) via the Admin SDK. Initialised only when a
// base64 service-account is provided; otherwise the app stays on the in-memory
// store. Admin SDK bypasses security rules (all access is server-side).
let db: Firestore | null = null;

if (flags.firestoreEnabled) {
  try {
    const json = JSON.parse(Buffer.from(env.firebaseServiceAccountB64, "base64").toString("utf8"));
    if (!getApps().length) {
      initializeApp({ credential: cert(json as ServiceAccount) });
    }
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true }); // optional StoredIssue fields
    console.log(`[firebase] Firestore connected (project ${json.project_id})`);
  } catch (err) {
    console.error("[firebase] init failed, falling back to in-memory:", (err as Error).message);
    db = null;
  }
}

export const firestore = db;
