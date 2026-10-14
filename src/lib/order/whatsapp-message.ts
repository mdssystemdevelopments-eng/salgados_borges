import { getGramOptionById, isGramVariationEnabled } from "@/lib/cms/gram-variation";
import { PREP_METHOD_LABELS, PRODUCT_FULFILLMENT_LABELS } from "@/lib/cms/order-defaults";
import type { CmsData, CmsOrderSettings, CmsPaymentMethod } from "@/lib/cms/types";
import { lineSubtotal, orderTotals } from "./pricing";
import type { CartLineItem, CheckoutDraft, FulfillmentType } from "./types";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function fmtMoney(value: number): string {
  return BRL.format(value);
}

function fmtDateBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function buildOrderWhatsAppMessage(
  cms: CmsData,
  items: CartLineItem[],
  draft: CheckoutDraft,
  paymentLabel: string,
): string {
  const { orderSettings } = cms.settings;
  const totals = orderTotals(items, draft.fulfillment, orderSettings, draft.coupon);
  const orderDate = fmtDateBr(new Date().toISOString().slice(0, 10));
  const lines: string[] = [];

  lines.push(`NOVO PEDIDO ${cms.content.brandName.toUpperCase()}`);
  lines.push("");
  lines.push("CLIENTE");
  lines.push(`Nome: ${draft.customer.name}`);
  lines.push(`Telefone: ${draft.customer.phone}`);
  lines.push(`Pedido iniciado em: ${orderDate}`);
  lines.push("");

  if (draft.fulfillment === "delivery") {
    lines.push("ENTREGA");
    lines.push("Tipo: Entrega");
    if (draft.date) lines.push(`Data desejada: ${fmtDateBr(draft.date)}`);
    const slot = orderSettings.schedule.timeSlots.find((s) => s.id === draft.timeSlotId);
    if (slot) lines.push(`Horario: ${slot.label}`);
    lines.push("");
    lines.push("Endereco:");
    lines.push(`${draft.delivery.address}, ${draft.delivery.number}`);
    if (draft.delivery.complement) lines.push(draft.delivery.complement);
    lines.push(draft.delivery.district);
    if (draft.delivery.cep) lines.push(`CEP: ${draft.delivery.cep}`);
    if (draft.delivery.reference) lines.push(`Referencia: ${draft.delivery.reference}`);
    if (draft.delivery.notes) lines.push(`Obs entrega: ${draft.delivery.notes}`);
  } else if (draft.fulfillment === "pickup") {
    lines.push("RETIRADA");
    lines.push("Tipo: Retirada no local");
    if (draft.date) lines.push(`Data desejada: ${fmtDateBr(draft.date)}`);
    const slot = orderSettings.schedule.timeSlots.find((s) => s.id === draft.timeSlotId);
    if (slot) lines.push(`Horario: ${slot.label}`);
    lines.push(`Endereco: ${orderSettings.pickup.address}`);
    lines.push(`Horario retirada: ${orderSettings.pickup.hours}`);
  }

  lines.push("");
  lines.push("ITENS");
  for (const item of items) {
    lines.push(`${item.qty}x ${item.product.name}`);
    if (isGramVariationEnabled(item.product) && item.gramOptionId) {
      const gram = getGramOptionById(item.product, item.gramOptionId);
      if (gram) lines.push(`Gramatura: ${gram.label}`);
    }
    if (item.prep) lines.push(`Preparo: ${PREP_METHOD_LABELS[item.prep]}`);
    if (item.product.fulfillmentTag) {
      lines.push(`Disponibilidade: ${PRODUCT_FULFILLMENT_LABELS[item.product.fulfillmentTag]}`);
    }
    if (item.note) lines.push(`Obs: ${item.note}`);
    lines.push(fmtMoney(lineSubtotal(item)));
    lines.push("");
  }

  lines.push("VALORES");
  lines.push(`Subtotal: ${fmtMoney(totals.subtotal)}`);
  if (draft.coupon) {
    lines.push(`Cupom: ${draft.coupon.code}`);
    lines.push(`Desconto: -${fmtMoney(totals.discount)}`);
  }
  if (totals.delivery > 0) lines.push(`Entrega: ${fmtMoney(totals.delivery)}`);
  lines.push(`TOTAL: ${fmtMoney(totals.total)}`);
  lines.push("");
  lines.push("PAGAMENTO");
  lines.push(paymentLabel);
  if (draft.paymentMethodId === "dinheiro" && draft.needsChange && draft.changeFor) {
    lines.push(`Troco para: ${draft.changeFor}`);
  }
  lines.push("");
  if (draft.customer.notes) {
    lines.push("OBSERVACOES");
    lines.push(draft.customer.notes);
    lines.push("");
  }
  lines.push(`Pedido realizado pelo site ${cms.content.brandName}.`);

  return lines.join("\n");
}

export function paymentMethodLabel(methods: CmsPaymentMethod[], id: string | null): string {
  if (!id) return "Nao informado";
  return methods.find((m) => m.id === id)?.label ?? id;
}

export function waLink(whatsapp: string, msg: string): string {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
}

export function resolveCheckoutPhone(draft: {
  fulfillment: "delivery" | "pickup" | null;
  delivery: { phone: string };
  customer: { phone: string };
}): string {
  if (draft.fulfillment === "delivery" && draft.delivery.phone.trim()) {
    return draft.delivery.phone.trim();
  }
  return draft.customer.phone.trim();
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

export function resolveFulfillmentOptions(orderSettings: CmsOrderSettings): FulfillmentType[] {
  const options: FulfillmentType[] = [];
  if (orderSettings.allowDelivery && orderSettings.delivery.enabled) options.push("delivery");
  if (orderSettings.allowPickup && orderSettings.pickup.enabled) options.push("pickup");
  return options;
}
