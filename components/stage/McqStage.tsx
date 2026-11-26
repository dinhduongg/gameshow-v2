"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Lock,
  LockOpen,
  Pause,
  Play,
  Trophy,
  XCircle,
} from "lucide-react";
import { getFontCss, groupByPackage } from "@/lib/defaults";
import { soundEngine } from "@/lib/sound";
import type { CorrectAnswerKey, McqStep } from "@/lib/types";
import { useStage } from "./StageContext";
import { StageFrame } from "./StageFrame";
import { StageHeaderHero } from "./StageHeaderHero";
import { StageTimerBox, setTimerRingProgress } from "./StageTimerBox";

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
    lockedPackages,
    markPackageCompleted,
    resetLockedPackages,
  } = useStage();

  const packages = useMemo(() => groupByPackage(mcqs), [mcqs]);
  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(
    null,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<McqStep>("question");
  const [selectedAnswer, setSelectedAnswer] = useState<CorrectAnswerKey | null>(
    null,
  );
  const [displayedTime, setDisplayedTime] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const remainingMsRef = useRef<number | null>(null);
  const timerRingRef = useRef<SVGRectElement | null>(null);

  const activePackage = useMemo(
    () => packages.find((pkg) => pkg.name === selectedPackageName) ?? null,
    [packages, selectedPackageName],
  );

  const questions = activePackage?.items ?? [];
  const currentQuestion = questions[currentIndex] ?? null;
  const isInteractionLocked = timerRunning && settings.lock_during_countdown;
  const timeLeft =
    step === "question"
      ? settings.mcq_duration
      : (displayedTime ?? settings.mcq_duration);

  const startPackage = useCallback(
    (packageName: string) => {
      if (lockedPackages.mcq.includes(packageName)) return;
      setSelectedPackageName(packageName);
      setCurrentIndex(0);
      setStep("question");
      setSelectedAnswer(null);
      remainingMsRef.current = null;
      setDisplayedTime(null);
      setTimerRunning(false);
      setFinished(false);
      soundEngine.playLock();
    },
    [lockedPackages.mcq]
  );

  const resetQuestionState = useCallback((targetIndex: number) => {
    setCurrentIndex(targetIndex);
    setStep("question");
    setSelectedAnswer(null);
    remainingMsRef.current = null;
    setDisplayedTime(null);
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
    [currentQuestion],
  );

  const handleSelectOption = useCallback(
    (key: CorrectAnswerKey) => {
      if (
        !currentQuestion ||
        finished ||
        step === "revealed" ||
        isInteractionLocked
      ) {
        return;
      }
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
      isInteractionLocked,
      revealAnswer,
      settings.auto_reveal_answer,
      step,
    ],
  );

  const handleAdvanceStep = useCallback(() => {
    if (
      !activePackage ||
      questions.length === 0 ||
      finished ||
      isInteractionLocked
    ) {
      return;
    }

    if (step === "question") {
      setStep("running");
      remainingMsRef.current = settings.mcq_duration * 1000;
      setDisplayedTime(settings.mcq_duration);
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
        markPackageCompleted("mcq", activePackage.name);
        setFinished(true);
        setTimerRunning(false);
        soundEngine.playCorrect();
      }
    }
  }, [
    activePackage,
    currentIndex,
    finished,
    isInteractionLocked,
    markPackageCompleted,
    questions.length,
    resetQuestionState,
    revealAnswer,
    selectedAnswer,
    settings.mcq_duration,
    step,
  ]);

  const handlePreviousQuestion = useCallback(() => {
    if (!activePackage || questions.length === 0 || isInteractionLocked) return;
    if (finished) {
      resetQuestionState(questions.length - 1);
      return;
    }
    if (currentIndex > 0) {
      resetQuestionState(currentIndex - 1);
      soundEngine.playLock();
    }
  }, [
    activePackage,
    currentIndex,
    finished,
    isInteractionLocked,
    questions.length,
    resetQuestionState,
  ]);

  const handleToggleTimer = useCallback(() => {
    if (
      !activePackage ||
      finished ||
      step === "revealed" ||
      isInteractionLocked
    ) {
      return;
    }

    if (step === "question") {
      setStep("running");
      remainingMsRef.current = settings.mcq_duration * 1000;
      setDisplayedTime(settings.mcq_duration);
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
  }, [
    activePackage,
    finished,
    isInteractionLocked,
    settings.mcq_duration,
    step,
    timeLeft,
  ]);

  // Cập nhật vòng tiến độ quanh ô đồng hồ khi không chạy (reset / tạm dừng / đổi câu)
  useEffect(() => {
    if (timerRunning) return;
    const totalMs = Math.max(1, settings.mcq_duration) * 1000;
    const currentMs =
      step === "question" ? totalMs : (remainingMsRef.current ?? totalMs);
    setTimerRingProgress(timerRingRef.current, currentMs / totalMs);
  }, [activePackage, currentIndex, settings.mcq_duration, step, timerRunning]);

  // Đồng hồ đếm ngược 60fps bằng requestAnimationFrame + tích tắc 5 giây cuối
  useEffect(() => {
    if (!timerRunning) return;

    const totalMs = Math.max(1, settings.mcq_duration) * 1000;
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

      setTimerRingProgress(timerRingRef.current, nextMs / totalMs);

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
        if (settings.auto_reveal_answer) {
          setStep("revealed");
        } else {
          setStep("locked");
        }
        return;
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, [settings.auto_reveal_answer, settings.mcq_duration, timerRunning]);

  // Bắt phím tắt Bút trình chiếu (Remote PowerPoint) & Bàn phím
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

      if (
        e.key === "ArrowRight" ||
        e.key === "PageDown" ||
        e.code === "Space"
      ) {
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
    isInteractionLocked,
  ]);

  const topLeftControls = activePackage ? (
    <div className="flex items-center gap-2">
      <button
        type="button"
        title="Chọn bộ đề"
        onClick={() => {
          setSelectedPackageName(null);
          setTimerRunning(false);
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
          borderColor: `${settings.accent_color}55`,
          color: settings.accent_color,
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
      {lockedPackages.mcq.length > 0 && (
        <button
          type="button"
          title="Mở khóa toàn bộ bộ đề Trắc nghiệm"
          onClick={() => {
            if (
              window.confirm("Mở khóa lại tất cả bộ đề Trắc nghiệm đã thi?")
            ) {
              resetLockedPackages("mcq");
            }
          }}
          className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/35 hover:bg-black/60 border border-white/15 text-white/90 backdrop-blur-md transition opacity-65 hover:opacity-100 cursor-pointer"
        >
          <LockOpen className="h-4 w-4" />
        </button>
      )}
    </div>
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
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-7 max-w-6xl w-full mx-auto">
          <StageHeaderHero
            settings={settings}
            compact
            badgeText="THI TRẮC NGHIỆM"
          />

          <div className="w-full flex-1 min-h-0 flex flex-col justify-center">
            {loading ? (
              <div className="text-center py-12 opacity-75">Đang tải...</div>
            ) : packages.length === 0 ? (
              <div
                className="mx-auto max-w-md rounded-3xl border p-8 text-center backdrop-blur-md"
                style={{
                  backgroundColor: `${settings.card_color}cc`,
                  borderColor: `${settings.accent_color}45`,
                }}
              >
                <p className="text-lg font-semibold mb-4">Chưa có bộ đề nào</p>
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950 transition"
                  style={{ backgroundColor: settings.accent_color }}
                >
                  Thêm bộ đề
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[50vh] overflow-y-auto custom-scrollbar px-1 py-1">
                {packages.map((pkg, idx) => {
                  const isLocked = lockedPackages.mcq.includes(pkg.name);
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
                          : `${settings.accent_color}55`,
                        boxShadow: `0 12px 32px -10px rgba(0,0,0,0.5)`,
                      }}
                    >
                      {!isLocked && (
                        <div
                          className="absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl opacity-25 group-hover:opacity-55 transition-opacity"
                          style={{ backgroundColor: settings.accent_color }}
                        />
                      )}
                      <div className="relative flex items-center justify-between">
                        <span
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-base font-extrabold border"
                          style={{
                            backgroundColor: isLocked
                              ? "rgba(255,255,255,0.08)"
                              : `${settings.accent_color}22`,
                            borderColor: isLocked
                              ? "rgba(255,255,255,0.2)"
                              : `${settings.accent_color}55`,
                            color: isLocked
                              ? "rgba(255,255,255,0.65)"
                              : settings.accent_color,
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
                            {settings.mcq_duration}s
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
                            {pkg.items.length} câu hỏi
                          </p>
                        </div>
                        {isLocked ? (
                          <Lock className="h-5 w-5 shrink-0 opacity-65" />
                        ) : (
                          <ArrowRight
                            className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                            style={{ color: settings.accent_color }}
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
              HOÀN THÀNH!
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => setSelectedPackageName(null)}
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-bold text-slate-950 transition cursor-pointer"
              style={{ backgroundColor: settings.accent_color }}
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

  // MÀN HÌNH 2: TRÌNH CHIẾU CÂU HỎI TRẮC NGHIỆM
  const isUrgent = timerRunning && timeLeft > 0 && timeLeft <= 5;
  const isTimeUp = timeLeft === 0;

  const nextActionLabel =
    step === "question"
      ? "Bắt đầu"
      : step === "running" || step === "locked"
        ? "Hiện đáp án"
        : currentIndex + 1 < questions.length
          ? "Câu tiếp"
          : "Hoàn thành";

  const optionTexts: Record<CorrectAnswerKey, string> = {
    A: currentQuestion.option_a,
    B: currentQuestion.option_b,
    C: currentQuestion.option_c,
    D: currentQuestion.option_d,
  };

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
        {/* Số câu & Đồng hồ đếm ngược */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div
            className="rounded-2xl border px-5 py-2.5 backdrop-blur-md"
            style={{
              backgroundColor: `${settings.card_color}dd`,
              borderColor: `${settings.accent_color}66`,
            }}
          >
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

          {/* Đồng hồ đếm ngược sân khấu */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleTimer}
              disabled={step === "revealed" || isTimeUp || isInteractionLocked}
              title="Bật / Tạm dừng đồng hồ (Enter)"
              className="hidden sm:inline-flex items-center justify-center h-11 w-11 rounded-xl border border-white/20 bg-black/35 hover:bg-black/55 disabled:opacity-30 transition cursor-pointer"
            >
              {timerRunning ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>

            <StageTimerBox
              settings={settings}
              displayText={String(timeLeft).padStart(2, "0")}
              accentColor={settings.accent_color}
              isUrgent={isUrgent}
              isTimeUp={isTimeUp}
              ringRef={timerRingRef}
            />
          </div>
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
                disabled={isRevealed || isInteractionLocked}
                onClick={() => handleSelectOption(key)}
                className={`group relative flex items-center gap-4 rounded-2xl border-2 px-5 py-4 md:px-6 md:py-5 text-left transition-all duration-250 backdrop-blur-md ${
                  !isRevealed && !isInteractionLocked
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
              </button>
            );
          })}
        </div>

        {/* Hộp giải thích đáp án */}
        {step === "revealed" && currentQuestion.explanation && (
          <div className="animate-reveal-pop rounded-2xl border border-emerald-400/45 bg-emerald-950/75 px-6 py-4 backdrop-blur-md flex items-center gap-3.5 shrink-0">
            <BookOpenCheck className="h-6 w-6 text-emerald-300 shrink-0" />
            <p
              className="text-base md:text-lg leading-relaxed text-emerald-50"
              style={{ fontFamily: getFontCss(settings.body_font) }}
            >
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {/* Thanh điều khiển gọn */}
        <div
          className={`flex items-center justify-between gap-3 pt-1 shrink-0 transition-opacity ${
            isInteractionLocked ? "pointer-events-none opacity-30" : ""
          }`}
        >
          <button
            type="button"
            onClick={handlePreviousQuestion}
            disabled={currentIndex === 0 || isInteractionLocked}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/35 hover:bg-black/55 disabled:opacity-30 px-4 py-2.5 text-sm font-semibold backdrop-blur-md transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Trước
          </button>

          <button
            type="button"
            onClick={handleAdvanceStep}
            disabled={isInteractionLocked}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm md:text-base font-extrabold text-slate-950 shadow-lg transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
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
