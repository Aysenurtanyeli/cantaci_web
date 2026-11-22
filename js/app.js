import {
  SHOP,
  STORAGE_BUCKET,
  instagramDmUrl,
  instagramProfileUrl,
  storeMapUrl,
  supabase,
} from "./supabase.js";
import {
  asBool,
  categoryKey,
  categoryLabel,
  COLOR_OPTIONS,
  colorVariantImageMap,
  esc,
  formatPrice,
  isSoldOut,
  matchesFilter,
  productColors,
  productImageUrls,
  resolveImageUrl,
  productSubtypeLabel,
  productTypeLabel,
  PRODUCT_TYPE_OPTIONS,
  richText,
  subtypeOptions,
  stockLabel,
} from "./format.js";
import { createFavorites } from "./favorites.js";

const page = document.body.dataset.page || "home";
const favorites = createFavorites(supabase);
const filters = {
  home: "one_cikan",
  urunler: "all",
  stand: "stand",
  kaliteli: "kaliteli",
  kadin: "kadin",
  erkek: "erkek",
};

const heartSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
const heartOnSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z" fill="currentColor" stroke="currentColor" stroke-width="1.6"/></svg>`;

let authMode = "login";
let catalogRequest = 0;
const catalogParams = new URLSearchParams(location.search);
const initialType = catalogParams.get("tur") || "";
const catalogFacets = {
  gender: ["kadin", "erkek", "cocuk", "unisex"].includes(catalogParams.get("koleksiyon")) ? catalogParams.get("koleksiyon") : "",
  type: PRODUCT_TYPE_OPTIONS.some((item) => item.value === initialType) ? initialType : "",
  subtype: "",
  color: "",
  query: (catalogParams.get("q") || "").trim(),
  sort: "",
};

function initBannerCarousel() {
  const carousel = document.querySelector("[data-banner-carousel]");
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll("[data-banner-slide]")];
  const dots = [...carousel.querySelectorAll("[data-banner-go]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toggle = carousel.querySelector("[data-banner-toggle]");
  let active = 0;
  let timer = null;
  let userPaused = false;

  const show = (next) => {
    active = (next + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      const selected = index === active;
      slide.classList.toggle("is-active", selected);
      slide.setAttribute("aria-hidden", String(!selected));
      slide.inert = !selected;
    });
    dots.forEach((dot, index) => {
      const selected = index === active;
      dot.classList.toggle("is-active", selected);
      dot.setAttribute("aria-current", String(selected));
    });
  };
  const stop = () => {
    window.clearInterval(timer);
    timer = null;
  };
  const start = () => {
    if (reducedMotion || userPaused || document.hidden || timer) return;
    timer = window.setInterval(() => show(active + 1), 6500);
  };

  carousel.querySelectorAll("img").forEach((img) => {
    const parent = img.closest("[data-banner-slide]");
    const markLoaded = () => parent?.classList.add("has-photo");
    if (img.complete && img.naturalWidth > 0) markLoaded();
    else img.addEventListener("load", markLoaded, { once: true });
    img.addEventListener("error", () => parent?.classList.add("photo-missing"), { once: true });
  });
  carousel.querySelector("[data-banner-prev]")?.addEventListener("click", () => show(active - 1));
  carousel.querySelector("[data-banner-next]")?.addEventListener("click", () => show(active + 1));
  dots.forEach((dot) => dot.addEventListener("click", () => show(Number(dot.dataset.bannerGo))));
  if (reducedMotion && toggle) toggle.hidden = true;
  toggle?.addEventListener("click", () => {
    userPaused = !userPaused;
    toggle.setAttribute("aria-pressed", String(userPaused));
    toggle.setAttribute("aria-label", userPaused ? "Banner geçişlerini başlat" : "Banner geçişlerini duraklat");
    toggle.textContent = userPaused ? "▶" : "Ⅱ";
    if (userPaused) stop();
    else start();
  });
  carousel.addEventListener("pointerenter", stop);
  carousel.addEventListener("pointerleave", start);
  carousel.addEventListener("focusin", stop);
  carousel.addEventListener("focusout", (event) => {
    if (!carousel.contains(event.relatedTarget)) start();
  });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  show(0);
  start();
}

function currentFile() {
  const file = location.pathname.split("/").pop();
  return file || "index.html";
}

function navLink(href, label) {
  const current = href === currentFile() || (href === "index.html" && currentFile() === "");
  return `<a href="${href}"${current ? ' class="is-current"' : ""}>${label}</a>`;
}

function displayName(user) {
  return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Hesap";
}

