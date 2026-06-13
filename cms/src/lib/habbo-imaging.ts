import { config } from "./config";

/**
 * Builds an avatar render URL using the standard habbo-imaging endpoint.
 * Arcturus + Nitro stacks typically proxy this; we point at the client host
 * which serves `/habbo-imaging/avatarimage`. Falls back gracefully if the
 * imaging host is not configured.
 */
export function avatarImageUrl(
  look: string,
  opts: {
    direction?: number;
    headDirection?: number;
    size?: "s" | "m" | "l";
    headOnly?: boolean;
    action?: string;
    gesture?: string;
  } = {},
): string {
  const base =
    process.env.NEXT_PUBLIC_IMAGING_URL ?? `${config.hotel.clientUrl}/habbo-imaging`;
  const params = new URLSearchParams({
    figure: look,
    direction: String(opts.direction ?? 2),
    head_direction: String(opts.headDirection ?? 2),
    size: opts.size ?? "l",
    img_format: "png",
  });
  if (opts.headOnly) params.set("headonly", "1");
  if (opts.action) params.set("action", opts.action);
  if (opts.gesture) params.set("gesture", opts.gesture);
  return `${base}/avatarimage?${params.toString()}`;
}
