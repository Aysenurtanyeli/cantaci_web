import { SHOP, STORAGE_BUCKET, supabase } from "./supabase.js";
import {
  asBool,
  categoryKey,
  COLOR_OPTIONS,
  colorVariantImageMap,
  esc,
  formatPrice,
  productColors,
  productImageUrls,
  subtypeOptions,
} from "./format.js";

const form = document.querySelector("#product-form");
const listEl = document.querySelector("#admin-products");
const titleEl = document.querySelector("#editor-title");
const deleteBtn = document.querySelector("#delete-product");
const errorEl = document.querySelector("#form-error");
const statusEl = document.querySelector("#save-status");
const who = document.querySelector("#admin-who");
const searchInput = document.querySelector("#product-search");
const overviewEl = document.querySelector("#admin-overview");
const colorOptionsEl = document.querySelector("#color-options");
const colorSummaryEl = document.querySelector("#color-selection-summary");
const colorSelectEl = document.querySelector("#color-to-add");
const colorsInput = form?.elements.namedItem("renkler");
const COLOR_SWATCHES = {
  "Su yeşili": "#73cfc1",
  Siyah: "#171717", Beyaz: "#ffffff", Kahverengi: "#795548", Bej: "#d6c2a2", Krem: "#f2e6cf",
  Gri: "#929292", Lacivert: "#24365c", Mavi: "#4387c7", "Kırmızı": "#c63737",
  Bordo: "#78263d", "Yeşil": "#4a8058", Haki: "#77784d", Pembe: "#e9a8bb", Lila: "#c8a2c8",
  Mor: "#895aa5", Sarı: "#e3c64d", Turuncu: "#e58a3b", "Çok renkli": "linear-gradient(135deg,#ee6875,#e9c24e,#54a77b,#637bdd)",
};
let products = [];
let activeFilter = "all";
let selectedColors = [];

let editingId = null;
let existingVariantImages = {};
let newVariantFiles = {};

function isAdmin(user) {
  return user?.email?.toLowerCase() === SHOP.adminEmail.toLowerCase();
}

function setError(message) {
  if (errorEl) errorEl.textContent = message || "";
}

function syncSubtypeOptions(selected = "") {
  const choices = subtypeOptions(categoryKey(form.kategori.value), form.urun_turu.value);
  form.alt_tur.innerHTML = choices.length
    ? `<option value="">Model seçin</option>${choices.map((item) => `<option value="${item.value}">${item.label}</option>`).join("")}`
    : `<option value="">Önce ürün türü seçin</option>`;
  form.alt_tur.disabled = !choices.length;
  if (choices.some((item) => item.value === selected)) form.alt_tur.value = selected;
  else if (choices.length === 1) form.alt_tur.value = choices[0].value;
}

function renderColorOptions(selected = []) {
  selectedColors = [...new Set(selected.map((color) => String(color).trim()).filter(Boolean))];
  if (colorSelectEl) {
    const extras = selectedColors.filter((color) => !COLOR_OPTIONS.includes(color));
    colorSelectEl.innerHTML = `<option value="">Eklenecek rengi seç</option>${[...COLOR_OPTIONS, ...extras]
      .map((color) => `<option value="${esc(color)}" ${selectedColors.includes(color) ? "disabled" : ""}>${esc(color)}${selectedColors.includes(color) ? " · eklendi" : ""}</option>`)
      .join("")}`;
  }
  if (colorOptionsEl) {
    colorOptionsEl.innerHTML = selectedColors.length
      ? selectedColors.map((color) => `
        <div class="color-variant-row">
          <div class="color-variant-head">
          <span class="color-variant-swatch" style="--variant-color:${COLOR_SWATCHES[color] || "#999"}" aria-hidden="true"></span>
          <strong>${esc(color)}</strong>
          <span class="color-variant-caption">Bu ürünün renk seçeneği</span>
          <button type="button" data-remove-color="${esc(color)}" aria-label="${esc(color)} rengini kaldır">Rengi kaldır</button>
          </div>
          <label class="variant-photo-drop" data-variant-drop="${esc(color)}">
            <span>Bu rengin fotoğraflarını seç veya buraya bırak</span>
            <small>JPG, PNG, WEBP · her fotoğraf en fazla 5 MB</small>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-variant-files="${esc(color)}" />
          </label>
          <div class="variant-photo-previews" data-variant-previews="${esc(color)}">${renderVariantPreviews(color)}</div>
        </div>`).join("")
      : `<p class="color-variant-empty">Henüz renk eklenmedi. Yukarıdan ürünün bir rengini seçip ekleyebilirsin.</p>`;
  }
  if (colorsInput) colorsInput.value = selectedColors.join(", ");
  renderColorSummary(selectedColors);
}

