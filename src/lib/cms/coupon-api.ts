import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";

import type { ValidateCouponInput } from "./coupon-logic";
import type { CouponValidationResult } from "./types";
import { normalizeCouponPhone } from "./coupon-logic";

const COUPON_WINDOW_MS = 15 * 60 * 1000;
const COUPON_VALIDATE_MAX = 24;
const COUPON_REDEEM_MAX = 6;

const couponAttempts = new Map<string, { validate: number; redeem: number; firstAt: number }>();

function clientKey(): string {
  return getRequestIP({ xForwardedFor: true }) || "unknown";
}

function assertCouponAllowed(kind: "validate" | "redeem"): void {
  const key = clientKey();
  const now = Date.now();
  const entry = couponAttempts.get(key);
  if (!entry || now - entry.firstAt > COUPON_WINDOW_MS) {
    couponAttempts.set(key, { validate: 0, redeem: 0, firstAt: now });
    return;
  }
  const limit = kind === "validate" ? COUPON_VALIDATE_MAX : COUPON_REDEEM_MAX;
  const count = kind === "validate" ? entry.validate : entry.redeem;
  if (count >= limit) {
    throw new Error("Muitas tentativas. Aguarde alguns minutos.");
  }
}

function registerCouponAttempt(kind: "validate" | "redeem"): void {
  const key = clientKey();
  const now = Date.now();
  const entry = couponAttempts.get(key);
  if (!entry || now - entry.firstAt > COUPON_WINDOW_MS) {
    couponAttempts.set(key, {
      validate: kind === "validate" ? 1 : 0,
      redeem: kind === "redeem" ? 1 : 0,
      firstAt: now,
    });
    return;
  }
  if (kind === "validate") entry.validate += 1;
  else entry.redeem += 1;
}

class CouponRedeemError extends Error {
  result: CouponValidationResult;

  constructor(result: CouponValidationResult) {
    super("coupon_redeem_blocked");
    this.result = result;
  }
}

function parseCartLines(raw: unknown): { productId: string; qty: number }[] {
  if (!Array.isArray(raw)) return [];
  const lines: { productId: string; qty: number }[] = [];
  for (const item of raw.slice(0, 50)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const productId = typeof row.productId === "string" ? row.productId.trim().slice(0, 80) : "";
    const qty = Math.max(1, Math.min(999, Math.floor(Number(row.qty) || 1)));
    if (productId) lines.push({ productId, qty });
  }
  return lines;
}

function parseValidateInput(data: ValidateCouponInput): ValidateCouponInput {
  if (!data?.code || typeof data.code !== "string" || data.code.length > 40) {
    throw new Error("Cupom invalido");
  }
  const customerPhone =
    typeof data.customerPhone === "string" && data.customerPhone.trim()
      ? data.customerPhone.trim()
      : undefined;
  return {
    code: data.code,
    subtotal: Math.max(0, Number(data.subtotal) || 0),
    cartProductIds: Array.isArray(data.cartProductIds) ? data.cartProductIds : [],
    cartCategoryIds: Array.isArray(data.cartCategoryIds) ? data.cartCategoryIds : [],
    cartLines: parseCartLines(data.cartLines),
    customerPhone,
  };
}

async function withTrustedCartInput(
  data: ValidateCouponInput,
  requireLines: boolean,
): Promise<ValidateCouponInput> {
  const lines = data.cartLines ?? [];
  if (requireLines && lines.length === 0) {
    throw new Error("Carrinho invalido");
  }
  if (lines.length === 0) return data;

  const { readCms } = await import("./store");
  const { cartMetaFromLines } = await import("./coupon-logic");
  const cms = await readCms();
  const meta = cartMetaFromLines(cms.products, lines);
  return {
    ...data,
    subtotal: meta.subtotal,
    cartProductIds: meta.cartProductIds,
    cartCategoryIds: meta.cartCategoryIds,
  };
}

function parseRedeemInput(data: ValidateCouponInput): ValidateCouponInput {
  const parsed = parseValidateInput(data);
  const phone = parsed.customerPhone ? normalizeCouponPhone(parsed.customerPhone) : "";
  if (phone.length < 10) {
    throw new Error("Telefone invalido");
  }
  return parsed;
}

function couponTexts(cms: {
  settings: {
    orderSettings: {
      checkoutTexts: {
        couponInvalid: string;
        couponExpired: string;
        couponExhausted: string;
        couponAlreadyUsed: string;
        couponMinOrder: string;
      };
    };
  };
}) {
  const texts = cms.settings.orderSettings.checkoutTexts;
  return {
    couponInvalid: texts.couponInvalid,
    couponExpired: texts.couponExpired,
    couponExhausted: texts.couponExhausted,
    couponAlreadyUsed: texts.couponAlreadyUsed,
    couponMinOrder: texts.couponMinOrder,
  };
}

/** Validacao de cupom no servidor — importavel pelo checkout sem puxar auth/store no cliente. */
export const validateCoupon = createServerFn({ method: "POST" })
  .validator((data: ValidateCouponInput) => parseValidateInput(data))
  .handler(async ({ data }) => {
    assertCouponAllowed("validate");
    registerCouponAttempt("validate");
    const trusted = await withTrustedCartInput(data, false);
    const { readCms } = await import("./store");
    const { validateCouponLogic } = await import("./coupon-logic");
    const cms = await readCms();
    return validateCouponLogic(cms.coupons, trusted, couponTexts(cms));
  });

export const redeemCoupon = createServerFn({ method: "POST" })
  .validator((data: ValidateCouponInput) => parseRedeemInput(data))
  .handler(async ({ data }) => {
    assertCouponAllowed("redeem");
    registerCouponAttempt("redeem");
    const trusted = await withTrustedCartInput(data, true);
    const { updateCms } = await import("./store");
    const { normalizeCouponPhone, validateCouponLogic } = await import("./coupon-logic");
    const { invalidatePublicCmsCache } = await import("./public-cache");

    const phone = normalizeCouponPhone(data.customerPhone ?? "");
    const redeemedAt = new Date().toISOString();
    let successResult: Extract<CouponValidationResult, { valid: true }> | null = null;

    try {
      await updateCms((current) => {
        const texts = couponTexts(current);
        const result = validateCouponLogic(current.coupons, trusted, texts);
        if (!result.valid) {
          throw new CouponRedeemError(result);
        }

        successResult = result;
        return {
          ...current,
          coupons: current.coupons.map((c) => {
            if (c.id !== result.couponId) return c;
            return {
              ...c,
              quantityUsed: c.quantityUsed + 1,
              redemptions: [...(c.redemptions ?? []), { phone, redeemedAt }],
            };
          }),
        };
      });
    } catch (error) {
      if (error instanceof CouponRedeemError) {
        return error.result;
      }
      throw error;
    }

    invalidatePublicCmsCache();
    return successResult!;
  });
