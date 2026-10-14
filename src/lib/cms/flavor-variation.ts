import type { CmsProduct, CmsProductFlavorOption, CmsProductFlavorVariation } from "./types";

export function createDefaultFlavorVariation(): CmsProductFlavorVariation {
  return {
    enabled: false,
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: "flavor-1", name: "Frango" },
      { id: "flavor-2", name: "Carne" },
    ],
  };
}

export function normalizeFlavorVariation(
  raw: Partial<CmsProductFlavorVariation> | undefined,
): CmsProductFlavorVariation {
  const base = createDefaultFlavorVariation();
  if (!raw) return base;

  const enabled = Boolean(raw.enabled);
  let minSelect = Math.max(0, Math.min(10, Math.floor(Number(raw.minSelect) || 1)));
  let maxSelect = Math.max(0, Math.min(10, Math.floor(Number(raw.maxSelect) || 1)));
  if (maxSelect < minSelect) maxSelect = minSelect;

  const options: CmsProductFlavorOption[] = Array.isArray(raw.options)
    ? raw.options.slice(0, 24).map((opt, index) => ({
        id:
          typeof opt?.id === "string" && opt.id.trim()
            ? opt.id.trim().slice(0, 40)
            : `flavor-${index + 1}`,
        name: typeof opt?.name === "string" ? opt.name.trim().slice(0, 48) : "",
      }))
    : base.options;

  const cleaned = options.filter((o) => o.name.length > 0);
  if (enabled && cleaned.length === 0) {
    return { ...base, enabled: false };
  }

  if (enabled && maxSelect > cleaned.length) {
    maxSelect = cleaned.length;
  }
  if (enabled && minSelect > maxSelect) {
    minSelect = maxSelect;
  }

  return {
    enabled,
    minSelect: enabled ? Math.max(1, minSelect) : minSelect,
    maxSelect: enabled ? Math.max(1, maxSelect) : maxSelect,
    options: cleaned.length > 0 ? cleaned : base.options,
  };
}

export function isFlavorVariationEnabled(product: CmsProduct): boolean {
  const v = product.flavorVariation;
  return Boolean(v?.enabled && v.options.some((o) => o.name.trim()));
}

export function getFlavorOptions(product: CmsProduct): CmsProductFlavorOption[] {
  if (!isFlavorVariationEnabled(product)) return [];
  return product.flavorVariation!.options.filter((o) => o.name.trim());
}

export function getFlavorSelectionRules(product: CmsProduct): { min: number; max: number } {
  const v = product.flavorVariation;
  if (!isFlavorVariationEnabled(product) || !v) {
    return { min: 0, max: 0 };
  }
  return { min: v.minSelect, max: v.maxSelect };
}

export function formatFlavorSelectionHint(product: CmsProduct): string {
  const { min, max } = getFlavorSelectionRules(product);
  if (min === max) {
    return min === 1 ? "Escolha 1 sabor" : `Escolha ${min} sabores`;
  }
  return `Escolha de ${min} a ${max} sabores`;
}

export function isValidFlavorSelection(product: CmsProduct, selectedIds: string[]): boolean {
  if (!isFlavorVariationEnabled(product)) return true;
  const options = getFlavorOptions(product);
  const validIds = new Set(options.map((o) => o.id));
  const picked = selectedIds.filter((id) => validIds.has(id));
  const { min, max } = getFlavorSelectionRules(product);
  return picked.length >= min && picked.length <= max;
}

export function getFlavorNamesByIds(product: CmsProduct, selectedIds: string[]): string[] {
  const map = new Map(getFlavorOptions(product).map((o) => [o.id, o.name]));
  return selectedIds.map((id) => map.get(id)).filter((name): name is string => Boolean(name));
}
