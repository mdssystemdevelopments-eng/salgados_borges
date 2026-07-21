export type CmsProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  categoryId: string;
  image: string;
  visible: boolean;
  order: number;
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
};

export type CmsCollection =
  | "categories"
  | "products"
  | "gallery"
  | "faq"
  | "testimonials"
  | "steps"
  | "features";