function renderChrome(user) {
  const header = document.querySelector("#site-header");
  const footer = document.querySelector("#site-footer");
  if (header) {
    const count = favorites.ordered.length;
    header.innerHTML = `
      <header class="site-header">
      <div class="announcement-strip"><span>Birecik mağazasında yakından gör · fiyatı birlikte konuşalım</span><a href="${storeMapUrl()}" target="_blank" rel="noopener">Yol tarifi al <b aria-hidden="true">↗</b></a></div>
      <div class="nav">
        <a class="brand" href="index.html">
          <span class="logo-mark brand-logo"><img src="img/çm.jpeg" alt="" /></span>
          <span class="brand-copy"><strong>${esc(SHOP.name)}</strong><span>${esc(SHOP.cityLabel || SHOP.city)}</span></span>
        </a>
        <form class="nav-search is-collapsed" data-nav-search action="urunler.html" role="search">
          <input type="search" name="q" value="${esc(catalogFacets.query)}" placeholder="Çanta, cüzdan veya valiz ara" aria-label="Ürün ara" />
          <button type="button" data-search-toggle aria-label="Aramayı aç" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></button>
          <button class="header-search-close" type="button" data-search-close aria-label="Aramayı kapat">×</button>
        </form>
        <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-label="Menüyü aç">
          <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M0 1h16M0 6h16M0 11h16" stroke="currentColor" stroke-width="1.4"/></svg>
        </button>
        <div class="nav-actions">
          <button class="icon-btn search-open" type="button" data-search-toggle aria-label="Arama aÃ§" aria-expanded="false">
            <svg class="search-open-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><span class="search-close-icon" aria-hidden="true">×</span>
          </button>
          <a class="icon-btn" href="favoriler.html" aria-label="Favoriler">
            ${heartSvg}
            <span class="count-pill" data-fav-count ${user && count ? "" : "hidden"}>${count}</span>
          </a>
          ${
            user
              ? `<a class="who" href="hesap.html">${esc(displayName(user))}</a>
                 <button class="text-btn" type="button" data-logout>Çıkış</button>`
              : `<a class="text-btn" href="hesap.html">Giriş</a>`
          }
        </div>
      </div>
        <nav class="nav-links" data-nav-links>
          ${navLink("index.html", "Vitrin")}
          ${navLink("urunler.html", "Ürünler")}
          ${navLink("indirim.html", "İndirim")}
          ${navLink("kaliteli.html", "Kaliteli")}
          ${navLink("kadin.html", "Kadın")}
          ${navLink("erkek.html", "Erkek")}
          <a href="urunler.html?koleksiyon=cocuk">Çocuk</a>
        </nav>
      </header>`;
  }

  if (footer) {
    const year = new Date().getFullYear();
    footer.innerHTML = `
      <div class="wrap footer-grid">
        <div>
          <a class="footer-brand" href="index.html"><span class="logo-mark footer-logo"><img src="img/çm.jpeg" alt="" /></span><strong>${esc(SHOP.name)}</strong></a>
          <p>${esc(SHOP.city)} mağazamıza bekleriz. Stok ve çalışma saatleri için Instagram'dan yazabilirsin.</p>
          <address class="store-address">
            <span>Adres</span>
            <a href="${storeMapUrl()}" target="_blank" rel="noopener">${esc(SHOP.address)}</a>
            <a class="map-link" href="${storeMapUrl()}" target="_blank" rel="noopener">Haritada yol tarifi al <b aria-hidden="true">↗</b></a>
          </address>
          <p class="footer-contact"><span>E-posta</span><a href="https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SHOP.contactEmail)}" target="_blank" rel="noopener noreferrer">${esc(SHOP.contactEmail)}</a></p>
        </div>
        <div>
          <p>Sayfalar</p>
          <ul>
            <li><a href="urunler.html">Tüm ürünler</a></li>
            <li><a href="indirim.html">İndirim</a></li>
            <li><a href="favoriler.html">Favoriler</a></li>
            <li><a href="hesap.html">Hesap</a></li>
          </ul>
        </div>
        <div>
          <p>Mağaza</p>
          <a class="instagram-link" href="${instagramProfileUrl()}" target="_blank" rel="noopener noreferrer" aria-label="Instagram Çantacı Mehmet">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle class="instagram-dot" cx="17.5" cy="6.5" r="1"/></svg>
            <span>Instagram</span>
          </a>
          <a class="instagram-link tiktok-link" href="${SHOP.tiktokUrl}" target="_blank" rel="noopener noreferrer" aria-label="TikTok Çantacı Mehmet">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.31V2h-3.55v13.67a2.9 2.9 0 0 1-2.9 2.9 2.9 2.9 0 1 1 2.9-2.9V12.1a6.46 6.46 0 1 0 3.55 5.77V10.9a8.36 8.36 0 0 0 4.89 1.57V8.92a4.85 4.85 0 0 1-1.12-.13z"/></svg>
            <span>TikTok</span>
          </a>
          <ul>
            <li><a href="${instagramDmUrl()}" target="_blank" rel="noopener">Mesaj gönder</a></li>
          </ul>
        </div>
      </div>
      <p class="wrap legal">© ${year} ${esc(SHOP.name)}. Vitrin amaçlıdır.</p>`;
  }
}

function badgeFor(product) {
  if (isSoldOut(product.stok_durumu)) return `<span class="badge sold">Tükendi</span>`;
  if (asBool(product.kaliteli_mi)) return `<span class="badge">Kaliteli</span>`;
  const hasPrice = product.fiyat !== null && product.fiyat !== undefined && String(product.fiyat).trim() !== "";
  if (asBool(product.stand_200_tl) || (hasPrice && Number(product.fiyat) <= 200)) return `<span class="badge">İndirim</span>`;
  return "";
}

const COLOR_SWATCHES = {
  Siyah: "#171717", Beyaz: "#fff", Kahverengi: "#795548", Bej: "#d6c2a2", Krem: "#f2e6cf", Gri: "#929292",
  Lacivert: "#24365c", Mavi: "#4387c7", "Kırmızı": "#c63737", Bordo: "#78263d", "Yeşil": "#4a8058",
  Haki: "#77784d", Pembe: "#e9a8bb", Lila: "#c8a2c8", Mor: "#895aa5", "Sarı": "#e3c64d", Turuncu: "#e58a3b",
  "Su yeşili": "#73cfc1", "Çok renkli": "linear-gradient(135deg,#ee6875,#e9c24e,#54a77b,#637bdd)",
};

