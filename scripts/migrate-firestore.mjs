import fs from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const dbPath = path.join(root, "data", "db.json");

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

loadEnvFile();

const projectId = requireEnv("FIREBASE_PROJECT_ID");
const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
const privateKey = requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

if (!fs.existsSync(dbPath)) {
  throw new Error("data/db.json was not found.");
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = getFirestore();
const source = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const rootRef = db.collection("portfolio").doc("main");

async function replaceCollection(name, items) {
  const collection = rootRef.collection(name);
  const existing = await collection.get();
  const nextIds = new Set(items.map((item) => item.id));
  const batch = db.batch();

  for (const item of items) {
    batch.set(collection.doc(item.id), item);
  }

  for (const doc of existing.docs) {
    if (!nextIds.has(doc.id)) {
      batch.delete(doc.ref);
    }
  }

  await batch.commit();
}

await rootRef.set(
  {
    auth: source.auth ?? { passwordHash: null, sessions: [] },
    migratedAt: new Date().toISOString(),
  },
  { merge: true },
);

await replaceCollection("works", source.works ?? []);
await replaceCollection("reviews", source.reviews ?? []);

console.log(
  `Migrated ${(source.works ?? []).length} works and ${(source.reviews ?? []).length} reviews to Firestore.`,
);
