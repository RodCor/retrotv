/**
 * Central runtime configuration, read from environment variables.
 * Sensible defaults match the bundled docker-compose stack so the CMS
 * works out-of-the-box in development.
 */
export const config = {
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 13306),
    user: process.env.DB_USER ?? "arcturus_user",
    password: process.env.DB_PASSWORD ?? "arcturus_pw",
    database: process.env.DB_NAME ?? "arcturus",
  },
  session: {
    secret:
      process.env.SESSION_SECRET ??
      "dev-only-insecure-secret-change-me-in-production-please-0000",
    cookieName: "retrotv_session",
    maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
  },
  hotel: {
    name: process.env.NEXT_PUBLIC_HOTEL_NAME ?? "RetroTV",
    // URL of the Nitro client. The CMS redirects here with ?sso=<ticket>.
    clientUrl: process.env.NEXT_PUBLIC_CLIENT_URL ?? "http://127.0.0.1:1080",
    // Default avatar look for newly registered users.
    defaultLook:
      process.env.DEFAULT_LOOK ??
      "hr-100-61.hd-180-1.ch-210-66.lg-270-82.sh-290-80",
    defaultMotto: process.env.DEFAULT_MOTTO ?? "Welcome to RetroTV!",
    startCredits: Number(process.env.START_CREDITS ?? 5000),
    startPixels: Number(process.env.START_PIXELS ?? 5000),
    startPoints: Number(process.env.START_POINTS ?? 100),
  },
  assets: {
    // Furni icon PNGs, loaded by the browser (<img>). Point at your public
    // asset host in production; defaults to the bundled SWF server.
    furniIconUrl:
      process.env.NEXT_PUBLIC_FURNI_ICON_URL ??
      "http://127.0.0.1:8081/dcr/hof_furni/icons",
    // Game data, fetched server-side to map clothing sets -> figure types.
    // In docker this is the internal asset service; on host it's the mapped port.
    gameDataUrl: process.env.GAMEDATA_URL ?? "http://127.0.0.1:8080/gamedata",
    // Badge GIFs, loaded by the browser (admin badge previews).
    badgeUrl:
      process.env.NEXT_PUBLIC_BADGE_URL ??
      "http://127.0.0.1:8081/c_images/album1584",
    // Hotel-view promo/news images (admin news previews). The hotelview_news
    // `image` column stores paths like "web_promo_small/foo.png" relative here.
    promoImageUrl:
      process.env.NEXT_PUBLIC_PROMO_IMAGE_URL ?? "http://127.0.0.1:8080/images",
  },
  // Arcturus RCON endpoint (server-side only). Used to push live reloads
  // (e.g. refresh the hotel-view news) without restarting the emulator.
  rcon: {
    host: process.env.RCON_HOST ?? "127.0.0.1",
    port: Number(process.env.RCON_PORT ?? 3001),
  },
} as const;

export type AppConfig = typeof config;
