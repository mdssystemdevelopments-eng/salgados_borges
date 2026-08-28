import { describe, expect, it } from "vitest";

import { createDefaultOrderSettings } from "@/lib/cms/order-defaults";
import type { CmsProduct } from "@/lib/cms/types";
import {
  applyAdvancePlaceholders,
  validateOrderAdvanceLogic,
  zonedDateTimeToUtcMs,
} from "@/lib/order/advance";

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

const prontaProduct = product("p1", "pronta_entrega");
const encomendaProduct = product("p2", "sob_encomenda");

function baseSettings() {
  return createDefaultOrderSettings();
}

describe("validateOrderAdvanceLogic", () => {
  const nowMs = zonedDateTimeToUtcMs("2026-08-28", "20:00", TIMEZONE)!;

  it("permite pronta entrega para hoje", () => {
    const result = validateOrderAdvanceLogic(
      baseSettings(),
      [prontaProduct],
      { cartLines: [{ productId: "p1", qty: 1 }], date: "2026-08-28", timeSlotId: null },
      { nowMs },
    );
    expect(result.valid).toBe(true);
  });

  it("bloqueia encomenda com 10 horas de antecedencia", () => {
    const result = validateOrderAdvanceLogic(
      baseSettings(),
      [encomendaProduct],
      { cartLines: [{ productId: "p2", qty: 1 }], date: "2026-08-29", timeSlotId: null },
      { nowMs },
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("ORDER_MINIMUM_ADVANCE_REQUIRED");
    }
  });

  it("permite encomenda com exatamente 48 horas", () => {
    const settings = baseSettings();
    settings.schedule.timeSlots = [
      { id: "t1", label: "20:00", start: "20:00", end: "21:00", enabled: true },
    ];
    const result = validateOrderAdvanceLogic(
      settings,
      [encomendaProduct],
      {
        cartLines: [{ productId: "p2", qty: 1 }],
        date: "2026-08-30",
        timeSlotId: "t1",
      },
      { nowMs },
    );
    expect(result.valid).toBe(true);
  });

  it("bloqueia encomenda com 46 horas (30/08 as 10:00)", () => {
    const settings = baseSettings();
    settings.schedule.timeSlots = [
      { id: "t1", label: "10:00", start: "10:00", end: "12:00", enabled: true },
    ];
    const result = validateOrderAdvanceLogic(
      settings,
      [encomendaProduct],
      {
        cartLines: [{ productId: "p2", qty: 1 }],
        date: "2026-08-30",
        timeSlotId: "t1",
      },
      { nowMs },
    );
    expect(result.valid).toBe(false);
  });

  it("permite encomenda com 72 horas", () => {
    const settings = baseSettings();
    settings.schedule.timeSlots = [
      { id: "t1", label: "20:00", start: "20:00", end: "21:00", enabled: true },
    ];
    const result = validateOrderAdvanceLogic(
      settings,
      [encomendaProduct],
      {
        cartLines: [{ productId: "p2", qty: 1 }],
        date: "2026-08-31",
        timeSlotId: "t1",
      },
      { nowMs },
    );
    expect(result.valid).toBe(true);
  });

  it("aplica nova antecedencia configurada pelo administrador", () => {
    const settings = baseSettings();
    settings.orderAdvance.minimumAdvanceHours = 72;
    settings.schedule.timeSlots = [
      { id: "t1", label: "20:00", start: "20:00", end: "21:00", enabled: true },
    ];
    const blocked = validateOrderAdvanceLogic(
      settings,
      [encomendaProduct],
      {
        cartLines: [{ productId: "p2", qty: 1 }],
        date: "2026-08-30",
        timeSlotId: "t1",
      },
      { nowMs },
    );
    expect(blocked.valid).toBe(false);

    const allowed = validateOrderAdvanceLogic(
      settings,
      [encomendaProduct],
      {
        cartLines: [{ productId: "p2", qty: 1 }],
        date: "2026-08-31",
        timeSlotId: "t1",
      },
      { nowMs },
    );
    expect(allowed.valid).toBe(true);
  });

  it("nao bloqueia quando a regra esta desativada", () => {
    const settings = baseSettings();
    settings.orderAdvance.enabled = false;
    const result = validateOrderAdvanceLogic(
      settings,
      [encomendaProduct],
      { cartLines: [{ productId: "p2", qty: 1 }], date: "2026-08-28", timeSlotId: null },
      { nowMs },
    );
    expect(result.valid).toBe(true);
  });
});

describe("applyAdvancePlaceholders", () => {
  it("substitui placeholders nas mensagens", () => {
    const text =
      "Pedidos precisam de {{minimumHours}} horas. Voce selecionou {{selectedDate}} as {{selectedTime}}.";
    expect(
      applyAdvancePlaceholders(text, {
        minimumHours: 48,
        selectedDate: "30/08/2026",
        selectedTime: "20:00",
      }),
    ).toBe("Pedidos precisam de 48 horas. Voce selecionou 30/08/2026 as 20:00.");
  });
});
