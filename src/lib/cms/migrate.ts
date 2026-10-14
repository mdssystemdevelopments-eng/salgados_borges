import {
  createDefaultCheckoutTexts,
  createDefaultOrderAdvanceSettings,
  createDefaultOrderSettings,
  createDefaultPaymentMethods,
  createSampleCoupons,
  DEFAULT_PREP_METHODS,
} from "./order-defaults";
import { normalizeFlavorVariation } from "./flavor-variation";
import { normalizeGramVariation, resolveProductUnitPrice } from "./gram-variation";
import type {
  CmsCheckoutTexts,
  CmsCoupon,
  CmsData,
  CmsOrderAdvanceSettings,
  CmsOrderSettings,
  CmsPaymentMethod,
  CmsProduct,
  CmsSettings,
  PrepMethod,
  ProductFulfillmentTag,
  CmsMenuLink,
} from "./types";

const VALID_FULFILLMENT_TAGS = new Set<ProductFulfillmentTag>([
  "pronta_entrega",
  "sob_encomenda",
  "encomenda_24h",
  "encomenda_48h",
  "apenas_retirada",
]);

function normalizeFulfillmentTag(raw: unknown): ProductFulfillmentTag | null {
  if (typeof raw !== "string" || !VALID_FULFILLMENT_TAGS.has(raw as ProductFulfillmentTag)) {
    return null;
  }
  return raw as ProductFulfillmentTag;
}

function defaultPrepForCategory(categoryId: string): PrepMethod[] {
  if (categoryId === "assados") return ["congelado", "assado"];
  if (categoryId === "fritos" || categoryId === "mini") return ["congelado", "frito"];
  return [...DEFAULT_PREP_METHODS];
}

export function normalizeProduct(raw: Partial<CmsProduct> & Pick<CmsProduct, "id">): CmsProduct {
  const price = Number(raw.price) || 0;
  const promo = raw.promoPrice != null ? Number(raw.promoPrice) : null;
  return {
    id: raw.id,
    name: raw.name ?? "",
    description: raw.description ?? "",
    price,
    promoPrice: promo != null && Number.isFinite(promo) ? promo : null,
    unit: raw.unit ?? "un",
    categoryId: raw.categoryId ?? "",
    image: raw.image ?? "",
    visible: raw.visible !== false,
    order: typeof raw.order === "number" ? raw.order : 0,
    featured: Boolean(raw.featured),
    minQty: Math.max(1, Number(raw.minQty) || 1),
    maxQty: raw.maxQty != null ? Math.max(1, Number(raw.maxQty)) : null,
    available: raw.available !== false,
    prepMethods:
      Array.isArray(raw.prepMethods) && raw.prepMethods.length > 0
        ? raw.prepMethods.filter(
            (m): m is PrepMethod => m === "congelado" || m === "frito" || m === "assado",
          )
        : defaultPrepForCategory(raw.categoryId ?? ""),
    fulfillmentTag: normalizeFulfillmentTag(raw.fulfillmentTag),
    gramVariation: normalizeGramVariation(raw.gramVariation, price),
    flavorVariation: normalizeFlavorVariation(raw.flavorVariation),
    notes: raw.notes ?? "",
    extraInfo: raw.extraInfo ?? "",
  };
}

export function getEffectiveProductPrice(
  product: CmsProduct,
  gramOptionId?: string | null,
): number {
  return resolveProductUnitPrice(product, gramOptionId);
}

const LEGACY_BTN_SEND_WHATSAPP = "Enviar pedido pelo WhatsApp";

function mergeCheckoutTexts(partial?: Partial<CmsCheckoutTexts>): CmsCheckoutTexts {
  const merged = { ...createDefaultCheckoutTexts(), ...partial };
  if (merged.btnSendWhatsapp === LEGACY_BTN_SEND_WHATSAPP) {
    merged.btnSendWhatsapp = createDefaultCheckoutTexts().btnSendWhatsapp;
  }
  return merged;
}

function mergePaymentMethods(methods?: CmsPaymentMethod[]): CmsPaymentMethod[] {
  const defaults = createDefaultPaymentMethods();
  if (!methods?.length) return defaults;
  const map = new Map(methods.map((m) => [m.id, m]));
  return defaults.map((d) => ({ ...d, ...map.get(d.id) }));
}

function normalizeOrderAdvance(partial?: Partial<CmsOrderAdvanceSettings>): CmsOrderAdvanceSettings {
  const base = createDefaultOrderAdvanceSettings();
  if (!partial) return base;
  const hours = Number(partial.minimumAdvanceHours);
  return {
    ...base,
    ...partial,
    enabled: partial.enabled ?? base.enabled,
    minimumAdvanceHours: Number.isFinite(hours)
      ? Math.max(1, Math.min(720, Math.round(hours)))
      : base.minimumAdvanceHours,
    timeZone:
      typeof partial.timeZone === "string" && partial.timeZone.trim()
        ? partial.timeZone.trim()
        : base.timeZone,
    warningTitle: partial.warningTitle ?? base.warningTitle,
    warningMessage: partial.warningMessage ?? base.warningMessage,
    warningDescription: partial.warningDescription ?? base.warningDescription,
    whatsappEnabled: partial.whatsappEnabled ?? base.whatsappEnabled,
    whatsappButtonText: partial.whatsappButtonText ?? base.whatsappButtonText,
    whatsappMessage: partial.whatsappMessage ?? base.whatsappMessage,
    whatsappNumber: partial.whatsappNumber ?? base.whatsappNumber,
    changeOrderEnabled: partial.changeOrderEnabled ?? base.changeOrderEnabled,
    changeOrderButtonText: partial.changeOrderButtonText ?? base.changeOrderButtonText,
  };
}

