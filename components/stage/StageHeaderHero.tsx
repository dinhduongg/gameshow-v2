"use client";

import React from "react";
import { Cpu } from "lucide-react";
import { getFontCss } from "@/lib/defaults";
import type { ContestSettings } from "@/lib/types";

interface StageHeaderHeroProps {
  settings: ContestSettings;
  compact?: boolean;
  scale?: number;
  badgeText?: string;
}

export function StageHeaderHero({
  settings,
  compact = false,
  scale = 1,
  badgeText,
}: StageHeaderHeroProps) {
  const titleFontSize = Math.round(
    settings.title_size * (compact ? 0.72 : 1) * scale
  );
  const sloganFontSize = Math.round(
    settings.slogan_size * (compact ? 0.8 : 1) * scale
  );
  const orgFontSize = Math.max(
    11,
    Math.round((compact ? 14 : 17) * scale)
  );
  const logoHeight = Math.round((compact ? 62 : 96) * scale);

  return (
    <div
      className={`flex flex-col items-center text-center ${
        compact ? "gap-2" : "gap-3.5"
      }`}
    >
      {/* Logo cuộc thi */}
      <div className="flex items-center justify-center">
        {settings.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.logo_url}
            alt="Logo cuộc thi"
            style={{ maxHeight: `${logoHeight}px` }}
            className="w-auto object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)]"
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-2xl border shadow-lg backdrop-blur-md"
            style={{
              height: `${logoHeight}px`,
              width: `${logoHeight}px`,
              backgroundColor: `${settings.card_color}cc`,
              borderColor: `${settings.accent_color}66`,
              boxShadow: `0 0 36px ${settings.accent_color}33`,
            }}
          >
            <Cpu
              style={{
                width: `${Math.round(logoHeight * 0.52)}px`,
                height: `${Math.round(logoHeight * 0.52)}px`,
                color: settings.accent_color,
              }}
            />
          </div>
        )}
      </div>

      {/* Tên đơn vị tổ chức */}
      {settings.org_name && (
        <div
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1 tracking-[0.14em] uppercase backdrop-blur-md"
          style={{
            fontSize: `${orgFontSize}px`,
            fontFamily: getFontCss(settings.heading_font),
            fontWeight: 700,
            borderColor: `${settings.accent_color}55`,
            backgroundColor: `${settings.card_color}aa`,
            color: settings.accent_color,
          }}
        >
          <span>{settings.org_name}</span>
          {badgeText && (
            <>
              <span className="opacity-45">•</span>
              <span style={{ color: settings.slogan_color }}>{badgeText}</span>
            </>
          )}
        </div>
      )}

      {/* Tên cuộc thi chính */}
      <h1
        className="leading-[1.12] tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] max-w-5xl"
        style={{
          fontFamily: getFontCss(settings.heading_font),
          fontSize: `${titleFontSize}px`,
          fontWeight: settings.title_weight,
          color: settings.text_color,
        }}
      >
        {settings.contest_title}
      </h1>

      {/* Slogan cuộc thi */}
      {settings.slogan && (
        <p
          className="max-w-4xl leading-snug drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
          style={{
            fontFamily: getFontCss(settings.body_font),
            fontSize: `${sloganFontSize}px`,
            fontWeight: settings.slogan_weight,
            color: settings.slogan_color,
          }}
        >
          “{settings.slogan}”
        </p>
      )}
    </div>
  );
}
