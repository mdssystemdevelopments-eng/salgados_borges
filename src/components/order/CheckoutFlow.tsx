import { useEffect, useMemo, useState, type ReactNode } from "react";

import { redeemCoupon, validateCoupon } from "@/lib/cms/coupon-api";
import { PREP_METHOD_LABELS } from "@/lib/cms/order-defaults";
import type { CmsData } from "@/lib/cms/types";
import {
  toAdvanceCartLines,
  validateOrderAdvanceLogic,
  type OrderAdvanceModalContent,
} from "@/lib/order/advance";
import { notifyOrderEvolution, validateOrderAdvance } from "@/lib/order/order-api";
import { lineUnitPrice, orderTotals } from "@/lib/order/pricing";
import { availableTimeSlots, isDateAvailable, minSelectableDate } from "@/lib/order/schedule";
import {
  buildOrderWhatsAppMessage,
  isValidPhone,
  paymentMethodLabel,
  resolveCheckoutPhone,
  resolveFulfillmentOptions,
} from "@/lib/order/whatsapp-message";
import {
  emptyCustomerForm,
  emptyDeliveryForm,
  type CartLineItem,
  type CheckoutDraft,
} from "@/lib/order/types";
import { CartLinePreview, formatBRL } from "./ProductAddSheet";
import { OrderAdvanceModal } from "./OrderAdvanceModal";

type StepId = "cart" | "fulfillment" | "schedule" | "payment" | "customer" | "review" | "success";

type CheckoutFlowProps = {
  open: boolean;
  onClose: () => void;
  onOrderComplete?: () => void;
  cms: CmsData;
  items: CartLineItem[];
  onRemoveLine: (lineId: string) => void;
  onUpdateQty: (lineId: string, delta: number) => void;
  onClearCart: () => void;
};

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-3 text-base focus:border-gold outline-none";

function buildCouponRequest(
  code: string,
  items: CartLineItem[],
  subtotal: number,
  customerPhone?: string,
) {
  return {
    code,
    subtotal,
    cartProductIds: items.map((i) => i.product.id),
    cartCategoryIds: [...new Set(items.map((i) => i.product.categoryId))],
    cartLines: items.map((i) => ({
      productId: i.product.id,
      qty: i.qty,
      gramOptionId: i.gramOptionId,
    })),
    customerPhone,
  };
}

