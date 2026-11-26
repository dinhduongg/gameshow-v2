import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SETTINGS,
  DEMO_MCQS,
  DEMO_SCENARIOS,
  normalizeSettings,
} from "./defaults";
import type {
  ContestSettings,
  McqInput,
  McqQuestion,
  ScenarioInput,
  ScenarioQuestion,
} from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const CONTEST_BUCKET = "contest-assets";

export const isSupabaseConfigured =
  Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY) &&
  !SUPABASE_URL.includes("your-project-ref") &&
  !SUPABASE_ANON_KEY.includes("your-supabase-anon-key");

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    });
  }
  return cachedClient;
}

// ============================================================================
// CHẾ ĐỘ DEMO CỤC BỘ (KHI CHƯA CẤU HÌNH .env.local)
// ============================================================================
const LOCAL_KEYS = {
  settings: "gameshow_demo_settings_v1",
  mcqs: "gameshow_demo_mcqs_v1",
  scenarios: "gameshow_demo_scenarios_v1",
} as const;

const SYNC_CHANNEL = "gameshow-local-sync";

function broadcastLocalUpdate(topic: "settings" | "mcqs" | "scenarios") {
  if (typeof window === "undefined") return;
  try {
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channel.postMessage({ topic, ts: Date.now() });
    channel.close();
  } catch {
    // Trình duyệt không hỗ trợ BroadcastChannel sẽ dùng sự kiện storage
  }
}

export function subscribeLocalDemoSync(
  onChange: (topic: "settings" | "mcqs" | "scenarios") => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(SYNC_CHANNEL);
    channel.onmessage = (event) => {
      const topic = event.data?.topic;
      if (topic === "settings" || topic === "mcqs" || topic === "scenarios") {
        onChange(topic);
      }
    };
  } catch {
    channel = null;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_KEYS.settings) onChange("settings");
    if (event.key === LOCAL_KEYS.mcqs) onChange("mcqs");
    if (event.key === LOCAL_KEYS.scenarios) onChange("scenarios");
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.close();
  };
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Bỏ qua lỗi quota vượt giới hạn localStorage
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không thể đọc file hình ảnh."));
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// API SETTINGS
// ============================================================================
export async function fetchSettings(): Promise<ContestSettings> {
  const client = getSupabaseClient();
  if (!client) {
    return normalizeSettings(
      readLocal<ContestSettings>(LOCAL_KEYS.settings, DEFAULT_SETTINGS)
    );
  }

  const { data, error } = await client
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Lỗi tải cấu hình Supabase: ${error.message}`);
  }

  return normalizeSettings(data as Partial<ContestSettings> | null);
}

export async function saveSettings(
  settings: ContestSettings
): Promise<ContestSettings> {
  const payload: ContestSettings = {
    ...normalizeSettings(settings),
    id: 1,
    updated_at: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (!client) {
    writeLocal(LOCAL_KEYS.settings, payload);
    broadcastLocalUpdate("settings");
    return payload;
  }

  const { data, error } = await client
    .from("settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Không thể lưu cấu hình lên Supabase: ${error.message}`);
  }

  return normalizeSettings(data as Partial<ContestSettings>);
}

