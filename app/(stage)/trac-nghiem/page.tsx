import type { Metadata } from "next";
import { McqStage } from "@/components/stage/McqStage";

export const metadata: Metadata = {
  title: "Phần 1: Thi Trắc nghiệm — Cuộc thi Gia đình Chuyển đổi số",
};

export default function McqPage() {
  return <McqStage />;
}