export function CheckoutFlow({
  open,
  onClose,
  onOrderComplete,
  cms,
  items,
  onRemoveLine,
  onUpdateQty,
  onClearCart,
}: CheckoutFlowProps) {
  const os = cms.settings.orderSettings;
  const texts = os.checkoutTexts;
  const fulfillmentOptions = resolveFulfillmentOptions(os);

  const createInitialDraft = (): CheckoutDraft => ({
    fulfillment: fulfillmentOptions.length === 1 ? fulfillmentOptions[0] : null,
    delivery: emptyDeliveryForm(),
    date: minSelectableDate(os.schedule),
    timeSlotId: availableTimeSlots(os.schedule)[0]?.id ?? null,
    paymentMethodId: os.paymentMethods.find((m) => m.enabled)?.id ?? null,
    needsChange: false,
    changeFor: "",
    customer: emptyCustomerForm(),
    coupon: null,
  });

  const [step, setStep] = useState<StepId>("cart");
  const [draft, setDraft] = useState<CheckoutDraft>(() => createInitialDraft());
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [advanceModal, setAdvanceModal] = useState<OrderAdvanceModalContent | null>(null);

  const advanceInput = useMemo(
    () => ({
      cartLines: toAdvanceCartLines(items),
      date: draft.date,
      timeSlotId: draft.timeSlotId,
    }),
    [items, draft.date, draft.timeSlotId],
  );

  const checkAdvanceClient = (): boolean => {
    const result = validateOrderAdvanceLogic(os, cms.products, advanceInput, {
      nowMs: Date.now(),
      fallbackWhatsapp: cms.settings.whatsapp,
    });
    if (!result.valid) {
      setAdvanceModal(result.modal);
      return false;
    }
    return true;
  };

  const checkAdvanceServer = async (): Promise<boolean> => {
    try {
      const result = await validateOrderAdvance({ data: advanceInput });
      if (!result.valid) {
        setAdvanceModal(result.modal);
        return false;
      }
      return true;
    } catch {
      return checkAdvanceClient();
    }
  };

  const resetCheckout = () => {
    setStep("cart");
    setDraft(createInitialDraft());
    setCouponInput("");
    setCouponError("");
    setCouponLoading(false);
    setSubmitting(false);
    setSubmitError("");
    setAdvanceModal(null);
  };

  const checkoutPhone = resolveCheckoutPhone(draft);

  const totals = useMemo(
    () => orderTotals(items, draft.fulfillment, os, draft.coupon),
    [items, draft.fulfillment, draft.coupon, os],
  );

  useEffect(() => {
    if (!draft.coupon || !isValidPhone(checkoutPhone)) return;

    let cancelled = false;
    void (async () => {
      const result = await validateCoupon({
        data: buildCouponRequest(draft.coupon!.code, items, totals.subtotal, checkoutPhone),
      });
      if (cancelled) return;
      if (!result.valid) {
        setDraft((d) => ({ ...d, coupon: null }));
        setCouponError(result.message);
      } else {
        setCouponError("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draft.coupon, checkoutPhone, items, totals.subtotal]);

  const steps: StepId[] = useMemo(() => {
    const list: StepId[] = ["cart"];
    if (fulfillmentOptions.length > 0) list.push("fulfillment");
    list.push("schedule", "payment", "customer", "review");
    return list;
  }, [fulfillmentOptions.length]);

  const stepIndex = steps.indexOf(step);
  const goNext = () => {
    const nextStep = steps[Math.min(stepIndex + 1, steps.length - 1)];
    if (nextStep === "customer" && draft.fulfillment === "delivery") {
      setDraft((d) => ({
        ...d,
        customer: {
          ...d.customer,
          name: d.delivery.name || d.customer.name,
          phone: d.delivery.phone || d.customer.phone,
        },
      }));
    }
    setStep(nextStep);
  };
  const goBack = () => setStep(steps[Math.max(stepIndex - 1, 0)]);

  if (!open) return null;

  const applyCoupon = async () => {
    setCouponLoading(true);
    setCouponError("");
    try {
      const result = await validateCoupon({
        data: buildCouponRequest(couponInput, items, totals.subtotal),
      });
      if (!result.valid) {
        setCouponError(result.message);
        return;
      }
      setDraft((d) => ({
        ...d,
        coupon: {
          couponId: result.couponId,
          code: result.code,
          discountAmount: result.discountAmount,
        },
      }));
    } catch {
      setCouponError(texts.couponInvalid);
    } finally {
      setCouponLoading(false);
    }
  };

  const submitOrder = async () => {
    const phone = resolveCheckoutPhone(draft);
    if (!isValidPhone(phone)) return;

    const orderDraft: CheckoutDraft = {
      ...draft,
      customer: {
        ...draft.customer,
        phone: draft.customer.phone || draft.delivery.phone,
        name: draft.customer.name || draft.delivery.name,
      },
    };

    setSubmitting(true);
    setCouponError("");
    setSubmitError("");
    try {
      const advanceOk = await checkAdvanceServer();
      if (!advanceOk) return;

      if (draft.coupon) {
        const preCheck = await validateCoupon({
          data: buildCouponRequest(draft.coupon.code, items, totals.subtotal, phone),
        });
        if (!preCheck.valid) {
          setCouponError(preCheck.message);
          setDraft((d) => ({ ...d, coupon: null }));
          setStep("cart");
          return;
        }
      }

      const label = paymentMethodLabel(os.paymentMethods, orderDraft.paymentMethodId);
      const msg = buildOrderWhatsAppMessage(cms, items, orderDraft, label);

      let notifyResult: Awaited<ReturnType<typeof notifyOrderEvolution>>;
      try {
        notifyResult = await notifyOrderEvolution({ data: { message: msg } });
      } catch {
        setSubmitError(texts.orderSubmitFailed);
        return;
      }

      if (!notifyResult.sent) {
        setSubmitError(texts.orderSubmitFailed);
        return;
      }

      if (draft.coupon) {
        const redeemResult = await redeemCoupon({
          data: buildCouponRequest(draft.coupon.code, items, totals.subtotal, phone),
        });
        if (!redeemResult.valid) {
          setCouponError(redeemResult.message);
          setDraft((d) => ({ ...d, coupon: null }));
          setStep("cart");
          return;
        }
      }

      onClearCart();
      onOrderComplete?.();
      setStep("success");
    } catch {
      setSubmitError(texts.orderSubmitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const finishAfterSuccess = () => {
    resetCheckout();
    onClose();
  };

  const canProceedSchedule =
    Boolean(draft.date) &&
    isDateAvailable(draft.date, os.schedule) &&
    (availableTimeSlots(os.schedule).length === 0 || draft.timeSlotId);

  return (
    <>
      {advanceModal ? (
        <OrderAdvanceModal
          open
          content={advanceModal}
          onChangeOrder={() => {
            setAdvanceModal(null);
            setStep("schedule");
          }}
          onClose={() => setAdvanceModal(null)}
        />
      ) : null}

      <div
        className="fixed inset-0 z-[70] bg-black/40"
        onClick={() => (step === "success" ? finishAfterSuccess() : onClose())}
        aria-hidden
      />
      <aside className="fixed top-0 right-0 z-[71] flex h-full w-full max-w-lg flex-col bg-card border-l border-border shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {step === "success"
                ? texts.orderSubmitSuccess
                : step === "cart"
                  ? texts.cartTitle
                  : texts.checkoutStart}
            </div>
            <div className="font-display text-xl text-foreground">
              {step === "cart" && texts.cartTitle}
              {step === "fulfillment" && texts.stepFulfillment}
              {step === "schedule" && texts.stepDate}
              {step === "payment" && texts.stepPayment}
              {step === "customer" && texts.stepCustomer}
              {step === "review" && texts.stepReview}
              {step === "success" && texts.orderSubmitSuccess}
            </div>
          </div>
          <button
            type="button"
            onClick={() => (step === "success" ? finishAfterSuccess() : onClose())}
            className="text-sm uppercase tracking-[0.12em] text-muted-foreground hover:text-gold"
          >
            Fechar
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {step === "cart" ? (
            <>
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">{texts.cartEmpty}</p>
              ) : (
                items.map((item) => (
                  <div key={item.lineId}>
                    <CartLinePreview item={item} onRemove={() => onRemoveLine(item.lineId)} />
                    <div className="flex items-center gap-2 mt-2 ml-[4.25rem]">
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full border border-border"
                        onClick={() => onUpdateQty(item.lineId, -1)}
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm">{item.qty}</span>
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full border border-border"
                        onClick={() => onUpdateQty(item.lineId, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}

              {items.length > 0 ? (
                <>
                  <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
                    <p className="text-sm text-foreground">{texts.couponQuestion}</p>
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder={texts.couponPlaceholder}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        disabled={couponLoading || !couponInput.trim()}
                        onClick={() => void applyCoupon()}
                        className="shrink-0 rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.12em] text-gold hover:bg-gold/10 disabled:opacity-50"
                      >
                        {texts.couponApply}
                      </button>
                    </div>
                    {couponError ? <p className="text-sm text-destructive">{couponError}</p> : null}
                    {draft.coupon ? (
                      <p className="text-sm text-foreground">
                        {texts.couponApplied}: {draft.coupon.code} (
                        {formatBRL(-draft.coupon.discountAmount)})
                      </p>
                    ) : null}
                  </div>
                  <TotalsBlock texts={texts} totals={totals} />
                </>
              ) : null}
            </>
          ) : null}

          {step === "fulfillment" ? (
            <div className="space-y-3">
              {fulfillmentOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, fulfillment: opt }))}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    draft.fulfillment === opt
                      ? "border-gold bg-gold/5"
                      : "border-border hover:border-gold/40"
                  }`}
                >
                  <div className="font-medium text-foreground">
                    {opt === "delivery" ? texts.stepDelivery : texts.stepPickup}
                  </div>
                </button>
              ))}

              {draft.fulfillment === "pickup" ? (
                <div className="rounded-xl border border-border bg-surface p-4 text-sm space-y-2">
                  <div className="font-medium text-foreground">{texts.stepPickupInfo}</div>
                  <p>{os.pickup.address}</p>
                  <p>{os.pickup.hours}</p>
                  {os.pickup.instructions ? <p>{os.pickup.instructions}</p> : null}
                </div>
              ) : null}

              {draft.fulfillment === "delivery" ? (
                <div className="space-y-3">
                  <Field label={texts.fieldName}>
                    <input
                      className={inputClass}
                      value={draft.delivery.name}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          delivery: { ...d.delivery, name: e.target.value },
                        }))
                      }
                    />
                  </Field>
                  <Field label={texts.fieldPhone}>
                    <input
                      className={inputClass}
                      value={draft.delivery.phone}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          delivery: { ...d.delivery, phone: e.target.value },
                        }))
                      }
                    />
                  </Field>
                  <Field label={texts.fieldCep}>
                    <input
                      className={inputClass}
                      value={draft.delivery.cep}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          delivery: { ...d.delivery, cep: e.target.value },
                        }))
                      }
                    />
                  </Field>
                  <Field label={texts.fieldAddress}>
                    <input
                      className={inputClass}
                      value={draft.delivery.address}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          delivery: { ...d.delivery, address: e.target.value },
                        }))
                      }
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={texts.fieldNumber}>
                      <input
                        className={inputClass}
                        value={draft.delivery.number}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            delivery: { ...d.delivery, number: e.target.value },
                          }))
                        }
                      />
                    </Field>
                    <Field label={texts.fieldComplement}>
                      <input
                        className={inputClass}
                        value={draft.delivery.complement}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            delivery: { ...d.delivery, complement: e.target.value },
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <Field label={texts.fieldDistrict}>
                    <input
                      className={inputClass}
                      value={draft.delivery.district}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          delivery: { ...d.delivery, district: e.target.value },
                        }))
                      }
                    />
                  </Field>
                  <Field label={texts.fieldReference}>
                    <input
                      className={inputClass}
                      value={draft.delivery.reference}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          delivery: { ...d.delivery, reference: e.target.value },
                        }))
                      }
                    />
                  </Field>
                  {os.delivery.instructions ? (
                    <p className="text-xs text-muted-foreground">{os.delivery.instructions}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "schedule" ? (
            <div className="space-y-4">
              <Field label={texts.stepDate}>
                <input
                  type="date"
                  className={inputClass}
                  min={minSelectableDate(os.schedule)}
                  value={draft.date}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                />
              </Field>
              {!isDateAvailable(draft.date, os.schedule) ? (
                <p className="text-sm text-destructive">{texts.dateUnavailable}</p>
              ) : null}
              {availableTimeSlots(os.schedule).length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {texts.stepTime}
                  </div>
                  <div className="grid gap-2">
                    {availableTimeSlots(os.schedule).map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, timeSlotId: slot.id }))}
                        className={`rounded-lg border px-4 py-3 text-left text-sm ${
                          draft.timeSlotId === slot.id ? "border-gold bg-gold/5" : "border-border"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "payment" ? (
            <div className="space-y-3">
              {os.paymentMethods
                .filter((m) => m.enabled)
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, paymentMethodId: m.id }))}
                    className={`w-full rounded-xl border p-4 text-left ${
                      draft.paymentMethodId === m.id ? "border-gold bg-gold/5" : "border-border"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              {draft.paymentMethodId === "dinheiro" ? (
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <p className="text-sm">{texts.changeQuestion}</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={!draft.needsChange}
                        onChange={() => setDraft((d) => ({ ...d, needsChange: false }))}
                      />
                      {texts.changeNo}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={draft.needsChange}
                        onChange={() => setDraft((d) => ({ ...d, needsChange: true }))}
                      />
                      {texts.changeYes}
                    </label>
                  </div>
                  {draft.needsChange ? (
                    <Field label={texts.changeFor}>
                      <input
                        className={inputClass}
                        value={draft.changeFor}
                        onChange={(e) => setDraft((d) => ({ ...d, changeFor: e.target.value }))}
                      />
                    </Field>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "customer" ? (
            <div className="space-y-3">
              <Field label={texts.fieldName}>
                <input
                  className={inputClass}
                  value={draft.customer.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, customer: { ...d.customer, name: e.target.value } }))
                  }
                />
              </Field>
              <Field label={texts.fieldPhone}>
                <input
                  className={inputClass}
                  value={draft.customer.phone}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, customer: { ...d.customer, phone: e.target.value } }))
                  }
                />
              </Field>
              {!isValidPhone(draft.customer.phone) && draft.customer.phone ? (
                <p className="text-sm text-destructive">{texts.phoneInvalid}</p>
              ) : null}
              <Field label={texts.fieldObservations}>
                <textarea
                  rows={4}
                  className={`${inputClass} resize-none`}
                  value={draft.customer.notes}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, customer: { ...d.customer, notes: e.target.value } }))
                  }
                />
              </Field>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-4 text-sm">
              <section>
                <h4 className="font-medium text-foreground mb-2">{texts.reviewProducts}</h4>
                {items.map((item) => (
                  <div key={item.lineId} className="py-2 border-b border-border">
                    {item.qty}x {item.product.name}
                    {item.prep ? ` (${PREP_METHOD_LABELS[item.prep]})` : ""}
                    <span className="float-right text-gold">
                      {formatBRL(item.qty * lineUnitPrice(item))}
                    </span>
                  </div>
                ))}
              </section>
              <ReviewRow
                label={texts.reviewFulfillment}
                value={draft.fulfillment === "delivery" ? texts.stepDelivery : texts.stepPickup}
              />
              <ReviewRow
                label={texts.reviewDate}
                value={draft.date.split("-").reverse().join("/")}
              />
              {draft.timeSlotId ? (
                <ReviewRow
                  label={texts.reviewTime}
                  value={os.schedule.timeSlots.find((s) => s.id === draft.timeSlotId)?.label ?? ""}
                />
              ) : null}
              <ReviewRow
                label={texts.reviewPayment}
                value={paymentMethodLabel(os.paymentMethods, draft.paymentMethodId)}
              />
              <ReviewRow
                label={texts.reviewCustomer}
                value={`${draft.customer.name} · ${draft.customer.phone}`}
              />
              <TotalsBlock texts={texts} totals={totals} />
              {couponError ? <p className="text-sm text-destructive">{couponError}</p> : null}
              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
            </div>
          ) : null}

          {step === "success" ? (
            <div className="space-y-4 py-6 text-center">
              <p className="font-display text-2xl text-foreground">{texts.orderSubmitSuccess}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {texts.orderSubmitSuccessDetail}
              </p>
            </div>
          ) : null}
        </div>

        <footer className="border-t border-border p-4 space-y-2 bg-surface">
          {step !== "cart" && step !== "success" ? (
            <button
              type="button"
              onClick={goBack}
              className="w-full py-2 text-sm uppercase tracking-[0.12em] text-muted-foreground hover:text-gold"
            >
              {texts.btnBack}
            </button>
          ) : null}

          {step === "cart" ? (
            <button
              type="button"
              disabled={items.length === 0 || !os.enabled}
              onClick={goNext}
              className="w-full rounded-full bg-gold-gradient py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-50"
            >
              {texts.checkoutStart}
            </button>
          ) : null}

          {step === "fulfillment" ? (
            <button
              type="button"
              disabled={!draft.fulfillment}
              onClick={goNext}
              className="w-full rounded-full bg-gold-gradient py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-50"
            >
              {texts.btnNext}
            </button>
          ) : null}

          {step === "schedule" ? (
            <button
              type="button"
              disabled={!canProceedSchedule}
              onClick={() => {
                if (!checkAdvanceClient()) return;
                goNext();
              }}
              className="w-full rounded-full bg-gold-gradient py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-50"
            >
              {texts.btnNext}
            </button>
          ) : null}

          {step === "payment" ? (
            <button
              type="button"
              disabled={!draft.paymentMethodId}
              onClick={goNext}
              className="w-full rounded-full bg-gold-gradient py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-50"
            >
              {texts.btnNext}
            </button>
          ) : null}

          {step === "customer" ? (
            <button
              type="button"
              disabled={!draft.customer.name.trim() || !isValidPhone(draft.customer.phone)}
              onClick={goNext}
              className="w-full rounded-full bg-gold-gradient py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-50"
            >
              {texts.btnNext}
            </button>
          ) : null}

          {step === "review" ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submitOrder()}
              className="w-full rounded-full bg-gold-gradient py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-50"
            >
              {submitting ? "Enviando…" : texts.btnSendWhatsapp}
            </button>
          ) : null}

          {step === "success" ? (
            <button
              type="button"
              onClick={finishAfterSuccess}
              className="w-full rounded-full bg-gold-gradient py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground"
            >
              {texts.orderSubmitClose}
            </button>
          ) : null}
        </footer>
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}

function TotalsBlock({
  texts,
  totals,
}: {
  texts: CmsData["settings"]["orderSettings"]["checkoutTexts"];
  totals: ReturnType<typeof orderTotals>;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <span>{texts.cartSubtotal}</span>
        <span>{formatBRL(totals.subtotal)}</span>
      </div>
      {totals.discount > 0 ? (
        <div className="flex justify-between text-gold">
          <span>{texts.cartDiscount}</span>
          <span>-{formatBRL(totals.discount)}</span>
        </div>
      ) : null}
      {totals.delivery > 0 ? (
        <div className="flex justify-between">
          <span>{texts.cartDeliveryFee}</span>
          <span>{formatBRL(totals.delivery)}</span>
        </div>
      ) : null}
      <div className="flex justify-between font-price text-lg text-gold pt-2 border-t border-border">
        <span>{texts.cartTotal}</span>
        <span>{formatBRL(totals.total)}</span>
      </div>
    </div>
  );
}
