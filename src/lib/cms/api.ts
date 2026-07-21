import { createServerFn } from "@tanstack/react-start";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { clearSession, createSession, isAuthenticated, requireAuth, verifyPassword } from "./auth";
import { createSeedCms } from "./seed";
import { ensureUploadsDir, newId, readCms, updateCms, UPLOADS_DIR, writeCms } from "./store";
import type {
  CmsCollection,
  CmsContent,
  CmsData,
  CmsSettings,
} from "./types";

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

function toPublicCms(data: CmsData): CmsData {
  return {
    ...data,
    categories: sortByOrder(data.categories.filter((c) => c.visible)),
    products: sortByOrder(data.products.filter((p) => p.visible)),
    gallery: sortByOrder(data.gallery.filter((g) => g.visible)),
    faq: sortByOrder(data.faq.filter((f) => f.visible)),
    testimonials: sortByOrder(data.testimonials.filter((t) => t.visible)),
    steps: sortByOrder(data.steps.filter((s) => s.visible)),
    features: sortByOrder(data.features.filter((f) => f.visible)),
  };
}

export const getPublicCms = createServerFn({ method: "GET" }).handler(async () => {
  const data = await readCms();
  return toPublicCms(data);
});

export const getAdminCms = createServerFn({ method: "GET" }).handler(async () => {
  requireAuth();
  const data = await readCms();
  return {
    ...data,
    categories: sortByOrder(data.categories),
    products: sortByOrder(data.products),
    gallery: sortByOrder(data.gallery),
    faq: sortByOrder(data.faq),
    testimonials: sortByOrder(data.testimonials),
    steps: sortByOrder(data.steps),
    features: sortByOrder(data.features),
  };
});

export const getAuthStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { authenticated: isAuthenticated() };
});

export const loginAdmin = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    if (!verifyPassword(data.password)) {
      throw new Error("Senha incorreta");
    }
    createSession();
    return { ok: true as const };
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  clearSession();
  return { ok: true as const };
});

export const saveContent = createServerFn({ method: "POST" })
  .validator((data: { content: CmsContent }) => data)
  .handler(async ({ data }) => {
    requireAuth();
    return updateCms((cms) => ({ ...cms, content: data.content }));
  });

export const saveSettings = createServerFn({ method: "POST" })
  .validator((data: { settings: CmsSettings }) => data)
  .handler(async ({ data }) => {
    requireAuth();
    return updateCms((cms) => ({ ...cms, settings: data.settings }));
  });

export const upsertCollectionItem = createServerFn({ method: "POST" })
  .validator(
    (data: { collection: CmsCollection; item: Record<string, unknown> }) => data,
  )
  .handler(async ({ data }) => {
    requireAuth();
    return updateCms((cms) => {
      const list = [...(cms[data.collection] as Record<string, unknown>[])];
      const item = { ...data.item };
      const id = typeof item.id === "string" && item.id ? item.id : newId(data.collection.slice(0, 3));
      item.id = id;
      if (typeof item.order !== "number") {
        item.order = list.length;
      }
      if (typeof item.visible !== "boolean") {
        item.visible = true;
      }
      const idx = list.findIndex((row) => row.id === id);
      if (idx >= 0) list[idx] = item;
      else list.push(item);
      return { ...cms, [data.collection]: list } as CmsData;
    });
  });

export const deleteCollectionItem = createServerFn({ method: "POST" })
  .validator((data: { collection: CmsCollection; id: string }) => data)
  .handler(async ({ data }) => {
    requireAuth();
    return updateCms((cms) => {
      const list = (cms[data.collection] as { id: string }[]).filter((row) => row.id !== data.id);
      return { ...cms, [data.collection]: list } as CmsData;
    });
  });

export const toggleCollectionItem = createServerFn({ method: "POST" })
  .validator((data: { collection: CmsCollection; id: string }) => data)
  .handler(async ({ data }) => {
    requireAuth();
    return updateCms((cms) => {
      const list = (cms[data.collection] as { id: string; visible: boolean }[]).map((row) =>
        row.id === data.id ? { ...row, visible: !row.visible } : row,
      );
      return { ...cms, [data.collection]: list } as CmsData;
    });
  });

export const reorderCollection = createServerFn({ method: "POST" })
  .validator((data: { collection: CmsCollection; orderedIds: string[] }) => data)
  .handler(async ({ data }) => {
    requireAuth();
    return updateCms((cms) => {
      const map = new Map(
        (cms[data.collection] as { id: string; order: number }[]).map((row) => [row.id, row]),
      );
      const list = data.orderedIds
        .map((id, order) => {
          const row = map.get(id);
          return row ? { ...row, order } : null;
        })
        .filter(Boolean);
      return { ...cms, [data.collection]: list } as CmsData;
    });
  });

export const resetCmsToSeed = createServerFn({ method: "POST" }).handler(async () => {
  requireAuth();
  return writeCms(createSeedCms());
});

export const uploadCmsImage = createServerFn({ method: "POST" })
  .validator((data: { filename: string; base64: string; mimeType: string }) => data)
  .handler(async ({ data }) => {
    requireAuth();
    await ensureUploadsDir();

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(data.mimeType)) {
      throw new Error("Tipo de imagem não suportado");
    }

    const ext =
      data.mimeType === "image/png"
        ? "png"
        : data.mimeType === "image/webp"
          ? "webp"
          : data.mimeType === "image/gif"
            ? "gif"
            : "jpg";

    const safeBase = data.filename
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 40);
    const filename = `${Date.now()}-${safeBase || "image"}.${ext}`;
    const buffer = Buffer.from(data.base64, "base64");
    if (buffer.byteLength > 5 * 1024 * 1024) {
      throw new Error("Imagem maior que 5MB");
    }

    await writeFile(path.join(UPLOADS_DIR, filename), buffer);
    return { url: `/uploads/${filename}` };
  });
