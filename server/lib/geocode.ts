// Reverse geocoding via OpenStreetMap Nominatim (free, no key, no billing).
// Turns device GPS coords into a real area name + city. Cached to respect limits.
// (Google Geocoding would need the Maps key + billing — avoided per constraints.)

export interface Geo {
  area?: string;
  city?: string;
}

const cache = new Map<string, Geo>();

export async function geocode(lat: number, lng: number): Promise<Geo> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Jagrik/1.0 (civic-action app)", "Accept-Language": "en" },
    });
    if (!res.ok) return {};
    const j = (await res.json()) as { address?: Record<string, string>; display_name?: string };
    const a = j.address ?? {};
    const local = a.road || a.neighbourhood || a.suburb || a.quarter || a.hamlet || a.village || a.residential;
    const city = a.city || a.town || a.municipality || a.city_district || a.state_district || a.county;
    const area = [local, city].filter(Boolean).join(", ") || j.display_name?.split(",").slice(0, 2).join(",").trim();
    const geo: Geo = { area, city };
    if (area) cache.set(key, geo);
    return geo;
  } catch (err) {
    console.error("[geocode] failed:", (err as Error).message);
    return {};
  }
}

// area-string convenience for the intake chip endpoint
export async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  return (await geocode(lat, lng)).area;
}
