import type { CmsCoupon, CmsProduct, CouponValidationResult } from "./types";
import { getEffectiveProductPrice } from "./migrate";

export type ValidateCouponInput = {
  code: string;
  subtotal: number;
  cartProductIds: string[];
  cartCategoryIds: string[];
  cartLines?: { productId: string; qty: number }[];
  /** Telefone do cliente (para limite por pessoa). */
  customerPhone?: string;
};

export type CouponValidationTexts = {
  couponInvalid: string;
  couponExpired: string;
  couponExhausted: string;
  couponAlreadyUsed: string;
  couponMinOrder: string;
};

export function normalizeCouponPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function couponAppliesToCart(
  coupon: CmsCoupon,
  cartProductIds: string[],
  cartCategoryIds: string[],
): boolean {
  const hasProductFilter = coupon.productIds.length > 0;
  const hasCategoryFilter = coupon.categoryIds.length > 0;
  if (!hasProductFilter && !hasCategoryFilter) return true;
  if (hasProductFilter && coupon.productIds.some((id) => cartProductIds.includes(id))) return true;
  if (hasCategoryFilter && coupon.categoryIds.some((id) => cartCategoryIds.includes(id)))
    return true;
  return false;
}

export function countCustomerCouponUses(coupon: CmsCoupon, phone: string): number {
  const normalized = normalizeCouponPhone(phone);
  if (!normalized) return 0;
  return (coupon.redemptions ?? []).filter((entry) => entry.phone === normalized).length;
}

export function validateCouponLogic(
  coupons: CmsCoupon[],
  input: ValidateCouponInput,
  texts: CouponValidationTexts,
): CouponValidationResult {
  const code = input.code.trim().toUpperCase();
  if (!code) {
    return { valid: false, reason: "invalid", message: texts.couponInvalid };
  }

  const coupon = coupons.find((c) => c.code === code && c.active && c.visible);
  if (!coupon) {
    return { valid: false, reason: "invalid", message: texts.couponInvalid };
  }

  const today = todayIsoDate();
  if (coupon.startsAt && coupon.startsAt > today) {
    return { valid: false, reason: "inactive", message: texts.couponInvalid };
  }
  if (coupon.endsAt && coupon.endsAt < today) {
    return { valid: false, reason: "expired", message: texts.couponExpired };
  }

  const remaining = coupon.quantityAvailable - coupon.quantityUsed;
  if (remaining <= 0) {
    return { valid: false, reason: "exhausted", message: texts.couponExhausted };
  }

  if (input.customerPhone && coupon.limitPerCustomer != null && coupon.limitPerCustomer > 0) {
    const uses = countCustomerCouponUses(coupon, input.customerPhone);
    if (uses >= coupon.limitPerCustomer) {
      return { valid: false, reason: "customer_limit", message: texts.couponAlreadyUsed };
    }
  }

  if (input.subtotal < coupon.minOrderValue) {
    return { valid: false, reason: "min_order", message: texts.couponMinOrder };
  }

  if (!couponAppliesToCart(coupon, input.cartProductIds, input.cartCategoryIds)) {
    return { valid: false, reason: "invalid", message: texts.couponInvalid };
  }

  let discountAmount = 0;
  if (coupon.discountType === "percent") {
    discountAmount = Math.round(input.subtotal * (coupon.discountValue / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(coupon.discountValue, input.subtotal);
  }

  if (discountAmount <= 0) {
    return { valid: false, reason: "invalid", message: texts.couponInvalid };
  }

  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discountAmount,
    message: coupon.description || coupon.code,
  };
}

export function computeCartSubtotal(items: { product: CmsProduct; qty: number }[]): number {
  return items.reduce((sum, item) => sum + getEffectiveProductPrice(item.product) * item.qty, 0);
}

export function computeCartSubtotalFromLines(
  products: CmsProduct[],
  lines: { productId: string; qty: number }[],
): number {
  if (lines.length === 0) return 0;
  const map = new Map(products.map((p) => [p.id, p]));
  let total = 0;
  for (const line of lines) {
    const product = map.get(line.productId);
    if (!product || !product.visible || product.available === false) {
      throw new Error("Carrinho invalido");
    }
    total += getEffectiveProductPrice(product) * line.qty;
  }
  return Math.round(total * 100) / 100;
}

export function cartMetaFromLines(
  products: CmsProduct[],
  lines: { productId: string; qty: number }[],
): { subtotal: number; cartProductIds: string[]; cartCategoryIds: string[] } {
  const subtotal = computeCartSubtotalFromLines(products, lines);
  const map = new Map(products.map((p) => [p.id, p]));
  const cartProductIds: string[] = [];
  const categorySet = new Set<string>();
  for (const line of lines) {
    const product = map.get(line.productId);
    if (!product) continue;
    cartProductIds.push(product.id);
    categorySet.add(product.categoryId);
  }
  return { subtotal, cartProductIds, cartCategoryIds: [...categorySet] };
}
