"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Image as ImageIcon,
  ListChecks,
  Loader2,
  MessageSquareQuote,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { StageFrame } from "@/components/stage/StageFrame";
import { StageHeaderHero } from "@/components/stage/StageHeaderHero";
import { DEFAULT_SETTINGS, FONT_OPTIONS, getFontCss } from "@/lib/defaults";
import { deleteContestAssetByUrl, uploadContestAsset } from "@/lib/supabase";
import type { ContestSettings, FontFamilyName } from "@/lib/types";

interface AppearanceTabProps {
  draft: ContestSettings;
  onChange: (patch: Partial<ContestSettings>) => void;
  onSave: () => Promise<void>;
  onResetDefault: () => Promise<void>;
  saving: boolean;
  isDirty: boolean;
  onToast: (type: "success" | "error", message: string) => void;
}

type PreviewView = "home" | "packages" | "mcq" | "scenario";

const WEIGHT_OPTIONS = [400, 500, 600, 700, 800, 900];

function StageLivePreview({
  settings,
  view,
}: {
  settings: ContestSettings;
  view: PreviewView;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.45);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(width / 1280);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-950 shadow-2xl"
    >
      <div
        className="origin-top-left pointer-events-none"
        style={{
          width: "1280px",
          height: "720px",
          transform: `scale(${scale})`,
        }}
      >
        <StageFrame settings={settings} preview>
          {view === "home" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-10 px-10">
              <StageHeaderHero settings={settings} />
              <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
                <div
                  className="rounded-3xl border-2 p-6 flex flex-col justify-between gap-4"
                  style={{
                    backgroundColor: `${settings.card_color}d9`,
                    borderColor: `${settings.accent_color}70`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <ListChecks
                      className="h-10 w-10"
                      style={{ color: settings.accent_color }}
                    />
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold uppercase"
                      style={{
                        backgroundColor: `${settings.accent_color}22`,
                        color: settings.accent_color,
                      }}
                    >
                      Phần 1
                    </span>
                  </div>
                  <div
                    className="text-2xl font-extrabold"
                    style={{ fontFamily: getFontCss(settings.heading_font) }}
                  >
                    THI TRẮC NGHIỆM
                  </div>
                </div>
                <div
                  className="rounded-3xl border-2 p-6 flex flex-col justify-between gap-4"
                  style={{
                    backgroundColor: `${settings.card_color}d9`,
                    borderColor: `${settings.slogan_color}70`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <MessageSquareQuote
                      className="h-10 w-10"
                      style={{ color: settings.slogan_color }}
                    />
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold uppercase"
                      style={{
                        backgroundColor: `${settings.slogan_color}22`,
                        color: settings.slogan_color,
                      }}
                    >
                      Phần 2
                    </span>
                  </div>
                  <div
                    className="text-2xl font-extrabold"
                    style={{ fontFamily: getFontCss(settings.heading_font) }}
                  >
                    THI TÌNH HUỐNG
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === "packages" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-7 px-10">
              <StageHeaderHero
                settings={settings}
                compact
                badgeText="PHẦN 1 • THI TRẮC NGHIỆM"
              />
              <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
                {["Gói 1 - Công dân số", "Gói 2 - An toàn không gian mạng"].map(
                  (pkg, idx) => (
                    <div
                      key={pkg}
                      className="rounded-2xl border-2 p-6 flex flex-col gap-3"
                      style={{
                        backgroundColor: `${settings.card_color}d9`,
                        borderColor: `${settings.accent_color}55`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl font-extrabold"
                          style={{
                            backgroundColor: `${settings.accent_color}22`,
                            color: settings.accent_color,
                            fontFamily: getFontCss(settings.heading_font),
                          }}
                        >
                          0{idx + 1}
                        </span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                          {settings.mcq_duration}s / câu
                        </span>
                      </div>
                      <h3
                        className="text-2xl font-bold"
                        style={{
                          fontFamily: getFontCss(settings.heading_font),
                        }}
                      >
                        {pkg}
                      </h3>
                      <p className="text-sm opacity-75">
                        5 câu hỏi trắc nghiệm
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {view === "mcq" && (
            <div className="flex-1 flex flex-col justify-between gap-4 px-8 py-4">
              <div className="flex items-center justify-between">
                <div
                  className="rounded-2xl border px-5 py-2.5"
                  style={{
                    backgroundColor: `${settings.card_color}dd`,
                    borderColor: `${settings.accent_color}66`,
                  }}
                >
                  <span
                    className="text-2xl font-extrabold"
                    style={{
                      fontFamily: getFontCss(settings.heading_font),
                      color: settings.accent_color,
                    }}
                  >
                    CÂU 1 / 5
                  </span>
                </div>

                <div
                  className="flex items-center gap-3 rounded-2xl border-2 px-5 py-2"
                  style={{
                    backgroundColor: `${settings.card_color}e6`,
                    borderColor: settings.accent_color,
                  }}
                >
                  <Clock
                    className="h-7 w-7"
                    style={{ color: settings.accent_color }}
                  />
                  <span
                    className="tabular-nums leading-none"
                    style={{
                      fontFamily: getFontCss(settings.heading_font),
                      fontSize: `${settings.timer_size}px`,
                      fontWeight: settings.timer_weight,
                      color: settings.text_color,
                    }}
                  >
                    {String(settings.mcq_duration).padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div
                className="rounded-3xl border-2 px-8 py-7 text-center"
                style={{
                  backgroundColor: `${settings.card_color}e0`,
                  borderColor: `${settings.accent_color}55`,
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
                  Ứng dụng định danh điện tử quốc gia do Bộ Công an phát triển
                  là gì?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { k: "A", text: "VNeID", correct: true },
                  { k: "B", text: "VssID", correct: false },
                  { k: "C", text: "PC-Covid", correct: false },
                  { k: "D", text: "eTax Mobile", correct: false },
                ].map((opt) => (
                  <div
                    key={opt.k}
                    className="flex items-center gap-4 rounded-2xl border-2 px-5 py-4"
                    style={{
                      backgroundColor: opt.correct
                        ? "rgba(6, 95, 70, 0.9)"
                        : `${settings.card_color}cc`,
                      borderColor: opt.correct
                        ? "#34d399"
                        : "rgba(255,255,255,0.18)",
                    }}
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-extrabold"
                      style={{
                        backgroundColor: opt.correct
                          ? "#10b981"
                          : `${settings.accent_color}25`,
                        color: opt.correct ? "#022c22" : settings.accent_color,
                        fontFamily: getFontCss(settings.heading_font),
                      }}
                    >
                      {opt.k}
                    </span>
                    <span
                      className="leading-snug"
                      style={{
                        fontFamily: getFontCss(settings.body_font),
                        fontSize: `${settings.option_size}px`,
                        fontWeight: settings.option_weight,
                        color: settings.text_color,
                      }}
                    >
                      {opt.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === "scenario" && (
            <div className="flex-1 flex flex-col justify-between gap-5 px-8 py-4">
              <div className="flex items-center justify-between">
                <div
                  className="rounded-2xl border px-5 py-2.5"
                  style={{
                    backgroundColor: `${settings.card_color}dd`,
                    borderColor: `${settings.slogan_color}66`,
                  }}
                >
                  <span
                    className="text-2xl font-extrabold"
                    style={{
                      fontFamily: getFontCss(settings.heading_font),
                      color: settings.slogan_color,
                    }}
                  >
                    TÌNH HUỐNG 1 / 2
                  </span>
                </div>

                <div
                  className="flex items-center gap-3 rounded-2xl border-2 px-5 py-2"
                  style={{
                    backgroundColor: `${settings.card_color}e6`,
                    borderColor: settings.slogan_color,
                  }}
                >
                  <Clock
                    className="h-7 w-7"
                    style={{ color: settings.slogan_color }}
                  />
                  <span
                    className="tabular-nums leading-none"
                    style={{
                      fontFamily: getFontCss(settings.heading_font),
                      fontSize: `${settings.timer_size}px`,
                      fontWeight: settings.timer_weight,
                      color: settings.text_color,
                    }}
                  >
                    {`${String(
                      Math.floor(settings.scenario_duration / 60),
                    ).padStart(2, "0")}:${String(
                      settings.scenario_duration % 60,
                    ).padStart(2, "0")}`}
                  </span>
                </div>
              </div>

              <div
                className="flex-1 rounded-3xl border-2 p-8 flex flex-col justify-center gap-4"
                style={{
                  backgroundColor: `${settings.card_color}e4`,
                  borderColor: `${settings.slogan_color}55`,
                }}
              >
                <h3
                  className="text-3xl font-extrabold uppercase"
                  style={{
                    fontFamily: getFontCss(settings.heading_font),
                    color: settings.slogan_color,
                  }}
                >
                  Hướng dẫn ông bà làm thủ tục hành chính trực tuyến tại nhà
                </h3>
                <p
                  className="leading-relaxed"
                  style={{
                    fontFamily: getFontCss(settings.body_font),
                    fontSize: `${settings.question_size}px`,
                    fontWeight: settings.question_weight,
                    color: settings.text_color,
                  }}
                >
                  Ông nội 72 tuổi cần xin giấy xác nhận cư trú nhưng ngại đi lại
                  xa. Gia đình bạn sẽ vận dụng chuyển đổi số thế nào để hỗ trợ
                  ông nhanh gọn, an toàn?
                </p>
              </div>

              <div className="flex justify-center">
                <span
                  className="inline-flex items-center gap-2 rounded-xl border-2 px-5 py-2 text-sm font-bold"
                  style={{
                    backgroundColor: `${settings.card_color}e0`,
                    borderColor: `${settings.accent_color}88`,
                    color: settings.accent_color,
                  }}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Gợi ý chấm điểm
                </span>
              </div>
            </div>
          )}
        </StageFrame>
      </div>
    </div>
  );
}

export function AppearanceTab({
  draft,
  onChange,
  onSave,
  onResetDefault,
  saving,
  isDirty,
  onToast,
}: AppearanceTabProps) {
  const [previewView, setPreviewView] = useState<PreviewView>("home");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingLogo(true);
    try {
      const publicUrl = await uploadContestAsset(file, "logos");
      onChange({ logo_url: publicUrl });
      onToast(
        "success",
        "Đã tải Logo lên thành công! Nhớ bấm Lưu cấu hình để áp dụng lên sân khấu.",
      );
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Lỗi tải Logo lên Storage",
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    const previous = draft.logo_url;
    onChange({ logo_url: null });
    await deleteContestAssetByUrl(previous).catch(() => {});
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingBg(true);
    try {
      const publicUrl = await uploadContestAsset(file, "backgrounds");
      onChange({
        background_mode: "image",
        background_url: publicUrl,
      });
      onToast(
        "success",
        "Đã tải ảnh nền lên thành công! Nhớ bấm Lưu cấu hình để đồng bộ lên sân khấu.",
      );
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Lỗi tải ảnh nền lên Storage",
      );
    } finally {
      setUploadingBg(false);
    }
  };

  const handleRemoveBg = async () => {
    const previous = draft.background_url;
    onChange({
      background_mode: "gradient",
      background_url: null,
    });
    await deleteContestAssetByUrl(previous).catch(() => {});
  };

  const colorFields: {
    key:
      | "bg_color"
      | "card_color"
      | "text_color"
      | "slogan_color"
      | "accent_color";
    label: string;
  }[] = [
    { key: "bg_color", label: "Màu nền chính" },
    { key: "card_color", label: "Màu khung câu hỏi" },
    { key: "text_color", label: "Màu chữ chính" },
    { key: "slogan_color", label: "Màu chữ Slogan" },
    { key: "accent_color", label: "Màu điểm nhấn (Accent)" },
  ];

  const typographyControls: {
    label: string;
    sizeKey:
      | "title_size"
      | "slogan_size"
      | "question_size"
      | "option_size"
      | "timer_size";
    weightKey:
      | "title_weight"
      | "slogan_weight"
      | "question_weight"
      | "option_weight"
      | "timer_weight";
    min: number;
    max: number;
  }[] = [
    {
      label: "Tiêu đề cuộc thi",
      sizeKey: "title_size",
      weightKey: "title_weight",
      min: 28,
      max: 92,
    },
    {
      label: "Slogan cuộc thi",
      sizeKey: "slogan_size",
      weightKey: "slogan_weight",
      min: 14,
      max: 48,
    },
    {
      label: "Nội dung câu hỏi / Tình huống",
      sizeKey: "question_size",
      weightKey: "question_weight",
      min: 18,
      max: 56,
    },
    {
      label: "Các đáp án A / B / C / D",
      sizeKey: "option_size",
      weightKey: "option_weight",
      min: 16,
      max: 44,
    },
    {
      label: "Đồng hồ đếm ngược",
      sizeKey: "timer_size",
      weightKey: "timer_weight",
      min: 28,
      max: 92,
    },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* CỘT TRÁI: BẢNG TÙY CHỈNH CHI TIẾT */}
      <div className="xl:col-span-6 space-y-5">
        {/* 1. Nhận diện sự kiện & Hình nền */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <Sparkles className="h-5 w-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              Nhận diện sự kiện &amp; Hình nền sân khấu
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Tên đơn vị tổ chức (Tiêu đề phụ)
              </label>
              <input
                type="text"
                value={draft.org_name}
                onChange={(e) => onChange({ org_name: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
                placeholder="VD: BAN TỔ CHỨC NGÀY HỘI CHUYỂN ĐỔI SỐ"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Tên cuộc thi (Tiêu đề chính)
              </label>
              <input
                type="text"
                value={draft.contest_title}
                onChange={(e) => onChange({ contest_title: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white focus:border-sky-400 focus:outline-none"
                placeholder="VD: CUỘC THI GIA ĐÌNH CHUYỂN ĐỔI SỐ"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Slogan cuộc thi (Khẩu hiệu)
              </label>
              <input
                type="text"
                value={draft.slogan}
                onChange={(e) => onChange({ slogan: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-amber-200 focus:border-amber-400 focus:outline-none"
                placeholder="VD: Mỗi gia đình một hạt nhân số..."
              />
            </div>
          </div>

          {/* Upload Logo */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Logo cuộc thi
                </p>
                <p className="text-xs text-slate-400">
                  Tải ảnh PNG/SVG/WebP lên Supabase Storage (bucket{" "}
                  <span className="font-mono">contest-assets</span>)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 px-3 py-2 text-xs font-bold text-sky-200 transition cursor-pointer">
                  {uploadingLogo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Tải Logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => void handleUploadLogo(e)}
                  />
                </label>
                {draft.logo_url && (
                  <button
                    type="button"
                    onClick={() => void handleRemoveLogo()}
                    className="inline-flex items-center gap-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 px-2.5 py-2 text-xs font-semibold text-rose-300 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                )}
              </div>
            </div>

            {draft.logo_url && (
              <div className="flex items-center gap-3 rounded-lg bg-slate-900 p-2.5 border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.logo_url}
                  alt="Logo preview"
                  className="h-12 w-12 object-contain rounded bg-slate-950 p-1"
                />
                <span className="text-xs text-slate-400 truncate flex-1">
                  {draft.logo_url}
                </span>
              </div>
            )}
          </div>

          {/* Tùy chọn Background */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ImageIcon className="h-4 w-4 text-sky-400" />
              Hình nền sân khấu (Background)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onChange({ background_mode: "gradient" })}
                className={`rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition cursor-pointer ${
                  draft.background_mode === "gradient"
                    ? "bg-sky-500/20 border-sky-400 text-sky-100"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Nền Gradient công nghệ mặc định
              </button>

              <button
                type="button"
                onClick={() => onChange({ background_mode: "image" })}
                className={`rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition cursor-pointer ${
                  draft.background_mode === "image"
                    ? "bg-sky-500/20 border-sky-400 text-sky-100"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Tải ảnh nền từ máy tính (JPG/PNG/WebP)
              </button>
            </div>

            {draft.background_mode === "image" && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 px-3.5 py-2 text-xs font-bold text-sky-200 transition cursor-pointer">
                    {uploadingBg ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Chọn ảnh nền tải lên Storage
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={uploadingBg}
                      onChange={(e) => void handleUploadBg(e)}
                    />
                  </label>

                  {draft.background_url && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveBg()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa ảnh về mặc định
                    </button>
                  )}
                </div>

                {draft.background_url && (
                  <div className="relative h-24 w-full overflow-hidden rounded-xl border border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draft.background_url}
                      alt="Background thumbnail"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Thanh trượt độ tối lớp phủ nền (0% - 85%) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Độ tối lớp phủ nền (Overlay Opacity)
                </span>
                <span className="font-mono font-bold text-sky-300">
                  {draft.overlay_opacity}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={85}
                step={1}
                value={draft.overlay_opacity}
                onChange={(e) =>
                  onChange({ overlay_opacity: Number(e.target.value) })
                }
                className="w-full accent-sky-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>0% (Sáng nguyên bản)</span>
                <span>85% (Rất tối, nổi bật chữ)</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Tùy chỉnh Màu sắc */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <Palette className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Bảng màu sân khấu (Color Picker)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {colorFields.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5"
              >
                <span className="text-xs font-semibold text-slate-200">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft[key]}
                    onChange={(e) => onChange({ [key]: e.target.value })}
                    className="h-8 w-10 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={draft[key]}
                    onChange={(e) => onChange({ [key]: e.target.value })}
                    className="w-20 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200 uppercase"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Font chữ & Cỡ chữ / Độ đậm */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <Type className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Font chữ tiếng Việt, Cỡ chữ (px) &amp; Độ đậm
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Font Tiêu đề &amp; Đồng hồ
              </label>
              <select
                value={draft.heading_font}
                onChange={(e) =>
                  onChange({ heading_font: e.target.value as FontFamilyName })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.name} value={font.name}>
                    {font.name} — {font.note}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Font Nội dung câu hỏi &amp; Đáp án
              </label>
              <select
                value={draft.body_font}
                onChange={(e) =>
                  onChange({ body_font: e.target.value as FontFamilyName })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.name} value={font.name}>
                    {font.name} — {font.note}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {typographyControls.map((ctrl) => (
              <div
                key={ctrl.sizeKey}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-200">
                    {ctrl.label}
                  </span>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="rounded bg-sky-500/15 px-2 py-0.5 text-sky-300 font-bold">
                      {draft[ctrl.sizeKey]}px
                    </span>
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-300 font-bold">
                      Weight {draft[ctrl.weightKey]}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>
                        Cỡ chữ ({ctrl.min}px – {ctrl.max}px)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={1}
                      value={draft[ctrl.sizeKey]}
                      onChange={(e) =>
                        onChange({ [ctrl.sizeKey]: Number(e.target.value) })
                      }
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Độ đậm (400 – 900)</span>
                    </div>
                    <input
                      type="range"
                      min={400}
                      max={900}
                      step={100}
                      value={draft[ctrl.weightKey]}
                      onChange={(e) =>
                        onChange({ [ctrl.weightKey]: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      {WEIGHT_OPTIONS.map((w) => (
                        <span key={w}>{w}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* CỘT PHẢI (STICKY): KHUNG XEM TRƯỚC TRỰC TIẾP 16:9 + NÚT LƯU / KHÔI PHỤC */}
      <div className="xl:col-span-6 xl:sticky xl:top-6 space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-white">
                Khung Xem trước Trực tiếp (Tỷ lệ 16:9)
              </h2>
              <p className="text-xs text-slate-400">
                Mọi thay đổi màu sắc, font, cỡ chữ và ảnh nền phản ánh ngay lập
                tức.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
              {(
                [
                  { id: "home", label: "Trang chủ" },
                  { id: "packages", label: "Chọn bộ đề" },
                  { id: "mcq", label: "Trắc nghiệm" },
                  { id: "scenario", label: "Tình huống" },
                ] as { id: PreviewView; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPreviewView(tab.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    previewView === tab.id
                      ? "bg-sky-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <StageLivePreview settings={draft} view={previewView} />

          {/* Thanh hành động Lưu & Khôi phục mặc định */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800 flex-wrap">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (
                  window.confirm(
                    "Khôi phục toàn bộ màu sắc, font chữ, cỡ chữ và hình nền về giao diện mặc định?",
                  )
                ) {
                  void onResetDefault();
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-300 transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Khôi phục giao diện mặc định
            </button>

            <div className="flex items-center gap-3">
              {!isDirty ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã đồng bộ
                </span>
              ) : (
                <span className="hidden sm:inline text-xs font-medium text-amber-300">
                  Chưa lưu
                </span>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={() => void onSave()}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 px-5 py-2.5 text-sm font-bold text-slate-950 transition shadow-lg cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>

        {/* Ghi chú nhỏ về thông số mặc định */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 px-4 py-3 text-xs text-slate-400 flex items-center justify-between gap-2">
          <span>
            Font mặc định:{" "}
            <strong className="text-slate-200">
              {DEFAULT_SETTINGS.heading_font}
            </strong>{" "}
            /{" "}
            <strong className="text-slate-200">
              {DEFAULT_SETTINGS.body_font}
            </strong>
          </span>
          <span>Chuẩn sân khấu 1280×720 (16:9)</span>
        </div>
      </div>
    </div>
  );
}