export function normalizeOrderSettings(partial?: Partial<CmsOrderSettings>): CmsOrderSettings {
  const base = createDefaultOrderSettings();
  if (!partial) return base;
  return {
    enabled: partial.enabled ?? base.enabled,
    allowDelivery: partial.allowDelivery ?? base.allowDelivery,
    allowPickup: partial.allowPickup ?? base.allowPickup,
    delivery: { ...base.delivery, ...partial.delivery },
    pickup: { ...base.pickup, ...partial.pickup },
    schedule: {
      ...base.schedule,
      ...partial.schedule,
      timeSlots: partial.schedule?.timeSlots?.length
        ? partial.schedule.timeSlots
        : base.schedule.timeSlots,
      availableWeekdays: partial.schedule?.availableWeekdays?.length
        ? partial.schedule.availableWeekdays
        : base.schedule.availableWeekdays,
      blockedDates: partial.schedule?.blockedDates ?? base.schedule.blockedDates,
      blockedTimeSlotIds: partial.schedule?.blockedTimeSlotIds ?? base.schedule.blockedTimeSlotIds,
    },
    paymentMethods: mergePaymentMethods(partial.paymentMethods),
    checkoutTexts: mergeCheckoutTexts(partial.checkoutTexts),
    orderAdvance: normalizeOrderAdvance(partial.orderAdvance),
  };
}

function normalizeCoupon(raw: Partial<CmsCoupon> & { id: string }): CmsCoupon {
  const quantityAvailable = Math.max(1, Number(raw.quantityAvailable) || 1);
  const quantityUsed = Math.max(0, Number(raw.quantityUsed) || 0);
  const limitRaw = raw.limitPerCustomer;
  const limitPerCustomer =
    limitRaw == null || limitRaw === ("" as unknown as null)
      ? null
      : Math.max(1, Number(limitRaw) || 1);

  return {
    id: raw.id,
    code: (raw.code ?? "").trim().toUpperCase(),
    description: raw.description ?? "",
    discountType: raw.discountType === "fixed" ? "fixed" : "percent",
    discountValue: Math.max(0, Number(raw.discountValue) || 0),
    quantityAvailable: Math.max(quantityUsed, quantityAvailable),
    quantityUsed,
    limitPerCustomer,
    minOrderValue: Math.max(0, Number(raw.minOrderValue) || 0),
    startsAt: raw.startsAt ?? null,
    endsAt: raw.endsAt ?? null,
    productIds: Array.isArray(raw.productIds) ? raw.productIds : [],
    categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds : [],
    active: raw.active !== false,
    visible: raw.visible !== false,
    order: typeof raw.order === "number" ? raw.order : 0,
    redemptions: Array.isArray(raw.redemptions)
      ? raw.redemptions
          .filter((entry) => entry && typeof entry.phone === "string")
          .map((entry) => ({
            phone: entry.phone.replace(/\D/g, ""),
            redeemedAt: entry.redeemedAt ?? new Date().toISOString(),
          }))
          .filter((entry) => entry.phone.length >= 10)
      : [],
  };
}

export function normalizeSettings(settings: CmsSettings): CmsSettings {
  return {
    ...settings,
    orderSettings: normalizeOrderSettings(settings.orderSettings),
  };
}

function normalizeMenuLink(raw: Partial<CmsMenuLink> & Pick<CmsMenuLink, "id">): CmsMenuLink {
  const slug = (raw.slug ?? raw.id ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return {
    id: raw.id,
    slug: slug || raw.id,
    title: raw.title ?? "Cardápio",
    subtitle: raw.subtitle ?? "",
    active: raw.active !== false,
    categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds : [],
    productIds: Array.isArray(raw.productIds) ? raw.productIds : [],
    showPrices: raw.showPrices !== false,
    allowOrders: raw.allowOrders !== false,
    order: typeof raw.order === "number" ? raw.order : 0,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

/** Migra CMS antigo para o schema atual sem perder dados. */
export function migrateCmsData(data: CmsData): CmsData {
  const coupons =
    Array.isArray(data.coupons) && data.coupons.length > 0
      ? data.coupons.map((c) => normalizeCoupon(c))
      : createSampleCoupons();

  const menuLinks = Array.isArray(data.menuLinks)
    ? data.menuLinks.map((link) => normalizeMenuLink(link))
    : [];

  return {
    ...data,
    version: Math.max(data.version ?? 1, 2),
    products: (data.products ?? []).map((p) => normalizeProduct(p)),
    coupons,
    menuLinks,
    settings: normalizeSettings({
      ...data.settings,
      orderSettings: data.settings?.orderSettings ?? createDefaultOrderSettings(),
    }),
  };
}
