import { useEffect, useState } from "react";

import { OrderAdvanceModal } from "@/components/order/OrderAdvanceModal";
import {
  deleteCollectionItem,
  saveOrderSettings,
  toggleCollectionItem,
  upsertCollectionItem,
} from "@/lib/cms/api";
import {
  DEFAULT_PREP_METHODS,
  PREP_METHOD_LABELS,
  PRODUCT_FULFILLMENT_LABELS,
  PRODUCT_FULFILLMENT_TAGS,
} from "@/lib/cms/order-defaults";
import { createDefaultFlavorVariation } from "@/lib/cms/flavor-variation";
import { createDefaultGramOptions } from "@/lib/cms/gram-variation";
import type {
  CmsCheckoutTexts,
  CmsCoupon,
  CmsData,
  CmsOrderSettings,
  CmsProduct,
  CmsTimeSlot,
  PrepMethod,
  ProductFulfillmentTag,
} from "@/lib/cms/types";
import { buildAdvanceModalContent, formatDateBr } from "@/lib/order/advance";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  VisibilityBadge,
} from "./ui";

type RunFn = (fn: () => Promise<CmsData | void>, okMsg: string) => Promise<void>;

const WEEKDAYS = [
  { v: 0, l: "Dom" },
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
];

export function CouponsSection({ cms, busy, run }: { cms: CmsData; busy: boolean; run: RunFn }) {
  const empty: CmsCoupon = {
    id: "",
    code: "",
    description: "",
    discountType: "percent",
    discountValue: 10,
    quantityAvailable: 100,
    quantityUsed: 0,
    limitPerCustomer: null,
    minOrderValue: 0,
    startsAt: null,
    endsAt: null,
    productIds: [],
    categoryIds: [],
    active: true,
    visible: true,
    order: cms.coupons.length,
  };
  const [editing, setEditing] = useState<CmsCoupon | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gerencie cupons de desconto. A validação ocorre no servidor ao aplicar no checkout.
      </p>
      <div className="flex justify-end">
        <AdminButton type="button" disabled={busy} onClick={() => setEditing(empty)}>
          Novo cupom
        </AdminButton>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gold/35">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Desconto</th>
              <th className="px-4 py-3">Uso</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {cms.coupons.map((c) => {
              const remaining = Math.max(0, c.quantityAvailable - c.quantityUsed);
              const discount =
                c.discountType === "percent"
                  ? `${c.discountValue}%`
                  : c.discountValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.code}</div>
                    <div className="text-xs text-muted-foreground">{c.description}</div>
                  </td>
                  <td className="px-4 py-3">{discount}</td>
                  <td className="px-4 py-3">
                    {c.quantityUsed} / {c.quantityAvailable}
                    <span className="text-xs text-muted-foreground"> (restam {remaining})</span>
                    {c.limitPerCustomer != null ? (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Máx. {c.limitPerCustomer} por cliente
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <VisibilityBadge visible={c.active && c.visible} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <AdminButton type="button" variant="ghost" onClick={() => setEditing(c)}>
                        Editar
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () =>
                              toggleCollectionItem({ data: { collection: "coupons", id: c.id } }),
                            c.active ? "Cupom desativado" : "Cupom ativado",
                          )
                        }
                      >
                        {c.active ? "Desativar" : "Ativar"}
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          if (confirm("Excluir este cupom?")) {
                            void run(
                              () =>
                                deleteCollectionItem({ data: { collection: "coupons", id: c.id } }),
                              "Cupom excluído",
                            );
                          }
                        }}
                      >
                        Excluir
                      </AdminButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing ? (
        <CouponEditor
          coupon={editing}
          cms={cms}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(item) =>
            run(async () => {
              const existing = cms.coupons.find((c) => c.id === item.id);
              const payload = existing
                ? {
                    ...item,
                    quantityUsed: existing.quantityUsed,
                    redemptions: existing.redemptions ?? [],
                  }
                : item;
              const next = await upsertCollectionItem({
                data: { collection: "coupons", item: payload as unknown as Record<string, unknown> },
              });
              setEditing(null);
              return next;
            }, "Cupom salvo")
          }
        />
      ) : null}
    </div>
  );
}

