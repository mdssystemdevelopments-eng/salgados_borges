import { createServerFn } from "@tanstack/react-start";

import {
  assertLoginAllowed,
  clearLoginFailures,
  clearSession,
  createSession,
  isAuthenticated,
  registerLoginFailure,
  requireAuth,
  sleep,
  verifyPassword,
} from "./auth";
import { createSeedCms } from "./seed";
import { withNormalizedSettings } from "./sections";
import { newId, readCms, updateCms, writeCms } from "./store";
import { saveCmsUpload } from "./uploads";
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

function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 6 && buffer.toString("ascii", 0, 3) === "GIF") {
    return "image/gif";
  }
  return null;
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
  .validator((data: { password: string }) => {
    if (!data || typeof data.password !== "string" || data.password.length > 200) {
      throw new Error("Dados invalidos");
    }
    return { password: data.password };
  })
  .handler(async ({ data }) => {
    assertLoginAllowed();
    await sleep(350);
    if (!verifyPassword(data.password)) {
      registerLoginFailure();
      throw new Error("Senha incorreta");
    }
    clearLoginFailures();
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
    return updateCms((cms) => ({
      ...cms,
      settings: withNormalizedSettings(data.settings),
    }));
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
      const current = cms[data.collection] as { id: string; order: number }[];
      const map = new Map(current.map((row) => [row.id, row]));
      const seen = new Set<string>();
      const list: typeof current = [];
      for (const id of data.orderedIds) {
        const row = map.get(id);
        if (row && !seen.has(id)) {
          list.push({ ...row, order: list.length });
          seen.add(id);
        }
      }
      for (const row of current) {
        if (!seen.has(row.id)) {
          list.push({ ...row, order: list.length });
        }
      }
      return { ...cms, [data.collection]: list } as CmsData;
    });
  });

export const resetCmsToSeed = createServerFn({ method: "POST" }).handler(async () => {
  requireAuth();
  return writeCms(createSeedCms());
});

export const uploadCmsImage = createServerFn({ method: "POST" })
  .validator((data: { filename: string; base64: string; mimeType: string }) => {
    if (!data?.base64 || typeof data.base64 !== "string" || data.base64.length > 8_000_000) {
      throw new Error("Arquivo invalido ou muito grande");
    }
    return {
      filename: typeof data.filename === "string" ? data.filename : "upload",
      base64: data.base64.replace(/^data:[^;]+;base64,/, ""),
      mimeType: typeof data.mimeType === "string" ? data.mimeType : "",
    };
  })
  .handler(async ({ data }) => {
    requireAuth();

    const buffer = Buffer.from(data.base64, "base64");
    if (!buffer.byteLength) {
      throw new Error("Arquivo vazio");
    }
    if (buffer.byteLength > 5 * 1024 * 1024) {
      throw new Error("Imagem maior que 5MB");
    }

    const sniffed = sniffImageMime(buffer);
    if (!sniffed) {
      throw new Error("Use JPG, PNG, WEBP ou GIF");
    }

    const saved = await saveCmsUpload(buffer, sniffed);
    return { url: saved.url };
  });
