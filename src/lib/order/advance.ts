import type {
  CmsOrderAdvanceSettings,
  CmsOrderSettings,
  CmsProduct,
  CmsTimeSlot,
} from "@/lib/cms/types";

export type OrderAdvanceCartLine = {
  productId: string;
  qty: number;
};

export type OrderAdvanceCheckInput = {
  cartLines: OrderAdvanceCartLine[];
  date: string;
  timeSlotId: string | null;
};

export type OrderAdvancePlaceholderContext = {
  minimumHours: number;
  selectedDate: string;
  selectedTime: string;
};

export type OrderAdvanceModalContent = {
  title: string;
  message: string;
  description: string;
  whatsappEnabled: boolean;
  whatsappButtonText: string;
  whatsappUrl: string | null;
  changeOrderEnabled: boolean;
  changeOrderButtonText: string;
};

export type OrderAdvanceValidationResult =
  | { valid: true }
  | {
      valid: false;
      code: "ORDER_MINIMUM_ADVANCE_REQUIRED";
      message: string;
      modal: OrderAdvanceModalContent;
    };

const MS_PER_HOUR = 60 * 60 * 1000;

export function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function applyAdvancePlaceholders(
  template: string,
  ctx: OrderAdvancePlaceholderContext,
): string {
  return template
    .replace(/\{\{minimumHours\}\}/g, String(ctx.minimumHours))
    .replace(/\{\{selectedDate\}\}/g, ctx.selectedDate)
    .replace(/\{\{selectedTime\}\}/g, ctx.selectedTime);
}

/** Pedido exige antecedência quando algum item não é pronta entrega. */
export function cartRequiresAdvanceNotice(
  cartLines: OrderAdvanceCartLine[],
  products: CmsProduct[],
): boolean {
  if (cartLines.length === 0) return false;
  const map = new Map(products.map((p) => [p.id, p]));
  for (const line of cartLines) {
    const product = map.get(line.productId);
    if (!product) continue;
    if (product.fulfillmentTag !== "pronta_entrega") return true;
  }
  return false;
}

/** Horas mínimas conforme a etiqueta mais exigente do carrinho. */
export function minimumAdvanceHoursForCart(
  cartLines: OrderAdvanceCartLine[],
  products: CmsProduct[],
  advance: CmsOrderAdvanceSettings,
): number {
  if (!advance.enabled || !cartRequiresAdvanceNotice(cartLines, products)) return 0;

  let hours = advance.minimumAdvanceHours;
  const map = new Map(products.map((p) => [p.id, p]));

  for (const line of cartLines) {
    const tag = map.get(line.productId)?.fulfillmentTag;
    if (!tag || tag === "pronta_entrega") continue;
    if (tag === "encomenda_24h") hours = Math.max(hours, 24);
    else if (tag === "encomenda_48h") hours = Math.max(hours, 48);
    else hours = Math.max(hours, advance.minimumAdvanceHours);
  }

  return hours;
}

function getTimezoneOffsetMs(utcMs: number, timeZone: string): number {
  const date = new Date(utcMs);
  const utcParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const pick = (parts: Intl.DateTimeFormatPart[]) => {
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
  };
  return pick(tzParts) - pick(utcParts);
}

/** Converte data/hora local da loja para timestamp UTC. */
export function zonedDateTimeToUtcMs(
  dateIso: string,
  timeHHMM: string,
  timeZone: string,
): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  if (!/^\d{2}:\d{2}$/.test(timeHHMM)) return null;

  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = timeHHMM.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offsetMs = getTimezoneOffsetMs(utcGuess, timeZone);
  let utcMs = utcGuess - offsetMs;

  // Refina o offset (DST pode mudar entre o chute e o instante final).
  const refinedOffset = getTimezoneOffsetMs(utcMs, timeZone);
  if (refinedOffset !== offsetMs) {
    utcMs = utcGuess - refinedOffset;
  }

  return utcMs;
}

export function resolveTimeSlotStart(
  timeSlotId: string | null,
  schedule: CmsOrderSettings["schedule"],
): string {
  if (timeSlotId) {
    const slot = schedule.timeSlots.find((s) => s.id === timeSlotId && s.enabled);
    if (slot?.start) return slot.start;
  }
  const first = schedule.timeSlots.find((s) => s.enabled);
  return first?.start ?? "08:00";
}

export function resolveSelectedTimeLabel(
  timeSlotId: string | null,
  timeSlots: CmsTimeSlot[],
  fallbackStart: string,
): string {
  if (timeSlotId) {
    const slot = timeSlots.find((s) => s.id === timeSlotId);
    if (slot) return slot.label;
  }
  return fallbackStart;
}

