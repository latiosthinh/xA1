export interface ProductAttributes {
  duration?: string | null;
  type?: string | null;
  warranty?: string | null;
}

export function formatProductDescription(attrs: ProductAttributes): string {
  const parts: string[] = [];
  if (attrs.duration?.trim()) parts.push(attrs.duration.trim());
  if (attrs.type?.trim()) parts.push(attrs.type.trim());
  if (attrs.warranty?.trim()) {
    const w = attrs.warranty.trim();
    parts.push(w.toLowerCase().startsWith("warranty") ? w : `Warranty ${w}`);
  }
  return parts.join(" - ");
}

export function parseProductDescription(raw?: string | null): { duration?: string; type?: string; warranty?: string } {
  if (!raw) return {};
  const segments = raw.split("-").map((s) => s.trim()).filter(Boolean);
  if (segments.length >= 3) {
    return {
      duration: segments[0],
      type: segments[1],
      warranty: segments.slice(2).join(" - ").replace(/^warranty\s*/i, ""),
    };
  }
  if (segments.length === 2) {
    return {
      duration: segments[0],
      type: segments[1],
    };
  }
  if (segments.length === 1) {
    return {
      duration: segments[0],
    };
  }
  return {};
}

export function getEffectiveProductAttributes(product: {
  duration?: string | null;
  deliveryType?: string | null;
  warranty?: string | null;
}): { duration: string; type: string; warranty: string } {
  return {
    duration: (product.duration || "").trim(),
    type: (product.deliveryType || "").trim(),
    warranty: (product.warranty || "").trim(),
  };
}


