const PENDING_KEY = "cantaci_pending_fav";

export function createFavorites(supabase) {
  let user = null;
  let ordered = [];
  const listeners = new Set();

  function emit() {
    listeners.forEach((fn) => fn());
  }

  function ids() {
    return new Set(ordered);
  }

  async function setUser(nextUser) {
    user = nextUser || null;
    if (!user) {
      ordered = [];
      emit();
      return;
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("product_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      ordered = [];
    } else {
      ordered = (data || []).map((row) => String(row.product_id));
    }
    emit();
  }

  function has(productId) {
    return ordered.includes(String(productId));
  }

  async function add(productId) {
    const pid = String(productId);
    const { error } = await supabase.from("favorites").insert({
      user_id: user.id,
      product_id: pid,
    });
    if (error && error.code !== "23505") throw error;
    ordered = [pid, ...ordered.filter((id) => id !== pid)];
    emit();
  }

  async function remove(productId) {
    const pid = String(productId);
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", pid);
    if (error) throw error;
    ordered = ordered.filter((id) => id !== pid);
    emit();
  }

  async function toggle(productId) {
    if (!user) {
      sessionStorage.setItem(PENDING_KEY, String(productId));
      document.dispatchEvent(new CustomEvent("cantaci:auth-required"));
      return { needsAuth: true };
    }
    if (has(productId)) {
      await remove(productId);
      return { added: false };
    }
    await add(productId);
    return { added: true };
  }

  async function consumePending() {
    const pending = sessionStorage.getItem(PENDING_KEY);
    if (!pending || !user) return false;
    sessionStorage.removeItem(PENDING_KEY);
    if (has(pending)) return false;
    await add(pending);
    return true;
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    setUser,
    has,
    toggle,
    consumePending,
    onChange,
    ids,
    get user() {
      return user;
    },
    get ordered() {
      return ordered;
    },
  };
}