// ============================================================================
// API STORAGE (UPLOAD LOGO / BACKGROUND LÊN BUCKET `contest-assets`)
// ============================================================================
export async function uploadContestAsset(
  file: File,
  folder: "logos" | "backgrounds"
): Promise<string> {
  const client = getSupabaseClient();
  if (!client) {
    return fileToDataUrl(file);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "png";
  const filePath = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${safeExt}`;

  const { error: uploadError } = await client.storage
    .from(CONTEST_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw new Error(
      `Không thể tải ảnh lên bucket "${CONTEST_BUCKET}": ${uploadError.message}`
    );
  }

  const { data } = client.storage.from(CONTEST_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function deleteContestAssetByUrl(url: string | null) {
  if (!url) return;
  const client = getSupabaseClient();
  if (!client) return;

  const marker = `/storage/v1/object/public/${CONTEST_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;

  const storagePath = decodeURIComponent(url.slice(idx + marker.length));
  if (!storagePath) return;

  await client.storage.from(CONTEST_BUCKET).remove([storagePath]);
}

// ============================================================================
// API MCQS (TRẮC NGHIỆM)
// ============================================================================
export async function fetchMcqs(): Promise<McqQuestion[]> {
  const client = getSupabaseClient();
  if (!client) {
    return readLocal<McqQuestion[]>(LOCAL_KEYS.mcqs, DEMO_MCQS);
  }

  const { data, error } = await client
    .from("mcqs")
    .select("*")
    .order("package_name", { ascending: true })
    .order("order_index", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Lỗi tải câu hỏi trắc nghiệm: ${error.message}`);
  }

  return (data ?? []) as McqQuestion[];
}

export async function saveMcq(input: McqInput): Promise<McqQuestion> {
  const client = getSupabaseClient();
  if (!client) {
    const current = readLocal<McqQuestion[]>(LOCAL_KEYS.mcqs, DEMO_MCQS);
    if (input.id) {
      const updated = current.map((item) =>
        item.id === input.id ? { ...item, ...input, id: input.id } : item
      );
      writeLocal(LOCAL_KEYS.mcqs, updated);
      broadcastLocalUpdate("mcqs");
      return updated.find((item) => item.id === input.id)!;
    }
    const nextId =
      current.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    const created: McqQuestion = { ...input, id: nextId };
    writeLocal(LOCAL_KEYS.mcqs, [...current, created]);
    broadcastLocalUpdate("mcqs");
    return created;
  }

  const payload = {
    package_name: input.package_name.trim(),
    question: input.question.trim(),
    option_a: input.option_a.trim(),
    option_b: input.option_b.trim(),
    option_c: input.option_c.trim(),
    option_d: input.option_d.trim(),
    correct_answer: input.correct_answer,
    explanation: input.explanation.trim(),
    order_index: input.order_index ?? 0,
  };

  if (input.id) {
    const { data, error } = await client
      .from("mcqs")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(`Không thể cập nhật câu hỏi: ${error.message}`);
    return data as McqQuestion;
  }

  const { data, error } = await client
    .from("mcqs")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`Không thể thêm câu hỏi: ${error.message}`);
  return data as McqQuestion;
}

export async function deleteMcq(id: number): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    const current = readLocal<McqQuestion[]>(LOCAL_KEYS.mcqs, DEMO_MCQS);
    writeLocal(
      LOCAL_KEYS.mcqs,
      current.filter((item) => item.id !== id)
    );
    broadcastLocalUpdate("mcqs");
    return;
  }

  const { error } = await client.from("mcqs").delete().eq("id", id);
  if (error) throw new Error(`Không thể xóa câu hỏi: ${error.message}`);
}

export async function importMcqs(
  rows: Omit<McqInput, "id">[],
  mode: "append" | "replace"
): Promise<void> {
  if (rows.length === 0) return;

  const client = getSupabaseClient();
  if (!client) {
    const current =
      mode === "replace"
        ? []
        : readLocal<McqQuestion[]>(LOCAL_KEYS.mcqs, DEMO_MCQS);
    let nextId = current.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    const inserted: McqQuestion[] = rows.map((row) => ({
      ...row,
      id: nextId++,
    }));
    writeLocal(LOCAL_KEYS.mcqs, [...current, ...inserted]);
    broadcastLocalUpdate("mcqs");
    return;
  }

  if (mode === "replace") {
    const { error: delError } = await client.from("mcqs").delete().gt("id", 0);
    if (delError) {
      throw new Error(`Không thể xóa bộ câu hỏi cũ: ${delError.message}`);
    }
  }

  const { error } = await client.from("mcqs").insert(rows);
  if (error) {
    throw new Error(`Không thể import câu hỏi trắc nghiệm: ${error.message}`);
  }
}

// ============================================================================
// API SCENARIOS (TÌNH HUỐNG)
// ============================================================================
export async function fetchScenarios(): Promise<ScenarioQuestion[]> {
  const client = getSupabaseClient();
  if (!client) {
    return readLocal<ScenarioQuestion[]>(LOCAL_KEYS.scenarios, DEMO_SCENARIOS);
  }

  const { data, error } = await client
    .from("scenarios")
    .select("*")
    .order("package_name", { ascending: true })
    .order("order_index", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Lỗi tải câu hỏi tình huống: ${error.message}`);
  }

  return (data ?? []) as ScenarioQuestion[];
}

export async function saveScenario(
  input: ScenarioInput
): Promise<ScenarioQuestion> {
  const client = getSupabaseClient();
  if (!client) {
    const current = readLocal<ScenarioQuestion[]>(
      LOCAL_KEYS.scenarios,
      DEMO_SCENARIOS
    );
    if (input.id) {
      const updated = current.map((item) =>
        item.id === input.id ? { ...item, ...input, id: input.id } : item
      );
      writeLocal(LOCAL_KEYS.scenarios, updated);
      broadcastLocalUpdate("scenarios");
      return updated.find((item) => item.id === input.id)!;
    }
    const nextId =
      current.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    const created: ScenarioQuestion = { ...input, id: nextId };
    writeLocal(LOCAL_KEYS.scenarios, [...current, created]);
    broadcastLocalUpdate("scenarios");
    return created;
  }

  const payload = {
    package_name: input.package_name.trim(),
    title: input.title.trim(),
    content: input.content.trim(),
    grading_guide: input.grading_guide.trim(),
    order_index: input.order_index ?? 0,
  };

  if (input.id) {
    const { data, error } = await client
      .from("scenarios")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) {
      throw new Error(`Không thể cập nhật tình huống: ${error.message}`);
    }
    return data as ScenarioQuestion;
  }

  const { data, error } = await client
    .from("scenarios")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`Không thể thêm tình huống: ${error.message}`);
  return data as ScenarioQuestion;
}

