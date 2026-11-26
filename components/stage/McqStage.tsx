"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Eye,
  FolderKanban,
  Home,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { getFontCss, groupByPackage } from "@/lib/defaults";
import { soundEngine } from "@/lib/sound";
import type { CorrectAnswerKey, McqStep } from "@/lib/types";
import { useStage } from "./StageContext";
import { StageFrame } from "./StageFrame";
import { StageHeaderHero } from "./StageHeaderHero";

const OPTION_KEYS: CorrectAnswerKey[] = ["A", "B", "C", "D"];

export function McqStage() {
  const {
    settings,
    mcqs,
    loading,
    realtimeConnected,
    soundEnabled,
    toggleSound,
    isFullscreen,
    toggleFullscreen,
    showShortcuts,
    setShowShortcuts,
  } = useStage();

  const packages = useMemo(() => groupByPackage(mcqs), [mcqs]);
  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(
    null
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<McqStep>("question");
  const [selectedAnswer, setSelectedAnswer] =
    useState<CorrectAnswerKey | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const activePackage = useMemo(
    () => packages.find((pkg) => pkg.name === selectedPackageName) ?? null,
    [packages, selectedPackageName]
  );

  const questions = activePackage?.items ?? [];
  const currentQuestion = questions[currentIndex] ?? null;
  const timeLeft =
    step === "question"
      ? settings.mcq_duration
      : (remainingTime ?? settings.mcq_duration);

  const startPackage = useCallback((packageName: string) => {
    setSelectedPackageName(packageName);
    setCurrentIndex(0);
    setStep("question");
    setSelectedAnswer(null);
    setRemainingTime(null);
    setTimerRunning(false);
    setFinished(false);
    soundEngine.playLock();
  }, []);

  const resetQuestionState = useCallback((targetIndex: number) => {
    setCurrentIndex(targetIndex);
    setStep("question");
    setSelectedAnswer(null);
    setRemainingTime(null);
    setTimerRunning(false);
    setFinished(false);
  }, []);

  const revealAnswer = useCallback(
    (chosen: CorrectAnswerKey | null) => {
      if (!currentQuestion) return;
      setTimerRunning(false);
      setStep("revealed");
      if (chosen) {
        if (chosen === currentQuestion.correct_answer) {
          soundEngine.playCorrect();
        } else {
          soundEngine.playWrong();
        }
      } else {
        soundEngine.playLock();
      }
    },
    [currentQuestion]
  );

  const handleSelectOption = useCallback(
    (key: CorrectAnswerKey) => {
      if (!currentQuestion || finished || step === "revealed") return;
      setSelectedAnswer(key);
      setTimerRunning(false);

      if (settings.auto_reveal_answer) {
        revealAnswer(key);
      } else {
        setStep("locked");
        soundEngine.playLock();
      }
    },
    [
      currentQuestion,
      finished,
      revealAnswer,
      settings.auto_reveal_answer,
      step,
    ]
  );

  const handleAdvanceStep = useCallback(() => {
    if (!activePackage || questions.length === 0 || finished) return;

    if (step === "question") {
      setStep("running");
      setRemainingTime(settings.mcq_duration);
      setTimerRunning(true);
      soundEngine.playLock();
      return;
    }

    if (step === "running" || step === "locked") {
      revealAnswer(selectedAnswer);
      return;
    }

    if (step === "revealed") {
      if (currentIndex + 1 < questions.length) {
        resetQuestionState(currentIndex + 1);
        soundEngine.playLock();
      } else {
        setFinished(true);
        setTimerRunning(false);
        soundEngine.playCorrect();
      }
    }
  }, [
    activePackage,
    currentIndex,
    finished,
    questions.length,
    resetQuestionState,
    revealAnswer,
    selectedAnswer,
    settings.mcq_duration,
    step,
  ]);

  const handlePreviousQuestion = useCallback(() => {
    if (!activePackage || questions.length === 0) return;
    if (finished) {
      resetQuestionState(questions.length - 1);
      return;
    }
    if (currentIndex > 0) {
      resetQuestionState(currentIndex - 1);
      soundEngine.playLock();
    }
  }, [activePackage, currentIndex, finished, questions.length, resetQuestionState]);

  const handleToggleTimer = useCallback(() => {
    if (!activePackage || finished || step === "revealed") return;

    if (step === "question") {
      setStep("running");
      setRemainingTime(settings.mcq_duration);
      setTimerRunning(true);
      soundEngine.playLock();
      return;
    }

    if (timeLeft <= 0) return;

    setTimerRunning((prev) => {
      const next = !prev;
      if (next && step === "locked") {
        setStep("running");
      }
      return next;
    });
  }, [activePackage, finished, settings.mcq_duration, step, timeLeft]);

  // Đồng hồ đếm ngược + hiệu ứng tích tắc 5 giây cuối
  useEffect(() => {
    if (!timerRunning) return;

    const timerId = window.setInterval(() => {
      setRemainingTime((prev) => {
        const current = prev ?? settings.mcq_duration;
        const next = current - 1;
        if (next > 0 && next <= 5) {
          soundEngine.playTick(next <= 3);
        }
        if (next <= 0) {
          window.clearInterval(timerId);
          setTimerRunning(false);
          soundEngine.playTimeUp();
          if (settings.auto_reveal_answer) {
            setStep("revealed");
          } else {
            setStep("locked");
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [settings.auto_reveal_answer, settings.mcq_duration, timerRunning]);

  // Bắt phím tắt Bút trình chiếu (Remote PowerPoint) & Bàn phím
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

      if (e.key === "ArrowRight" || e.key === "PageDown" || e.code === "Space") {
        e.preventDefault();
        handleAdvanceStep();
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePreviousQuestion();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleToggleTimer();
        return;
      }

      const keyLower = e.key.toLowerCase();
      if (keyLower === "1" || keyLower === "a") {
        e.preventDefault();
        handleSelectOption("A");
      } else if (keyLower === "2" || keyLower === "b") {
        e.preventDefault();
        handleSelectOption("B");
      } else if (keyLower === "3" || keyLower === "c") {
        e.preventDefault();
        handleSelectOption("C");
      } else if (keyLower === "4" || keyLower === "d") {
        e.preventDefault();
        handleSelectOption("D");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activePackage,
    handleAdvanceStep,
    handlePreviousQuestion,
    handleSelectOption,
    handleToggleTimer,
  ]);

  const topLeftControls = activePackage ? (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => {
          setSelectedPackageName(null);
          setTimerRunning(false);
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
          borderColor: `${settings.accent_color}55`,
          color: settings.accent_color,
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

  // MÀN HÌNH 1: CHỌN BỘ ĐỀ TRẮC NGHIỆM (HIỂN THỊ ĐẦY ĐỦ LOGO, TIÊU ĐỀ, SLOGAN)
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
            badgeText="PHẦN 1 • THI TRẮC NGHIỆM"
          />

          <div className="w-full flex-1 min-h-0 flex flex-col justify-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles
                className="h-4 w-4"
                style={{ color: settings.accent_color }}
              />
              <h2
                className="text-base md:text-lg font-bold uppercase tracking-[0.18em]"
                style={{
                  fontFamily: getFontCss(settings.heading_font),
                  color: settings.text_color,
                }}
              >
                Chọn bộ đề thi Trắc nghiệm
              </h2>
              <Sparkles
                className="h-4 w-4"
                style={{ color: settings.accent_color }}
              />
            </div>

            {loading ? (
              <div className="text-center py-12 opacity-75">
                Đang tải danh sách bộ đề trắc nghiệm...
              </div>
            ) : packages.length === 0 ? (
              <div
                className="mx-auto max-w-lg rounded-3xl border p-8 text-center backdrop-blur-md"
                style={{
                  backgroundColor: `${settings.card_color}cc`,
                  borderColor: `${settings.accent_color}45`,
                }}
              >
                <p className="text-lg font-semibold mb-2">
                  Chưa có câu hỏi trắc nghiệm nào
                </p>
                <p className="text-sm opacity-75 mb-5">
                  Hãy vào trang Admin để thêm câu hỏi thủ công hoặc Import từ
                  file Excel (.xlsx).
                </p>
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950 transition"
                  style={{ backgroundColor: settings.accent_color }}
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
                      borderColor: `${settings.accent_color}55`,
                      boxShadow: `0 12px 32px -10px rgba(0,0,0,0.5)`,
                    }}
                  >
                    <div
                      className="absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl opacity-25 group-hover:opacity-55 transition-opacity"
                      style={{ backgroundColor: settings.accent_color }}
                    />
                    <div className="relative flex items-center justify-between">
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-base font-extrabold border"
                        style={{
                          backgroundColor: `${settings.accent_color}22`,
                          borderColor: `${settings.accent_color}55`,
                          color: settings.accent_color,
                          fontFamily: getFontCss(settings.heading_font),
                        }}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        {settings.mcq_duration}s / câu
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
                        {pkg.items.length} câu hỏi trắc nghiệm
                      </p>
                    </div>

                    <div
                      className="relative flex items-center justify-between pt-3 border-t border-white/10 text-sm font-bold"
                      style={{ color: settings.accent_color }}
                    >
                      <span>Bắt đầu thi bộ đề này</span>
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

  // MÀN HÌNH HOÀN THÀNH BỘ ĐỀ
  if (finished || !currentQuestion) {
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
              style={{ color: settings.accent_color }}
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
              HOÀN THÀNH PHẦN THI TRẮC NGHIỆM!
            </h2>
            <p
              className="text-lg opacity-85"
              style={{ color: settings.slogan_color }}
            >
              Đã trình chiếu trọn vẹn {questions.length} câu hỏi trong bộ đề.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => resetQuestionState(0)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 px-6 py-3.5 text-base font-bold transition cursor-pointer"
            >
              <RotateCcw className="h-5 w-5" />
              Trình chiếu lại bộ đề
            </button>
            <button
              type="button"
              onClick={() => setSelectedPackageName(null)}
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold text-slate-950 transition cursor-pointer"
              style={{ backgroundColor: settings.accent_color }}
            >
              <FolderKanban className="h-5 w-5" />
              Chọn bộ đề khác
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-black/35 hover:bg-black/55 px-6 py-3.5 text-base font-bold transition"
            >
              <Home className="h-5 w-5" />
              Màn hình chính
            </Link>
          </div>
        </div>
      </StageFrame>
    );
  }

  // MÀN HÌNH 2: TRÌNH CHIẾU CÂU HỎI TRẮC NGHIỆM
  const isUrgent = timerRunning && timeLeft > 0 && timeLeft <= 5;
  const isTimeUp = timeLeft === 0;
  const progressPercent = Math.max(
    0,
    Math.min(100, (timeLeft / Math.max(1, settings.mcq_duration)) * 100)
  );

  const stepLabel =
    step === "question"
      ? "Chờ bắt đầu đếm ngược"
      : step === "running"
      ? "Đang tính giờ"
      : step === "locked"
      ? "Đã chốt — Chờ mở đáp án"
      : "Đã công bố đáp án";

  const nextActionLabel =
    step === "question"
      ? "Bắt đầu đếm ngược"
      : step === "running" || step === "locked"
      ? "Chốt & Hiện đáp án"
      : currentIndex + 1 < questions.length
      ? "Câu tiếp theo"
      : "Kết thúc bộ đề";

  const optionTexts: Record<CorrectAnswerKey, string> = {
    A: currentQuestion.option_a,
    B: currentQuestion.option_b,
    C: currentQuestion.option_c,
    D: currentQuestion.option_d,
  };

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
        {/* Thanh trạng thái câu hỏi & Đồng hồ đếm ngược */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="rounded-2xl border px-4 py-2 backdrop-blur-md"
              style={{
                backgroundColor: `${settings.card_color}dd`,
                borderColor: `${settings.accent_color}66`,
              }}
            >
              <span className="text-xs uppercase tracking-widest opacity-70 block">
                Tiến độ câu hỏi
              </span>
              <span
                className="text-xl md:text-2xl font-extrabold"
                style={{
                  fontFamily: getFontCss(settings.heading_font),
                  color: settings.accent_color,
                }}
              >
                CÂU {currentIndex + 1} / {questions.length}
              </span>
            </div>

            <div className="hidden sm:flex flex-col gap-1">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold uppercase tracking-wider"
                style={{
                  backgroundColor:
                    step === "revealed"
                      ? "rgba(16, 185, 129, 0.2)"
                      : step === "locked"
                      ? `${settings.slogan_color}24`
                      : `${settings.card_color}bb`,
                  borderColor:
                    step === "revealed"
                      ? "rgba(52, 211, 153, 0.6)"
                      : step === "locked"
                      ? `${settings.slogan_color}88`
                      : "rgba(255,255,255,0.18)",
                  color:
                    step === "revealed"
                      ? "#6ee7b7"
                      : step === "locked"
                      ? settings.slogan_color
                      : settings.text_color,
                }}
              >
                {stepLabel}
              </span>
              <span className="text-xs opacity-65 pl-1">
                {settings.contest_title}
              </span>
            </div>
          </div>

          {/* Đồng hồ đếm ngược sân khấu */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleTimer}
              disabled={step === "revealed" || isTimeUp}
              title="Bật / Tạm dừng đồng hồ (Enter)"
              className="hidden sm:inline-flex items-center justify-center h-11 w-11 rounded-xl border border-white/20 bg-black/35 hover:bg-black/55 disabled:opacity-35 transition cursor-pointer"
            >
              {timerRunning ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>

            <div
              className={`relative flex items-center gap-3 rounded-2xl border-2 px-5 py-2 backdrop-blur-md transition-colors ${
                isUrgent ? "animate-urgent-timer" : ""
              }`}
              style={{
                backgroundColor:
                  isUrgent || isTimeUp
                    ? "rgba(127, 29, 29, 0.82)"
                    : `${settings.card_color}e6`,
                borderColor:
                  isUrgent || isTimeUp
                    ? "#f87171"
                    : timerRunning
                    ? settings.accent_color
                    : "rgba(255,255,255,0.22)",
              }}
            >
              <Clock
                className={`h-7 w-7 shrink-0 ${
                  isUrgent || isTimeUp ? "text-red-300" : ""
                }`}
                style={
                  isUrgent || isTimeUp
                    ? undefined
                    : { color: settings.accent_color }
                }
              />
              <div className="flex flex-col items-end leading-none">
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
                  {String(timeLeft).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh tiến độ thời gian mỏng */}
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden shrink-0">
          <div
            className="h-full rounded-full transition-all duration-500 ease-linear"
            style={{
              width: `${progressPercent}%`,
              backgroundColor:
                isUrgent || isTimeUp ? "#ef4444" : settings.accent_color,
            }}
          />
        </div>

        {/* Khung nội dung câu hỏi */}
        <div
          className="relative rounded-3xl border-2 px-7 py-6 md:px-10 md:py-8 shadow-2xl backdrop-blur-md flex items-center justify-center text-center min-h-[140px]"
          style={{
            backgroundColor: `${settings.card_color}e0`,
            borderColor: `${settings.accent_color}55`,
            boxShadow: `0 20px 50px -14px rgba(0, 0, 0, 0.55)`,
          }}
        >
          <p
            className="leading-snug"
            style={{
              fontFamily: getFontCss(settings.body_font),
              fontSize: `${settings.question_size}px`,
              fontWeight: settings.question_weight,
              color: settings.text_color,
            }}
          >
            {currentQuestion.question}
          </p>
        </div>

        {/* Lưới 4 đáp án A / B / C / D */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 content-center">
          {OPTION_KEYS.map((key) => {
            const isSelected = selectedAnswer === key;
            const isCorrect = currentQuestion.correct_answer === key;
            const isRevealed = step === "revealed";

            let bgStyle = `${settings.card_color}cc`;
            let borderStyle = "rgba(255,255,255,0.18)";
            let badgeBg = `${settings.accent_color}25`;
            let badgeColor = settings.accent_color;
            let opacityClass = "opacity-100";
            let shadowStyle = "0 8px 24px -8px rgba(0,0,0,0.45)";

            if (isRevealed) {
              if (isCorrect) {
                bgStyle = "rgba(6, 95, 70, 0.92)";
                borderStyle = "#34d399";
                badgeBg = "#10b981";
                badgeColor = "#022c22";
                shadowStyle = "0 0 36px -4px rgba(16, 185, 129, 0.65)";
              } else if (isSelected && !isCorrect) {
                bgStyle = "rgba(136, 19, 55, 0.9)";
                borderStyle = "#fb7185";
                badgeBg = "#f43f5e";
                badgeColor = "#ffffff";
                shadowStyle = "0 0 32px -6px rgba(244, 63, 94, 0.55)";
              } else {
                opacityClass = "opacity-45";
              }
            } else if (isSelected) {
              bgStyle = `${settings.card_color}f2`;
              borderStyle = settings.slogan_color;
              badgeBg = settings.slogan_color;
              badgeColor = "#0f172a";
              shadowStyle = `0 0 32px -4px ${settings.slogan_color}80`;
            }

            return (
              <button
                key={key}
                type="button"
                disabled={isRevealed}
                onClick={() => handleSelectOption(key)}
                className={`group relative flex items-center gap-4 rounded-2xl border-2 px-5 py-4 md:px-6 md:py-5 text-left transition-all duration-250 backdrop-blur-md ${
                  !isRevealed
                    ? "hover:-translate-y-0.5 hover:brightness-110 cursor-pointer"
                    : "cursor-default"
                } ${opacityClass}`}
                style={{
                  backgroundColor: bgStyle,
                  borderColor: borderStyle,
                  boxShadow: shadowStyle,
                }}
              >
                <span
                  className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl text-xl md:text-2xl font-extrabold transition-colors"
                  style={{
                    backgroundColor: badgeBg,
                    color: badgeColor,
                    fontFamily: getFontCss(settings.heading_font),
                  }}
                >
                  {key}
                </span>

                <span
                  className="flex-1 leading-snug"
                  style={{
                    fontFamily: getFontCss(settings.body_font),
                    fontSize: `${settings.option_size}px`,
                    fontWeight: settings.option_weight,
                    color: settings.text_color,
                  }}
                >
                  {optionTexts[key]}
                </span>

                {isRevealed && isCorrect && (
                  <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-300" />
                )}
                {isRevealed && isSelected && !isCorrect && (
                  <XCircle className="h-8 w-8 shrink-0 text-rose-300" />
                )}
                {!isRevealed && isSelected && (
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider shrink-0"
                    style={{
                      backgroundColor: `${settings.slogan_color}26`,
                      color: settings.slogan_color,
                    }}
                  >
                    Đã chọn
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Hộp giải thích đáp án */}
        {step === "revealed" && currentQuestion.explanation && (
          <div className="animate-reveal-pop rounded-2xl border border-emerald-400/45 bg-emerald-950/75 px-6 py-4 backdrop-blur-md flex items-start gap-3.5 shrink-0">
            <BookOpenCheck className="h-6 w-6 text-emerald-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300 block mb-0.5">
                Giải thích đáp án {currentQuestion.correct_answer}
              </span>
              <p
                className="text-base md:text-lg leading-relaxed text-emerald-50"
                style={{ fontFamily: getFontCss(settings.body_font) }}
              >
                {currentQuestion.explanation}
              </p>
            </div>
          </div>
        )}

        {/* Thanh điều khiển sân khấu cho MC / Kỹ thuật */}
        <div className="flex items-center justify-between gap-3 pt-1 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handlePreviousQuestion}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/35 hover:bg-black/55 disabled:opacity-35 px-4 py-2.5 text-sm font-semibold backdrop-blur-md transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Câu trước
          </button>

          <div className="hidden lg:flex items-center gap-3 text-xs opacity-70">
            <span>Phím 1-4 / A-D: Chọn đáp án</span>
            <span>•</span>
            <span>Enter: Tạm dừng giờ</span>
            <span>•</span>
            <span>Space / →: Bước tiếp</span>
          </div>

          <button
            type="button"
            onClick={handleAdvanceStep}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm md:text-base font-extrabold text-slate-950 shadow-lg transition hover:brightness-110 cursor-pointer"
            style={{
              backgroundColor:
                step === "locked" || step === "running"
                  ? settings.slogan_color
                  : settings.accent_color,
            }}
          >
            {step === "running" || step === "locked" ? (
              <Eye className="h-5 w-5" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
            {nextActionLabel}
          </button>
        </div>
      </div>
    </StageFrame>
  );
}
