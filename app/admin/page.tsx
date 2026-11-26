import type { Metadata } from "next";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";

export const metadata: Metadata = {
  title: "Quản trị Gameshow (/admin) — Cuộc thi Gia đình Chuyển đổi số",
};

export default function AdminPage() {
  return <AdminAuthGate />;
}
