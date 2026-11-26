"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Clock,
  FolderKanban,
  Home,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { getFontCss, groupByPackage } from "@/lib/defaults";
import { soundEngine } from "@/lib/sound";
import { useStage } from "./StageContext";
import { StageFrame } from "./StageFrame";
import { StageHeaderHero } from "./StageHeaderHero";

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ScenarioStage() {
  const {
    settings,
    scenarios,
    loading,
    realtimeConnected,
    soundEnabled,
    toggleSound,
    isFullscreen,
    toggleFullscreen,
    showShortcuts,
    setShowShortcuts,
  } = useStage();

  const packages = useMemo(() => groupByPackage(scenarios), [scenarios]);
  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(
    null
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const activePackage = useMemo(
    () => packages.find((pkg) => pkg.name === selectedPackageName) ?? null,
    [packages, selectedPackageName]
  );

  const items = activePackage?.items ?? [];
  const currentScenario = items[currentIndex] ?? null;
  const timeLeft = remainingTime ?? settings.scenario_duration;

  const startPackage = useCallback((name: string) => {
    setSelectedPackageName(name);
    setCurrentIndex(0);
    setRemainingTime(null);
    setTimerRunning(false);
    setShowGuide(false);
    soundEngine.playLock();
  }, []);

  const goToScenario = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= items.length) return;
      setCurrentIndex(nextIndex);
      setRemainingTime(null);
      setTimerRunning(false);
      setShowGuide(false);
      soundEngine.playLock();
    },
    [items.length]
  );

  const handleResetTimer = useCallback(() => {
    setTimerRunning(false);
    setRemainingTime(null);
    soundEngine.playLock();
  }, []);

  const handleToggleTimer = useCallback(() => {
    if (timeLeft <= 0) {
      setRemainingTime(settings.scenario_duration);
      setTimerRunning(true);
      soundEngine.playLock();
      return;
    }
    if (remainingTime === null) {
      setRemainingTime(settings.scenario_duration);
    }
    setTimerRunning((prev) => !prev);
  }, [remainingTime, settings.scenario_duration, timeLeft]);

  // Đồng hồ đếm ngược riêng cho phần Tình huống
  useEffect(() => {
    if (!timerRunning) return;

    const timerId = window.setInterval(() => {
      setRemainingTime((prev) => {
        const current = prev ?? settings.scenario_duration;
        const next = current - 1;
        if (next > 0 && next <= 5) {
          soundEngine.playTick(next <= 3);
        }
        if (next <= 0) {
          window.clearInterval(timerId);
          setTimerRunning(false);
          soundEngine.playTimeUp();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [settings.scenario_duration, timerRunning]);

  // Phím tắt điều khiển cho Phần 2
  useEffect(() => {
    if (!activePackage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleToggleTimer();
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        if (currentIndex + 1 < items.length) goToScenario(currentIndex + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        if (currentIndex > 0) goToScenario(currentIndex - 1);
      } else if (e.key === "Escape") {
        setShowGuide(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activePackage,
    currentIndex,
    goToScenario,
    handleToggleTimer,
    items.length,
  ]);

  const topLeftControls = activePackage ? (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => {
          setSelectedPackageName(null);
          setTimerRunning(false);
          setShowGuide(false);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-black/35 hover:bg-black/55 border border-white/15 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-md transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Chọn bộ đề
      </button>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-xl bg-black/35 hover:bg-black/55 border border-white/15 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-md transition"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">Trang chủ</span>
      </Link>
      <span
        className="hidden md:inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md"
        style={{
          backgroundColor: `${settings.card_color}cc`,
          borderColor: `${settings.slogan_color}55`,
          color: settings.slogan_color,
        }}
      >
        <FolderKanban className="h-3.5 w-3.5" />
        {activePackage.name}
      </span>
    </div>
  ) : (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-xl bg-black/35 hover:bg-black/55 border border-white/15 px-3.5 py-2 text-xs font-semibold text-white/95 backdrop-blur-md transition"
    >
      <ArrowLeft className="h-4 w-4" />
      Về màn hình chính
    </Link>
  );

  // MÀN HÌNH 1: CHỌN BỘ ĐỀ TÌNH HUỐNG (HIỂN THỊ ĐẦY ĐỦ LOGO, TIÊU ĐỀ, SLOGAN)
  if (!activePackage) {
    return (
      <StageFrame
        settings={settings}
        topLeft={topLeftControls}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        showShortcuts={showShortcuts}
        onToggleShortcuts={() => setShowShortcuts((v) => !v)}
        realtimeConnected={realtimeConnected}
      >
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 max-w-6xl w-full mx-auto">
          <StageHeaderHero
            settings={settings}
            compact
            badgeText="PHẦN 2 • XỬ LÝ TÌNH HUỐNG"
          />

          <div className="w-full flex-1 min-h-0 flex flex-col justify-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles
                className="h-4 w-4"
                style={{ color: settings.slogan_color }}
              />
              <h2
                className="text-base md:text-lg font-bold uppercase tracking-[0.18em]"
                style={{
                  fontFamily: getFontCss(settings.heading_font),
                  color: settings.text_color,
                }}
              >
                Chọn bộ đề thi Tình huống
              </h2>
              <Sparkles
                className="h-4 w-4"
                style={{ color: settings.slogan_color }}
              />
            </div>

            {loading ? (
              <div className="text-center py-12 opacity-75">
                Đang tải danh sách bộ đề tình huống...
              </div>
            ) : packages.length === 0 ? (
              <div
                className="mx-auto max-w-lg rounded-3xl border p-8 text-center backdrop-blur-md"
                style={{
                  backgroundColor: `${settings.card_color}cc`,
                  borderColor: `${settings.slogan_color}45`,
                }}
              >
                <p className="text-lg font-semibold mb-2">
                  Chưa có câu hỏi tình huống nào
                </p>
                <p className="text-sm opacity-75 mb-5">
                  Hãy vào trang Admin để thêm tình huống thủ công hoặc Import từ
                  file Excel (.xlsx).
                </p>
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950 transition"
                  style={{ backgroundColor: settings.slogan_color }}
                >
                  Mở trang Quản trị (/admin)
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[48vh] overflow-y-auto custom-scrollbar px-1 py-1">
                {packages.map((pkg, idx) => (
                  <button
                    key={pkg.name}
                    type="button"
                    onClick={() => startPackage(pkg.name)}
                    className="group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl backdrop-blur-md cursor-pointer flex flex-col justify-between gap-4"
                    style={{
                      backgroundColor: `${settings.card_color}d9`,
                      borderColor: `${settings.slogan_color}55`,
                      boxShadow: `0 12px 32px -10px rgba(0,0,0,0.5)`,
                    }}
                  >
                    <div
                      className="absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl opacity-25 group-hover:opacity-55 transition-opacity"
                      style={{ backgroundColor: settings.slogan_color }}
                    />
                    <div className="relative flex items-center justify-between">
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-base font-extrabold border"
                        style={{
                          backgroundColor: `${settings.slogan_color}22`,
                          borderColor: `${settings.slogan_color}55`,
                          color: settings.slogan_color,
                          fontFamily: getFontCss(settings.heading_font),
                        }}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        {formatClock(settings.scenario_duration)}
                      </span>
                    </div>

                    <div className="relative">
                      <h3
                        className="text-xl font-bold leading-snug mb-1.5"
                        style={{
                          fontFamily: getFontCss(settings.heading_font),
                          color: settings.text_color,
                        }}
                      >
                        {pkg.name}
                      </h3>
                      <p className="text-sm opacity-75">
                        {pkg.items.length} tình huống sân khấu
                      </p>
                    </div>

                    <div
                      className="relative flex items-center justify-between pt-3 border-t border-white/10 text-sm font-bold"
                      style={{ color: settings.slogan_color }}
                    >
                      <span>Mở bộ đề tình huống</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </StageFrame>
    );
  }

  // MÀN HÌNH 2: TRÌNH CHIẾU TÌNH HUỐNG
  if (!currentScenario) return null;

  const isUrgent = timerRunning && timeLeft > 0 && timeLeft <= 5;
  const isTimeUp = timeLeft === 0;
  const progressPercent = Math.max(
    0,
    Math.min(100, (timeLeft / Math.max(1, settings.scenario_duration)) * 100)
  );

  return (
    <StageFrame
      settings={settings}
      topLeft={topLeftControls}
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
      showShortcuts={showShortcuts}
      onToggleShortcuts={() => setShowShortcuts((v) => !v)}
      realtimeConnected={realtimeConnected}
    >
      <div className="flex-1 min-h-0 flex flex-col justify-between gap-4 max-w-7xl w-full mx-auto">
        {/* Thanh trên: số thứ tự tình huống & đồng hồ riêng (Play/Pause/Reset) */}
        <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="rounded-2xl border px-4 py-2 backdrop-blur-md"
              style={{
                backgroundColor: `${settings.card_color}dd`,
                borderColor: `${settings.slogan_color}66`,
              }}
            >
              <span className="text-xs uppercase tracking-widest opacity-70 block">
                Phần 2 • Xử lý tình huống
              </span>
              <span
                className="text-xl md:text-2xl font-extrabold"
                style={{
                  fontFamily: getFontCss(settings.heading_font),
                  color: settings.slogan_color,
                }}
              >
                TÌNH HUỐNG {currentIndex + 1} / {items.length}
              </span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-bold opacity-90">
                {settings.contest_title}
              </p>
              <p
                className="text-xs opacity-80"
                style={{ color: settings.slogan_color }}
              >
                {settings.slogan}
              </p>
            </div>
          </div>

          {/* Đồng hồ đếm ngược riêng + nút Play / Pause / Reset */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleTimer}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-slate-950 transition hover:brightness-110 cursor-pointer shadow-lg"
              style={{
                backgroundColor: timerRunning
                  ? settings.slogan_color
                  : settings.accent_color,
              }}
            >
              {timerRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  Tạm dừng
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {timeLeft === settings.scenario_duration
                    ? "Bắt đầu giờ"
                    : "Tiếp tục"}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetTimer}
              title="Đặt lại đồng hồ"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/40 hover:bg-black/60 px-3.5 py-3 text-sm font-semibold transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Đặt lại</span>
            </button>

            <div
              className={`flex items-center gap-3 rounded-2xl border-2 px-5 py-2 backdrop-blur-md ${
                isUrgent ? "animate-urgent-timer" : ""
              }`}
              style={{
                backgroundColor:
                  isUrgent || isTimeUp
                    ? "rgba(127, 29, 29, 0.85)"
                    : `${settings.card_color}e6`,
                borderColor:
                  isUrgent || isTimeUp
                    ? "#f87171"
                    : timerRunning
                    ? settings.slogan_color
                    : "rgba(255,255,255,0.22)",
              }}
            >
              <Clock
                className={`h-7 w-7 ${
                  isUrgent || isTimeUp ? "text-red-300" : ""
                }`}
                style={
                  isUrgent || isTimeUp
                    ? undefined
                    : { color: settings.slogan_color }
                }
              />
              <span
                className="tabular-nums leading-none"
                style={{
                  fontFamily: getFontCss(settings.heading_font),
                  fontSize: `${settings.timer_size}px`,
                  fontWeight: settings.timer_weight,
                  color:
                    isUrgent || isTimeUp ? "#fecaca" : settings.text_color,
                }}
              >
                {formatClock(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* Thanh tiến độ thời gian */}
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden shrink-0">
          <div
            className="h-full rounded-full transition-all duration-500 ease-linear"
            style={{
              width: `${progressPercent}%`,
              backgroundColor:
                isUrgent || isTimeUp ? "#ef4444" : settings.slogan_color,
            }}
          />
        </div>

        {/* Khung đề bài tình huống lớn rõ nét */}
        <div
          className="flex-1 min-h-0 rounded-3xl border-2 p-7 md:p-10 shadow-2xl backdrop-blur-md flex flex-col justify-center gap-5 overflow-y-auto custom-scrollbar"
          style={{
            backgroundColor: `${settings.card_color}e4`,
            borderColor: `${settings.slogan_color}55`,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="h-1.5 w-12 rounded-full"
              style={{ backgroundColor: settings.slogan_color }}
            />
            <h2
              className="text-2xl md:text-3xl font-extrabold uppercase tracking-wide"
              style={{
                fontFamily: getFontCss(settings.heading_font),
                color: settings.slogan_color,
              }}
            >
              {currentScenario.title}
            </h2>
          </div>

          <p
            className="leading-relaxed whitespace-pre-line"
            style={{
              fontFamily: getFontCss(settings.body_font),
              fontSize: `${settings.question_size}px`,
              fontWeight: settings.question_weight,
              color: settings.text_color,
            }}
          >
            {currentScenario.content}
          </p>
        </div>

        {/* Thanh điều khiển dưới cùng + Nút Xem gợi ý chấm điểm */}
        <div className="flex items-center justify-between gap-3 pt-1 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => goToScenario(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/35 hover:bg-black/55 disabled:opacity-35 px-4 py-2.5 text-sm font-semibold backdrop-blur-md transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Tình huống trước
          </button>

          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-5 py-2.5 text-sm md:text-base font-bold transition cursor-pointer backdrop-blur-md hover:brightness-110"
            style={{
              backgroundColor: showGuide
                ? "rgba(16, 185, 129, 0.25)"
                : `${settings.card_color}e0`,
              borderColor: showGuide ? "#34d399" : `${settings.accent_color}88`,
              color: showGuide ? "#6ee7b7" : settings.accent_color,
            }}
          >
            <ClipboardCheck className="h-5 w-5" />
            {showGuide
              ? "Ẩn gợi ý chấm điểm"
              : "Xem gợi ý chấm điểm (Ban giám khảo)"}
          </button>

          <button
            type="button"
            onClick={() => goToScenario(currentIndex + 1)}
            disabled={currentIndex + 1 >= items.length}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm md:text-base font-extrabold text-slate-950 disabled:opacity-35 transition hover:brightness-110 cursor-pointer"
            style={{ backgroundColor: settings.slogan_color }}
          >
            Tình huống tiếp theo
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bảng Gợi ý chấm điểm cho Ban giám khảo */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="animate-reveal-pop w-full max-w-4xl max-h-[82vh] flex flex-col rounded-3xl border-2 border-emerald-400/50 bg-slate-950/95 text-slate-100 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-emerald-500/15 px-7 py-5">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                    Gợi ý chấm điểm dành cho Ban giám khảo
                  </p>
                  <h3 className="text-lg md:text-xl font-bold text-white">
                    {currentScenario.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-xl p-2 hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-7 overflow-y-auto custom-scrollbar">
              {currentScenario.grading_guide ? (
                <p
                  className="text-lg md:text-xl leading-relaxed whitespace-pre-line text-slate-100"
                  style={{ fontFamily: getFontCss(settings.body_font) }}
                >
                  {currentScenario.grading_guide}
                </p>
              ) : (
                <p className="text-base text-slate-400 italic">
                  Tình huống này chưa có nội dung gợi ý chấm điểm. Bạn có thể bổ
                  sung tại trang /admin.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </StageFrame>
  );
}
