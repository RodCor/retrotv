/**
 * Builds an avatar render URL using the standard habbo-imaging endpoint.
 * Defaults to the public Habbo imager; override with NEXT_PUBLIC_IMAGING_URL
 * to point at a self-hosted imager on your own domain.
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
  // CMS avatar thumbnails use an habbo-imaging endpoint. By default we use the
  // public Habbo imager (renders any standard figure string). Self-host an
  // imager and set NEXT_PUBLIC_IMAGING_URL to keep everything on your domain.
  const base =
    process.env.NEXT_PUBLIC_IMAGING_URL ?? "https://www.habbo.com/habbo-imaging";
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