function CouponEditor({
  coupon,
  cms,
  busy,
  onClose,
  onSave,
}: {
  coupon: CmsCoupon;
  cms: CmsData;
  busy: boolean;
  onClose: () => void;
  onSave: (c: CmsCoupon) => void;
}) {
  const [form, setForm] = useState(coupon);
  useEffect(() => setForm(coupon), [coupon]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-gold/35 bg-background p-5 sm:rounded-xl sm:p-6">
        <h2 className="font-display text-2xl mb-4">{form.id ? "Editar cupom" : "Novo cupom"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Código">
            <AdminInput
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
          </AdminField>
          <AdminField label="Tipo">
            <AdminSelect
              value={form.discountType}
              onChange={(e) =>
                setForm({ ...form, discountType: e.target.value as CmsCoupon["discountType"] })
              }
            >
              <option value="percent">Percentual</option>
              <option value="fixed">Valor fixo</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="Valor do desconto">
            <AdminInput
              type="number"
              step="0.01"
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
            />
          </AdminField>
          <AdminField label="Pedido mínimo (R$)">
            <AdminInput
              type="number"
              step="0.01"
              value={form.minOrderValue}
              onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })}
            />
          </AdminField>
          <AdminField label="Limite total de usos">
            <AdminInput
              type="number"
              min={Math.max(1, form.quantityUsed)}
              value={form.quantityAvailable}
              onChange={(e) =>
                setForm({
                  ...form,
                  quantityAvailable: Math.max(form.quantityUsed, Number(e.target.value) || 1),
                })
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Ex.: 1 = o cupom só pode ser usado uma vez no total.
            </p>
          </AdminField>
          <AdminField label="Limite por cliente">
            <AdminInput
              type="number"
              min={1}
              value={form.limitPerCustomer ?? ""}
              placeholder="Sem limite"
              onChange={(e) => {
                const raw = e.target.value.trim();
                setForm({
                  ...form,
                  limitPerCustomer: raw === "" ? null : Math.max(1, Number(raw) || 1),
                });
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Ex.: 1 = cada telefone pode usar este cupom apenas uma vez.
            </p>
          </AdminField>
          <AdminField label="Utilizados (somente leitura)">
            <AdminInput type="number" value={form.quantityUsed} readOnly />
          </AdminField>
          <div className="sm:col-span-2">
            <AdminField label="Descrição">
              <AdminTextarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </AdminField>
          </div>
          <AdminField label="Início (opcional)">
            <AdminInput
              type="date"
              value={form.startsAt ?? ""}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value || null })}
            />
          </AdminField>
          <AdminField label="Fim (opcional)">
            <AdminInput
              type="date"
              value={form.endsAt ?? ""}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value || null })}
            />
          </AdminField>
          <div className="sm:col-span-2">
            <AdminField label="Categorias participantes (vazio = todas)">
              <div className="flex flex-wrap gap-2">
                {cms.categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={form.categoryIds.includes(cat.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...form.categoryIds, cat.id]
                          : form.categoryIds.filter((id) => id !== cat.id);
                        setForm({ ...form, categoryIds: ids });
                      }}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </AdminField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Ativo
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <AdminButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </AdminButton>
          <AdminButton type="button" disabled={busy || !form.code} onClick={() => onSave(form)}>
            Salvar
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

type OrderTab = "geral" | "entrega" | "agenda" | "antecedencia";

