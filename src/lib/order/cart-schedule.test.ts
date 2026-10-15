import { describe, expect, it } from "vitest";

import { createDefaultOrderSettings } from "@/lib/cms/order-defaults";
import type { CmsProduct } from "@/lib/cms/types";
import { zonedDateTimeToUtcMs } from "@/lib/order/advance";
import {
  classifyCartScheduleKind,
  isCartScheduleSelectionValid,
  suggestCartSchedule,
  validCartTimeSlotsForDate,
} from "@/lib/order/cart-schedule";
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

  it("rejeita data antes de 48h para encomenda", () => {
    const settings = createDefaultOrderSettings();
    settings.orderAdvance.timeZone = TIMEZONE;
    settings.orderAdvance.minimumAdvanceHours = 48;
    const nowMs = zonedDateTimeToUtcMs("2026-08-28", "12:00", TIMEZONE)!;
    const p = product("a", "encomenda_48h");
    const items = [line(p)];
    const tooSoon = "2026-08-29";
    const slotId = settings.schedule.timeSlots.find((s) => s.enabled)?.id ?? null;
    expect(
      isCartScheduleSelectionValid(items, [p], settings, tooSoon, slotId, nowMs),
    ).toBe(false);

    const suggestion = suggestCartSchedule(items, [p], settings, nowMs);
    expect(
      isCartScheduleSelectionValid(
        items,
        [p],
        settings,
        suggestion.date,
        suggestion.timeSlotId,
        nowMs,
      ),
    ).toBe(true);

    const validSlots = validCartTimeSlotsForDate(items, [p], settings, suggestion.date, nowMs);
    expect(validSlots.length).toBeGreaterThan(0);
    expect(tooSoon < suggestion.date || suggestion.date >= tooSoon).toBe(true);
  });
});
