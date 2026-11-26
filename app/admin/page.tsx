import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "Quản trị Gameshow (/admin) — Cuộc thi Gia đình Chuyển đổi số",
};

export default function AdminPage() {
  return <AdminApp />;
}