export function OrderSettingsSection({
  cms,
  busy,
  run,
}: {
  cms: CmsData;
  busy: boolean;
  run: RunFn;
}) {
  const [form, setForm] = useState(cms.settings.orderSettings);
  const [tab, setTab] = useState<OrderTab>("geral");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setForm(cms.settings.orderSettings);
  }, [cms.settings.orderSettings]);

  const patch = (partial: Partial<CmsOrderSettings>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const patchAdvance = (partial: Partial<CmsOrderSettings["orderAdvance"]>) =>
    setForm((prev) => ({ ...prev, orderAdvance: { ...prev.orderAdvance, ...partial } }));

  const save = () =>
    run(
      async () => saveOrderSettings({ data: { orderSettings: form } }),
      "Configurações salvas com sucesso!",
    );

  const previewModal = buildAdvanceModalContent(
    form.orderAdvance,
    cms.settings.whatsapp,
    {
      minimumHours: form.orderAdvance.minimumAdvanceHours,
      selectedDate: formatDateBr(new Date().toISOString().slice(0, 10)),
      selectedTime: form.schedule.timeSlots.find((s) => s.enabled)?.label ?? "08:00",
    },
  );

  const tabs: { id: OrderTab; label: string }[] = [
    { id: "geral", label: "Geral e pagamento" },
    { id: "entrega", label: "Entrega e retirada" },
    { id: "agenda", label: "Datas e horários" },
    { id: "antecedencia", label: "Antecedência de pedidos" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm border transition ${
              tab === t.id
                ? "bg-gold/15 border-gold text-gold"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "geral" ? (
        <div className="grid gap-6 max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => patch({ enabled: e.target.checked })}
              />
              Pedidos online ativos
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowDelivery}
                onChange={(e) => patch({ allowDelivery: e.target.checked })}
              />
              Permitir entrega
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowPickup}
                onChange={(e) => patch({ allowPickup: e.target.checked })}
              />
              Permitir retirada
            </label>
          </div>
          <div className="space-y-3 border-t border-border pt-4">
            <div className="text-sm font-medium text-foreground">Formas de pagamento</div>
            {form.paymentMethods.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={m.enabled}
                    onChange={(e) => {
                      const paymentMethods = [...form.paymentMethods];
                      paymentMethods[idx] = { ...m, enabled: e.target.checked };
                      patch({ paymentMethods });
                    }}
                  />
                  {m.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "entrega" ? (
        <div className="grid gap-8 max-w-2xl lg:grid-cols-2">
          <div className="space-y-4">
            <div className="text-sm font-medium text-foreground">Entrega</div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.delivery.enabled}
                onChange={(e) => patch({ delivery: { ...form.delivery, enabled: e.target.checked } })}
              />
              Entrega habilitada
            </label>
            <AdminField label="Modo da taxa">
              <AdminSelect
                value={form.delivery.feeMode}
                onChange={(e) =>
                  patch({
                    delivery: { ...form.delivery, feeMode: e.target.value as "free" | "fixed" },
                  })
                }
              >
                <option value="free">Grátis</option>
                <option value="fixed">Taxa fixa</option>
              </AdminSelect>
            </AdminField>
            {form.delivery.feeMode === "fixed" ? (
              <AdminField label="Taxa fixa (R$)">
                <AdminInput
                  type="number"
                  step="0.01"
                  value={form.delivery.fixedFee}
                  onChange={(e) =>
                    patch({ delivery: { ...form.delivery, fixedFee: Number(e.target.value) } })
                  }
                />
              </AdminField>
            ) : null}
            <AdminField label="Instruções">
              <AdminTextarea
                value={form.delivery.instructions}
                onChange={(e) =>
                  patch({ delivery: { ...form.delivery, instructions: e.target.value } })
                }
              />
            </AdminField>
          </div>
          <div className="space-y-4">
            <div className="text-sm font-medium text-foreground">Retirada</div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.pickup.enabled}
                onChange={(e) => patch({ pickup: { ...form.pickup, enabled: e.target.checked } })}
              />
              Retirada habilitada
            </label>
            <AdminField label="Endereço">
              <AdminTextarea
                value={form.pickup.address}
                onChange={(e) => patch({ pickup: { ...form.pickup, address: e.target.value } })}
              />
            </AdminField>
            <AdminField label="Horário">
              <AdminInput
                value={form.pickup.hours}
                onChange={(e) => patch({ pickup: { ...form.pickup, hours: e.target.value } })}
              />
            </AdminField>
            <AdminField label="Instruções">
              <AdminTextarea
                value={form.pickup.instructions}
                onChange={(e) =>
                  patch({ pickup: { ...form.pickup, instructions: e.target.value } })
                }
              />
            </AdminField>
          </div>
        </div>
      ) : null}

      {tab === "agenda" ? (
        <div className="grid gap-4 max-w-2xl">
          <AdminField label="Antecedência mínima (dias)">
            <AdminInput
              type="number"
              value={form.schedule.minLeadDays}
              onChange={(e) =>
                patch({ schedule: { ...form.schedule, minLeadDays: Number(e.target.value) } })
              }
            />
          </AdminField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.schedule.allowSameDay}
              onChange={(e) =>
                patch({ schedule: { ...form.schedule, allowSameDay: e.target.checked } })
              }
            />
            Permitir pedido para o mesmo dia
          </label>
          <AdminField label="Dias da semana disponíveis">
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <label key={d.v} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.schedule.availableWeekdays.includes(d.v)}
                    onChange={(e) => {
                      const days = e.target.checked
                        ? [...form.schedule.availableWeekdays, d.v]
                        : form.schedule.availableWeekdays.filter((x) => x !== d.v);
                      patch({ schedule: { ...form.schedule, availableWeekdays: days.sort() } });
                    }}
                  />
                  {d.l}
                </label>
              ))}
            </div>
          </AdminField>
          <AdminField label="Datas bloqueadas (uma por linha, AAAA-MM-DD)">
            <AdminTextarea
              rows={3}
              value={form.schedule.blockedDates.join("\n")}
              onChange={(e) =>
                patch({
                  schedule: {
                    ...form.schedule,
                    blockedDates: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </AdminField>
          <TimeSlotsEditor
            slots={form.schedule.timeSlots}
            onChange={(timeSlots) => patch({ schedule: { ...form.schedule, timeSlots } })}
          />
        </div>
      ) : null}

      {tab === "antecedencia" ? (
        <div className="grid gap-6 max-w-2xl">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.orderAdvance.enabled}
              onChange={(e) => patchAdvance({ enabled: e.target.checked })}
            />
            Exigir antecedência mínima para encomendas
          </label>

          <AdminField label="Antecedência mínima (horas)">
            <AdminInput
              type="number"
              min={1}
              max={720}
              value={form.orderAdvance.minimumAdvanceHours}
              onChange={(e) =>
                patchAdvance({ minimumAdvanceHours: Number(e.target.value) || 48 })
              }
            />
          </AdminField>

          <AdminField label="Fuso horário da loja">
            <AdminInput
              value={form.orderAdvance.timeZone}
              onChange={(e) => patchAdvance({ timeZone: e.target.value })}
              placeholder="America/Sao_Paulo"
            />
          </AdminField>

          <div className="border-t border-border pt-4 space-y-4">
            <div className="text-sm font-medium text-foreground">Mensagem de bloqueio</div>
            <AdminField label="Título">
              <AdminInput
                value={form.orderAdvance.warningTitle}
                onChange={(e) => patchAdvance({ warningTitle: e.target.value })}
              />
            </AdminField>
            <AdminField label="Mensagem">
              <AdminTextarea
                rows={4}
                value={form.orderAdvance.warningMessage}
                onChange={(e) => patchAdvance({ warningMessage: e.target.value })}
              />
            </AdminField>
            <AdminField label="Mensagem complementar">
              <AdminTextarea
                rows={3}
                value={form.orderAdvance.warningDescription}
                onChange={(e) => patchAdvance({ warningDescription: e.target.value })}
              />
            </AdminField>
            <p className="text-xs text-muted-foreground">
              Placeholders: {"{{minimumHours}}"}, {"{{selectedDate}}"}, {"{{selectedTime}}"}
            </p>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <div className="text-sm font-medium text-foreground">Botão WhatsApp</div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.orderAdvance.whatsappEnabled}
                onChange={(e) => patchAdvance({ whatsappEnabled: e.target.checked })}
              />
              Exibir botão WhatsApp
            </label>
            <AdminField label="Texto do botão">
              <AdminInput
                value={form.orderAdvance.whatsappButtonText}
                onChange={(e) => patchAdvance({ whatsappButtonText: e.target.value })}
              />
            </AdminField>
            <AdminField label="Número do WhatsApp (vazio = usa o principal do site)">
              <AdminInput
                value={form.orderAdvance.whatsappNumber}
                onChange={(e) => patchAdvance({ whatsappNumber: e.target.value })}
                placeholder={cms.settings.whatsapp}
              />
            </AdminField>
            <AdminField label="Mensagem automática">
              <AdminTextarea
                rows={3}
                value={form.orderAdvance.whatsappMessage}
                onChange={(e) => patchAdvance({ whatsappMessage: e.target.value })}
              />
            </AdminField>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <div className="text-sm font-medium text-foreground">Botão alterar pedido</div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.orderAdvance.changeOrderEnabled}
                onChange={(e) => patchAdvance({ changeOrderEnabled: e.target.checked })}
              />
              Exibir botão &quot;Fazer outro pedido&quot;
            </label>
            <AdminField label="Texto">
              <AdminInput
                value={form.orderAdvance.changeOrderButtonText}
                onChange={(e) => patchAdvance({ changeOrderButtonText: e.target.value })}
              />
            </AdminField>
          </div>

          <AdminButton type="button" variant="ghost" onClick={() => setPreviewOpen(true)}>
            Pré-visualizar mensagem
          </AdminButton>
        </div>
      ) : null}

      <div className="pt-4 border-t border-border">
        <AdminButton type="button" disabled={busy} onClick={() => void save()}>
          Salvar configurações
        </AdminButton>
      </div>

      {previewOpen ? (
        <OrderAdvanceModal
          open
          content={previewModal}
          onChangeOrder={() => setPreviewOpen(false)}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

function TimeSlotsEditor({
  slots,
  onChange,
}: {
  slots: CmsTimeSlot[];
  onChange: (slots: CmsTimeSlot[]) => void;
}) {
  const add = () => {
    const id = `t-${Date.now()}`;
    onChange([
      ...slots,
      { id, label: "08:00 a 10:00", start: "08:00", end: "10:00", enabled: true },
    ]);
  };

  return (
    <AdminField label="Horários disponíveis">
      <div className="space-y-2">
        {slots.map((s, idx) => (
          <div key={s.id} className="grid gap-2 sm:grid-cols-[1fr_100px_100px_auto] items-center">
            <AdminInput
              value={s.label}
              onChange={(e) => {
                const next = [...slots];
                next[idx] = { ...s, label: e.target.value };
                onChange(next);
              }}
            />
            <AdminInput
              value={s.start}
              placeholder="Início"
              onChange={(e) => {
                const next = [...slots];
                next[idx] = { ...s, start: e.target.value };
                onChange(next);
              }}
            />
            <AdminInput
              value={s.end}
              placeholder="Fim"
              onChange={(e) => {
                const next = [...slots];
                next[idx] = { ...s, end: e.target.value };
                onChange(next);
              }}
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) => {
                  const next = [...slots];
                  next[idx] = { ...s, enabled: e.target.checked };
                  onChange(next);
                }}
              />
              Ativo
            </label>
          </div>
        ))}
        <AdminButton type="button" variant="ghost" onClick={add}>
          Adicionar horário
        </AdminButton>
      </div>
    </AdminField>
  );
}

