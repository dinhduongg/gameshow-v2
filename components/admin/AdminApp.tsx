"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Database,
  ExternalLink,
  Loader2,
  Palette,
  Sliders,
  Tv,
} from "lucide-react";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import {
  fetchMcqs,
  fetchScenarios,
  fetchSettings,
  isSupabaseConfigured,
  saveSettings,
} from "@/lib/supabase";
import type {
  ContestSettings,
  McqQuestion,
  ScenarioQuestion,
} from "@/lib/types";
import { AppearanceTab } from "./AppearanceTab";
import { QuestionsTab } from "./QuestionsTab";
import { RulesTab } from "./RulesTab";

type AdminTabId = "rules" | "appearance" | "questions";

interface ToastMessage {
  id: number;
  type: "success" | "error";
  text: string;
}

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<AdminTabId>("rules");
  const [savedSettings, setSavedSettings] =
    useState<ContestSettings>(DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] =
    useState<ContestSettings>(DEFAULT_SETTINGS);
  const [mcqs, setMcqs] = useState<McqQuestion[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    const id = Date.now();
    setToast({ id, type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4200);
  }, []);

  const refreshQuestionsOnly = useCallback(async () => {
    const [m, sc] = await Promise.all([fetchMcqs(), fetchScenarios()]);
    setMcqs(m);
    setScenarios(sc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [s, m, sc] = await Promise.all([
          fetchSettings(),
          fetchMcqs(),
          fetchScenarios(),
        ]);
        if (cancelled) return;
        setSavedSettings(s);
        setDraftSettings(s);
        setMcqs(m);
        setScenarios(sc);
      } catch (err) {
        if (!cancelled) {
          showToast(
            "error",
            err instanceof Error ? err.message : "Lỗi tải dữ liệu quản trị"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const isDirty =
    JSON.stringify({ ...draftSettings, updated_at: undefined }) !==
    JSON.stringify({ ...savedSettings, updated_at: undefined });

  const handleDraftChange = useCallback((patch: Partial<ContestSettings>) => {
    setDraftSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setSavingSettings(true);
    try {
      const persisted = await saveSettings(draftSettings);
      setSavedSettings(persisted);
      setDraftSettings(persisted);
      showToast(
        "success",
        "Đã lưu cấu hình và đồng bộ Realtime lên màn hình sân khấu!"
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Không thể lưu cấu hình"
      );
    } finally {
      setSavingSettings(false);
    }
  }, [draftSettings, showToast]);

  const handleResetAppearance = useCallback(async () => {
    const resetMerged: ContestSettings = {
      ...DEFAULT_SETTINGS,
      mcq_duration: draftSettings.mcq_duration,
      scenario_duration: draftSettings.scenario_duration,
      auto_reveal_answer: draftSettings.auto_reveal_answer,
    };
    setDraftSettings(resetMerged);
    setSavingSettings(true);
    try {
      const persisted = await saveSettings(resetMerged);
      setSavedSettings(persisted);
      setDraftSettings(persisted);
      showToast("success", "Đã khôi phục giao diện mặc định!");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Không thể khôi phục mặc định"
      );
    } finally {
      setSavingSettings(false);
    }
  }, [
    draftSettings.auto_reveal_answer,
    draftSettings.mcq_duration,
    draftSettings.scenario_duration,
    showToast,
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header quản trị */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                Bảng Điều Khiển Ban Tổ Chức
              </h1>
              <p className="text-xs text-slate-400">
                Gameshow “Cuộc thi Gia đình Chuyển đổi số”
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                isSupabaseConfigured
                  ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
                  : "bg-amber-500/15 border-amber-500/35 text-amber-200"
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              {isSupabaseConfigured ? "Supabase Realtime" : "Chế độ Demo cục bộ"}
            </span>

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-950 transition"
            >
              Mở Màn hình Sân khấu
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Thanh 3 Tab */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
          {(
            [
              {
                id: "rules",
                label: "Tab 1: Cấu hình Luật chơi",
                icon: Sliders,
              },
              {
                id: "appearance",
                label: "Tab 2: Giao diện & Font chữ",
                icon: Palette,
              },
              {
                id: "questions",
                label: "Tab 3: Bộ đề & Import Excel",
                icon: BookOpen,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition cursor-pointer ${
                  active
                    ? "border-sky-400 text-sky-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Banner hướng dẫn kết nối Supabase khi chưa có .env.local */}
      {!isSupabaseConfigured && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5">
          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-100 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-amber-300">
                Đang chạy Chế độ Demo cục bộ (chưa cấu hình Supabase):
              </strong>{" "}
              Mọi thay đổi vẫn được lưu trên trình duyệt và đồng bộ giữa các tab
              cùng máy. Để dùng Supabase PostgreSQL + Storage + Realtime trên
              nhiều máy, hãy sao chép{" "}
              <code className="rounded bg-black/30 px-1.5 py-0.5">
                .env.local.example
              </code>{" "}
              thành{" "}
              <code className="rounded bg-black/30 px-1.5 py-0.5">
                .env.local
              </code>
              , điền khóa Supabase và chạy file{" "}
              <code className="rounded bg-black/30 px-1.5 py-0.5">
                supabase/schema.sql
              </code>
              .
            </div>
          </div>
        </div>
      )}

      {/* Nội dung Tab */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            <span className="text-sm">Đang tải dữ liệu quản trị...</span>
          </div>
        ) : (
          <>
            {activeTab === "rules" && (
              <RulesTab
                draft={draftSettings}
                onChange={handleDraftChange}
                onSave={handleSaveSettings}
                saving={savingSettings}
                isDirty={isDirty}
              />
            )}

            {activeTab === "appearance" && (
              <AppearanceTab
                draft={draftSettings}
                onChange={handleDraftChange}
                onSave={handleSaveSettings}
                onResetDefault={handleResetAppearance}
                saving={savingSettings}
                isDirty={isDirty}
                onToast={showToast}
              />
            )}

            {activeTab === "questions" && (
              <QuestionsTab
                mcqs={mcqs}
                scenarios={scenarios}
                onRefresh={refreshQuestionsOnly}
                onToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Thông báo Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-reveal-pop">
          <div
            className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-950/95 border-emerald-400/50 text-emerald-100"
                : "bg-rose-950/95 border-rose-400/50 text-rose-100"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
