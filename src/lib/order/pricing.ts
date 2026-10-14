import { getEffectiveProductPrice } from "@/lib/cms/migrate";
import type { CmsOrderSettings } from "@/lib/cms/types";
import type { AppliedCoupon, CartLineItem, FulfillmentType } from "./types";

export function lineUnitPrice(item: CartLineItem): number {
  return getEffectiveProductPrice(item.product, item.gramOptionId);
}

export function lineSubtotal(item: CartLineItem): number {
  return lineUnitPrice(item) * item.qty;
}

export function cartSubtotal(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + lineSubtotal(item), 0);
}

export function deliveryFee(
  fulfillment: FulfillmentType | null,
  orderSettings: CmsOrderSettings,
): number {
  if (fulfillment !== "delivery") return 0;
  if (!orderSettings.delivery.enabled) return 0;
  if (orderSettings.delivery.feeMode === "free") return 0;
  return Math.max(0, orderSettings.delivery.fixedFee);
}

export function orderTotals(
  items: CartLineItem[],
  fulfillment: FulfillmentType | null,
  orderSettings: CmsOrderSettings,
  coupon: AppliedCoupon | null,
) {
  const subtotal = cartSubtotal(items);
  const discount = coupon?.discountAmount ?? 0;
  const delivery = deliveryFee(fulfillment, orderSettings);
  const total = Math.max(0, subtotal - discount + delivery);
  return { subtotal, discount, delivery, total };
}
