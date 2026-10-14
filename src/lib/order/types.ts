import type { CmsProduct, PrepMethod } from "@/lib/cms/types";

export type CartLineItem = {
  lineId: string;
  product: CmsProduct;
  qty: number;
  prep: PrepMethod | null;
  /** Opcao de gramas quando o produto tem variacao ativa. */
  gramOptionId: string | null;
  note: string;
};

export type CartLineMeta = {
  productId: string;
  qty: number;
  gramOptionId?: string | null;
};

export type FulfillmentType = "delivery" | "pickup";

export type DeliveryForm = {
  name: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  reference: string;
  notes: string;
};

export type CustomerForm = {
  name: string;
  phone: string;
  notes: string;
};

export type AppliedCoupon = {
  couponId: string;
  code: string;
  discountAmount: number;
};

export type CheckoutDraft = {
  fulfillment: FulfillmentType | null;
  delivery: DeliveryForm;
  date: string;
  timeSlotId: string | null;
  paymentMethodId: string | null;
  needsChange: boolean;
  changeFor: string;
  customer: CustomerForm;
  coupon: AppliedCoupon | null;
};

export const emptyDeliveryForm = (): DeliveryForm => ({
  name: "",
  phone: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  district: "",
  reference: "",
  notes: "",
});

export const emptyCustomerForm = (): CustomerForm => ({
  name: "",
  phone: "",
  notes: "",
});

export function newCartLineId(): string {
  return `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
