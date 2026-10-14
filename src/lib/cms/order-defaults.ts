import type {
  CmsCheckoutTexts,
  CmsCoupon,
  CmsOrderAdvanceSettings,
  CmsOrderSettings,
  CmsPaymentMethod,
  PrepMethod,
  ProductFulfillmentTag,
} from "./types";

export const PREP_METHOD_LABELS: Record<PrepMethod, string> = {
  congelado: "Congelado",
  frito: "Frito",
  assado: "Assado",
};

export const PRODUCT_FULFILLMENT_LABELS: Record<ProductFulfillmentTag, string> = {
  pronta_entrega: "Pronta entrega",
  sob_encomenda: "Sob encomenda",
  encomenda_24h: "Encomenda com 24h",
  encomenda_48h: "Encomenda com 48h",
  apenas_retirada: "Apenas retirada",
};

export const PRODUCT_FULFILLMENT_TAGS: ProductFulfillmentTag[] = [
  "pronta_entrega",
  "sob_encomenda",
  "encomenda_24h",
  "encomenda_48h",
  "apenas_retirada",
];

export const DEFAULT_PREP_METHODS: PrepMethod[] = ["congelado", "frito", "assado"];

export function createDefaultCheckoutTexts(): CmsCheckoutTexts {
  return {
    cartTitle: "Seu carrinho",
    cartEmpty: "Seu carrinho está vazio.",
    cartContinue: "Ver cardápio",
    cartSubtotal: "Subtotal",
    cartDiscount: "Desconto",
    cartDeliveryFee: "Taxa de entrega",
    cartTotal: "Total",
    couponQuestion: "Possui um cupom de desconto?",
    couponPlaceholder: "Digite seu cupom",
    couponApply: "Aplicar",
    couponApplied: "Cupom aplicado",
    couponInvalid: "Cupom inválido. Verifique o código e tente novamente.",
    couponExpired: "Este cupom expirou.",
    couponExhausted: "Este cupom não está mais disponível.",
    couponAlreadyUsed: "Você não pode utilizar este cupom novamente.",
    couponMinOrder: "Valor mínimo do pedido não atingido para este cupom.",
    checkoutStart: "Finalizar pedido",
    stepFulfillment: "Como você deseja receber?",
    stepDelivery: "Entrega",
    stepPickup: "Retirada",
    stepDeliveryAddress: "Endereço de entrega",
    stepPickupInfo: "Retirada no local",
    stepDate: "Data desejada",
    stepTime: "Horário",
    stepPayment: "Como você deseja pagar?",
    stepCustomer: "Seus dados",
    stepReview: "Confirme seu pedido",
    fieldName: "Nome",
    fieldPhone: "Telefone",
    fieldCep: "CEP",
    fieldAddress: "Endereço",
    fieldNumber: "Número",
    fieldComplement: "Complemento",
    fieldDistrict: "Bairro",
    fieldReference: "Referência",
    fieldNotes: "Observações",
    fieldObservations: "Observações do pedido",
    changeQuestion: "Precisa de troco?",
    changeNo: "Não",
    changeYes: "Sim",
    changeFor: "Troco para quanto?",
    btnBack: "Voltar",
    btnNext: "Continuar",
    btnSendWhatsapp: "Fazer pedido",
    orderSubmitSuccess: "Pedido enviado!",
    orderSubmitSuccessDetail:
      "Recebemos seu pedido. Em breve a salgaderia entrará em contato pelo WhatsApp para confirmar.",
    orderSubmitFailed:
      "Não foi possível enviar o pedido agora. Verifique sua conexão e tente novamente, ou use os botões de contato do site.",
    orderSubmitFailedNotConfigured:
      "O envio automático do pedido não está ativo neste servidor. Avise a loja ou use o WhatsApp de contato do site.",
    orderSubmitFailedApi:
      "Não conseguimos entregar seu pedido pelo WhatsApp da loja agora. Tente de novo em instantes ou fale conosco pelo contato do site.",
    orderSubmitFailedInvalidNumber:
      "Não foi possível enviar o pedido: o número da loja no sistema está incorreto (use DDI 55, ex.: 5517991005213). Avise o administrador do site.",
    orderSubmitClose: "Fechar",
    btnAddToCart: "Adicionar ao carrinho",
    prepLabel: "Forma de preparo",
    qtyLabel: "Quantidade",
    searchPlaceholder: "Buscar no cardápio",
    unavailable: "Indisponível",
    featured: "Destaque",
    minQtyHint: "Quantidade mínima",
    maxQtyHint: "Quantidade máxima",
    ordersDisabled: "Pedidos online temporariamente indisponíveis. Fale conosco pelo WhatsApp.",
    dateUnavailable: "Esta data não está disponível.",
    timeUnavailable: "Este horário não está disponível.",
    phoneInvalid: "Informe um telefone válido com DDD.",
    requiredField: "Preencha os campos obrigatórios.",
    reviewProducts: "Produtos",
    reviewFulfillment: "Recebimento",
    reviewDate: "Data",
    reviewTime: "Horário",
    reviewPayment: "Pagamento",
    reviewCustomer: "Cliente",
    reviewTotals: "Valores",
  };
}

