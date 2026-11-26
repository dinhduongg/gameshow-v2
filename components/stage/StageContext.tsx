"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_SETTINGS,
  DEMO_MCQS,
  DEMO_SCENARIOS,
  normalizeSettings,
} from "@/lib/defaults";
import { soundEngine } from "@/lib/sound";
import {
  fetchMcqs,
  fetchScenarios,
  fetchSettings,
  getSupabaseClient,
  isSupabaseConfigured,
  subscribeLocalDemoSync,
} from "@/lib/supabase";
import type {
  ContestSettings,
  McqQuestion,
  ScenarioQuestion,
} from "@/lib/types";

interface StageContextValue {
  settings: ContestSettings;
  mcqs: McqQuestion[];
  scenarios: ScenarioQuestion[];
  loading: boolean;
  error: string | null;
  realtimeConnected: boolean;
  soundEnabled: boolean;
  toggleSound: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  showShortcuts: boolean;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  refreshAll: () => Promise<void>;
}

const StageContext = createContext<StageContextValue | null>(null);

export function StageProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ContestSettings>(DEFAULT_SETTINGS);
  const [mcqs, setMcqs] = useState<McqQuestion[]>(DEMO_MCQS);
  const [scenarios, setScenarios] = useState<ScenarioQuestion[]>(DEMO_SCENARIOS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải cấu hình");
    }
  }, []);

  const refreshMcqs = useCallback(async () => {
    try {
      const data = await fetchMcqs();
      setMcqs(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lỗi tải câu hỏi trắc nghiệm"
      );
    }
  }, []);

  const refreshScenarios = useCallback(async () => {
    try {
      const data = await fetchScenarios();
      setScenarios(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lỗi tải câu hỏi tình huống"
      );
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, m, sc] = await Promise.all([
        fetchSettings(),
        fetchMcqs(),
        fetchScenarios(),
      ]);
      setSettings(s);
      setMcqs(m);
      setScenarios(sc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
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
        setSettings(s);
        setMcqs(m);
        setScenarios(sc);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Đồng bộ Realtime từ Supabase (hoặc BroadcastChannel khi chạy Demo cục bộ)
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      return subscribeLocalDemoSync((topic) => {
        if (topic === "settings") void refreshSettings();
        if (topic === "mcqs") void refreshMcqs();
        if (topic === "scenarios") void refreshScenarios();
      });
    }

    const channel = client
      .channel("gameshow-stage-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            setSettings(
              normalizeSettings(payload.new as Partial<ContestSettings>)
            );
          } else {
            void refreshSettings();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mcqs" },
        () => {
          void refreshMcqs();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scenarios" },
        () => {
          void refreshScenarios();
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [refreshMcqs, refreshScenarios, refreshSettings]);

  // Đồng bộ trạng thái âm thanh & toàn màn hình
  useEffect(() => {
    soundEngine.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
    };
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundEngine.setEnabled(next);
      if (next) soundEngine.playLock();
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  return (
    <StageContext.Provider
      value={{
        settings,
        mcqs,
        scenarios,
        loading,
        error,
        realtimeConnected: isSupabaseConfigured && realtimeConnected,
        soundEnabled,
        toggleSound,
        isFullscreen,
        toggleFullscreen,
        showShortcuts,
        setShowShortcuts,
        refreshAll,
      }}
    >
      {children}
    </StageContext.Provider>
  );
}

export function useStage() {
  const ctx = useContext(StageContext);
  if (!ctx) {
    throw new Error("useStage phải được dùng bên trong StageProvider");
  }
  return ctx;
}
