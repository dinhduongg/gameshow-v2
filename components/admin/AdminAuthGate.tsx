"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { AdminApp } from "./AdminApp";

export function AdminAuthGate() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [usingDefault, setUsingDefault] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const res = await fetch("/api/admin-auth", { cache: "no-store" });
        const data = (await res.json()) as {
          authenticated?: boolean;
          usingDefault?: boolean;
        };
        if (cancelled) return;
        setAuthenticated(Boolean(data.authenticated));
        setUsingDefault(Boolean(data.usingDefault));
      } catch {
        if (!cancelled) {
          setAuthenticated(false);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu quản trị.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Mật khẩu không chính xác.");
        return;
      }
      setPassword("");
      setAuthenticated(true);
    } catch {
      setError("Không thể kết nối máy chủ xác thực. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = useCallback(async () => {
    await fetch("/api/admin-auth", { method: "DELETE" }).catch(() => {});
    setAuthenticated(false);
    setPassword("");
    setError(null);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        <span className="text-sm text-slate-400">
          Đang kiểm tra phiên đăng nhập...
        </span>
      </div>
    );
  }

  if (authenticated) {
    return <AdminApp onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ánh sáng nền nhẹ */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-[560px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: "#38bdf8" }}
      />

      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-7 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-400/35 text-sky-300 shadow-lg">
            <Lock className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">
              Đăng nhập Quản trị Gameshow
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Nhập mật khẩu Ban tổ chức để mở bảng điều khiển /admin
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
            >
              Mật khẩu truy cập
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Nhập mật khẩu..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-11 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-200">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 px-4 py-3 text-sm font-bold text-slate-950 transition shadow-lg cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Mở khóa trang Quản trị
          </button>
        </form>

        {usingDefault && (
          <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-[11px] text-amber-200/90 leading-relaxed text-center">
            Mật khẩu mặc định là{" "}
            <strong className="font-mono text-amber-100">admin123</strong> (có
            thể đổi trực tiếp trong Tab 1 hoặc bảng{" "}
            <code className="font-mono">settings.admin_password</code> trên
            Supabase).
          </p>
        )}

        <div className="pt-2 border-t border-slate-800 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-sky-300 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại Màn hình Sân khấu
          </Link>
        </div>
      </div>
    </div>
  );
}
