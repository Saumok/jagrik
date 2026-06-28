// A stable per-device identity (localStorage). The id is anonymous; the citizen
// picks their own display name (no random handles) — we ask for it before the
// first report. There's no login wall, just a name.
export interface Identity {
  id: string;
  handle: string; // "" until the citizen sets their name
}

const KEY = "jagrik_identity";

export function getIdentity(): Identity {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Identity;
  } catch {
    /* ignore */
  }
  const ident: Identity = {
    id: "u-" + Math.random().toString(36).slice(2, 10),
    handle: "",
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(ident));
  } catch {
    /* ignore */
  }
  return ident;
}

// Has the citizen given us a real name yet?
export function hasName(): boolean {
  return getIdentity().handle.trim().length > 0;
}

// Safe display name for UI (handles the unnamed case).
export function displayName(handle: string | undefined): string {
  return handle && handle.trim() ? handle : "Anonymous citizen";
}

export function setHandle(handle: string): Identity {
  const cur = getIdentity();
  const next = { ...cur, handle: handle.trim() || cur.handle };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function initials(handle: string): string {
  const out = (handle || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
  return out || "·";
}
