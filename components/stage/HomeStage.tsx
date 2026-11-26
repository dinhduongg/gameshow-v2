"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ListChecks, MessageSquareQuote } from "lucide-react";
import { getFontCss, groupByPackage } from "@/lib/defaults";
import { useStage } from "./StageContext";
import { StageFrame } from "./StageFrame";
import { StageHeaderHero } from "./StageHeaderHero";

export function HomeStage() {
  const {
    settings,
    mcqs,
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

  const mcqPackages = useMemo(() => groupByPackage(mcqs), [mcqs]);
  const scenarioPackages = useMemo(() => groupByPackage(scenarios), [scenarios]);

  return (
    <StageFrame
      settings={settings}
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
      showShortcuts={showShortcuts}
      onToggleShortcuts={() => setShowShortcuts((v) => !v)}
      realtimeConnected={realtimeConnected}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-8 lg:gap-12 max-w-6xl w-full mx-auto">
        <StageHeaderHero settings={settings} />

        {/* 2 lựa chọn phần thi chính */}
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option 1: Thi Trắc nghiệm */}
            <Link
              href="/trac-nghiem"
              className="group relative overflow-hidden rounded-3xl border-2 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between gap-6 backdrop-blur-md"
              style={{
                backgroundColor: `${settings.card_color}d9`,
                borderColor: `${settings.accent_color}70`,
                boxShadow: `0 18px 48px -12px rgba(0, 0, 0, 0.55), 0 0 32px -10px ${settings.accent_color}55`,
              }}
            >
              <div
                className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-2xl opacity-35 transition-opacity group-hover:opacity-65 pointer-events-none"
                style={{ backgroundColor: settings.accent_color }}
              />

              <div className="relative flex items-center justify-between gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: `${settings.accent_color}22`,
                    borderColor: `${settings.accent_color}66`,
                    color: settings.accent_color,
                  }}
                >
                  <ListChecks className="h-9 w-9" />
                </div>
                <ArrowRight
                  className="h-6 w-6 transition-transform group-hover:translate-x-1.5"
                  style={{ color: settings.accent_color }}
                />
              </div>

              <div className="relative space-y-1.5">
                <h2
                  className="text-2xl md:text-3xl font-extrabold tracking-tight"
                  style={{
                    fontFamily: getFontCss(settings.heading_font),
                    color: settings.text_color,
                  }}
                >
                  THI TRẮC NGHIỆM
                </h2>
                {!loading && (
                  <p className="text-sm font-medium opacity-75">
                    {mcqPackages.length} bộ đề • {mcqs.length} câu hỏi
                  </p>
                )}
              </div>
            </Link>

            {/* Option 2: Thi Tình huống */}
            <Link
              href="/tinh-huong"
              className="group relative overflow-hidden rounded-3xl border-2 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between gap-6 backdrop-blur-md"
              style={{
                backgroundColor: `${settings.card_color}d9`,
                borderColor: `${settings.slogan_color}70`,
                boxShadow: `0 18px 48px -12px rgba(0, 0, 0, 0.55), 0 0 32px -10px ${settings.slogan_color}55`,
              }}
            >
              <div
                className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-2xl opacity-35 transition-opacity group-hover:opacity-65 pointer-events-none"
                style={{ backgroundColor: settings.slogan_color }}
              />

              <div className="relative flex items-center justify-between gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: `${settings.slogan_color}22`,
                    borderColor: `${settings.slogan_color}66`,
                    color: settings.slogan_color,
                  }}
                >
                  <MessageSquareQuote className="h-9 w-9" />
                </div>
                <ArrowRight
                  className="h-6 w-6 transition-transform group-hover:translate-x-1.5"
                  style={{ color: settings.slogan_color }}
                />
              </div>

              <div className="relative space-y-1.5">
                <h2
                  className="text-2xl md:text-3xl font-extrabold tracking-tight"
                  style={{
                    fontFamily: getFontCss(settings.heading_font),
                    color: settings.text_color,
                  }}
                >
                  THI TÌNH HUỐNG
                </h2>
                {!loading && (
                  <p className="text-sm font-medium opacity-75">
                    {scenarioPackages.length} bộ đề • {scenarios.length} tình
                    huống
                  </p>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </StageFrame>
  );
}
