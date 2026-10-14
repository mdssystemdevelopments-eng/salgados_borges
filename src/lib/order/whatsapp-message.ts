import { getFlavorNamesByIds, isFlavorVariationEnabled } from "@/lib/cms/flavor-variation";
import { getGramOptionById, isGramVariationEnabled } from "@/lib/cms/gram-variation";
import { PREP_METHOD_LABELS, PRODUCT_FULFILLMENT_LABELS } from "@/lib/cms/order-defaults";
import type { CmsData, CmsOrderSettings, CmsPaymentMethod } from "@/lib/cms/types";
import { lineSubtotal, lineUnitPrice, orderTotals } from "./pricing";
import type { CartLineItem, CheckoutDraft, FulfillmentType } from "./types";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function fmtMoney(value: number): string {
  return BRL.format(value);
}

function fmtDateBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtDateTimeBr(date: Date): string {
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pushItemWhatsAppLines(lines: string[], item: CartLineItem): void {
  lines.push(`${item.qty}x ${item.product.name}`);

  const description = item.product.description.trim();
  if (description) {
    lines.push(`Descricao: ${description}`);
  }

  if (isGramVariationEnabled(item.product) && item.gramOptionId) {
    const gram = getGramOptionById(item.product, item.gramOptionId);
    if (gram) lines.push(`Gramatura: ${gram.label}`);
  }

  if (isFlavorVariationEnabled(item.product) && item.selectedFlavorIds.length > 0) {
    const names = getFlavorNamesByIds(item.product, item.selectedFlavorIds);
    if (names.length > 0) {
      lines.push(`Sabores: ${names.join(", ")}`);
    }
  }

  if (item.prep) lines.push(`Preparo: ${PREP_METHOD_LABELS[item.prep]}`);

  if (item.product.fulfillmentTag) {
    lines.push(`Disponibilidade: ${PRODUCT_FULFILLMENT_LABELS[item.product.fulfillmentTag]}`);
  }

  const unit = lineUnitPrice(item);
  lines.push(`Unitario: ${fmtMoney(unit)} / ${item.product.unit}`);
  lines.push(`Subtotal item: ${fmtMoney(lineSubtotal(item))}`);

  if (item.note.trim()) {
    lines.push(`Obs item: ${item.note.trim()}`);
  }

  lines.push("");
}

export function buildOrderWhatsAppMessage(
  cms: CmsData,
  items: CartLineItem[],
  draft: CheckoutDraft,
  paymentLabel: string,
): string {
  const { orderSettings } = cms.settings;
  const totals = orderTotals(items, draft.fulfillment, orderSettings, draft.coupon);
  const now = fmtDateTimeBr(new Date());
  const lines: string[] = [];

  lines.push(`NOVO PEDIDO ${cms.content.brandName.toUpperCase()}`);
  lines.push(`Registrado em: ${now}`);
  lines.push("");

  const customerName = draft.customer.name.trim() || draft.delivery.name.trim();
  const customerPhone = draft.customer.phone.trim() || draft.delivery.phone.trim();

  lines.push("CLIENTE");
  lines.push(`Nome: ${customerName || "Nao informado"}`);
  lines.push(`Telefone: ${customerPhone || "Nao informado"}`);

  if (draft.fulfillment === "delivery") {
    lines.push("");
    lines.push("ENTREGA");
    lines.push("Tipo: Entrega");
    if (draft.delivery.name.trim() && draft.delivery.name.trim() !== customerName) {
      lines.push(`Recebedor: ${draft.delivery.name.trim()}`);
    }
    if (draft.delivery.phone.trim() && draft.delivery.phone.trim() !== customerPhone) {
      lines.push(`Telefone entrega: ${draft.delivery.phone.trim()}`);
    }
    if (draft.date) lines.push(`Data desejada: ${fmtDateBr(draft.date)}`);
    const slot = orderSettings.schedule.timeSlots.find((s) => s.id === draft.timeSlotId);
    if (slot) lines.push(`Horario: ${slot.label}`);
    lines.push("");
    lines.push("Endereco completo:");
    lines.push(`${draft.delivery.address}, ${draft.delivery.number}`);
    if (draft.delivery.complement.trim()) {
      lines.push(`Complemento: ${draft.delivery.complement.trim()}`);
    }
    lines.push(`Bairro: ${draft.delivery.district}`);
    if (draft.delivery.cep.trim()) lines.push(`CEP: ${draft.delivery.cep.trim()}`);
    if (draft.delivery.reference.trim()) {
      lines.push(`Referencia: ${draft.delivery.reference.trim()}`);
    }
    if (draft.delivery.notes.trim()) {
      lines.push(`Obs entrega: ${draft.delivery.notes.trim()}`);
    }
  } else if (draft.fulfillment === "pickup") {
    lines.push("");
    lines.push("RETIRADA");
    lines.push("Tipo: Retirada no local");
    if (draft.date) lines.push(`Data desejada: ${fmtDateBr(draft.date)}`);
    const slot = orderSettings.schedule.timeSlots.find((s) => s.id === draft.timeSlotId);
    if (slot) lines.push(`Horario: ${slot.label}`);
    lines.push(`Endereco loja: ${orderSettings.pickup.address}`);
    lines.push(`Horario retirada: ${orderSettings.pickup.hours}`);
  }

  lines.push("");
  lines.push("ITENS DO PEDIDO");
  for (const item of items) {
    pushItemWhatsAppLines(lines, item);
  }

  lines.push("VALORES");
  lines.push(`Subtotal: ${fmtMoney(totals.subtotal)}`);
  if (draft.coupon) {
    lines.push(`Cupom: ${draft.coupon.code}`);
    lines.push(`Desconto: -${fmtMoney(totals.discount)}`);
  }
  if (totals.delivery > 0) lines.push(`Taxa entrega: ${fmtMoney(totals.delivery)}`);
  lines.push(`TOTAL: ${fmtMoney(totals.total)}`);
  lines.push("");
  lines.push("PAGAMENTO");
  lines.push(paymentLabel);
  if (draft.paymentMethodId === "dinheiro" && draft.needsChange && draft.changeFor.trim()) {
    lines.push(`Troco para: ${draft.changeFor.trim()}`);
  }
  lines.push("");
  if (draft.customer.notes.trim()) {
    lines.push("OBSERVACOES GERAIS");
    lines.push(draft.customer.notes.trim());
    lines.push("");
  }
  lines.push(`Pedido enviado pelo site ${cms.content.brandName}.`);

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
  const deliveryPhone = draft.delivery.phone.trim();
  const customerPhone = draft.customer.phone.trim();

  if (draft.fulfillment === "delivery") {
    if (isValidPhone(deliveryPhone)) return deliveryPhone;
    if (isValidPhone(customerPhone)) return customerPhone;
    return deliveryPhone || customerPhone;
  }

  return customerPhone;
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