function CheckoutTextsEditor({
  texts,
  onChange,
}: {
  texts: CmsCheckoutTexts;
  onChange: (texts: CmsCheckoutTexts) => void;
}) {
  const keys = Object.keys(texts) as (keyof CmsCheckoutTexts)[];

  return (
    <div className="grid gap-3 sm:grid-cols-2 max-w-4xl">
      {keys.map((key) => (
        <AdminField key={key} label={key}>
          <AdminInput
            value={texts[key]}
            onChange={(e) => onChange({ ...texts, [key]: e.target.value })}
          />
        </AdminField>
      ))}
    </div>
  );
}

export function ProductPrepFields({
  form,
  setForm,
}: {
  form: {
    prepMethods?: PrepMethod[];
    fulfillmentTag?: ProductFulfillmentTag | null;
    promoPrice?: number | null;
    featured?: boolean;
    minQty?: number;
    maxQty?: number | null;
    available?: boolean;
    notes?: string;
    extraInfo?: string;
  };
  setForm: (next: typeof form) => void;
}) {
  const prepMethods = form.prepMethods ?? DEFAULT_PREP_METHODS;

  return (
    <>
      <AdminField label="Preço promocional (opcional)">
        <AdminInput
          type="number"
          step="0.01"
          value={form.promoPrice ?? ""}
          onChange={(e) =>
            setForm({
              ...form,
              promoPrice: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </AdminField>
      <AdminField label="Quantidade mínima">
        <AdminInput
          type="number"
          value={form.minQty ?? 1}
          onChange={(e) => setForm({ ...form, minQty: Number(e.target.value) })}
        />
      </AdminField>
      <AdminField label="Quantidade máxima">
        <AdminInput
          type="number"
          value={form.maxQty ?? ""}
          onChange={(e) =>
            setForm({
              ...form,
              maxQty: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </AdminField>
      <AdminField label="Disponibilidade no cardápio">
        <AdminSelect
          value={form.fulfillmentTag ?? ""}
          onChange={(e) =>
            setForm({
              ...form,
              fulfillmentTag: e.target.value
                ? (e.target.value as ProductFulfillmentTag)
                : null,
            })
          }
        >
          <option value="">Nenhuma etiqueta</option>
          {PRODUCT_FULFILLMENT_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              {PRODUCT_FULFILLMENT_LABELS[tag]}
            </option>
          ))}
        </AdminSelect>
      </AdminField>
      <div className="sm:col-span-2">
        <AdminField label="Formas de preparo">
          <div className="flex flex-wrap gap-3">
            {DEFAULT_PREP_METHODS.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={prepMethods.includes(m)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...prepMethods, m]
                      : prepMethods.filter((x) => x !== m);
                    setForm({ ...form, prepMethods: next.length ? next : [m] });
                  }}
                />
                {PREP_METHOD_LABELS[m]}
              </label>
            ))}
          </div>
        </AdminField>
      </div>
      <div className="sm:col-span-2">
        <AdminField label="Observações internas">
          <AdminTextarea
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </AdminField>
      </div>
      <div className="sm:col-span-2">
        <AdminField label="Informações adicionais (site)">
          <AdminTextarea
            value={form.extraInfo ?? ""}
            onChange={(e) => setForm({ ...form, extraInfo: e.target.value })}
          />
        </AdminField>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.featured ?? false}
          onChange={(e) => setForm({ ...form, featured: e.target.checked })}
        />
        Destaque no cardápio
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.available !== false}
          onChange={(e) => setForm({ ...form, available: e.target.checked })}
        />
        Disponível para pedido
      </label>
    </>
  );
}

