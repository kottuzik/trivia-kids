import type { Metadata } from "next";
import { getDictionary } from "@/i18n/getDictionary";
import { getServerPreferences } from "@/i18n/server";
import { QuizScreen } from "./QuizScreen";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerPreferences();
  return { title: getDictionary(locale).meta.quizTitle };
}

export default function QuizPage() {
  return <QuizScreen />;
}