function cardColorLinks(product, id) {
  const colors = productColors(product.renkler);
  if (!colors.length) return "";
  return `<div class="card-colors" aria-label="Mevcut renkler">${colors.map((color) =>
    `<a class="card-color-link" href="urun.html?id=${id}&renk=${encodeURIComponent(color)}" title="${esc(color)} rengini gör" aria-label="${esc(color)} rengini gör"><span style="--color-swatch:${COLOR_SWATCHES[color] || "#999"}"></span></a>`
  ).join("")}<small>${colors.length} renk</small></div>`;
}

function cardGalleryImages(product) {
  // Kartın okları yalnızca kapak renginin fotoğraflarını dolaşır.
  // Diğer renkler renk noktalarından ayrı olarak seçilir.
  return productImageUrls(product, supabase, STORAGE_BUCKET);
}

function cardHtml(product) {
  const images = cardGalleryImages(product);
  const id = esc(product.id);
  const media = images[0]
    ? `<img src="${esc(images[0])}" alt="${esc(product.ad)}" loading="lazy" decoding="async" />`
    : `<div class="ph">${esc(SHOP.name)}</div>`;
  const on = favorites.has(product.id);
  return `
    <article class="card">
      <div class="card-shot" data-card-images="${esc(JSON.stringify(images))}" data-card-index="0">
        <a class="card-media" href="urun.html?id=${id}">
          ${media}
          ${badgeFor(product)}
        </a>
        ${images.length > 1 ? `<button class="card-gallery-nav card-gallery-prev" type="button" data-card-gallery-step="-1" aria-label="Önceki ürün fotoğrafı">‹</button><button class="card-gallery-nav card-gallery-next" type="button" data-card-gallery-step="1" aria-label="Sonraki ürün fotoğrafı">›</button><span class="card-gallery-count" aria-live="polite">1 / ${images.length}</span>` : ""}
        <button class="heart${on ? " is-on" : ""}" type="button" data-fav="${id}" aria-pressed="${on ? "true" : "false"}" aria-label="Favori">
          ${on ? heartOnSvg : heartSvg}
        </button>
      </div>
      <div class="card-body">
        <h3><a href="urun.html?id=${id}">${esc(product.ad)}</a></h3>
        ${cardColorLinks(product, id)}
        <div class="card-meta">
          ${formatPrice(product.fiyat) ? `<span>${esc(formatPrice(product.fiyat))}</span>` : ""}
          <span>${esc([categoryLabel(product.kategori), productTypeLabel(product.urun_turu), productSubtypeLabel(categoryKey(product.kategori), product.urun_turu, product.alt_tur)].filter(Boolean).join(" · "))}</span>
        </div>
      </div>
    </article>`;
}

function emptyHtml(title, text, error) {
  return `
    <div class="empty span-2">
      <h2>${esc(title)}</h2>
      <p>${esc(text)}</p>
      ${error ? `<details><summary>Teknik ayrıntı</summary><p>${esc(error)}</p></details>` : ""}
    </div>`;
}

async function fetchPublished() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("yayinda_mi", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

function paintHearts() {
  document.querySelectorAll("[data-fav]").forEach((btn) => {
    const on = favorites.has(btn.dataset.fav);
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (btn.classList.contains("heart")) btn.innerHTML = on ? heartOnSvg : heartSvg;
    if (btn.classList.contains("heart-inline")) {
      btn.innerHTML = on ? heartOnSvg : heartSvg;
      btn.setAttribute("aria-label", on ? "Favorilerden çıkar" : "Favorilere ekle");
      btn.title = on ? "Favorilerden çıkar" : "Favorilere ekle";
    }
  });
  const pill = document.querySelector("[data-fav-count]");
  if (pill) {
    const count = favorites.ordered.length;
    pill.textContent = String(count);
    pill.hidden = !(favorites.user && count);
  }
}

async function renderCatalog(target, filter) {
  if (!target) return;
  const requestId = ++catalogRequest;
  target.innerHTML = `<p class="notice">Vitrin yükleniyor…</p>`;
  try {
    const products = await fetchPublished();
    if (requestId !== catalogRequest) return;
    let filterBar = document.querySelector("#catalog-filters");
    if (!filterBar) {
      filterBar = document.createElement("section");
      filterBar.id = "catalog-filters";
      filterBar.className = "catalog-filters";
      target.parentElement.insertBefore(filterBar, target);
    }
    const canChooseGender = page === "urunler" || page === "home";
    const renderControls = () => {
      const subtypeMap = new Map();
      const categories = catalogFacets.gender
        ? [catalogFacets.gender, ...(["kadin", "erkek"].includes(catalogFacets.gender) ? ["unisex"] : [])]
        : ["kadin", "erkek", "cocuk", "unisex"];
      categories.forEach((category) => {
        subtypeOptions(category, catalogFacets.type).forEach((item) => subtypeMap.set(item.value, item.label));
      });
      filterBar.innerHTML = `
        <div class="catalog-filter-heading"><strong>Ürünleri filtrele</strong><button type="button" data-clear-filters>Temizle</button></div>
        <div class="catalog-filter-fields">
          ${canChooseGender ? `<label><span>Koleksiyon</span><select data-facet="gender"><option value="">Tümü</option><option value="kadin" ${catalogFacets.gender === "kadin" ? "selected" : ""}>Kadın</option><option value="erkek" ${catalogFacets.gender === "erkek" ? "selected" : ""}>Erkek</option><option value="cocuk" ${catalogFacets.gender === "cocuk" ? "selected" : ""}>Çocuk</option><option value="unisex" ${catalogFacets.gender === "unisex" ? "selected" : ""}>Unisex</option></select></label>` : ""}
          <label><span>Ürün türü</span><select data-facet="type"><option value="">Tümü</option>${PRODUCT_TYPE_OPTIONS.map((item) => `<option value="${item.value}" ${catalogFacets.type === item.value ? "selected" : ""}>${item.label}</option>`).join("")}</select></label>
          <label><span>Model</span><select data-facet="subtype" ${!subtypeMap.size ? "disabled" : ""}><option value="">Tümü</option>${[...subtypeMap].map(([value, label]) => `<option value="${value}" ${catalogFacets.subtype === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label><span>Renk</span><select data-facet="color"><option value="">Tümü</option>${COLOR_OPTIONS.map((color) => `<option value="${esc(color)}" ${catalogFacets.color === color ? "selected" : ""}>${esc(color)}</option>`).join("")}</select></label>
          <label><span>Sıralama</span><select data-facet="sort"><option value="" ${!catalogFacets.sort ? "selected" : ""}>Önerilen</option><option value="newest" ${catalogFacets.sort === "newest" ? "selected" : ""}>En yeni</option><option value="price-asc" ${catalogFacets.sort === "price-asc" ? "selected" : ""}>Fiyat artan</option><option value="price-desc" ${catalogFacets.sort === "price-desc" ? "selected" : ""}>Fiyat azalan</option><option value="name-asc" ${catalogFacets.sort === "name-asc" ? "selected" : ""}>İsim A-Z</option></select></label>
        </div>`;
    };
    const paint = () => {
      let list = products.filter((product) => matchesFilter(product, filter)
        && (!catalogFacets.gender
          || categoryKey(product.kategori) === catalogFacets.gender
          || (["kadin", "erkek"].includes(catalogFacets.gender) && categoryKey(product.kategori) === "unisex"))
        && (!catalogFacets.type || product.urun_turu === catalogFacets.type)
        && (!catalogFacets.subtype || product.alt_tur === catalogFacets.subtype)
        && (!catalogFacets.color || productColors(product.renkler).includes(catalogFacets.color))
        && (!catalogFacets.query || [product.ad, product.urun_kodu, categoryLabel(product.kategori), productTypeLabel(product.urun_turu), productSubtypeLabel(categoryKey(product.kategori), product.urun_turu, product.alt_tur), ...productColors(product.renkler)].join(" ").toLocaleLowerCase("tr-TR").includes(catalogFacets.query.toLocaleLowerCase("tr-TR"))));
      const hasFacets = Object.entries(catalogFacets).some(([key, value]) => key !== "sort" && Boolean(value));
      if (filter === "one_cikan" && !hasFacets) {
        const featured = list;
        list = featured.length ? featured : products.slice(0, 6);
      }
      if (catalogFacets.sort === "price-asc") list.sort((a, b) => (a.fiyat == null || a.fiyat === "" ? Infinity : Number(a.fiyat)) - (b.fiyat == null || b.fiyat === "" ? Infinity : Number(b.fiyat)));
      if (catalogFacets.sort === "price-desc") list.sort((a, b) => (b.fiyat == null || b.fiyat === "" ? -Infinity : Number(b.fiyat)) - (a.fiyat == null || a.fiyat === "" ? -Infinity : Number(a.fiyat)));
      if (catalogFacets.sort === "name-asc") list.sort((a, b) => (a.ad || "").localeCompare(b.ad || "", "tr"));
      if (catalogFacets.sort === "newest") list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      if (!list.length) {
        target.innerHTML = emptyHtml("Ürün bulunamadı", "Filtreleri temizleyebilir veya başka bir model seçebilirsin.");
      } else {
        target.innerHTML = list.map(cardHtml).join("");
      }
      const hero = document.querySelector("#hero-photo");
      const fallback = document.querySelector("#hero-fallback");
      const caption = document.querySelector("#hero-caption");
      const first = list.length ? productImageUrls(list[0], supabase, STORAGE_BUCKET)[0] : "";
      if (hero && first) {
        hero.src = first;
        hero.alt = list[0].ad || "Öne çıkan model";
        hero.hidden = false;
        if (fallback) fallback.hidden = true;
        if (caption) caption.textContent = list[0].ad || "Seçki";
      }
    };
    renderControls();
    if (!filterBar.dataset.bound) {
      filterBar.addEventListener("change", (event) => {
        const select = event.target.closest("[data-facet]");
        if (!select) return;
        catalogFacets[select.dataset.facet] = select.value;
        if (select.dataset.facet === "gender" || select.dataset.facet === "type") catalogFacets.subtype = "";
        renderControls();
        paint();
      });
      filterBar.addEventListener("click", (event) => {
        if (!event.target.closest("[data-clear-filters]")) return;
        Object.keys(catalogFacets).forEach((key) => { catalogFacets[key] = ""; });
        const search = document.querySelector(".nav-search input[name=q]");
        if (search) search.value = "";
        renderControls();
        paint();
      });
      filterBar.dataset.bound = "true";
    }
    paint();
  } catch (error) {
    console.error(error);
    target.innerHTML = emptyHtml(
      "Vitrin şu an açılamıyor",
      "Ürün listesi için veritabanı izninin tanımlanması gerekiyor.",
      error.message
    );
  }
}

