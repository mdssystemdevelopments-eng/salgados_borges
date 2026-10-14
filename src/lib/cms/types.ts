export type PrepMethod = "congelado" | "frito" | "assado";

export type CmsProductGramOption = {
  id: string;
  /** Ex.: 100g, 200g */
  label: string;
  price: number;
  promoPrice?: number | null;
};

export type CmsProductGramVariation = {
  enabled: boolean;
  options: CmsProductGramOption[];
};

export type CmsProductFlavorOption = {
  id: string;
  name: string;
};

export type CmsProductFlavorVariation = {
  enabled: boolean;
  /** Quantidade minima de sabores que o cliente deve marcar. */
  minSelect: number;
  /** Quantidade maxima de sabores permitidos. */
  maxSelect: number;
  options: CmsProductFlavorOption[];
};

/** Disponibilidade / prazo do produto no cardápio. */
export type ProductFulfillmentTag =
  | "pronta_entrega"
  | "sob_encomenda"
  | "encomenda_24h"
  | "encomenda_48h"
  | "apenas_retirada";

export type CmsProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Preço promocional; quando definido e menor que price, usa este valor. */
  promoPrice?: number | null;
  unit: string;
  categoryId: string;
  image: string;
  visible: boolean;
  order: number;
  featured?: boolean;
  minQty?: number;
  maxQty?: number | null;
  available?: boolean;
  prepMethods?: PrepMethod[];
  /** Duas opções de peso (ex. 100g / 200g) com preços distintos. */
  gramVariation?: CmsProductGramVariation;
  /** Sabores opcionais (ex.: recheios) com minimo e maximo de escolhas. */
  flavorVariation?: CmsProductFlavorVariation;
  /** Etiqueta de pronta entrega, encomenda etc. exibida no cardápio. */
  fulfillmentTag?: ProductFulfillmentTag | null;
  notes?: string;
  extraInfo?: string;
};

export type CmsCategory = {
  id: string;
  name: string;
  visible: boolean;
  order: number;
};

export type CmsGalleryItem = {
  id: string;
  image: string;
  alt: string;
  visible: boolean;
  order: number;
};

export type CmsFaqItem = {
  id: string;
  question: string;
  answer: string;
  visible: boolean;
  order: number;
};

export type CmsTestimonial = {
  id: string;
  name: string;
  role: string;
  stars: number;
  text: string;
  visible: boolean;
  order: number;
};

export type CmsStep = {
  id: string;
  number: string;
  title: string;
  text: string;
  visible: boolean;
  order: number;
};

export type CmsFeature = {
  id: string;
  title: string;
  text: string;
  visible: boolean;
  order: number;
};

export type CouponDiscountType = "percent" | "fixed";

export type CmsCoupon = {
  id: string;
  code: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  /** Quantas vezes o cupom pode ser usado no total. */
  quantityAvailable: number;
  quantityUsed: number;
  /** Quantas vezes o mesmo telefone pode usar; null = sem limite por cliente. */
  limitPerCustomer: number | null;
  minOrderValue: number;
  startsAt: string | null;
  endsAt: string | null;
  productIds: string[];
  categoryIds: string[];
  active: boolean;
  visible: boolean;
  order: number;
  /** Uso registrado no servidor (telefone normalizado). */
  redemptions?: CouponRedemption[];
};

export type CouponRedemption = {
  phone: string;
  redeemedAt: string;
};

export type CmsMenuLink = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  active: boolean;
  categoryIds: string[];
  productIds: string[];
  showPrices: boolean;
  allowOrders: boolean;
  order: number;
  createdAt: string;
};

export type DeliveryFeeMode = "free" | "fixed";

export type CmsDeliveryRegion = {
  id: string;
  name: string;
  fee: number;
};

export type CmsTimeSlot = {
  id: string;
  label: string;
  start: string;
  end: string;
  enabled: boolean;
};

export type CmsPaymentMethod = {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
};