export async function deleteScenario(id: number): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    const current = readLocal<ScenarioQuestion[]>(
      LOCAL_KEYS.scenarios,
      DEMO_SCENARIOS
    );
    writeLocal(
      LOCAL_KEYS.scenarios,
      current.filter((item) => item.id !== id)
    );
    broadcastLocalUpdate("scenarios");
    return;
  }

  const { error } = await client.from("scenarios").delete().eq("id", id);
  if (error) throw new Error(`Không thể xóa tình huống: ${error.message}`);
}

export async function importScenarios(
  rows: Omit<ScenarioInput, "id">[],
  mode: "append" | "replace"
): Promise<void> {
  if (rows.length === 0) return;

  const client = getSupabaseClient();
  if (!client) {
    const current =
      mode === "replace"
        ? []
        : readLocal<ScenarioQuestion[]>(LOCAL_KEYS.scenarios, DEMO_SCENARIOS);
    let nextId = current.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    const inserted: ScenarioQuestion[] = rows.map((row) => ({
      ...row,
      id: nextId++,
    }));
    writeLocal(LOCAL_KEYS.scenarios, [...current, ...inserted]);
    broadcastLocalUpdate("scenarios");
    return;
  }

  if (mode === "replace") {
    const { error: delError } = await client
      .from("scenarios")
      .delete()
      .gt("id", 0);
    if (delError) {
      throw new Error(`Không thể xóa bộ tình huống cũ: ${delError.message}`);
    }
  }

  const { error } = await client.from("scenarios").insert(rows);
  if (error) {
    throw new Error(`Không thể import câu hỏi tình huống: ${error.message}`);
  }
}