function renderVariantPreviews(color) {
  const saved = existingVariantImages[color] || [];
  const fresh = newVariantFiles[color] || [];
  const previews = [
    ...saved.map((url, index) => `<div class="preview"><img src="${esc(url)}" alt="${esc(color)} renk fotoğrafı" /><button type="button" data-remove-variant-existing="${esc(color)}" data-index="${index}" aria-label="Fotoğrafı kaldır">×</button></div>`),
    ...fresh.map((item, index) => `<div class="preview"><img src="${esc(item.url)}" alt="${esc(color)} renk fotoğrafı" /><button type="button" data-remove-variant-new="${esc(color)}" data-index="${index}" aria-label="Fotoğrafı kaldır">×</button></div>`),
  ];
  return previews.join("") || `<span class="variant-no-photos">Bu renk için henüz fotoğraf eklenmedi.</span>`;
}

function updateVariantPreviews(color) {
  const target = colorOptionsEl?.querySelector(`[data-variant-previews="${CSS.escape(color)}"]`);
  if (target) target.innerHTML = renderVariantPreviews(color);
}

function renderColorSummary(selected) {
  if (!colorSummaryEl) return;
  colorSummaryEl.innerHTML = selected.length
    ? `<strong>${selected.length} renk seçildi</strong><span>${selected.map((color) => `<em>${esc(color)}</em>`).join("")}</span>`
    : "Henüz renk seçilmedi.";
  colorSummaryEl.classList.toggle("has-colors", selected.length > 0);
}

function syncColorsInput() {
  if (colorsInput) colorsInput.value = selectedColors.join(", ");
  renderColorSummary(selectedColors);
}

function revokeNew() {
  Object.values(newVariantFiles).flat().forEach((item) => URL.revokeObjectURL(item.url));
  newVariantFiles = {};
}

function resetForm() {
  editingId = null;
  existingVariantImages = {};
  revokeNew();
  form?.reset();
  if (form?.yayinda_mi) form.yayinda_mi.checked = true;
  if (form) syncSubtypeOptions();
  renderColorOptions();
  if (titleEl) titleEl.textContent = "Yeni ürün";
  if (deleteBtn) deleteBtn.hidden = true;
  setError("");
  if (statusEl) statusEl.textContent = "";
  document.querySelectorAll(".admin-item").forEach((btn) => btn.classList.remove("is-active"));
}