export function createDefaultPaymentMethods(): CmsPaymentMethod[] {
  return [
    { id: "pix", label: "Pix", enabled: true, order: 0 },
    { id: "dinheiro", label: "Dinheiro", enabled: true, order: 1 },
    { id: "credito", label: "Cartão de crédito", enabled: true, order: 2 },
    { id: "debito", label: "Cartão de débito", enabled: true, order: 3 },
  ];
}

export function createDefaultOrderAdvanceSettings(): CmsOrderAdvanceSettings {
  return {
    enabled: true,
    minimumAdvanceHours: 48,
    timeZone: "America/Sao_Paulo",
    warningTitle: "Atenção!",
    warningMessage:
      "Pedidos que não são de pronta entrega precisam ser realizados com no mínimo 48 horas de antecedência, pois precisamos de tempo para preparar sua encomenda.",
    warningDescription: "A data escolhida está dentro do período mínimo de antecedência.",
    whatsappEnabled: true,
    whatsappButtonText: "Falar pelo WhatsApp",
    whatsappMessage:
      "Olá! Gostaria de verificar a possibilidade de realizar um pedido para uma data que está dentro do prazo mínimo de antecedência.",
    whatsappNumber: "",
    changeOrderEnabled: true,
    changeOrderButtonText: "Alterar pedido",
  };
}

export function createDefaultOrderSettings(): CmsOrderSettings {
  return {
    enabled: true,
    allowDelivery: true,
    allowPickup: true,
    delivery: {
      enabled: true,
      feeMode: "free",
      fixedFee: 0,
      instructions:
        "Entregamos em Votuporanga e região. O valor final do frete pode ser confirmado no WhatsApp.",
      regions: [],
    },
    pickup: {
      enabled: true,
      address: "R. Tietê, 2870, Santa Eliza, Votuporanga, SP",
      hours: "Terça a domingo, das 8h às 20h",
      instructions: "Retirada com horário agendado. Avise quando chegar.",
      notes: "",
    },
    schedule: {
      minLeadDays: 1,
      allowSameDay: false,
      availableWeekdays: [0, 1, 2, 3, 4, 5, 6],
      blockedDates: [],
      timeSlots: [
        { id: "t1", label: "08:00 a 10:00", start: "08:00", end: "10:00", enabled: true },
        { id: "t2", label: "10:00 a 12:00", start: "10:00", end: "12:00", enabled: true },
        { id: "t3", label: "12:00 a 14:00", start: "12:00", end: "14:00", enabled: true },
        { id: "t4", label: "14:00 a 16:00", start: "14:00", end: "16:00", enabled: true },
        { id: "t5", label: "16:00 a 18:00", start: "16:00", end: "18:00", enabled: true },
      ],
      blockedTimeSlotIds: [],
    },
    paymentMethods: createDefaultPaymentMethods(),
    checkoutTexts: createDefaultCheckoutTexts(),
    orderAdvance: createDefaultOrderAdvanceSettings(),
  };
}

export function createSampleCoupons(): CmsCoupon[] {
  return [
    {
      id: "cup-borges10",
      code: "BORGES10",
      description: "10% de desconto na primeira encomenda",
      discountType: "percent",
      discountValue: 10,
      quantityAvailable: 100,
      quantityUsed: 0,
      limitPerCustomer: 1,
      minOrderValue: 80,
      startsAt: null,
      endsAt: null,
      productIds: [],
      categoryIds: [],
      active: true,
      visible: true,
      order: 0,
    },
  ];
}
