interface StorageArea {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Supabase sessions use local storage only when the user opts to remember login. */
export function createAuthStorage(
  sessionKey: string,
  areas: () => { local: StorageArea; session: StorageArea } | null = () => {
    if (typeof window === "undefined") return null;
    return { local: window.localStorage, session: window.sessionStorage };
  },
) {
  const preferenceKey = sessionKey + "-remember";
  const keys = new Set([sessionKey, sessionKey + "-code-verifier", sessionKey + "-user"]);
  const memory = new Map<string, string>();
  let remember: boolean | undefined;
  function browserAreas() {
    try { return areas(); } catch { return null; }
  }
  function remembered() {
    if (remember !== undefined) return remember;
    const stores = browserAreas();
    if (!stores) return true;
    try {
      // Preserve existing remembered sessions from before this feature.
      remember = (stores.session.getItem(preferenceKey) ?? stores.local.getItem(preferenceKey)) !== "session";
    } catch { remember = false; }
    return remember;
  }
  function selected() {
    const stores = browserAreas();
    return stores ? (remembered() ? stores.local : stores.session) : null;
  }
  const storage = {
    getItem(key: string) {
      keys.add(key);
      try { return selected()?.getItem(key) ?? memory.get(key) ?? null; }
      catch { return memory.get(key) ?? null; }
    },
    setItem(key: string, value: string) {
      keys.add(key);
      try {
        const target = selected();
        if (target) { target.setItem(key, value); memory.delete(key); }
        else memory.set(key, value);
      } catch { memory.set(key, value); }
    },
    removeItem(key: string) {
      memory.delete(key);
      const stores = browserAreas();
      for (const area of [stores?.local, stores?.session]) {
        try { area?.removeItem(key); } catch { /* Browser storage may be unavailable. */ }
      }
    },
  };
  function setRememberMe(value: boolean) {
    const stores = browserAreas();
    if (!stores) throw new Error("Browser storage is unavailable. Enable it to sign in.");
    const old = remembered() ? stores.local : stores.session;
    const target = value ? stores.local : stores.session;
    const other = value ? stores.session : stores.local;
    const mode = value ? "local" : "session";
    // Check the target before moving credentials; do not silently promise persistence.
    target.setItem(preferenceKey, mode);
    for (const key of keys) {
      const existing = old.getItem(key) ?? memory.get(key);
      if (existing !== undefined && existing !== null) target.setItem(key, existing);
      else target.removeItem(key);
      other.removeItem(key);
      memory.delete(key);
    }
    remember = value;
    stores.session.setItem(preferenceKey, mode);
    stores.local.setItem(preferenceKey, mode);
  }
  return { storage, setRememberMe };
}
