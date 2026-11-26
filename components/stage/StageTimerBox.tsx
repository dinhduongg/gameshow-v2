"use client";

import React from "react";
import { Clock } from "lucide-react";
import { getFontCss } from "@/lib/defaults";
import type { ContestSettings } from "@/lib/types";

export function setTimerRingProgress(
  rect: SVGRectElement | null,
  ratio: number,
) {
  if (!rect) return;
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped <= 0) {
    rect.style.strokeDashoffset = "101";
    rect.style.opacity = "0";
  } else {
    rect.style.strokeDashoffset = String((1 - clamped) * 100);
    rect.style.opacity = "1";
  }
}

interface StageTimerBoxProps {
  settings: ContestSettings;
  displayText: string;
  accentColor: string;
  isUrgent?: boolean;
  isTimeUp?: boolean;
  ringRef?: React.RefObject<SVGRectElement | null>;
}

export function StageTimerBox({
  settings,
  displayText,
  accentColor,
  isUrgent = false,
  isTimeUp = false,
  ringRef,
}: StageTimerBoxProps) {
  const ringColor = isUrgent || isTimeUp ? "#ef4444" : accentColor;
  const isClockFormat = displayText.includes(":");
  const fixedWidth = isClockFormat
    ? Math.max(210, Math.round(settings.timer_size * 4.2))
    : Math.max(152, Math.round(settings.timer_size * 2.95));

  return (
    <div
      className="relative inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-2.5 backdrop-blur-md transition-colors shrink-0"
      style={{
        width: `${fixedWidth}px`,
        backgroundColor:
          isUrgent || isTimeUp
            ? "rgba(127, 29, 29, 0.85)"
            : `${settings.card_color}e6`,
      }}
    >
      {/* Vòng tiến độ đếm ngược chạy mượt 60fps bao quanh ô hiển thị thời gian */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="16"
          ry="16"
          fill="none"
          stroke={
            isUrgent || isTimeUp
              ? "rgba(248, 113, 113, 0.35)"
              : "rgba(255, 255, 255, 0.16)"
          }
          strokeWidth="4.5"
        />
        <rect
          ref={ringRef}
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="16"
          ry="16"
          fill="none"
          stroke={ringColor}
          strokeWidth="5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset="0"
          style={{
            filter: `drop-shadow(0 0 8px ${ringColor})`,
          }}
        />
      </svg>

      <Clock
        className={`relative z-10 h-7 w-7 shrink-0 ${
          isUrgent || isTimeUp ? "text-red-300" : ""
        }`}
        style={isUrgent || isTimeUp ? undefined : { color: accentColor }}
      />
      <span
        className="relative z-10 tabular-nums leading-none"
        style={{
          fontFamily: getFontCss(settings.heading_font),
          fontSize: `${settings.timer_size}px`,
          fontWeight: settings.timer_weight,
          color: isUrgent || isTimeUp ? "#fecaca" : settings.text_color,
        }}
      >
        {displayText}
      </span>
    </div>
  );
}
