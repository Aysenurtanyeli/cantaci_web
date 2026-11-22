export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatPrice(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function asBool(value) {
  return (
    value === true ||
    value === "true" ||
    value === "t" ||
    value === 1 ||
    value === "1"
  );
}

export function categoryKey(value) {
  const key = String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR");
  if (["kadin", "kadın", "women", "woman"].includes(key)) return "kadin";
  if (["erkek", "men", "man"].includes(key)) return "erkek";
  if (["unisex", "üniseks", "uniseks"].includes(key)) return "unisex";
  if (["cocuk", "çocuk", "kids", "children"].includes(key)) return "cocuk";
  return key;
}

export function categoryLabel(value) {
  const key = categoryKey(value);
  if (key === "kadin") return "Kadın";
  if (key === "erkek") return "Erkek";
  if (key === "unisex") return "Unisex";
  if (key === "cocuk") return "Çocuk";
  return String(value ?? "").trim();
}

export const PRODUCT_TYPE_OPTIONS = [
  { value: "canta", label: "Çanta" },
  { value: "cuzdan", label: "Cüzdan" },
  { value: "valiz", label: "Valiz" },
];

export const COLOR_OPTIONS = [
  "Siyah",
  "Beyaz",
  "Kahverengi",
  "Bej",
  "Krem",
  "Gri",
  "Lacivert",
  "Mavi",
  "Kırmızı",
  "Bordo",
  "Yeşil",
  "Haki",
  "Pembe",
  "Lila",
  "Mor",
  "Sarı",
  "Turuncu",
  "Su yeşili",
];

export function subtypeOptions(category, type) {
  if (type === "canta" && category === "cocuk")
    return [
      { value: "okul-cantasi", label: "Okul çantası" },
      { value: "cocuk-sirt-cantasi", label: "Çocuk sırt çantası" },
      { value: "beslenme-cantasi", label: "Beslenme çantası" },
      { value: "cocuk-el-cantasi", label: "Çocuk el çantası" },
    ];
  if (type === "canta")
    return [
      { value: "sirt-cantasi", label: "Sırt çantası" },
      { value: "el-cantasi", label: "El çantası" },
      { value: "kucuk-canta", label: "Küçük çanta" },
      { value: "buyuk-canta", label: "Büyük çanta" },
    ];
  if (type === "cuzdan") {
    if (category === "cocuk")
      return [{ value: "cocuk-cuzdani", label: "Çocuk cüzdanı" }];
    if (category === "kadin")
      return [{ value: "kadin-cuzdani", label: "Kadın cüzdanı" }];
    if (category === "erkek")
      return [{ value: "erkek-cuzdani", label: "Erkek cüzdanı" }];
    return [{ value: "unisex-cuzdan", label: "Unisex cüzdan" }];
  }
  if (type === "valiz")
    return [
      { value: "el-valizi", label: "El valizi" },
      { value: "tekerlekli-valiz", label: "Tekerlekli valiz" },
    ];
  return [];
}

export function productTypeLabel(value) {
  return (
    PRODUCT_TYPE_OPTIONS.find((option) => option.value === value)?.label || ""
  );
}

export function productSubtypeLabel(category, type, subtype) {
  return (
    subtypeOptions(category, type).find((option) => option.value === subtype)
      ?.label || ""
  );
}

export function productColors(value) {
  if (Array.isArray(value))
    return value.map((color) => String(color).trim()).filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((color) => color.trim())
    .filter(Boolean);
}

export function colorVariantImageMap(value) {
  let raw = value;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { return {}; }
  }
  if (!Array.isArray(raw)) return {};
  return Object.fromEntries(raw
    .filter((variant) => variant && typeof variant.color === "string")
    .map((variant) => [variant.color, Array.isArray(variant.images) ? variant.images.filter((url) => typeof url === "string" && url.trim()) : []]));
}

export function isSoldOut(value) {
  const key = String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR");
  return ["tükendi", "tukendi", "yok", "stokta yok", "sold"].includes(key);
}

export function stockLabel(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Stok sorulur";
  if (isSoldOut(raw)) return "Tükendi";
  return raw;
}

export function collectImageValues(product) {
  let raw = product?.gorseller;
  if (!raw) return [];
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      raw = JSON.parse(trimmed);
    } catch {
      raw = trimmed.split(",").map((part) => part.trim());
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item.trim();
      return String(item.url || item.path || item.src || "").trim();
    })
    .filter(Boolean);
}

export function resolveImageUrl(value, supabase, bucket) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.replace(/^\/+/, "");
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || "";
}

export function productImageUrls(product, supabase, bucket) {
  return collectImageValues(product)
    .map((value) => resolveImageUrl(value, supabase, bucket))
    .filter((url) => /^https?:\/\//i.test(url));
}

export function matchesFilter(product, filter) {
  const rawPrice = product?.fiyat;
  const price = rawPrice === null || rawPrice === undefined || String(rawPrice).trim() === "" ? NaN : Number(rawPrice);
  const category = categoryKey(product?.kategori);
  switch (filter) {
    case "stand":
      return (
        asBool(product?.stand_200_tl) ||
        (Number.isFinite(price) && price <= 200)
      );
    case "kaliteli":
      return asBool(product?.kaliteli_mi);
    case "kadin":
      return category === "kadin" || category === "unisex";
    case "erkek":
      return category === "erkek" || category === "unisex";
    case "one_cikan":
      return asBool(product?.one_cikan);
    default:
      return true;
  }
}

export function richText(value) {
  return esc(value).replace(/\n/g, "<br />");
}
