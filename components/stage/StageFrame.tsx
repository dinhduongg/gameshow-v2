"use client";

import React from "react";
import Link from "next/link";
import {
  Keyboard,
  Maximize2,
  Minimize2,
  Settings,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { getFontCss, isLightHexColor } from "@/lib/defaults";
import type { ContestSettings } from "@/lib/types";

interface StageFrameProps {
  settings: ContestSettings;
  children: React.ReactNode;
  preview?: boolean;
  locked?: boolean;
  topLeft?: React.ReactNode;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  showShortcuts?: boolean;
  onToggleShortcuts?: () => void;
  realtimeConnected?: boolean;
}

export function StageFrame({
  settings,
  children,
  preview = false,
  locked = false,
  topLeft,
  soundEnabled = true,
  onToggleSound,
  isFullscreen = false,
  onToggleFullscreen,
  showShortcuts = false,
  onToggleShortcuts,
  realtimeConnected = false,
}: StageFrameProps) {
  const hasBgImage =
    settings.background_mode === "image" && Boolean(settings.background_url);
  const overlayAlpha = Math.min(85, Math.max(0, settings.overlay_opacity)) / 100;
  const isLightTheme = !hasBgImage && isLightHexColor(settings.bg_color);

  return (
    <div
      className={`relative w-full overflow-hidden flex flex-col select-none ${
        preview ? "h-full" : "min-h-screen h-screen"
      }`}
      style={{
        backgroundColor: settings.bg_color,
        color: settings.text_color,
        fontFamily: getFontCss(settings.body_font),
      }}
    >
      {/* Lớp nền ảnh hoặc Gradient sân khấu tự thích ứng tông tối/sáng */}
      {hasBgImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.background_url ?? ""}
            alt="Hình nền sân khấu"
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
          <div
            className="absolute inset-0 pointer-events-none transition-colors duration-300"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${overlayAlpha})`,
            }}
          />
        </>
      ) : (
        <>
          {/* Nền trường quay truyền hình VTV (đèn spotlight trung tâm & viền sân khấu) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isLightTheme
                ? `radial-gradient(ellipse at 50% 0%, ${settings.accent_color}18 0%, transparent 60%), radial-gradient(circle at 85% 90%, ${settings.slogan_color}18 0%, transparent 45%), linear-gradient(180deg, ${settings.bg_color} 0%, #e2e8f0 100%)`
                : `radial-gradient(ellipse 85% 55% at 50% 0%, color-mix(in srgb, ${settings.card_color} 95%, #ffffff 12%) 0%, transparent 68%), radial-gradient(circle at 14% 85%, ${settings.accent_color}26 0%, transparent 45%), radial-gradient(circle at 86% 85%, ${settings.slogan_color}20 0%, transparent 45%), linear-gradient(180deg, ${settings.bg_color} 0%, color-mix(in srgb, ${settings.bg_color} 52%, #000000) 100%)`,
            }}
          />
          {/* Luồng đèn chiếu trường quay nhẹ từ trên đỉnh */}
          <div
            className="animate-stage-glow absolute -top-28 left-1/2 -translate-x-1/2 h-80 w-[72%] rounded-full blur-3xl pointer-events-none"
            style={{
              backgroundColor: isLightTheme
                ? `${settings.accent_color}14`
                : `${settings.slogan_color}18`,
            }}
          />
          {overlayAlpha > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundColor: `rgba(0, 0, 0, ${overlayAlpha * 0.45})`,
              }}
            />
          )}
        </>
      )}

      {/* Viền phát sáng đỉnh sân khấu */}
      <div
        className="absolute top-0 inset-x-0 h-[3px] z-20 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${settings.accent_color} 35%, ${settings.slogan_color} 65%, transparent 100%)`,
        }}
      />

      {/* Thanh tiện ích nổi gọn (chỉ dùng icon để không làm rối sân khấu LED) */}
      {!preview && (
        <header
          aria-hidden={locked || undefined}
          className={`relative z-30 flex items-center justify-between gap-3 px-6 pt-3 pb-1 shrink-0 transition-opacity ${
            locked ? "pointer-events-none opacity-25" : ""
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">{topLeft}</div>

          <div className="flex items-center gap-1.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            {realtimeConnected && (
              <span
                title="Đã kết nối Supabase Realtime"
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/30 border border-white/10"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
            )}

            {onToggleShortcuts && (
              <button
                type="button"
                onClick={onToggleShortcuts}
                title="Phím tắt bút trình chiếu"
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/35 hover:bg-black/60 border border-white/15 text-white/90 backdrop-blur-md transition cursor-pointer"
              >
                <Keyboard className="h-4 w-4" />
              </button>
            )}

            {onToggleSound && (
              <button
                type="button"
                onClick={onToggleSound}
                title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
                className={`inline-flex items-center justify-center h-9 w-9 rounded-xl border backdrop-blur-md transition cursor-pointer ${
                  soundEnabled
                    ? "bg-black/35 hover:bg-black/60 border-white/15 text-white/90"
                    : "bg-rose-500/30 hover:bg-rose-500/45 border-rose-400/40 text-rose-200"
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
            )}

            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/35 hover:bg-black/60 border border-white/15 text-white/90 backdrop-blur-md transition cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            )}

            <Link
              href="/admin"
              title="Trang quản trị (/admin)"
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/35 hover:bg-black/60 border border-white/15 text-white/90 backdrop-blur-md transition"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </header>
      )}

      {/* Nội dung chính sân khấu */}
      <main
        className={`relative z-20 flex-1 min-h-0 flex flex-col ${
          preview ? "p-4" : "px-6 md:px-12 pb-6 pt-1"
        }`}
      >
        {children}
      </main>

      {/* Lớp chắn ngăn mọi thao tác chuột/cảm ứng khi đang đếm ngược */}
      {!preview && locked && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 cursor-not-allowed"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}

      {/* Modal hướng dẫn phím tắt bút trình chiếu */}
      {!preview && !locked && showShortcuts && onToggleShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onToggleShortcuts}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900/95 p-6 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Keyboard className="h-5 w-5 text-sky-400" />
                <h3 className="text-lg font-bold">
                  Phím tắt &amp; Bút trình chiếu (Remote)
                </h3>
              </div>
              <button
                type="button"
                onClick={onToggleShortcuts}
                className="rounded-lg p-1.5 hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
                <span className="text-slate-300">
                  Chuyển bước tuần tự (Hiện câu hỏi → Đếm ngược → Mở đáp án →
                  Câu tiếp)
                </span>
                <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
                  <kbd className="rounded bg-white/15 px-2 py-1">→</kbd>
                  <kbd className="rounded bg-white/15 px-2 py-1">PgDn</kbd>
                  <kbd className="rounded bg-white/15 px-2 py-1">Space</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
                <span className="text-slate-300">Quay lại câu trước</span>
                <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
                  <kbd className="rounded bg-white/15 px-2 py-1">←</kbd>
                  <kbd className="rounded bg-white/15 px-2 py-1">PgUp</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
                <span className="text-slate-300">
                  Chọn nhanh đáp án A / B / C / D
                </span>
                <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
                  <kbd className="rounded bg-white/15 px-2 py-1">1-4</kbd>
                  <span className="text-slate-400">hoặc</span>
                  <kbd className="rounded bg-white/15 px-2 py-1">A-D</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
                <span className="text-slate-300">
                  Bật / Tạm dừng đồng hồ đếm ngược
                </span>
                <kbd className="rounded bg-white/15 px-2.5 py-1 font-mono text-xs shrink-0">
                  Enter
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
