export type FontFamilyName =
  | "Be Vietnam Pro"
  | "Montserrat"
  | "Lexend"
  | "Roboto"
  | "Oswald";

export type BackgroundMode = "gradient" | "image";

export type CorrectAnswerKey = "A" | "B" | "C" | "D";

export interface ContestSettings {
  id: number;

  // Nhận diện sự kiện
  org_name: string;
  contest_title: string;
  slogan: string;
  logo_url: string | null;
  background_mode: BackgroundMode;
  background_url: string | null;
  overlay_opacity: number; // 0 - 85

  // Màu sắc
  bg_color: string;
  card_color: string;
  text_color: string;
  slogan_color: string;
  accent_color: string;

  // Font chữ
  heading_font: FontFamilyName;
  body_font: FontFamilyName;

  // Cỡ chữ (px) & Độ đậm (400 - 900)
  title_size: number;
  title_weight: number;
  slogan_size: number;
  slogan_weight: number;
  question_size: number;
  question_weight: number;
  option_size: number;
  option_weight: number;
  timer_size: number;
  timer_weight: number;

  // Luật chơi
  mcq_duration: number;
  scenario_duration: number;
  auto_reveal_answer: boolean;
  lock_during_countdown: boolean;

  updated_at?: string;
}

export interface McqQuestion {
  id: number;
  package_name: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswerKey;
  explanation: string;
  order_index: number;
  created_at?: string;
}

export type McqInput = Omit<McqQuestion, "id" | "created_at"> & {
  id?: number;
};

export interface ScenarioQuestion {
  id: number;
  package_name: string;
  title: string;
  content: string;
  grading_guide: string;
  order_index: number;
  created_at?: string;
}

export type ScenarioInput = Omit<ScenarioQuestion, "id" | "created_at"> & {
  id?: number;
};

export type McqStep = "question" | "running" | "locked" | "revealed";

export interface ParsedMcqRow {
  rowNumber: number;
  package_name: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswerKey | "";
  explanation: string;
  errors: string[];
}

export interface ParsedScenarioRow {
  rowNumber: number;
  package_name: string;
  title: string;
  content: string;
  grading_guide: string;
  errors: string[];
}

export interface ExcelParseResult {
  fileName: string;
  mcqs: ParsedMcqRow[];
  scenarios: ParsedScenarioRow[];
  warnings: string[];
}

export interface PackageGroup<T> {
  name: string;
  items: T[];
}
