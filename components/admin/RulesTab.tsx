"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Keyboard,
  Loader2,
  Lock,
  LockOpen,
  Save,
  ShieldAlert,
  Sliders,
} from "lucide-react";
import {
  EMPTY_LOCKED_PACKAGES,
  readLockedPackages,
  subscribeLockedPackages,
  unlockAllPackages,
  unlockPackage,
  type LockedPackagesState,
} from "@/lib/lockedPackages";
import type { ContestSettings } from "@/lib/types";

interface RulesTabProps {
  draft: ContestSettings;
  onChange: (patch: Partial<ContestSettings>) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  isDirty: boolean;
  onToast: (type: "success" | "error", message: string) => void;
}

const MCQ_PRESETS = [10, 15, 20, 30, 45];
const SCENARIO_PRESETS = [60, 90, 120, 180, 300];

export function RulesTab({
  draft,
  onChange,
  onSave,
  saving,
  isDirty,
  onToast,
}: RulesTabProps) {
  const [locked, setLocked] = useState<LockedPackagesState>(
    EMPTY_LOCKED_PACKAGES
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword.trim()) {
      onToast("error", "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.");
      return;
    }
    if (newPassword.trim().length < 4) {
      onToast("error", "Mật khẩu mới cần có ít nhất 4 ký tự.");
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      onToast("error", "Mật khẩu xác nhận không khớp.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch("/api/admin-auth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword: newPassword.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        onToast("error", data.error || "Không thể đổi mật khẩu quản trị.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onToast("success", "Đã cập nhật mật khẩu đăng nhập Admin lên Supabase!");
    } catch {
      onToast("error", "Không thể kết nối máy chủ để cập nhật mật khẩu.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setLocked(readLockedPackages());
    });
    const unsubscribe = subscribeLockedPackages(setLocked);
    return () => {
      window.cancelAnimationFrame(rafId);
      unsubscribe();
    };
  }, []);

  const totalLocked = locked.mcq.length + locked.scenario.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Cột trái: Cấu hình thời gian & chế độ hiện đáp án */}
      <div className="lg:col-span-7 space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Thời gian đếm ngược từng phần thi
              </h2>
              <p className="text-sm text-slate-400">
                Thiết lập số giây mặc định cho đồng hồ sân khấu ở Phần 1 và Phần
                2.
              </p>
            </div>
          </div>

          {/* Thời gian Trắc nghiệm */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="mcq-duration"
                className="text-sm font-semibold text-slate-200"
              >
                Phần 1 — Trắc nghiệm (giây / câu)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="mcq-duration"
                  type="number"
                  min={5}
                  max={300}
                  value={draft.mcq_duration}
                  onChange={(e) =>
                    onChange({
                      mcq_duration: Math.max(
                        5,
                        Math.min(300, Number(e.target.value) || 5)
                      ),
                    })
                  }
                  className="w-24 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-right font-mono text-base font-bold text-sky-300 focus:border-sky-400 focus:outline-none"
                />
                <span className="text-sm text-slate-400">giây</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {MCQ_PRESETS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onChange({ mcq_duration: sec })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition cursor-pointer ${
                    draft.mcq_duration === sec
                      ? "bg-sky-500/20 border-sky-400 text-sky-200"
                      : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {sec} giây
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800" />

          {/* Thời gian Tình huống */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="scenario-duration"
                className="text-sm font-semibold text-slate-200"
              >
                Phần 2 — Xử lý tình huống (giây / tình huống)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="scenario-duration"
                  type="number"
                  min={10}
                  max={900}
                  value={draft.scenario_duration}
                  onChange={(e) =>
                    onChange({
                      scenario_duration: Math.max(
                        10,
                        Math.min(900, Number(e.target.value) || 10)
                      ),
                    })
                  }
                  className="w-24 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-right font-mono text-base font-bold text-amber-300 focus:border-amber-400 focus:outline-none"
                />
                <span className="text-sm text-slate-400">giây</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SCENARIO_PRESETS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onChange({ scenario_duration: sec })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition cursor-pointer ${
                    draft.scenario_duration === sec
                      ? "bg-amber-500/20 border-amber-400 text-amber-200"
                      : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {sec >= 60
                    ? `${Math.floor(sec / 60)} phút${
                        sec % 60 ? ` ${sec % 60}s` : ""
                      }`
                    : `${sec} giây`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Công tắc tự động hiện đáp án */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  draft.auto_reveal_answer
                    ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400"
                    : "bg-amber-500/15 border-amber-500/35 text-amber-400"
                }`}
              >
                {draft.auto_reveal_answer ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Tự động hiện đáp án ngay khi chọn/hết giờ ở phần Trắc nghiệm
                </h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  {draft.auto_reveal_answer
                    ? "ĐANG BẬT: Ngay khi bấm chọn A/B/C/D hoặc đồng hồ về 0, sân khấu lập tức tô xanh đáp án đúng, tô đỏ đáp án sai và hiện giải thích."
                    : "ĐANG TẮT: Khi chọn đáp án hoặc hết giờ, sân khấu giữ trạng thái khóa/chờ. MC hoặc kỹ thuật viên bấm phím tiếp theo (Space / → / PgDn) mới mở đáp án."}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={draft.auto_reveal_answer}
              onClick={() =>
                onChange({ auto_reveal_answer: !draft.auto_reveal_answer })
              }
              className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                draft.auto_reveal_answer ? "bg-emerald-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  draft.auto_reveal_answer ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Công tắc khóa thao tác khi đang đếm ngược */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  draft.lock_during_countdown
                    ? "bg-sky-500/15 border-sky-500/35 text-sky-400"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}
              >
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Khóa toàn bộ thao tác trên màn hình thi khi đang đếm ngược
                </h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  {draft.lock_during_countdown
                    ? "ĐANG BẬT: Khi đồng hồ đang chạy, khóa mọi cú bấm chuột và phím tắt/bút trình chiếu để tránh ấn nhầm cho đến khi hết giờ."
                    : "ĐANG TẮT: Cho phép chọn đáp án A/B/C/D, tạm dừng đồng hồ (Enter) hoặc chuyển bước ngay cả khi đồng hồ đang đếm ngược."}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={draft.lock_during_countdown}
              onClick={() =>
                onChange({
                  lock_during_countdown: !draft.lock_during_countdown,
                })
              }
              className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                draft.lock_during_countdown ? "bg-sky-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  draft.lock_during_countdown
                    ? "translate-x-7"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Nút lưu cấu hình luật chơi */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4">
          <div className="flex items-center gap-2 text-sm">
            {isDirty ? (
              <span className="text-amber-300 font-medium">
                Có thay đổi chưa lưu — bấm Lưu để đồng bộ lên sân khấu.
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Cấu hình luật chơi đang được đồng bộ.
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave()}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 px-5 py-2.5 text-sm font-bold text-slate-950 transition cursor-pointer shrink-0"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Lưu cấu hình
          </button>
        </div>

        {/* Quản lý bộ đề đã khóa sau khi thi xong */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Lock className="h-5 w-5 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white">
                  Bộ đề đã khóa sau khi thi xong ({totalLocked})
                </h3>
                <p className="text-xs text-slate-400">
                  Mỗi bộ đề tự động khóa khi hoàn thành để tránh chọn trùng.
                </p>
              </div>
            </div>

            {totalLocked > 0 && (
              <button
                type="button"
                onClick={() => setLocked(unlockAllPackages())}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 px-3 py-1.5 text-xs font-bold text-amber-200 transition cursor-pointer shrink-0"
              >
                <LockOpen className="h-3.5 w-3.5" />
                Mở khóa tất cả
              </button>
            )}
          </div>

          {totalLocked === 0 ? (
            <p className="text-xs text-slate-400">
              Chưa có bộ đề nào bị khóa.
            </p>
          ) : (
            <div className="space-y-3">
              {locked.mcq.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                    Phần 1 — Trắc nghiệm
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {locked.mcq.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200"
                      >
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        {name}
                        <button
                          type="button"
                          onClick={() => setLocked(unlockPackage("mcq", name))}
                          className="text-sky-400 hover:text-sky-300 font-bold cursor-pointer ml-1"
                        >
                          Mở khóa
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {locked.scenario.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Phần 2 — Tình huống
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {locked.scenario.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200"
                      >
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        {name}
                        <button
                          type="button"
                          onClick={() =>
                            setLocked(unlockPackage("scenario", name))
                          }
                          className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer ml-1"
                        >
                          Mở khóa
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cột phải: Đổi mật khẩu Admin & Phím tắt bút trình chiếu */}
      <div className="lg:col-span-5 space-y-6">
        <form
          onSubmit={(e) => void handleUpdatePassword(e)}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3.5">
            <KeyRound className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Mật khẩu đăng nhập Admin (Supabase)
              </h3>
              <p className="text-xs text-slate-400">
                Lưu trong bảng <span className="font-mono">settings.admin_password</span>{" "}
                (mặc định <span className="font-mono">admin123</span>).
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 4 ký tự..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={updatingPassword}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 px-4 py-2.5 text-sm font-bold text-slate-950 transition cursor-pointer"
          >
            {updatingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Cập nhật mật khẩu Admin
          </button>
        </form>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3.5">
            <Keyboard className="h-5 w-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              Hướng dẫn điều khiển Bút trình chiếu
            </h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-slate-200">
                  Chuyển bước tuần tự
                </span>
                <div className="flex gap-1 font-mono text-xs">
                  <kbd className="rounded bg-slate-800 px-2 py-0.5 text-sky-300">
                    →
                  </kbd>
                  <kbd className="rounded bg-slate-800 px-2 py-0.5 text-sky-300">
                    PgDn
                  </kbd>
                  <kbd className="rounded bg-slate-800 px-2 py-0.5 text-sky-300">
                    Space
                  </kbd>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Hiện câu hỏi → Bắt đầu đếm ngược → Chốt &amp; Hiện đáp án → Câu
                tiếp theo.
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-slate-200">
                  Quay lại câu trước
                </span>
                <div className="flex gap-1 font-mono text-xs">
                  <kbd className="rounded bg-slate-800 px-2 py-0.5 text-sky-300">
                    ←
                  </kbd>
                  <kbd className="rounded bg-slate-800 px-2 py-0.5 text-sky-300">
                    PgUp
                  </kbd>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Quay về câu hỏi hoặc tình huống trước đó trong bộ đề.
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-slate-200">
                  Chọn nhanh đáp án A / B / C / D
                </span>
                <div className="flex gap-1 font-mono text-xs">
                  <kbd className="rounded bg-slate-800 px-2 py-0.5 text-amber-300">
                    1-4
                  </kbd>
                  <kbd className="rounded bg-slate-800 px-2 py-0.5 text-amber-300">
                    A-D
                  </kbd>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Chốt nhanh phương án thí sinh chọn trong Phần 1 Trắc nghiệm.
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-slate-200">
                  Tạm dừng / Tiếp tục đồng hồ
                </span>
                <kbd className="rounded bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-emerald-300">
                  Enter
                </kbd>
              </div>
              <p className="text-xs text-slate-400">
                Hoạt động cho cả đồng hồ Trắc nghiệm và đồng hồ Tình huống.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-xs text-slate-400 space-y-2 leading-relaxed">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <Sliders className="h-4 w-4 text-amber-400" />
            Lưu ý vận hành sân khấu
          </div>
          <p>
            • Mở màn hình trình chiếu tại{" "}
            <span className="text-sky-300 font-mono">/</span> trên máy chiếu
            LED và bấm nút <strong>Toàn màn hình</strong> ở góc trên phải.
          </p>
          <p>
            • Mọi thay đổi ở trang <span className="font-mono">/admin</span>{" "}
            được đồng bộ tức thì sang màn hình sân khấu qua Supabase Realtime mà
            không cần tải lại trang.
          </p>
        </div>
      </div>
    </div>
  );
}
