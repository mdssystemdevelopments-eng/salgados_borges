import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ensureUploadsDir, newId, UPLOADS_DIR } from "./store";

type StoredUpload = {
  id: string;
  mimeType: string;
  buffer: Buffer;
};

function useDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

type PgClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  end: () => Promise<void>;
};

async function withPg<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
  const { default: pg } = await import("pg");
  const connectionString = (process.env.DATABASE_URL || "")
    .replace(/([&?])channel_binding=require&?/, "$1")
    .replace(/[?&]$/, "");
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

async function ensureUploadsTable(client: PgClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cms_uploads (
      id TEXT PRIMARY KEY,
      mime_type TEXT NOT NULL,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function extForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

export async function saveCmsUpload(buffer: Buffer, mimeType: string): Promise<{ id: string; url: string }> {
  const id = `${Date.now()}-${newId("img")}.${extForMime(mimeType)}`;

  if (useDatabase()) {
    await withPg(async (client) => {
      await ensureUploadsTable(client);
      await client.query(
        "INSERT INTO cms_uploads (id, mime_type, data) VALUES ($1, $2, $3)",
        [id, mimeType, buffer],
      );
    });
  } else {
    await ensureUploadsDir();
    await writeFile(path.join(UPLOADS_DIR, id), buffer);
  }

  return { id, url: `/cms-media/${id}` };
}

export async function readCmsUpload(id: string): Promise<StoredUpload | null> {
  if (!id || id.includes("..") || id.includes("/") || id.includes("\\")) {
    return null;
  }

  if (useDatabase()) {
    return withPg(async (client) => {
      await ensureUploadsTable(client);
      const result = await client.query(
        "SELECT id, mime_type, data FROM cms_uploads WHERE id = $1 LIMIT 1",
        [id],
      );
      if (!result.rows[0]) return null;
      const row = result.rows[0];
      const data = row.data as Buffer | Uint8Array;
      return {
        id: String(row.id),
        mimeType: String(row.mime_type),
        buffer: Buffer.isBuffer(data) ? data : Buffer.from(data),
      };
    });
  }

  try {
    const buffer = await readFile(path.join(UPLOADS_DIR, id));
    const lower = id.toLowerCase();
    const mimeType = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".webp")
        ? "image/webp"
        : lower.endsWith(".gif")
          ? "image/gif"
          : "image/jpeg";
    return { id, mimeType, buffer };
  } catch {
    return null;
  }
}
