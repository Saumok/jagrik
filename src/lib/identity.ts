// A stable anonymous identity per device (localStorage). Gives every citizen a
// friendly handle for the community space without a login wall.
export interface Identity {
  id: string;
  handle: string;
}

const KEY = "jagrik_identity";
const FIRST = ["Riya", "Ashok", "Priya", "Sourav", "Ankit", "Meera", "Rahul", "Nadia", "Arjun", "Sneha", "Dev", "Ira"];
const LAST = ["S.", "D.", "M.", "R.", "K.", "B.", "C.", "G."];

function rand<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

export function getIdentity(): Identity {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Identity;
  } catch {
    /* ignore */
  }
  const ident: Identity = {
    id: "u-" + Math.random().toString(36).slice(2, 10),
    handle: `${rand(FIRST)} ${rand(LAST)}`,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(ident));
  } catch {
    /* ignore */
  }
  return ident;
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
  return handle
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}
