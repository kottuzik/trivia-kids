import type { Metadata, Viewport } from "next";
import { Nunito, Rubik } from "next/font/google";
import { getServerPreferences } from "@/i18n/server";
import { getDictionary } from "@/i18n/getDictionary";
import { LOCALE_DIR } from "@/i18n/locales";
import { GameProvider } from "@/lib/game/GameProvider";
import { PreferencesProvider } from "@/lib/preferences";
import { ServiceWorkerRegister } from "@/lib/pwa/ServiceWorkerRegister";
import { SoundProvider } from "@/lib/sound";
import "./globals.css";

// Rubik for Hebrew, Nunito for English and Russian (see DESIGN.md §2.2).
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerPreferences();
  const t = getDictionary(locale);
  return {
    title: { default: t.meta.appName, template: `%s · ${t.meta.appName}` },
    description: t.meta.description,
    appleWebApp: { capable: true, title: t.meta.appName, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: "#F8FDFF",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, ageGroup } = await getServerPreferences();
  const t = getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={LOCALE_DIR[locale]}
      data-scroll-behavior="smooth"
      className={`${rubik.variable} ${nunito.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          {t.common.skipToContent}
        </a>
        <PreferencesProvider initialLocale={locale} initialAgeGroup={ageGroup}>
          <SoundProvider>
            <GameProvider>{children}</GameProvider>
          </SoundProvider>
        </PreferencesProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