function buildWhatsappUrl(
  advance: CmsOrderAdvanceSettings,
  fallbackWhatsapp: string,
  message: string,
): string | null {
  const raw = (advance.whatsappNumber.trim() || fallbackWhatsapp).replace(/\D/g, "");
  if (raw.length < 10) return null;
  return `https://wa.me/${raw}?text=${encodeURIComponent(message)}`;
}

export function buildAdvanceModalContent(
  advance: CmsOrderAdvanceSettings,
  fallbackWhatsapp: string,
  ctx: OrderAdvancePlaceholderContext,
): OrderAdvanceModalContent {
  const placeholders = {
    minimumHours: advance.minimumAdvanceHours,
    selectedDate: ctx.selectedDate,
    selectedTime: ctx.selectedTime,
  };
  const waMessage = applyAdvancePlaceholders(advance.whatsappMessage, placeholders);

  return {
    title: applyAdvancePlaceholders(advance.warningTitle, placeholders),
    message: applyAdvancePlaceholders(advance.warningMessage, placeholders),
    description: applyAdvancePlaceholders(advance.warningDescription, placeholders),
    whatsappEnabled: advance.whatsappEnabled,
    whatsappButtonText: applyAdvancePlaceholders(advance.whatsappButtonText, placeholders),
    whatsappUrl: advance.whatsappEnabled
      ? buildWhatsappUrl(advance, fallbackWhatsapp, waMessage)
      : null,
    changeOrderEnabled: advance.changeOrderEnabled,
    changeOrderButtonText: applyAdvancePlaceholders(advance.changeOrderButtonText, placeholders),
  };
}

export function validateOrderAdvanceLogic(
  orderSettings: CmsOrderSettings,
  products: CmsProduct[],
  input: OrderAdvanceCheckInput,
  options?: {
    nowMs?: number;
    fallbackWhatsapp?: string;
  },
): OrderAdvanceValidationResult {
  const advance = orderSettings.orderAdvance;
  const nowMs = options?.nowMs ?? Date.now();
  const fallbackWhatsapp = options?.fallbackWhatsapp ?? "";

  if (!advance.enabled) {
    return { valid: true };
  }

  const cartLines = input.cartLines.filter(
    (line) => line.productId && Number.isFinite(line.qty) && line.qty > 0,
  );
  if (!cartRequiresAdvanceNotice(cartLines, products)) {
    return { valid: true };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return {
      valid: false,
      code: "ORDER_MINIMUM_ADVANCE_REQUIRED",
      message: "Data do pedido inválida.",
      modal: buildAdvanceModalContent(advance, fallbackWhatsapp, {
        minimumHours: advance.minimumAdvanceHours,
        selectedDate: input.date,
        selectedTime: "",
      }),
    };
  }

  const slotStart = resolveTimeSlotStart(input.timeSlotId, orderSettings.schedule);
  const selectedUtcMs = zonedDateTimeToUtcMs(input.date, slotStart, advance.timeZone);
  if (selectedUtcMs == null) {
    return {
      valid: false,
      code: "ORDER_MINIMUM_ADVANCE_REQUIRED",
      message: "Data ou horário do pedido inválido.",
      modal: buildAdvanceModalContent(advance, fallbackWhatsapp, {
        minimumHours: advance.minimumAdvanceHours,
        selectedDate: formatDateBr(input.date),
        selectedTime: slotStart,
      }),
    };
  }

  const minimumHours = minimumAdvanceHoursForCart(cartLines, products, advance);
  const minimumUtcMs = nowMs + minimumHours * MS_PER_HOUR;
  if (selectedUtcMs < minimumUtcMs) {
    const selectedTime = resolveSelectedTimeLabel(
      input.timeSlotId,
      orderSettings.schedule.timeSlots,
      slotStart,
    );
    const ctx: OrderAdvancePlaceholderContext = {
      minimumHours,
      selectedDate: formatDateBr(input.date),
      selectedTime,
    };
    return {
      valid: false,
      code: "ORDER_MINIMUM_ADVANCE_REQUIRED",
      message: "Este pedido precisa ser realizado com antecedência mínima.",
      modal: buildAdvanceModalContent(advance, fallbackWhatsapp, ctx),
    };
  }

  return { valid: true };
}

export function toAdvanceCartLines(
  items: { product: { id: string }; qty: number }[],
): OrderAdvanceCartLine[] {
  return items.map((item) => ({ productId: item.product.id, qty: item.qty }));
}
