import type { Metadata } from "next";
import { getDictionary } from "@/i18n/getDictionary";
import { getServerPreferences } from "@/i18n/server";
import { AboutScreen } from "./AboutScreen";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerPreferences();
  return { title: getDictionary(locale).meta.aboutTitle };
}

export default function AboutPage() {
  return <AboutScreen />;
}
