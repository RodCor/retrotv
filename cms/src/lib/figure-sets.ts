import { config } from "./config";

/**
 * Resolves Habbo figure SET ids (as stored in catalog_clothing.setid) to their
 * figure TYPE (hr/hd/ch/lg/ha/…) so the admin can preview clothing on an avatar.
 * FigureData.json is large (~1 MB); fetch it once and keep the map in memory.
 */
let cached: Map<string, string> | null = null;
let inflight: Promise<Map<string, string>> | null = null;

export async function setTypeMap(): Promise<Map<string, string>> {
  if (cached) return cached;
  if (!inflight) {
    inflight = (async () => {
      const res = await fetch(`${config.assets.gameDataUrl}/FigureData.json`, {
        cache: "force-cache",
      });
      if (!res.ok) throw new Error(`FigureData ${res.status}`);
      const data = (await res.json()) as {
        setTypes?: { type: string; sets?: { id: number | string }[] }[];
      };
      const map = new Map<string, string>();
      for (const st of data.setTypes ?? []) {
        for (const s of st.sets ?? []) map.set(String(s.id), st.type);
      }
      cached = map;
      return map;
    })().catch((err) => {
      inflight = null; // allow a later retry
      throw err;
    });
  }
  return inflight;
}

// Neutral mannequin so a single clothing piece still renders on a full avatar.
const BASE: Record<string, string> = {
  hd: "hd-180-1",
  ch: "ch-210-66",
  lg: "lg-270-82",
  hr: "hr-100-61",
  sh: "sh-290-80",
};

/**
 * Builds a full figure string for an avatar wearing the given clothing set id(s).
 * The set's own type replaces/extends the matching base part. Returns null when
 * none of the ids map to a known figure type.
 */
export function buildClothingFigure(
  map: Map<string, string>,
  setid: string,
): string | null {
  const parts: Record<string, string> = { ...BASE };
  let matched = false;
  for (const raw of String(setid ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const type = map.get(raw);
    if (!type) continue;
    parts[type] = `${type}-${raw}-0`;
    matched = true;
  }
  return matched ? Object.values(parts).join(".") : null;
}
