import type { CmsOrderSettings, CmsProduct, ProductFulfillmentTag } from "@/lib/cms/types";
import {
  cartRequiresAdvanceNotice,
  toAdvanceCartLines,
  validateOrderAdvanceLogic,
  type OrderAdvanceCartLine,
} from "@/lib/order/advance";
import {
  availableTimeSlots,
  formatIsoDate,
  isDateAvailable,
  minSelectableDate,
  parseIsoDate,
} from "@/lib/order/schedule";
import type { CartLineItem } from "@/lib/order/types";

export type CartScheduleKind = "all_ready" | "needs_prep" | "mixed";

export type CartScheduleSuggestion = {
  date: string;
  timeSlotId: string | null;
  kind: CartScheduleKind;
};

function addDaysIso(iso: string, days: number): string {
  const base = parseIsoDate(iso);
  if (!base) return iso;
  base.setDate(base.getDate() + days);
  return formatIsoDate(base);
}

export function classifyCartScheduleKind(
  cartLines: OrderAdvanceCartLine[],
  products: CmsProduct[],
): CartScheduleKind {
  if (cartLines.length === 0) return "all_ready";
  const map = new Map(products.map((p) => [p.id, p]));
  let ready = 0;
  let prep = 0;
  for (const line of cartLines) {
    const tag = map.get(line.productId)?.fulfillmentTag ?? null;
    if (!tag || tag === "pronta_entrega") ready += 1;
    else prep += 1;
  }
  if (prep === 0) return "all_ready";
  if (ready === 0) return "needs_prep";
  return "mixed";
}

/** Primeira data e horário válidos para o carrinho atual. */
export function suggestCartSchedule(
  items: CartLineItem[],
  products: CmsProduct[],
  orderSettings: CmsOrderSettings,
  nowMs = Date.now(),
): CartScheduleSuggestion {
  const schedule = orderSettings.schedule;
  const cartLines = toAdvanceCartLines(items);
  const kind = classifyCartScheduleKind(cartLines, products);
  const slots = availableTimeSlots(schedule);
  const slotIds = slots.length > 0 ? slots.map((s) => s.id) : [null];

  let cursor = minSelectableDate(schedule);
  const maxDate = addDaysIso(cursor, 90);

  while (cursor <= maxDate) {
    if (isDateAvailable(cursor, schedule)) {
      for (const slotId of slotIds) {
        const result = validateOrderAdvanceLogic(
          orderSettings,
          products,
          { cartLines, date: cursor, timeSlotId: slotId },
          { nowMs },
        );
        if (result.valid) {
          return { date: cursor, timeSlotId: slotId, kind };
        }
      }
    }
    cursor = addDaysIso(cursor, 1);
  }

  return {
    date: minSelectableDate(schedule),
    timeSlotId: slots[0]?.id ?? null,
    kind,
  };
}

export function scheduleNoticeForKind(
  kind: CartScheduleKind,
  texts: CmsOrderSettings["checkoutTexts"],
): string {
  if (kind === "all_ready") return texts.scheduleSuggestNoticeAllReady;
  if (kind === "needs_prep") return texts.scheduleSuggestNoticeWithPrep;
  return texts.scheduleSuggestNoticeMixed;
}

export function cartHasScheduleConstraints(
  items: CartLineItem[],
  products: CmsProduct[],
): boolean {
  return cartRequiresAdvanceNotice(toAdvanceCartLines(items), products);
}

export function strictestFulfillmentLabel(
  items: CartLineItem[],
  products: CmsProduct[],
  labels: Record<ProductFulfillmentTag, string>,
): string | null {
  const map = new Map(products.map((p) => [p.id, p]));
  const priority: ProductFulfillmentTag[] = [
    "encomenda_48h",
    "encomenda_24h",
    "sob_encomenda",
    "apenas_retirada",
    "pronta_entrega",
  ];
  let found: ProductFulfillmentTag | null = null;
  for (const line of items) {
    const tag = map.get(line.product.id)?.fulfillmentTag;
    if (!tag || tag === "pronta_entrega") continue;
    if (!found || priority.indexOf(tag) < priority.indexOf(found)) {
      found = tag;
    }
  }
  return found ? labels[found] : null;
}
