import type { Metadata } from "next";
import { LetiAiExperience } from "./LetiAiExperience";

export const metadata: Metadata = {
  title: "LETI IA",
};

export default function LetiAiPage() {
  return <LetiAiExperience />;
}