export function ProductGramFields({
  form,
  setForm,
}: {
  form: CmsProduct;
  setForm: (next: CmsProduct) => void;
}) {
  const variation = form.gramVariation ?? {
    enabled: false,
    options: createDefaultGramOptions(form.price),
  };

  const patchVariation = (patch: Partial<typeof variation>) => {
    setForm({
      ...form,
      gramVariation: { ...variation, ...patch },
    });
  };

  const patchOption = (index: 0 | 1, patch: Partial<(typeof variation.options)[0]>) => {
    const options = [...variation.options];
    options[index] = { ...options[index], ...patch };
    patchVariation({ options });
  };

  return (
    <div className="sm:col-span-2 rounded-lg border border-gold/30 p-4 space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={variation.enabled}
          onChange={(e) => {
            const enabled = e.target.checked;
            patchVariation({
              enabled,
              options: enabled
                ? variation.options.length >= 2
                  ? variation.options
                  : createDefaultGramOptions(form.price)
                : variation.options,
            });
          }}
        />
        Variação por gramas (duas opções de peso)
      </label>

      {variation.enabled ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {([0, 1] as const).map((index) => {
            const option = variation.options[index] ?? createDefaultGramOptions(form.price)[index];
            return (
              <div key={option.id} className="space-y-3 rounded-md border border-border p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Opção {index + 1}
                </div>
                <AdminField label="Peso / rótulo">
                  <AdminInput
                    value={option.label}
                    onChange={(e) => patchOption(index, { label: e.target.value })}
                    placeholder="100g"
                  />
                </AdminField>
                <AdminField label="Preço desta opção">
                  <AdminInput
                    type="number"
                    step="0.01"
                    value={option.price}
                    onChange={(e) => patchOption(index, { price: Number(e.target.value) })}
                  />
                </AdminField>
                <AdminField label="Preço promocional (opcional)">
                  <AdminInput
                    type="number"
                    step="0.01"
                    value={option.promoPrice ?? ""}
                    onChange={(e) =>
                      patchOption(index, {
                        promoPrice: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </AdminField>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Quando ativado, o site mostra os dois preços e o cliente escolhe a gramatura ao adicionar ao
          carrinho.
        </p>
      )}
    </div>
  );
}

export function ProductFlavorFields({
  form,
  setForm,
}: {
  form: CmsProduct;
  setForm: (next: CmsProduct) => void;
}) {
  const variation = form.flavorVariation ?? createDefaultFlavorVariation();

  const patchVariation = (patch: Partial<typeof variation>) => {
    setForm({
      ...form,
      flavorVariation: { ...variation, ...patch },
    });
  };

  const updateOption = (index: number, name: string) => {
    const options = [...variation.options];
    options[index] = { ...options[index], name };
    patchVariation({ options });
  };

  const addOption = () => {
    if (variation.options.length >= 24) return;
    patchVariation({
      options: [
        ...variation.options,
        { id: `flavor-${Date.now().toString(36)}`, name: "" },
      ],
    });
  };

  const removeOption = (index: number) => {
    patchVariation({ options: variation.options.filter((_, i) => i !== index) });
  };

  return (
    <div className="sm:col-span-2 rounded-lg border border-gold/30 p-4 space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={variation.enabled}
          onChange={(e) => patchVariation({ enabled: e.target.checked })}
        />
        Variação de sabores
      </label>

      {variation.enabled ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Mínimo de sabores">
              <AdminInput
                type="number"
                min={1}
                max={10}
                value={variation.minSelect}
                onChange={(e) =>
                  patchVariation({ minSelect: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </AdminField>
            <AdminField label="Máximo de sabores">
              <AdminInput
                type="number"
                min={1}
                max={10}
                value={variation.maxSelect}
                onChange={(e) =>
                  patchVariation({ maxSelect: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </AdminField>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Sabores disponíveis
            </div>
            {variation.options.map((option, index) => (
              <div key={option.id} className="flex gap-2">
                <AdminInput
                  value={option.name}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Sabor ${index + 1}`}
                />
                <AdminButton
                  type="button"
                  variant="ghost"
                  disabled={variation.options.length <= 1}
                  onClick={() => removeOption(index)}
                >
                  Remover
                </AdminButton>
              </div>
            ))}
            <AdminButton type="button" variant="ghost" onClick={addOption}>
              Adicionar sabor
            </AdminButton>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Ative para o cliente escolher sabores ao adicionar o produto (com mínimo e máximo
          configuráveis).
        </p>
      )}
    </div>
  );
}
