import type { Metadata } from "next";
import { ScenarioStage } from "@/components/stage/ScenarioStage";

export const metadata: Metadata = {
  title: "Phần 2: Thi Tình huống — Cuộc thi Gia đình Chuyển đổi số",
};

export default function ScenarioPage() {
  return <ScenarioStage />;
}
