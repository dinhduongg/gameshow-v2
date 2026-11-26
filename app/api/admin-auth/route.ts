import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "gameshow_admin_auth";
const DEFAULT_ADMIN_PASSWORD = "admin123";
const SESSION_PAYLOAD = "gameshow-admin-session-v1";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 giờ

// Mật khẩu tạm trong RAM khi chạy chế độ Demo cục bộ (chưa cấu hình Supabase)
let demoLocalPassword: string | null = null;

function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (
    !url ||
    !key ||
    url.includes("your-project-ref") ||
    key.includes("your-supabase-anon-key")
  ) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

async function getAdminPasswordConfig(): Promise<{
  password: string;
  usingDefault: boolean;
  fromSupabase: boolean;
}> {
  const client = createServerSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from("settings")
      .select("admin_password")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data && typeof data.admin_password === "string") {
      const trimmed = data.admin_password.trim();
      if (trimmed) {
        return {
          password: trimmed,
          usingDefault: trimmed === DEFAULT_ADMIN_PASSWORD,
          fromSupabase: true,
        };
      }
    }
  }

  const fallback =
    demoLocalPassword ||
    process.env.ADMIN_PASSWORD?.trim() ||
    DEFAULT_ADMIN_PASSWORD;

  return {
    password: fallback,
    usingDefault: fallback === DEFAULT_ADMIN_PASSWORD,
    fromSupabase: Boolean(client),
  };
}

function sha256Buffer(value: string): Buffer {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

function safeEqual(a: string, b: string): boolean {
  return crypto.timingSafeEqual(sha256Buffer(a), sha256Buffer(b));
}

function createSessionToken(password: string): string {
  return crypto
    .createHmac("sha256", password)
    .update(SESSION_PAYLOAD)
    .digest("hex");
}

function setSessionCookie(response: NextResponse, password: string) {
  response.cookies.set(COOKIE_NAME, createSessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const { password, usingDefault, fromSupabase } =
    await getAdminPasswordConfig();
  const expected = createSessionToken(password);
  const authenticated = Boolean(token) && safeEqual(token, expected);

  return NextResponse.json(
    { authenticated, usingDefault, fromSupabase },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: Request) {
  let submitted = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body?.password === "string") {
      submitted = body.password;
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Dữ liệu yêu cầu không hợp lệ." },
      { status: 400 }
    );
  }

  const { password } = await getAdminPasswordConfig();
  if (!submitted || !safeEqual(submitted, password)) {
    return NextResponse.json(
      { ok: false, error: "Mật khẩu không chính xác. Vui lòng thử lại." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, password);
  return response;
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const { password: activePassword } = await getAdminPasswordConfig();

  if (!token || !safeEqual(token, createSessionToken(activePassword))) {
    return NextResponse.json(
      { ok: false, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." },
      { status: 401 }
    );
  }

  let currentPassword = "";
  let newPassword = "";
  try {
    const body = (await request.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    if (typeof body?.currentPassword === "string") {
      currentPassword = body.currentPassword;
    }
    if (typeof body?.newPassword === "string") {
      newPassword = body.newPassword.trim();
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Dữ liệu yêu cầu không hợp lệ." },
      { status: 400 }
    );
  }

  if (!currentPassword || !safeEqual(currentPassword, activePassword)) {
    return NextResponse.json(
      { ok: false, error: "Mật khẩu hiện tại không chính xác." },
      { status: 400 }
    );
  }

  if (newPassword.length < 4) {
    return NextResponse.json(
      { ok: false, error: "Mật khẩu mới cần có ít nhất 4 ký tự." },
      { status: 400 }
    );
  }

  const client = createServerSupabaseClient();
  if (client) {
    const { error } = await client
      .from("settings")
      .upsert(
        {
          id: 1,
          admin_password: newPassword,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: `Không thể cập nhật mật khẩu trên Supabase: ${error.message}`,
        },
        { status: 500 }
      );
    }
  } else {
    demoLocalPassword = newPassword;
  }

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, newPassword);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
