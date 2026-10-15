import { describe, expect, it } from "vitest";

import { createDefaultOrderSettings } from "@/lib/cms/order-defaults";
import type { CmsProduct } from "@/lib/cms/types";
import { zonedDateTimeToUtcMs } from "@/lib/order/advance";
import { classifyCartScheduleKind, suggestCartSchedule } from "@/lib/order/cart-schedule";
import type { CartLineItem } from "@/lib/order/types";

const TIMEZONE = "America/Sao_Paulo";

function product(id: string, tag: CmsProduct["fulfillmentTag"]): CmsProduct {
  return {
    id,
    name: id,
    description: "",
    price: 10,
    unit: "un",
    categoryId: "cat",
    image: "",
    visible: true,
    order: 0,
    fulfillmentTag: tag,
  };
}

function line(product: CmsProduct, qty = 1): CartLineItem {
  return {
    lineId: `${product.id}-1`,
    product,
    qty,
    prep: null,
    gramOptionId: null,
    selectedFlavorIds: [],
    note: "",
  };
}

describe("cart-schedule", () => {
  it("classifica carrinho so pronta entrega", () => {
    const p = product("a", "pronta_entrega");
    expect(classifyCartScheduleKind([{ productId: "a", qty: 1 }], [p])).toBe("all_ready");
  });

  it("sugere data valida para pronta entrega", () => {
    const settings = createDefaultOrderSettings();
    settings.orderAdvance.timeZone = TIMEZONE;
    const nowMs = zonedDateTimeToUtcMs("2026-08-28", "12:00", TIMEZONE)!;
    const p = product("a", "pronta_entrega");
    const suggestion = suggestCartSchedule([line(p)], [p], settings, nowMs);
    expect(suggestion.kind).toBe("all_ready");
    expect(suggestion.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