function fillForm(product) {
  editingId = product.id;
  existingVariantImages = Object.fromEntries(Object.entries(colorVariantImageMap(product.renk_gorselleri)).map(([color, urls]) => [color, urls.map((url) => /^https?:\/\//i.test(url) ? url : supabase.storage.from(STORAGE_BUCKET).getPublicUrl(url).data.publicUrl)]));
  const legacyImages = productImageUrls(product, supabase, STORAGE_BUCKET);
  const legacyOwnerColor = productColors(product.renkler)[0];
  if (legacyImages.length && legacyOwnerColor && !existingVariantImages[legacyOwnerColor]?.length) {
    existingVariantImages[legacyOwnerColor] = legacyImages;
  }
  revokeNew();
  form.urun_kodu.value = product.urun_kodu || "";
  form.ad.value = product.ad || "";
  form.fiyat.value = product.fiyat ?? "";
  form.kategori.value = categoryKey(product.kategori) || "kadin";
  form.urun_turu.value = product.urun_turu || "";
  syncSubtypeOptions(product.alt_tur || "");
  const stock = product.stok_durumu || "Stokta";
  if (![...form.stok_durumu.options].some((option) => option.value === stock)) {
    form.stok_durumu.add(new Option(stock, stock));
  }
  form.stok_durumu.value = stock;
  form.malzeme.value = product.malzeme || "";
  form.olculer.value = product.olculer || "";
  renderColorOptions(productColors(product.renkler));
  form.aciklama.value = product.aciklama || "";
  form.kaliteli_mi.checked = asBool(product.kaliteli_mi);
  form.stand_200_tl.checked = asBool(product.stand_200_tl);
  form.one_cikan.checked = asBool(product.one_cikan);
  form.yayinda_mi.checked = asBool(product.yayinda_mi);
  if (titleEl) titleEl.textContent = "Ürünü düzenle";
  if (deleteBtn) deleteBtn.hidden = false;
  setError("");
  document.querySelectorAll(".admin-item").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.id === String(product.id));
  });
  if (window.innerWidth < 980) {
    document.querySelector(".admin-editor")?.scrollIntoView({ behavior: "smooth" });
  }
}

function addVariantFiles(color, fileList) {
  const incoming = [...fileList];
  const already = (existingVariantImages[color] || []).length + (newVariantFiles[color] || []).length;
  const room = Math.max(0, 8 - already);
  if (!room) {
    setError(`${color} için en fazla 8 fotoğraf eklenebilir.`);
    return;
  }
  const target = newVariantFiles[color] ||= [];
  incoming.slice(0, room).forEach((file) => {
    if (!file.type.startsWith("image/")) return setError("Yalnızca görsel dosyası yüklenebilir.");
    if (file.size > 5 * 1024 * 1024) return setError("Her görsel 5 MB altında olmalı.");
    target.push({ file, url: URL.createObjectURL(file) });
  });
  updateVariantPreviews(color);
}

async function loadProducts() {
  listEl.innerHTML = `<p class="notice">Ürünler yükleniyor…</p>`;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    products = [];
    if (overviewEl) overviewEl.innerHTML = "";
    listEl.innerHTML = `<div class="empty"><h2>Liste açılamadı</h2><p>${esc(error.message)}</p></div>`;
    return;
  }
  products = data || [];
  renderProductList();
}

function renderProductList() {
  const published = products.filter((product) => asBool(product.yayinda_mi)).length;
  const drafts = products.length - published;
  const soldOut = products.filter((product) => /tükendi/i.test(product.stok_durumu || "")).length;
  if (overviewEl) overviewEl.innerHTML = `
    <div><strong>${products.length}</strong><span>Toplam ürün</span></div>
    <div><strong>${published}</strong><span>Yayında</span></div>
    <div><strong>${drafts}</strong><span>Taslak</span></div>
    <div><strong>${soldOut}</strong><span>Tükendi</span></div>`;

  const query = (searchInput?.value || "").trim().toLocaleLowerCase("tr-TR");
  const visible = products.filter((product) => {
    const isPublished = asBool(product.yayinda_mi);
    const isSoldOut = /tükendi/i.test(product.stok_durumu || "");
    const matchesFilter = activeFilter === "all"
      || (activeFilter === "published" && isPublished)
      || (activeFilter === "draft" && !isPublished)
      || (activeFilter === "sold-out" && isSoldOut);
    const matchesQuery = !query || `${product.ad || ""} ${product.urun_kodu || ""}`.toLocaleLowerCase("tr-TR").includes(query);
    return matchesFilter && matchesQuery;
  });
  if (!products.length) {
    listEl.innerHTML = `<div class="empty"><h2>Henüz ürün yok</h2><p>Formdan ilk modeli ekleyebilirsin.</p></div>`;
    return;
  }
  if (!visible.length) {
    listEl.innerHTML = `<div class="empty"><h2>Ürün bulunamadı</h2><p>Arama veya filtre seçimini değiştirebilirsin.</p></div>`;
    return;
  }
  listEl.innerHTML = `<div class="admin-items">${visible
    .map((product) => {
      const image = productImageUrls(product, supabase, STORAGE_BUCKET)[0];
      return `
        <button class="admin-item${String(product.id) === String(editingId) ? " is-active" : ""}" type="button" data-id="${esc(product.id)}">
          ${image ? `<img src="${esc(image)}" alt="" />` : `<span class="admin-thumb"></span>`}
          <span>
            <strong>${esc(product.ad || "Adsız")}</strong><br />
            <small>${formatPrice(product.fiyat) ? `${esc(formatPrice(product.fiyat))} · ` : ""}${asBool(product.yayinda_mi) ? "Yayında" : "Taslak"}</small>
          </span>
        </button>`;
    })
    .join("")}</div>`;
  listEl.querySelectorAll(".admin-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = products.find((item) => String(item.id) === btn.dataset.id);
      if (product) fillForm(product);
    });
  });
}

