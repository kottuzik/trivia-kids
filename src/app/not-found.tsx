import type { Metadata } from "next";
import { ButtonLink } from "@/components/Button";
import { getDictionary } from "@/i18n/getDictionary";
import { getServerPreferences } from "@/i18n/server";
import shared from "./shared.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerPreferences();
  return { title: getDictionary(locale).meta.notFoundTitle };
}

export default async function NotFound() {
  const { locale } = await getServerPreferences();
  const t = getDictionary(locale);

  return (
    <main id="main" className={shared.main}>
      <div className={shared.card}>
        <h1>{t.notFound.heading}</h1>
        <p>{t.notFound.text}</p>
        <ButtonLink href="/">{t.notFound.goHome}</ButtonLink>
      </div>
    </main>
  );
}
