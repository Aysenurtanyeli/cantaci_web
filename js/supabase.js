import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://misndclzxuzhvbveynet.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_bFJlTQ53OAUTvJNLy1W2Rw_1O-DftD0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

export const STORAGE_BUCKET = "product-images";

export const SHOP = {
  name: "Çantacı Mehmet",
  city: "Birecik, Şanlıurfa",
  cityLabel: "Birecik · Şanlıurfa",
  address: "Meydan Mahallesi, 11 Temmuz Caddesi, 63400 Birecik/Şanlıurfa",
  mapUrl: "https://share.google/JrSn0LL0dnwym4YyK",
  instagramHandle: "cantaci_mehmet_63",
  instagramUrl:
    "https://www.instagram.com/cantaci_mehmet_63?fqnt=ODFlOTdoZGM1Mzhv",
  tiktokUrl: "https://www.tiktok.com/@cantaci_mehmet_63?_r=1&_t=ZS-9BcZtS9uHLg",
  contactEmail: "cantacimwebde@gmail.com",
  adminEmail: "cantacimwebde@gmail.com",
};

export function instagramProfileUrl() {
  return SHOP.instagramUrl || `https://instagram.com/${SHOP.instagramHandle}`;
}

export function instagramDmUrl() {
  return `https://ig.me/m/${SHOP.instagramHandle}`;
}

export function storeMapUrl() {
  return SHOP.mapUrl;
}
