"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FolderKanban,
  Home,
  Lock,
  LockOpen,
  Pause,
  Play,
  RotateCcw,
  Trophy,
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
    lockedPackages,
    markPackageCompleted,
    resetLockedPackages,
  } = useStage();

  const packages = useMemo(() => groupByPackage(scenarios), [scenarios]);
  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(
    null
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedTime, setDisplayedTime] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [finished, setFinished] = useState(false);
  const remainingMsRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const activePackage = useMemo(
    () => packages.find((pkg) => pkg.name === selectedPackageName) ?? null,
    [packages, selectedPackageName]
  );

  const items = activePackage?.items ?? [];
  const currentScenario = items[currentIndex] ?? null;
  const isInteractionLocked = timerRunning && settings.lock_during_countdown;
  const timeLeft = displayedTime ?? settings.scenario_duration;

  const startPackage = useCallback(
    (name: string) => {
      if (lockedPackages.scenario.includes(name)) return;
      setSelectedPackageName(name);
      setCurrentIndex(0);
      remainingMsRef.current = null;
      setDisplayedTime(null);
      setTimerRunning(false);
      setShowGuide(false);
      setFinished(false);
      soundEngine.playLock();
    },
    [lockedPackages.scenario]
  );

  const goToScenario = useCallback(
    (nextIndex: number) => {
      if (isInteractionLocked || nextIndex < 0 || nextIndex >= items.length) {
        return;
      }
      setCurrentIndex(nextIndex);
      remainingMsRef.current = null;
      setDisplayedTime(null);
      setTimerRunning(false);
      setShowGuide(false);
      setFinished(false);
      soundEngine.playLock();
    },
    [isInteractionLocked, items.length]
  );

  const handleFinishPackage = useCallback(() => {
    if (!activePackage || isInteractionLocked) return;
    markPackageCompleted("scenario", activePackage.name);
    setTimerRunning(false);
    setShowGuide(false);
    setFinished(true);
    soundEngine.playCorrect();
  }, [activePackage, isInteractionLocked, markPackageCompleted]);

  const handleResetTimer = useCallback(() => {
    if (isInteractionLocked) return;
    setTimerRunning(false);
    remainingMsRef.current = null;
    setDisplayedTime(null);
    soundEngine.playLock();
  }, [isInteractionLocked]);

  const handleToggleTimer = useCallback(() => {
    if (isInteractionLocked) return;
    if (timeLeft <= 0) {
      remainingMsRef.current = settings.scenario_duration * 1000;
      setDisplayedTime(settings.scenario_duration);
      setTimerRunning(true);
      soundEngine.playLock();
      return;
    }
    if (remainingMsRef.current === null) {
      remainingMsRef.current = settings.scenario_duration * 1000;
      setDisplayedTime(settings.scenario_duration);
    }
    setTimerRunning((prev) => !prev);
  }, [isInteractionLocked, settings.scenario_duration, timeLeft]);

  // Cập nhật vị trí thanh tiến độ khi không chạy (reset / tạm dừng / đổi tình huống)
  useEffect(() => {
    if (timerRunning || !progressBarRef.current) return;
    const totalMs = Math.max(1, settings.scenario_duration) * 1000;
    const currentMs = remainingMsRef.current ?? totalMs;
    const ratio = Math.max(0, Math.min(1, currentMs / totalMs));
    progressBarRef.current.style.transform = `scaleX(${ratio})`;
  }, [activePackage, currentIndex, displayedTime, settings.scenario_duration, timerRunning]);

  // Đồng hồ đếm ngược 60fps bằng requestAnimationFrame cho phần Tình huống
  useEffect(() => {
    if (!timerRunning) return;

    const totalMs = Math.max(1, settings.scenario_duration) * 1000;
    if (remainingMsRef.current === null) {
      remainingMsRef.current = totalMs;
    }

    let lastFrameTime = performance.now();
    let lastShownSecond = Math.ceil(remainingMsRef.current / 1000);
    let rafId = 0;

    const frame = (now: number) => {
      const delta = now - lastFrameTime;
      lastFrameTime = now;

      const nextMs = Math.max(0, (remainingMsRef.current ?? totalMs) - delta);
      remainingMsRef.current = nextMs;

      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${Math.max(
          0,
          Math.min(1, nextMs / totalMs)
        )})`;
      }

      const nextSec = Math.ceil(nextMs / 1000);
      if (nextSec !== lastShownSecond) {
        lastShownSecond = nextSec;
        setDisplayedTime(nextSec);
        if (nextSec > 0 && nextSec <= 5) {
          soundEngine.playTick(nextSec <= 3);
        }
      }

      if (nextMs <= 0) {
        setDisplayedTime(0);
        setTimerRunning(false);
        soundEngine.playTimeUp();
        return;
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, [settings.scenario_duration, timerRunning]);

  // Phím tắt điều khiển cho Phần 2
  useEffect(() => {
    if (!activePackage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInteractionLocked) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

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

      if (finished) return;

      if (e.key === "Enter") {
        e.preventDefault();
        handleToggleTimer();
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        if (currentIndex + 1 < items.length) {
          goToScenario(currentIndex + 1);
        } else {
          handleFinishPackage();
        }
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
    finished,
    goToScenario,
    handleFinishPackage,
    handleToggleTimer,
    isInteractionLocked,
    items.length,
  ]);

  const topLeftControls = activePackage ? (
    <div className="flex items-center gap-2">
      <button
        type="button"
        title="Chọn bộ đề"
        onClick={() => {
          setSelectedPackageName(null);
          setTimerRunning(false);
          setShowGuide(false);
        }}
        className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/35 hover:bg-black/60 border border-white/15 text-white/90 backdrop-blur-md transition cursor-pointer opacity-70 hover:opacity-100"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <Link
        href="/"
        title="Trang chủ"
        className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/35 hover:bg-black/60 border border-white/15 text-white/90 backdrop-blur-md transition opacity-70 hover:opacity-100"
      >
        <Home className="h-4 w-4" />
      </Link>
      <span
        className="hidden md:inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md"
        style={{
          backgroundColor: `${settings.card_color}cc`,
          borderColor: `${settings.slogan_color}55`,
          color: settings.slogan_color,
        }}
      >
        {activePackage.name}
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link
        href="/"
        title="Về màn hình chính"
        className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/35 hover:bg-black/60 border border-white/15 text-white/95 backdrop-blur-md transition opacity-75 hover:opacity-100"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      {lockedPackages.scenario.length > 0 && (
        <button
          type="button"
          title="Mở khóa toàn bộ bộ đề Tình huống"
          onClick={() => {
            if (
              window.confirm("Mở khóa lại tất cả bộ đề Tình huống đã thi?")
            ) {
              resetLockedPackages("scenario");
            }
          }}
          className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/35 hover:bg-black/60 border border-white/15 text-white/90 backdrop-blur-md transition opacity-65 hover:opacity-100 cursor-pointer"
        >
          <LockOpen className="h-4 w-4" />
        </button>
      )}
    </div>
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
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-7 max-w-6xl w-full mx-auto">
          <StageHeaderHero
            settings={settings}
            compact
            badgeText="THI TÌNH HUỐNG"
          />

          <div className="w-full flex-1 min-h-0 flex flex-col justify-center">
            {loading ? (
              <div className="text-center py-12 opacity-75">Đang tải...</div>
            ) : packages.length === 0 ? (
              <div
                className="mx-auto max-w-md rounded-3xl border p-8 text-center backdrop-blur-md"
                style={{
                  backgroundColor: `${settings.card_color}cc`,
                  borderColor: `${settings.slogan_color}45`,
                }}
              >
                <p className="text-lg font-semibold mb-4">Chưa có bộ đề nào</p>
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950 transition"
                  style={{ backgroundColor: settings.slogan_color }}
                >
                  Thêm bộ đề
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[50vh] overflow-y-auto custom-scrollbar px-1 py-1">
                {packages.map((pkg, idx) => {
                  const isLocked = lockedPackages.scenario.includes(pkg.name);
                  return (
                    <button
                      key={pkg.name}
                      type="button"
                      disabled={isLocked}
                      onClick={() => startPackage(pkg.name)}
                      className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-200 backdrop-blur-md flex flex-col justify-between gap-5 ${
                        isLocked
                          ? "opacity-45 grayscale cursor-not-allowed"
                          : "hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
                      }`}
                      style={{
                        backgroundColor: `${settings.card_color}d9`,
                        borderColor: isLocked
                          ? "rgba(255,255,255,0.16)"
                          : `${settings.slogan_color}55`,
                        boxShadow: `0 12px 32px -10px rgba(0,0,0,0.5)`,
                      }}
                    >
                      {!isLocked && (
                        <div
                          className="absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl opacity-25 group-hover:opacity-55 transition-opacity"
                          style={{ backgroundColor: settings.slogan_color }}
                        />
                      )}
                      <div className="relative flex items-center justify-between">
                        <span
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-base font-extrabold border"
                          style={{
                            backgroundColor: isLocked
                              ? "rgba(255,255,255,0.08)"
                              : `${settings.slogan_color}22`,
                            borderColor: isLocked
                              ? "rgba(255,255,255,0.2)"
                              : `${settings.slogan_color}55`,
                            color: isLocked
                              ? "rgba(255,255,255,0.65)"
                              : settings.slogan_color,
                            fontFamily: getFontCss(settings.heading_font),
                          }}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                            <Lock className="h-3.5 w-3.5" />
                            Đã thi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                            <Clock className="h-3.5 w-3.5" />
                            {formatClock(settings.scenario_duration)}
                          </span>
                        )}
                      </div>

                      <div className="relative flex items-end justify-between gap-3">
                        <div>
                          <h3
                            className="text-xl font-bold leading-snug mb-1"
                            style={{
                              fontFamily: getFontCss(settings.heading_font),
                              color: settings.text_color,
                            }}
                          >
                            {pkg.name}
                          </h3>
                          <p className="text-sm opacity-75">
                            {pkg.items.length} tình huống
                          </p>
                        </div>
                        {isLocked ? (
                          <Lock className="h-5 w-5 shrink-0 opacity-65" />
                        ) : (
                          <ArrowRight
                            className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                            style={{ color: settings.slogan_color }}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </StageFrame>
    );
  }

  // MÀN HÌNH HOÀN THÀNH BỘ ĐỀ TÌNH HUỐNG
  if (finished || !currentScenario) {
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
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-3xl mx-auto animate-reveal-pop">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-3xl border-2 shadow-2xl"
            style={{
              backgroundColor: `${settings.slogan_color}22`,
              borderColor: `${settings.slogan_color}88`,
              color: settings.slogan_color,
            }}
          >
            <Trophy className="h-12 w-12" />
          </div>

          <div className="space-y-2">
            <p
              className="text-sm font-bold uppercase tracking-[0.2em]"
              style={{ color: settings.slogan_color }}
            >
              {activePackage.name}
            </p>
            <h2
              className="text-4xl md:text-5xl font-extrabold"
              style={{
                fontFamily: getFontCss(settings.heading_font),
                color: settings.text_color,
              }}
            >
              HOÀN THÀNH!
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => setSelectedPackageName(null)}
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-bold text-slate-950 transition cursor-pointer"
              style={{ backgroundColor: settings.slogan_color }}
            >
              <FolderKanban className="h-5 w-5" />
              Bộ đề khác
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-black/35 hover:bg-black/55 px-6 py-3 text-base font-bold transition"
            >
              <Home className="h-5 w-5" />
              Trang chủ
            </Link>
          </div>
        </div>
      </StageFrame>
    );
  }

  // MÀN HÌNH 2: TRÌNH CHIẾU TÌNH HUỐNG
  const isUrgent = timerRunning && timeLeft > 0 && timeLeft <= 5;
  const isTimeUp = timeLeft === 0;
  const isLastScenario = currentIndex + 1 >= items.length;

  return (
    <StageFrame
      settings={settings}
      locked={isInteractionLocked}
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
        {/* Số tình huống & Đồng hồ đếm ngược */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div
            className="rounded-2xl border px-5 py-2.5 backdrop-blur-md"
            style={{
              backgroundColor: `${settings.card_color}dd`,
              borderColor: `${settings.slogan_color}66`,
            }}
          >
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

          {/* Đồng hồ đếm ngược riêng + nút Play / Pause / Reset */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleTimer}
              disabled={isInteractionLocked}
              title={timerRunning ? "Tạm dừng (Enter)" : "Bắt đầu (Enter)"}
              className="inline-flex items-center justify-center h-11 w-11 rounded-xl text-slate-950 transition hover:brightness-110 disabled:opacity-30 cursor-pointer shadow-lg"
              style={{
                backgroundColor: timerRunning
                  ? settings.slogan_color
                  : settings.accent_color,
              }}
            >
              {timerRunning ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleResetTimer}
              disabled={isInteractionLocked}
              title="Đặt lại đồng hồ"
              className="inline-flex items-center justify-center h-11 w-11 rounded-xl border border-white/20 bg-black/40 hover:bg-black/60 disabled:opacity-30 transition cursor-pointer"
            >
              <RotateCcw className="h-5 w-5" />
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

        {/* Thanh tiến độ thời gian mượt 60fps */}
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden shrink-0">
          <div
            ref={progressBarRef}
            className="h-full w-full rounded-full origin-left will-change-transform transition-colors duration-200"
            style={{
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

        {/* Thanh điều khiển dưới cùng + Nút Gợi ý chấm điểm */}
        <div
          className={`flex items-center justify-between gap-3 pt-1 shrink-0 transition-opacity ${
            isInteractionLocked ? "pointer-events-none opacity-30" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => goToScenario(currentIndex - 1)}
            disabled={currentIndex === 0 || isInteractionLocked}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/35 hover:bg-black/55 disabled:opacity-30 px-4 py-2.5 text-sm font-semibold backdrop-blur-md transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Trước
          </button>

          <button
            type="button"
            disabled={isInteractionLocked}
            onClick={() => setShowGuide((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-5 py-2.5 text-sm md:text-base font-bold transition cursor-pointer backdrop-blur-md hover:brightness-110 disabled:opacity-30"
            style={{
              backgroundColor: showGuide
                ? "rgba(16, 185, 129, 0.25)"
                : `${settings.card_color}e0`,
              borderColor: showGuide ? "#34d399" : `${settings.accent_color}88`,
              color: showGuide ? "#6ee7b7" : settings.accent_color,
            }}
          >
            <ClipboardCheck className="h-5 w-5" />
            Gợi ý chấm điểm
          </button>

          <button
            type="button"
            onClick={() => {
              if (isLastScenario) {
                handleFinishPackage();
              } else {
                goToScenario(currentIndex + 1);
              }
            }}
            disabled={isInteractionLocked}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm md:text-base font-extrabold text-slate-950 disabled:opacity-30 transition hover:brightness-110 cursor-pointer"
            style={{ backgroundColor: settings.slogan_color }}
          >
            {isLastScenario ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Hoàn thành
              </>
            ) : (
              <>
                Tiếp theo
                <ArrowRight className="h-5 w-5" />
              </>
            )}
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
                <h3 className="text-lg md:text-xl font-bold text-white">
                  Gợi ý chấm điểm
                </h3>
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
                  Chưa có gợi ý chấm điểm.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </StageFrame>
  );
}
