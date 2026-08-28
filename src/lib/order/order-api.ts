import { createServerFn } from "@tanstack/react-start";

import type { OrderAdvanceCheckInput, OrderAdvanceValidationResult } from "@/lib/order/advance";

function parseCartLines(raw: unknown): OrderAdvanceCheckInput["cartLines"] {
  if (!Array.isArray(raw)) return [];
  const lines: OrderAdvanceCheckInput["cartLines"] = [];
  for (const item of raw.slice(0, 50)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const productId = typeof row.productId === "string" ? row.productId.trim().slice(0, 80) : "";
    const qty = Math.max(1, Math.min(999, Math.floor(Number(row.qty) || 1)));
    if (productId) lines.push({ productId, qty });
  }
  return lines;
}

function parseAdvanceInput(data: OrderAdvanceCheckInput): OrderAdvanceCheckInput {
  if (!data?.date || typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error("Data invalida");
  }
  const lines = parseCartLines(data.cartLines);
  if (lines.length === 0) {
    throw new Error("Carrinho invalido");
  }
  return {
    cartLines: lines,
    date: data.date,
    timeSlotId:
      typeof data.timeSlotId === "string" && data.timeSlotId.trim()
        ? data.timeSlotId.trim().slice(0, 80)
        : null,
  };
}

/** Valida antecedência no servidor com produtos e configurações oficiais do CMS. */
export const validateOrderAdvance = createServerFn({ method: "POST" })
  .validator((data: OrderAdvanceCheckInput) => parseAdvanceInput(data))
  .handler(async ({ data }): Promise<OrderAdvanceValidationResult> => {
    const { readCms } = await import("@/lib/cms/store");
    const { validateOrderAdvanceLogic } = await import("@/lib/order/advance");
    const cms = await readCms();
    return validateOrderAdvanceLogic(cms.settings.orderSettings, cms.products, data, {
      nowMs: Date.now(),
      fallbackWhatsapp: cms.settings.whatsapp,
    });
  });