function spec(label, value) {
  if (!String(value ?? "").trim()) return "";
  return `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
}

function galleryImagesMarkup(images, name, emptyMessage = SHOP.name) {
  return `<div class="gallery-main">${images[0]
    ? `<img id="gallery-main" src="${esc(images[0])}" alt="${esc(name)}" role="button" tabindex="0" aria-label="Fotoğrafı tam ekran büyüt" />`
    : `<div class="ph">${esc(emptyMessage)}</div>`}${images.length > 1
      ? `<button class="gallery-nav gallery-prev" type="button" data-gallery-step="-1" aria-label="Önceki görsel">‹</button><button class="gallery-nav gallery-next" type="button" data-gallery-step="1" aria-label="Sonraki görsel">›</button>`
      : ""}</div>${images.length > 1
    ? `<div class="thumbs">${images.map((url, index) => `<button type="button" class="${index === 0 ? "is-on" : ""}" data-thumb="${esc(url)}" aria-label="Görsel ${index + 1}"><img src="${esc(url)}" alt="" /></button>`).join("")}</div>`
    : ""}`;
}

function showImageViewer(src, alt) {
  let viewer = document.querySelector("#image-viewer");
  if (!viewer) {
    viewer = document.createElement("div");
    viewer.id = "image-viewer";
    viewer.className = "image-viewer";
    viewer.hidden = true;
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", "Ürün fotoğrafı görüntüleyici");
    viewer.innerHTML = `
      <div class="image-viewer-toolbar">
        <button type="button" data-viewer-zoom="-1" aria-label="Uzaklaştır">−</button>
        <span data-viewer-level>100%</span>
        <button type="button" data-viewer-zoom="1" aria-label="Yakınlaştır">+</button>
        <button type="button" class="image-viewer-close" data-viewer-close aria-label="Kapat">×</button>
      </div>
      <div class="image-viewer-stage"><img data-viewer-image alt="" /></div>`;
    document.body.append(viewer);
    let zoom = 1;
    const image = viewer.querySelector("[data-viewer-image]");
    const level = viewer.querySelector("[data-viewer-level]");
    const updateZoom = (value) => {
      zoom = Math.min(3, Math.max(1, value));
      image.style.setProperty("--viewer-zoom", zoom);
      level.textContent = `${Math.round(zoom * 100)}%`;
    };
    viewer.addEventListener("click", (event) => {
      if (event.target === viewer || event.target.closest("[data-viewer-close]")) {
        viewer.hidden = true;
        document.documentElement.classList.remove("image-viewer-open");
      }
      const zoomButton = event.target.closest("[data-viewer-zoom]");
      if (zoomButton) updateZoom(zoom + Number(zoomButton.dataset.viewerZoom) * 0.25);
    });
    viewer.addEventListener("wheel", (event) => {
      event.preventDefault();
      updateZoom(zoom + (event.deltaY < 0 ? 0.15 : -0.15));
    }, { passive: false });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !viewer.hidden) {
        viewer.hidden = true;
        document.documentElement.classList.remove("image-viewer-open");
      }
      if (!viewer.hidden && (event.key === "+" || event.key === "=")) updateZoom(zoom + 0.25);
      if (!viewer.hidden && event.key === "-") updateZoom(zoom - 0.25);
    });
    viewer.updateZoom = updateZoom;
  }
  viewer.querySelector("[data-viewer-image]").src = src;
  viewer.querySelector("[data-viewer-image]").alt = alt;
  viewer.updateZoom(1);
  viewer.hidden = false;
  document.documentElement.classList.add("image-viewer-open");
  viewer.querySelector("[data-viewer-close]").focus();
}

async function renderProduct() {
  const root = document.querySelector("#product-detail");
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    root.innerHTML = emptyHtml("Ürün seçilmedi", "Listeden bir modele geçebilirsin.");
    return;
  }
  root.innerHTML = `<p class="notice">Ürün yükleniyor…</p>`;
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) {
    root.innerHTML = emptyHtml("Ürün açılamadı", "Bağlantı veya izin hatası.", error.message);
    return;
  }
  if (!data || !asBool(data.yayinda_mi)) {
    root.innerHTML = emptyHtml("Bu model yayında değil", "Vitrine geri dönebilirsin.");
    return;
  }
  const variantImageMap = colorVariantImageMap(data.renk_gorselleri);
  const colors = productColors(data.renkler);
  const requestedColor = new URLSearchParams(location.search).get("renk");
  const selectedColor = colors.includes(requestedColor)
    ? requestedColor
    : colors.find((color) => variantImageMap[color]?.length) || colors[0] || "";
  const hasVariantPhotos = Object.values(variantImageMap).some((items) => items.length);
  const images = variantImageMap[selectedColor]?.length
    ? variantImageMap[selectedColor].map((url) => resolveImageUrl(url, supabase, STORAGE_BUCKET))
    : hasVariantPhotos
      ? []
      : productImageUrls(data, supabase, STORAGE_BUCKET);
  const on = favorites.has(data.id);
  document.title = `${data.ad} — ${SHOP.name}`;
  root.innerHTML = `
    <div class="gallery">
      <a class="back-link" href="urunler.html">← Tüm ürünler</a>
      <div class="gallery-main">
        ${
          images[0]
            ? `<img id="gallery-main" src="${esc(images[0])}" alt="${esc(data.ad)}" role="button" tabindex="0" aria-label="Fotoğrafı tam ekran büyüt" />`
            : `<div class="ph">${esc(hasVariantPhotos ? "Bu rengin fotoğrafları henüz eklenmedi" : SHOP.name)}</div>`
        }
        ${images.length > 1 ? `<button class="gallery-nav gallery-prev" type="button" data-gallery-step="-1" aria-label="Önceki görsel">‹</button><button class="gallery-nav gallery-next" type="button" data-gallery-step="1" aria-label="Sonraki görsel">›</button>` : ""}
      </div>
      ${
        images.length > 1
          ? `<div class="thumbs">${images
              .map(
                (url, index) =>
                  `<button type="button" class="${index === 0 ? "is-on" : ""}" data-thumb="${esc(url)}" aria-label="Görsel ${index + 1}"><img src="${esc(url)}" alt="" /></button>`
              )
              .join("")}</div>`
          : ""
      }
    </div>
    <div class="detail-copy">
      <p class="eyebrow">${esc(categoryLabel(data.kategori) || "Model")}${data.urun_kodu ? ` · ${esc(data.urun_kodu)}` : ""}</p>
      <h1>${esc(data.ad)}</h1>
      ${formatPrice(data.fiyat) ? `<p class="price">${esc(formatPrice(data.fiyat))}</p>` : ""}
      ${colors.length ? `<div class="detail-color-picker"><span>Renk seçenekleri</span><div>${colors.map((color) => `<button type="button" class="${color === selectedColor ? "is-active" : ""}" data-detail-color="${esc(color)}" aria-pressed="${color === selectedColor}">${esc(color)}</button>`).join("")}</div></div>` : ""}
      <div class="desc">${richText(data.aciklama || "Bu modelin ayrıntısı mağazamızdan paylaşılır.")}</div>
      <div class="detail-actions">
        <button class="btn btn-red" type="button" id="ask-instagram">Instagram’da sor</button>
        <button class="btn heart-inline${on ? " is-on" : ""}" type="button" data-fav="${esc(data.id)}" aria-pressed="${on ? "true" : "false"}" aria-label="${on ? "Favorilerden çıkar" : "Favorilere ekle"}" title="${on ? "Favorilerden çıkar" : "Favorilere ekle"}">
          ${on ? heartOnSvg : heartSvg}
        </button>
      </div>
      <p class="lede">Birecik mağazamızdaki stok durumunu teyit etmek için Instagram’dan bize yaz.</p>
      <dl class="specs">
        ${spec("Koleksiyon", categoryLabel(data.kategori))}
        ${spec("Ürün türü", productTypeLabel(data.urun_turu))}
        ${spec("Model", productSubtypeLabel(categoryKey(data.kategori), data.urun_turu, data.alt_tur))}
        ${spec("Malzeme", data.malzeme)}
        ${spec("Ölçüler", data.olculer)}
        ${spec("Renkler", data.renkler)}
        ${spec("Stok", stockLabel(data.stok_durumu))}
        ${spec("Kod", data.urun_kodu)}
      </dl>
    </div>`;

  root.querySelectorAll("[data-detail-color]").forEach((button) => {
    button.addEventListener("click", () => {
      const color = button.dataset.detailColor;
      root.querySelectorAll("[data-detail-color]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      const colorImages = (variantImageMap[color] || []).map((url) => resolveImageUrl(url, supabase, STORAGE_BUCKET));
      const galleryImages = colorImages.length
        ? colorImages
        : hasVariantPhotos
          ? []
          : productImageUrls(data, supabase, STORAGE_BUCKET);
      const gallery = root.querySelector(".gallery");
      if (gallery) gallery.innerHTML = `<a class="back-link" href="urunler.html">← Tüm ürünler</a>${galleryImagesMarkup(galleryImages, data.ad, hasVariantPhotos ? "Bu rengin fotoğrafları henüz eklenmedi" : SHOP.name)}`;
      const nextUrl = new URL(location.href);
      nextUrl.searchParams.set("renk", color);
      history.replaceState({}, "", nextUrl);
    });
  });

  document.querySelector("#ask-instagram")?.addEventListener("click", async () => {
    const message = `Merhaba, bu modeli sormak istiyorum: ${data.ad}${data.urun_kodu ? ` (${data.urun_kodu})` : ""}.`;
    const isMobile = navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const targetUrl = isMobile ? instagramDmUrl() : instagramProfileUrl();
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    try {
      await navigator.clipboard.writeText(message);
      toast(isMobile
        ? "Ürün mesajı kopyalandı; Instagram DM ekranında yapıştırabilirsin."
        : "Ürün mesajı kopyalandı; Instagram profilinde Mesaj’a basıp yapıştırabilirsin.");
    } catch {
      toast(isMobile
        ? "Instagram DM açılıyor; ürün adını mesajına ekleyebilirsin."
        : "Instagram profili açılıyor; Mesaj’a basıp ürün adını yazabilirsin.");
    }
  });
}

async function renderFavorites() {
  const root = document.querySelector("#favorites-root");
  if (!root) return;
  if (!favorites.user) {
    root.innerHTML = `
      <div class="empty">
        <h2>Favoriler hesabına bağlı</h2>
        <p>Kaydetmek için giriş yap veya kayıt ol. Google hesabı da kullanılabilir.</p>
        <div class="hero-actions">
          <a class="btn btn-dark" href="hesap.html?next=favoriler.html">Giriş yap</a>
        </div>
      </div>`;
    return;
  }
  if (!favorites.ordered.length) {
    root.innerHTML = emptyHtml("Henüz favorin yok", "Bir modeldeki kalbe basınca burada durur.");
    return;
  }
  root.innerHTML = `<p class="notice">Favoriler yükleniyor…</p>`;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", favorites.ordered);
  if (error) {
    root.innerHTML = emptyHtml("Favoriler açılamadı", "Liste birazdan yeniden denenebilir.", error.message);
    return;
  }
  const byId = new Map((data || []).map((product) => [String(product.id), product]));
  const list = favorites.ordered.map((id) => byId.get(id)).filter(Boolean);
  root.innerHTML = list.length
    ? list.map(cardHtml).join("")
    : emptyHtml("Kayıtlı modeller yayında değil", "Yayından kalkan parçalar bu listede gizlenir.");
}

function toast(message) {
  let el = document.querySelector("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("is-on");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("is-on"), 3200);
}

function authError(error) {
  const message = error?.message || "İşlem tamamlanamadı.";
  if (/invalid login/i.test(message)) return "E-posta veya şifre hatalı.";
  if (/already registered/i.test(message)) return "Bu e-posta kayıtlı. Giriş yapabilirsin.";
  if (/not confirmed/i.test(message)) return "E-posta henüz onaylanmamış.";
  if (/provider is not enabled/i.test(message) || /unsupported provider/i.test(message)) {
    return "Google girişi henüz Supabase’te açılmamış.";
  }
  if (/signups not allowed/i.test(message) || /signup is disabled/i.test(message)) {
    return "Yeni kayıt Supabase’te kapalı. Authentication ayarından açılmalı.";
  }
  return message;
}

function authFields() {
  return `
    <div class="tabs">
      <button type="button" data-auth-tab="login" class="${authMode === "login" ? "is-on" : ""}">Giriş yap</button>
      <button type="button" data-auth-tab="signup" class="${authMode === "signup" ? "is-on" : ""}">Kayıt ol</button>
    </div>
    <form data-auth-form>
      <label class="field" data-name-field ${authMode === "signup" ? "" : "hidden"}>
        <span>Ad</span>
        <input name="name" type="text" autocomplete="name" maxlength="80" />
      </label>
      <label class="field">
        <span>E-posta</span>
        <input name="email" type="email" autocomplete="email" required />
      </label>
      <label class="field">
        <span>Şifre</span>
        <input name="password" type="password" autocomplete="${authMode === "signup" ? "new-password" : "current-password"}" minlength="6" required />
      </label>
      <p class="form-error" data-auth-error></p>
      <button class="btn btn-dark" type="submit" style="width:100%">${authMode === "signup" ? "Hesap oluştur" : "Giriş yap"}</button>
    </form>
    <div class="divider">veya</div>
    <button class="btn google-btn" type="button" data-google>
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.1 5.2-5.9 6.5l6.3 5.3C38.2 37.3 44 32 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
      Google ile devam et
    </button>`;
}

function bindAuth(container) {
  const errorEl = () => container.querySelector("[data-auth-error]");
  container.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      authMode = tab.dataset.authTab;
      if (page === "hesap") renderAccount();
      else openAuth();
    });
  });
  container.querySelector("[data-google]")?.addEventListener("click", async (event) => {
    errorEl().textContent = "";
    const button = event.currentTarget;
    const label = button.innerHTML;
    button.disabled = true;
    button.textContent = "Google açılıyor…";
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: location.href.split("#")[0],
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) errorEl().textContent = authError(error);
    } catch (error) {
      errorEl().textContent = authError(error);
    } finally {
      button.disabled = false;
      button.innerHTML = label;
    }
  });
  container.querySelector("[data-auth-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value;
    const name = form.name?.value.trim();
    errorEl().textContent = "";
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: new URL("hesap.html", location.href).href,
            data: { full_name: name || "" },
          },
        });
        if (error) throw error;
        if (!data.session) {
          errorEl().textContent = "Kayıt alındı. E-postadaki onaydan sonra giriş yapabilirsin.";
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      closeAuth();
      toast("Hoş geldin.");
      if (page === "hesap") await renderAccount();
    } catch (error) {
      errorEl().textContent = authError(error);
    } finally {
      submit.disabled = false;
    }
  });
}

function openAuth() {
  const modal = document.querySelector("#auth-modal");
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const box = modal.querySelector("[data-auth-box]");
  box.innerHTML = `<button class="modal-close" type="button" data-close-auth aria-label="Kapat">×</button><h2 style="font-family:var(--serif);font-weight:500;font-size:2.2rem;letter-spacing:-0.04em">Hesabın</h2><p class="lede" style="margin-top:8px">Favoriler cihazında değil, hesabında durur.</p>${authFields()}`;
  bindAuth(box);
  box.querySelector("input[name=email]")?.focus();
}

function closeAuth() {
  const modal = document.querySelector("#auth-modal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function ensureAuthModal() {
  const root = document.querySelector("#auth-root");
  if (!root || document.querySelector("#auth-modal")) return;
  root.innerHTML = `<div class="modal" id="auth-modal" hidden><div class="modal-card" data-auth-box></div></div>`;
  document.querySelector("#auth-modal").addEventListener("click", (event) => {
    if (event.target.id === "auth-modal" || event.target.closest("[data-close-auth]")) closeAuth();
  });
}

async function renderAccount() {
  const root = document.querySelector("#auth-page");
  if (!root) return;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (user) {
    const isAdmin = user.email?.toLowerCase() === SHOP.adminEmail.toLowerCase();
    root.innerHTML = `
      <div class="account-card">
        <p class="eyebrow">${isAdmin ? "Yönetici alanı" : "Hesap"}</p>
        <h1>${isAdmin ? "Mağaza yönetimi" : esc(displayName(user))}</h1>
        <p class="lede">${isAdmin ? "Ürünleri, stok durumunu ve vitrindeki görünümü yönet." : esc(user.email || "")}</p>
        <div class="account-actions">
          ${isAdmin ? '<a class="btn btn-dark" href="admin/panel.html">Yönetim panelini aç</a>' : '<a class="btn btn-dark" href="favoriler.html">Favorilerim</a>'}
          <button class="btn" type="button" data-logout>Çıkış yap</button>
        </div>
      </div>`;
    return;
  }
  root.innerHTML = `<div class="auth-card"><p class="eyebrow">${esc(SHOP.name)}</p><h1>Giriş yap</h1><p class="lede" style="margin-top:8px">Favorilerini saklamak için e-posta veya Google.</p>${authFields()}</div>`;
  bindAuth(root.querySelector(".auth-card"));
}

function safeNext() {
  const next = new URLSearchParams(location.search).get("next") || "";
  if (/^[a-z0-9.-]+\.html$/i.test(next)) return next;
  return "";
}

async function renderPage() {
  if (page === "home") await renderCatalog(document.querySelector("#featured-grid"), "one_cikan");
  if (filters[page] && page !== "home") await renderCatalog(document.querySelector("#catalog-grid"), filters[page]);
  if (page === "urun") await renderProduct();
  if (page === "favoriler") await renderFavorites();
  if (page === "hesap") await renderAccount();
  paintHearts();
}

function bindGlobal() {
  document.querySelector(".search-open[data-search-toggle]")?.setAttribute("aria-label", "Search");
  document.addEventListener("click", async (event) => {
    const galleryMain = event.target.closest("#gallery-main");
    if (galleryMain) {
      event.preventDefault();
      showImageViewer(galleryMain.src, galleryMain.alt);
      return;
    }

    const cardStep = event.target.closest("[data-card-gallery-step]");
    if (cardStep) {
      event.preventDefault();
      event.stopPropagation();
      const shot = cardStep.closest(".card-shot");
      const image = shot?.querySelector(".card-media img");
      if (!shot || !image) return;
      const images = JSON.parse(shot.dataset.cardImages || "[]");
      if (images.length < 2) return;
      const step = Number(cardStep.dataset.cardGalleryStep);
      const index = (Number(shot.dataset.cardIndex || 0) + step + images.length) % images.length;
      shot.dataset.cardIndex = String(index);
      image.src = images[index];
      const count = shot.querySelector(".card-gallery-count");
      if (count) count.textContent = `${index + 1} / ${images.length}`;
      return;
    }

    const searchToggle = event.target.closest("[data-search-toggle]");
    const searchForm = document.querySelector("[data-nav-search]");
    if (searchToggle && searchForm?.classList.contains("is-collapsed")) {
      event.preventDefault();
      searchForm.classList.remove("is-collapsed");
      searchForm.classList.add("is-open");
      document.querySelector(".search-open[data-search-toggle]")?.setAttribute("aria-expanded", "true");
      searchForm.querySelector("[data-search-toggle]")?.setAttribute("aria-label", "Ara");
      searchForm.querySelector("input[type=search]")?.focus();
      return;
    }
    if (searchToggle && searchForm?.classList.contains("is-open") && !searchForm.contains(searchToggle)) {
      event.preventDefault();
      searchForm.classList.remove("is-open");
      searchForm.classList.add("is-collapsed");
      searchToggle.setAttribute("aria-expanded", "false");
      return;
    }
    if (searchToggle && searchForm?.classList.contains("is-open") && searchForm.contains(searchToggle)) {
      event.preventDefault();
      searchForm.requestSubmit();
      return;
    }
    if (event.target.closest("[data-search-close]")) {
      event.preventDefault();
      searchForm?.classList.remove("is-open");
      searchForm?.classList.add("is-collapsed");
      searchForm?.querySelector("[data-search-toggle]")?.setAttribute("aria-label", "Aramayı aç");
      const opener = document.querySelector(".search-open[data-search-toggle]");
      opener?.setAttribute("aria-expanded", "false");
      opener?.focus();
      return;
    }

    const toggle = event.target.closest("[data-nav-toggle]");
    if (toggle) {
      const links = document.querySelector("[data-nav-links]");
      const open = links?.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    if (event.target.closest("[data-logout]")) {
      await supabase.auth.signOut();
      toast("Çıkış yapıldı.");
      if (page === "hesap" || page === "favoriler") await renderPage();
      else renderChrome(null);
    }

    const fav = event.target.closest("[data-fav]");
    if (fav) {
      event.preventDefault();
      event.stopPropagation();
      try {
        const result = await favorites.toggle(fav.dataset.fav);
        if (result?.added === true) toast("Favorilere eklendi.");
        if (result?.added === false) toast("Favorilerden çıkarıldı.");
      } catch (error) {
        toast(error.message || "Favori kaydedilemedi.");
      }
    }

    const thumb = event.target.closest("[data-thumb]");
    if (thumb) {
      const main = document.querySelector("#gallery-main");
      if (main) main.src = thumb.dataset.thumb;
      thumb.parentElement.querySelectorAll("button").forEach((btn) => btn.classList.remove("is-on"));
      thumb.classList.add("is-on");
    }

    const galleryStep = event.target.closest("[data-gallery-step]");
    if (galleryStep) {
      const thumbs = [...document.querySelectorAll(".thumbs [data-thumb]")];
      if (thumbs.length > 1) {
        const current = Math.max(0, thumbs.findIndex((item) => item.classList.contains("is-on")));
        const next = (current + Number(galleryStep.dataset.galleryStep) + thumbs.length) % thumbs.length;
        thumbs[next].click();
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    const galleryMain = event.target.closest?.("#gallery-main");
    if (galleryMain && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      showImageViewer(galleryMain.src, galleryMain.alt);
      return;
    }
    if (event.key === "Escape") {
      const form = document.querySelector("[data-nav-search].is-open");
      if (form) {
        form.classList.remove("is-open");
        form.classList.add("is-collapsed");
        document.querySelector(".search-open[data-search-toggle]")?.setAttribute("aria-expanded", "false");
        document.querySelector(".search-open[data-search-toggle]")?.focus();
        const button = form.querySelector("[data-search-toggle]");
        if (button) {
          button.type = "button";
          button.setAttribute("aria-label", "Aramayı aç");
          button.setAttribute("aria-expanded", "false");
        }
      }
      closeAuth();
    }
  });
  document.addEventListener("cantaci:auth-required", () => openAuth());
  document.addEventListener("scroll", () => {
    document.body.classList.toggle("is-scrolled", window.scrollY > 8);
  }, { passive: true });

  favorites.onChange(() => {
    paintHearts();
    renderChrome(favorites.user);
    if (page === "favoriler") renderFavorites();
  });
}

async function init() {
  initBannerCarousel();
  ensureAuthModal();
  bindGlobal();
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(async () => {
      await favorites.setUser(session?.user || null);
      renderChrome(favorites.user);
      try {
        const added = await favorites.consumePending();
        if (added) toast("Favorilere eklendi.");
      } catch (error) {
        console.error(error);
      }
      if (page === "hesap") await renderAccount();
      paintHearts();
    }, 0);
  });
  const { data } = await supabase.auth.getSession();
  await favorites.setUser(data.session?.user || null);
  renderChrome(favorites.user);
  await renderPage();
  try {
    const added = await favorites.consumePending();
    if (added) toast("Bekleyen favori kaydedildi.");
  } catch (error) {
    console.error(error);
    toast("Favori kaydedilemedi. Favoriler tablosu kurulmuş olmalı.");
  }
  if (page === "hesap" && favorites.user && safeNext()) location.href = safeNext();

}

init().catch((error) => {
  console.error(error);
  toast("Sayfa hazırlanırken bir hata oluştu.");
});