export type CmsCheckoutTexts = {
  cartTitle: string;
  cartEmpty: string;
  cartContinue: string;
  cartSubtotal: string;
  cartDiscount: string;
  cartDeliveryFee: string;
  cartTotal: string;
  couponQuestion: string;
  couponPlaceholder: string;
  couponApply: string;
  couponApplied: string;
  couponInvalid: string;
  couponExpired: string;
  couponExhausted: string;
  couponAlreadyUsed: string;
  couponMinOrder: string;
  checkoutStart: string;
  stepFulfillment: string;
  stepDelivery: string;
  stepPickup: string;
  stepDeliveryAddress: string;
  stepPickupInfo: string;
  stepDate: string;
  stepTime: string;
  stepPayment: string;
  stepCustomer: string;
  stepReview: string;
  fieldName: string;
  fieldPhone: string;
  fieldCep: string;
  fieldAddress: string;
  fieldNumber: string;
  fieldComplement: string;
  fieldDistrict: string;
  fieldReference: string;
  fieldNotes: string;
  fieldObservations: string;
  changeQuestion: string;
  changeNo: string;
  changeYes: string;
  changeFor: string;
  btnBack: string;
  btnNext: string;
  btnSendWhatsapp: string;
  orderSubmitSuccess: string;
  orderSubmitSuccessDetail: string;
  orderSubmitFailed: string;
  orderSubmitClose: string;
  btnAddToCart: string;
  prepLabel: string;
  qtyLabel: string;
  searchPlaceholder: string;
  unavailable: string;
  featured: string;
  minQtyHint: string;
  maxQtyHint: string;
  ordersDisabled: string;
  dateUnavailable: string;
  timeUnavailable: string;
  phoneInvalid: string;
  requiredField: string;
  reviewProducts: string;
  reviewFulfillment: string;
  reviewDate: string;
  reviewTime: string;
  reviewPayment: string;
  reviewCustomer: string;
  reviewTotals: string;
};

export type CmsOrderAdvanceSettings = {
  /** Exigir antecedência mínima para pedidos que não sejam pronta entrega. */
  enabled: boolean;
  minimumAdvanceHours: number;
  /** Fuso horário da loja (IANA). */
  timeZone: string;
  warningTitle: string;
  warningMessage: string;
  warningDescription: string;
  whatsappEnabled: boolean;
  whatsappButtonText: string;
  whatsappMessage: string;
  /** Vazio = usa o WhatsApp principal do site. */
  whatsappNumber: string;
  changeOrderEnabled: boolean;
  changeOrderButtonText: string;
};

export type CmsOrderSettings = {
  enabled: boolean;
  allowDelivery: boolean;
  allowPickup: boolean;
  delivery: {
    enabled: boolean;
    feeMode: DeliveryFeeMode;
    fixedFee: number;
    instructions: string;
    regions: CmsDeliveryRegion[];
  };
  pickup: {
    enabled: boolean;
    address: string;
    hours: string;
    instructions: string;
    notes: string;
  };
  schedule: {
    minLeadDays: number;
    allowSameDay: boolean;
    availableWeekdays: number[];
    blockedDates: string[];
    timeSlots: CmsTimeSlot[];
    blockedTimeSlotIds: string[];
  };
  paymentMethods: CmsPaymentMethod[];
  checkoutTexts: CmsCheckoutTexts;
  orderAdvance: CmsOrderAdvanceSettings;
};

export type CmsPageSection =
  | "hero"
  | "about"
  | "products"
  | "howItWorks"
  | "features"
  | "gallery"
  | "testimonials"
  | "faq"
  | "contact";

export type CmsSectionsVisibility = {
  hero: boolean;
  about: boolean;
  products: boolean;
  howItWorks: boolean;
  features: boolean;
  gallery: boolean;
  testimonials: boolean;
  faq: boolean;
  contact: boolean;
  floatingWhatsapp: boolean;
};

export type CmsContent = {
  brandName: string;
  brandTagline: string;
  logoUrl: string;
  hero: {
    image: string;
    imageOpacity: number;
    overlayOpacity: number;
    titleLine1: string;
    titleLine2: string;
    titleLine3: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    badges: string[];
  };
  about: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    image: string;
    paragraphs: string[];
    highlights: { title: string; text: string }[];
  };
  productsSection: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    subtitle: string;
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    titleAccent: string;
  };
  features: {
    eyebrow: string;
    title: string;
    titleAccent: string;
  };
  gallery: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    subtitle: string;
  };
  testimonials: {
    eyebrow: string;
    title: string;
    titleAccent: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    titleAccent: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    subtitle: string;
  };
  footer: {
    description: string;
    cnpj: string;
  };
};

export type CmsSettings = {
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  mapEmbedUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  sections: CmsSectionsVisibility;
  sectionOrder: CmsPageSection[];
  orderSettings: CmsOrderSettings;
};

export type CmsData = {
  version: number;
  updatedAt: string;
  content: CmsContent;
  settings: CmsSettings;
  categories: CmsCategory[];
  products: CmsProduct[];
  gallery: CmsGalleryItem[];
  faq: CmsFaqItem[];
  testimonials: CmsTestimonial[];
  steps: CmsStep[];
  features: CmsFeature[];
  coupons: CmsCoupon[];
  menuLinks: CmsMenuLink[];
};

export type CmsCollection =
  | "categories"
  | "products"
  | "gallery"
  | "faq"
  | "testimonials"
  | "steps"
  | "features"
  | "coupons"
  | "menuLinks";

export type CouponValidationResult =
  | {
      valid: true;
      couponId: string;
      code: string;
      discountAmount: number;
      message: string;
    }
  | {
      valid: false;
      reason: "invalid" | "expired" | "exhausted" | "min_order" | "inactive" | "customer_limit";
      message: string;
    };
