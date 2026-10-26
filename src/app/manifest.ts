import type { MetadataRoute } from "next";
import { getDictionary } from "@/i18n/getDictionary";
import { LOCALE_DIR } from "@/i18n/locales";
import { getServerPreferences } from "@/i18n/server";

// Installed name and direction follow the language chosen on the home screen (ADR-1).
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { locale } = await getServerPreferences();
  const t = getDictionary(locale);
  return {
    id: "/",
    name: t.meta.appName,
    short_name: t.meta.appName,
    description: t.meta.description,
    lang: locale,
    dir: LOCALE_DIR[locale],
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F8FDFF",
    theme_color: "#F8FDFF",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
