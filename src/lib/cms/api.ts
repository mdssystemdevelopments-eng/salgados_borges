import { createServerFn } from "@tanstack/react-start";

import { invalidatePublicCmsCache } from "./public-cache";
import type {
  CmsCollection,
  CmsContent,
  CmsData,
  CmsOrderSettings,
  CmsSettings,
} from "./types";

export { getPublicCms } from "./public-api";
export { redeemCoupon, validateCoupon } from "./coupon-api";

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
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

export const getAdminCms = createServerFn({ method: "GET" }).handler(async () => {
  const { assertAdminHost } = await import("./admin-host.server");
  const { requireAuth } = await import("./auth");
  const { readCms } = await import("./store");
  assertAdminHost();
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
    coupons: sortByOrder(data.coupons),
  };
});

export const getAuthStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { assertAdminHost } = await import("./admin-host.server");
  const { isAuthenticated } = await import("./auth");
  assertAdminHost();
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
    const { assertAdminHost } = await import("./admin-host.server");
    const {
      assertLoginAllowed,
      clearLoginFailures,
      createSession,
      registerLoginFailure,
      sleep,
      verifyPassword,
    } = await import("./auth");
    assertAdminHost();
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
  const { assertAdminHost } = await import("./admin-host.server");
  const { clearSession } = await import("./auth");
  assertAdminHost();
  clearSession();
  return { ok: true as const };
});

export const saveContent = createServerFn({ method: "POST" })
  .validator((data: { content: CmsContent }) => data)
  .handler(async ({ data }) => {
    const { requireAuth } = await import("./auth");
    const { updateCms } = await import("./store");
    requireAuth();
    invalidatePublicCmsCache();
    return updateCms((cms) => ({ ...cms, content: data.content }));
  });

export const saveSettings = createServerFn({ method: "POST" })
  .validator((data: { settings: CmsSettings }) => data)
  .handler(async ({ data }) => {
    const { requireAuth } = await import("./auth");
    const { updateCms } = await import("./store");
    const { withNormalizedSettings } = await import("./sections");
    requireAuth();
    invalidatePublicCmsCache();
    return updateCms((cms) => ({
      ...cms,
      settings: withNormalizedSettings(data.settings),
    }));
  });

export const saveOrderSettings = createServerFn({ method: "POST" })
  .validator((data: { orderSettings: CmsOrderSettings }) => data)
  .handler(async ({ data }) => {
    const { requireAuth } = await import("./auth");
    const { updateCms } = await import("./store");
    const { withNormalizedSettings } = await import("./sections");
    requireAuth();
    invalidatePublicCmsCache();
    return updateCms((cms) => ({
      ...cms,
      settings: withNormalizedSettings({
        ...cms.settings,
        orderSettings: data.orderSettings,
      }),
    }));
  });

export const upsertCollectionItem = createServerFn({ method: "POST" })
  .validator(
    (data: { collection: CmsCollection; item: Record<string, unknown> }) => data,
  )
  .handler(async ({ data }) => {
    const { requireAuth } = await import("./auth");
    const { newId, updateCms } = await import("./store");
    requireAuth();
    invalidatePublicCmsCache();
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
      if (idx >= 0) {
        const existing = list[idx] as Record<string, unknown>;
        if (data.collection === "coupons") {
          if (item.quantityUsed == null) item.quantityUsed = existing.quantityUsed ?? 0;
          if (!Array.isArray(item.redemptions)) item.redemptions = existing.redemptions ?? [];
        }
        list[idx] = item;
      } else list.push(item);
      return { ...cms, [data.collection]: list } as CmsData;
    });
  });

export const deleteCollectionItem = createServerFn({ method: "POST" })
  .validator((data: { collection: CmsCollection; id: string }) => data)
  .handler(async ({ data }) => {
    const { requireAuth } = await import("./auth");
    const { updateCms } = await import("./store");
    requireAuth();
    invalidatePublicCmsCache();
    return updateCms((cms) => {
      const list = (cms[data.collection] as { id: string }[]).filter((row) => row.id !== data.id);
      return { ...cms, [data.collection]: list } as CmsData;
    });
  });

export const toggleCollectionItem = createServerFn({ method: "POST" })
  .validator((data: { collection: CmsCollection; id: string }) => data)
  .handler(async ({ data }) => {
    const { requireAuth } = await import("./auth");
    const { updateCms } = await import("./store");
    requireAuth();
    invalidatePublicCmsCache();
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
    const { requireAuth } = await import("./auth");
    const { updateCms } = await import("./store");
    requireAuth();
    invalidatePublicCmsCache();
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
  const { requireAuth } = await import("./auth");
  const { writeCms } = await import("./store");
  const { createSeedCms } = await import("./seed");
  requireAuth();
  invalidatePublicCmsCache();
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
    const { requireAuth } = await import("./auth");
    const { saveCmsUpload } = await import("./uploads");
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
