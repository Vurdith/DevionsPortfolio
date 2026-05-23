import type { Review, Work } from "@/types/portfolio";
import { getFirebaseDb } from "@/lib/firebase/admin";

import { DEFAULT_DB, type Db, type DbSession } from "./types";

const ROOT_COLLECTION = "portfolio";
const ROOT_DOC = "main";
const WORKS_COLLECTION = "works";
const REVIEWS_COLLECTION = "reviews";

let chain: Promise<void> = Promise.resolve();

async function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const prev = chain;
  let release!: () => void;
  chain = new Promise<void>((resolve) => {
    release = resolve;
  });

  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

function rootRef() {
  return getFirebaseDb().collection(ROOT_COLLECTION).doc(ROOT_DOC);
}

function byNewest<T extends { createdAt?: string; updatedAt?: string }>(a: T, b: T) {
  const aDate = a.updatedAt ?? a.createdAt ?? "";
  const bDate = b.updatedAt ?? b.createdAt ?? "";
  return aDate < bDate ? 1 : -1;
}

async function readCollection<T>(name: string): Promise<T[]> {
  const snapshot = await rootRef().collection(name).get();
  return snapshot.docs.map((doc) => doc.data() as T);
}

async function replaceCollection<T extends { id: string }>(name: string, items: T[]) {
  const collection = rootRef().collection(name);
  const existing = await collection.get();
  const nextIds = new Set(items.map((item) => item.id));
  const batch = getFirebaseDb().batch();

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

export async function readFirestoreDb(): Promise<Db> {
  const root = await rootRef().get();
  const rootData = root.data() as
    | {
        auth?: {
          passwordHash?: string | null;
          sessions?: DbSession[];
        };
      }
    | undefined;

  const [works, reviews] = await Promise.all([
    readCollection<Work>(WORKS_COLLECTION),
    readCollection<Review>(REVIEWS_COLLECTION),
  ]);

  return {
    auth: {
      passwordHash: rootData?.auth?.passwordHash ?? DEFAULT_DB.auth.passwordHash,
      sessions: rootData?.auth?.sessions ?? DEFAULT_DB.auth.sessions,
    },
    works: works.sort(byNewest),
    reviews: reviews.sort(byNewest),
  };
}

export async function writeFirestoreDb(
  mutate: (db: Db) => void | Db | Promise<void | Db>,
): Promise<Db> {
  return runExclusive(async () => {
    const db = await readFirestoreDb();
    const maybeNext = await mutate(db);
    const next = (maybeNext ?? db) as Db;

    await Promise.all([
      rootRef().set(
        {
          auth: next.auth,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      ),
      replaceCollection(WORKS_COLLECTION, next.works),
      replaceCollection(REVIEWS_COLLECTION, next.reviews),
    ]);

    return next;
  });
}
