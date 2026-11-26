import React from "react";
import { StageProvider } from "@/components/stage/StageContext";

export default function StageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StageProvider>{children}</StageProvider>;
}