async function uploadVariantImages() {
  const variants = [];
  for (const color of selectedColors) {
    const urls = [...(existingVariantImages[color] || [])];
    for (const item of newVariantFiles[color] || []) {
      const ext = (item.file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `variants/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, item.file, {
        cacheControl: "3600", upsert: false, contentType: item.file.type || undefined,
      });
      if (error) throw error;
      urls.push(supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl);
    }
    variants.push({ color, images: urls });
  }
  return variants;
}

function storagePath(url) {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

async function onSubmit(event) {
  event.preventDefault();
  setError("");
  if (statusEl) statusEl.textContent = "";
  const ad = form.ad.value.trim();
  const kod = form.urun_kodu.value.trim();
  const rawPrice = form.fiyat.value.trim();
  const fiyat = rawPrice === "" ? null : Number(rawPrice.replace(",", "."));
  if (!kod) return setError("Ürün kodu gerekli.");
  if (!ad) return setError("Ürün adı gerekli.");
  if (fiyat !== null && (!Number.isFinite(fiyat) || fiyat < 0)) return setError("Geçerli bir fiyat girin.");
  if (!form.kategori.value) return setError("Kategori seçin.");
  if (!form.urun_turu.value || !form.alt_tur.value) return setError("Ürün türünü ve modelini seçin.");
  if (!colorsInput.value) return setError("En az bir renk seçin.");
  if (form.yayinda_mi.checked && selectedColors.some((color) => !(existingVariantImages[color]?.length || newVariantFiles[color]?.length))) {
    const missingColor = selectedColors.find((color) => !(existingVariantImages[color]?.length || newVariantFiles[color]?.length));
    return setError(`${missingColor} rengi için en az bir fotoğraf ekle.`);
  }

  const submit = form.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    const colorVariants = await uploadVariantImages();
    const payload = {
      urun_kodu: kod,
      ad,
      fiyat,
      kategori: form.kategori.value,
      urun_turu: form.urun_turu.value,
      alt_tur: form.alt_tur.value,
      kaliteli_mi: form.kaliteli_mi.checked,
      stand_200_tl: form.stand_200_tl.checked,
      aciklama: form.aciklama.value.trim(),
      malzeme: form.malzeme.value.trim(),
      olculer: form.olculer.value.trim(),
      renkler: productColors(colorsInput.value),
      renk_gorselleri: colorVariants,
      stok_durumu: form.stok_durumu.value,
      gorseller: colorVariants[0]?.images || [],
      one_cikan: form.one_cikan.checked,
      yayinda_mi: form.yayinda_mi.checked,
    };
    const query = editingId
      ? supabase.from("products").update(payload).eq("id", editingId)
      : supabase.from("products").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    existingVariantImages = Object.fromEntries(colorVariants.map((variant) => [variant.color, variant.images]));
    revokeNew();
    editingId = data.id;
    if (deleteBtn) deleteBtn.hidden = false;
    if (titleEl) titleEl.textContent = "Ürünü düzenle";
    renderColorOptions(selectedColors);
    if (statusEl) statusEl.textContent = "Kaydedildi.";
    await loadProducts();
  } catch (error) {
    const message = error.message || "Kayıt sırasında hata oluştu.";
    setError(/renk_gorselleri|schema cache/i.test(message)
      ? "Renk fotoğraflarını kaydetmek için Supabase SQL Editor'da supabase/add-color-variant-images.sql dosyasını bir kez çalıştır."
      : message);
  } finally {
    submit.disabled = false;
  }
}

async function removeProduct() {
  if (!editingId) return;
  const name = form.ad.value.trim() || "Bu ürün";
  if (!confirm(`${name} silinsin mi?`)) return;
  const paths = [...new Set(Object.values(existingVariantImages).flat().map(storagePath).filter(Boolean))];
  const { error } = await supabase.from("products").delete().eq("id", editingId);
  if (error) {
    setError(error.message);
    return;
  }
  if (paths.length) {
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  }
  resetForm();
  await loadProducts();
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user || null;
}

async function guard() {
  const user = await currentUser();
  if (!user) {
    location.replace("login.html");
    return null;
  }
  if (!isAdmin(user)) {
    location.replace("login.html?denied=1");
    return null;
  }
  return user;
}

async function initLogin() {
  const note = document.querySelector("#login-note");
  const user = await currentUser();
  if (isAdmin(user)) {
    location.replace("panel.html");
    return;
  }
  if (new URLSearchParams(location.search).get("denied") === "1") {
    note.textContent = user
      ? "Bu hesap yönetici değil. Yönetici girişi için önce çıkış yap."
      : "Bu sayfa yalnızca mağaza yöneticisine açık.";
  }
  document.querySelector("#logout-other")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    note.textContent = "Çıkış yapıldı. Yönetici hesabıyla giriş yapabilirsin.";
  });
  document.querySelector("#login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    note.textContent = "";
    const { error } = await supabase.auth.signInWithPassword({
      email: formEl.email.value.trim(),
      password: formEl.password.value,
    });
    if (error) {
      note.textContent = /invalid login/i.test(error.message)
        ? "E-posta veya şifre hatalı."
        : error.message;
      return;
    }
    const { data: after } = await supabase.auth.getUser();
    if (!isAdmin(after.user)) {
      note.textContent = "Giriş oldu ama bu e-posta yönetici hesabı değil.";
      return;
    }
    location.href = "panel.html";
  });
}

async function initPanel() {
  const user = await guard();
  if (!user || !form) return;
  if (who) who.textContent = user.email;
  resetForm();
  await loadProducts();
  form.kategori.addEventListener("change", () => syncSubtypeOptions());
  form.urun_turu.addEventListener("change", () => syncSubtypeOptions());
  document.querySelector("#add-color")?.addEventListener("click", () => {
    const color = colorSelectEl?.value;
    if (!color || selectedColors.includes(color)) return;
    renderColorOptions([...selectedColors, color]);
  });
  colorOptionsEl?.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-color]");
    if (remove) {
      (newVariantFiles[remove.dataset.removeColor] || []).forEach((item) => URL.revokeObjectURL(item.url));
      delete newVariantFiles[remove.dataset.removeColor];
      delete existingVariantImages[remove.dataset.removeColor];
      renderColorOptions(selectedColors.filter((color) => color !== remove.dataset.removeColor));
      return;
    }
    const oldPhoto = event.target.closest("[data-remove-variant-existing]");
    const newPhoto = event.target.closest("[data-remove-variant-new]");
    if (oldPhoto) {
      const color = oldPhoto.dataset.removeVariantExisting;
      existingVariantImages[color]?.splice(Number(oldPhoto.dataset.index), 1);
      updateVariantPreviews(color);
    }
    if (newPhoto) {
      const color = newPhoto.dataset.removeVariantNew;
      const item = newVariantFiles[color]?.splice(Number(newPhoto.dataset.index), 1)[0];
      if (item) URL.revokeObjectURL(item.url);
      updateVariantPreviews(color);
    }
  });
  colorOptionsEl?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-variant-files]");
    if (!input) return;
    addVariantFiles(input.dataset.variantFiles, input.files);
    input.value = "";
  });
  colorOptionsEl?.addEventListener("dragover", (event) => {
    const target = event.target.closest("[data-variant-drop]");
    if (!target) return;
    event.preventDefault();
    target.classList.add("is-drag");
  });
  colorOptionsEl?.addEventListener("dragleave", (event) => {
    event.target.closest("[data-variant-drop]")?.classList.remove("is-drag");
  });
  colorOptionsEl?.addEventListener("drop", (event) => {
    const target = event.target.closest("[data-variant-drop]");
    if (!target) return;
    event.preventDefault();
    target.classList.remove("is-drag");
    addVariantFiles(target.dataset.variantDrop, event.dataTransfer.files);
  });
  searchInput?.addEventListener("input", renderProductList);
  document.querySelectorAll("[data-product-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.productFilter;
      document.querySelectorAll("[data-product-filter]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      renderProductList();
    });
  });
  form.addEventListener("submit", onSubmit);
  document.querySelector("#new-product")?.addEventListener("click", resetForm);
  deleteBtn?.addEventListener("click", removeProduct);
  document.querySelector("#panel-logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.href = "login.html";
  });
}

if (document.body.dataset.admin === "login") initLogin();
if (document.body.dataset.admin === "panel") initPanel();
