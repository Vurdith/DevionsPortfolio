import { hasFirebaseAdminConfig } from "@/lib/firebase/admin";

import { ensureDbFile, readDb as readFileDb, writeDb as writeFileDb } from "./file";
import { readFirestoreDb, writeFirestoreDb } from "./firestore";
import type { Db } from "./types";

export { ensureDbFile };

export async function readDb(): Promise<Db> {
  if (hasFirebaseAdminConfig()) {
    return readFirestoreDb();
  }

  return readFileDb();
}

export async function writeDb(
  mutate: (db: Db) => void | Db | Promise<void | Db>,
): Promise<Db> {
  if (hasFirebaseAdminConfig()) {
    return writeFirestoreDb(mutate);
  }

  return writeFileDb(mutate);
}
