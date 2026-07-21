import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { createSeedCms } from "./seed";
import { withNormalizedSettings } from "./sections";
import type { CmsData } from "./types";

function normalizeCms(data: CmsData): CmsData {
  return {
    ...data,
    settings: withNormalizedSettings(data.settings),
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const CMS_FILE = path.join(DATA_DIR, "cms.json");

function useDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function ensureDataFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await access(CMS_FILE);
  } catch {
    const seed = createSeedCms();
    await writeFile(CMS_FILE, JSON.stringify(seed, null, 2), "utf-8");
  }
}

async function readCmsFromFile(): Promise<CmsData> {
  await ensureDataFile();
  const raw = await readFile(CMS_FILE, "utf-8");
  return normalizeCms(JSON.parse(raw) as CmsData);
}

async function writeCmsToFile(data: CmsData): Promise<CmsData> {
  await ensureDataFile();
  const next: CmsData = normalizeCms({
    ...data,
    updatedAt: new Date().toISOString(),
  });
  await writeFile(CMS_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

type PgClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  end: () => Promise<void>;
};

async function withPg<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
  const { default: pg } = await import("pg");
  // Neon pooler: remove channel_binding se vier na URL (node-pg pode falhar com ele)
  const connectionString = (process.env.DATABASE_URL || "").replace(
    /([&?])channel_binding=require&?/,
    "$1",
  ).replace(/[?&]$/, "");
  const client = new pg.Client({
    connectionString,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function ensureCmsTable(client: PgClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cms_store (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  const existing = await client.query("SELECT 1 FROM cms_store WHERE id = 1");
  if (existing.rows.length === 0) {
    const seed = createSeedCms();
    await client.query("INSERT INTO cms_store (id, data, updated_at) VALUES (1, $1::jsonb, NOW())", [
      JSON.stringify(seed),
    ]);
  }
}

async function readCmsFromDb(): Promise<CmsData> {
  return withPg(async (client) => {
    await ensureCmsTable(client);
    const result = await client.query("SELECT data FROM cms_store WHERE id = 1");
    return normalizeCms(result.rows[0].data as CmsData);
  });
}

async function writeCmsToDb(data: CmsData): Promise<CmsData> {
  const next: CmsData = normalizeCms({
    ...data,
    updatedAt: new Date().toISOString(),
  });
  return withPg(async (client) => {
    await ensureCmsTable(client);
    await client.query(
      `INSERT INTO cms_store (id, data, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [JSON.stringify(next)],
    );
    return next;
  });
}

export async function readCms(): Promise<CmsData> {
  if (useDatabase()) return readCmsFromDb();
  return readCmsFromFile();
}

export async function writeCms(data: CmsData): Promise<CmsData> {
  if (useDatabase()) return writeCmsToDb(data);
  return writeCmsToFile(data);
}

export async function updateCms(mutator: (data: CmsData) => CmsData): Promise<CmsData> {
  const current = await readCms();
  return writeCms(mutator(current));
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function ensureUploadsDir(): Promise<void> {
  await mkdir(UPLOADS_DIR, { recursive: true });
}
