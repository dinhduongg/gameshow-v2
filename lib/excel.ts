import * as XLSX from "xlsx";
import type {
  CorrectAnswerKey,
  ExcelParseResult,
  ParsedMcqRow,
  ParsedScenarioRow,
} from "./types";

const MCQ_SHEET_NAME = "TracNghiem";
const SCENARIO_SHEET_NAME = "TinhHuong";

const SAMPLE_MCQS = [
  {
    GoiCauHoi: "Gói 1 - Công dân số",
    CauHoi:
      "Ứng dụng định danh điện tử quốc gia do Bộ Công an phát triển giúp tích hợp CCCD, BHYT, GPLX là gì?",
    DapAnA: "VNeID",
    DapAnB: "VssID",
    DapAnC: "PC-Covid",
    DapAnD: "eTax Mobile",
    DapAnDung: "A",
    GiaiThich:
      "VNeID là ứng dụng định danh điện tử quốc gia chính thức do Bộ Công an phát triển.",
  },
  {
    GoiCauHoi: "Gói 1 - Công dân số",
    CauHoi: "Ngày Chuyển đổi số quốc gia của Việt Nam là ngày nào hằng năm?",
    DapAnA: "02/09",
    DapAnB: "10/10",
    DapAnC: "15/10",
    DapAnD: "20/11",
    DapAnDung: "B",
    GiaiThich:
      "Ngày 10 tháng 10 hằng năm là Ngày Chuyển đổi số quốc gia (gắn với hệ nhị phân 1 và 0).",
  },
  {
    GoiCauHoi: "Gói 2 - An toàn không gian mạng",
    CauHoi:
      "Thông tin nào sau đây TUYỆT ĐỐI KHÔNG chia sẻ cho bất kỳ ai kể cả người tự xưng nhân viên ngân hàng?",
    DapAnA: "Tên ngân hàng",
    DapAnB: "Mã OTP, mật khẩu và số CVV/CVC mặt sau thẻ",
    DapAnC: "Mã QR nhận tiền tại quầy",
    DapAnD: "Tên chủ tài khoản",
    DapAnDung: "B",
    GiaiThich:
      "Mã OTP, mật khẩu và CVV/CVC là thông tin bảo mật cá nhân tuyệt đối không được tiết lộ.",
  },
];

const SAMPLE_SCENARIOS = [
  {
    GoiCauHoi: "Gói 1 - Công dân số",
    TieuDe: "Hướng dẫn ông bà nộp hồ sơ dịch vụ công trực tuyến",
    NoiDungTinhHuong:
      "Ông nội 72 tuổi cần xin giấy xác nhận cư trú nhưng ngại đi xa và lo mình lớn tuổi khó thao tác trên điện thoại. Gia đình bạn sẽ vận dụng chuyển đổi số như thế nào để hỗ trợ ông?",
    GoiYChamDiem:
      "1. Hỗ trợ nộp trực tuyến qua VNeID / Cổng Dịch vụ công Quốc gia.\n2. Kiên nhẫn hướng dẫn từng bước trực quan, phóng to chữ.\n3. Kết nối Tổ công nghệ số cộng đồng nếu cần hỗ trợ trực tiếp.",
  },
  {
    GoiCauHoi: "Gói 2 - An toàn không gian mạng",
    TieuDe: "Cuộc gọi video giả mạo người thân vay tiền gấp",
    NoiDungTinhHuong:
      "Mẹ bạn nhận được cuộc gọi video mờ giật đúng gương mặt người thân báo đang gặp tai nạn, yêu cầu chuyển gấp 15 triệu vào tài khoản người lạ. Gia đình bạn xử lý thế nào?",
    GoiYChamDiem:
      "1. Bình tĩnh dừng chuyển tiền ngay.\n2. Nhận diện dấu hiệu Deepfake (mờ giật, hối thúc, tài khoản người lạ).\n3. Gọi lại bằng số điện thoại thường để xác minh chéo và báo cáo tài khoản giả mạo.",
  },
];

export function downloadSampleExcel() {
  const wb = XLSX.utils.book_new();

  const mcqSheet = XLSX.utils.json_to_sheet(SAMPLE_MCQS, {
    header: [
      "GoiCauHoi",
      "CauHoi",
      "DapAnA",
      "DapAnB",
      "DapAnC",
      "DapAnD",
      "DapAnDung",
      "GiaiThich",
    ],
  });
  mcqSheet["!cols"] = [
    { wch: 28 },
    { wch: 52 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 12 },
    { wch: 48 },
  ];

  const scenarioSheet = XLSX.utils.json_to_sheet(SAMPLE_SCENARIOS, {
    header: ["GoiCauHoi", "TieuDe", "NoiDungTinhHuong", "GoiYChamDiem"],
  });
  scenarioSheet["!cols"] = [
    { wch: 28 },
    { wch: 42 },
    { wch: 64 },
    { wch: 56 },
  ];

  XLSX.utils.book_append_sheet(wb, mcqSheet, MCQ_SHEET_NAME);
  XLSX.utils.book_append_sheet(wb, scenarioSheet, SCENARIO_SHEET_NAME);

  XLSX.writeFile(wb, "Mau_Bo_De_Gia_Dinh_Chuyen_Doi_So.xlsx");
}

function normalizeHeaderKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function getField(
  row: Record<string, unknown>,
  candidates: string[]
): string {
  const normalizedMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    normalizedMap.set(normalizeHeaderKey(k), v);
  }
  for (const candidate of candidates) {
    const val = normalizedMap.get(normalizeHeaderKey(candidate));
    if (val !== undefined && val !== null) {
      return String(val).trim();
    }
  }
  return "";
}

function findSheetByName(
  wb: XLSX.WorkBook,
  expected: string
): XLSX.WorkSheet | null {
  const target = normalizeHeaderKey(expected);
  const foundName = wb.SheetNames.find(
    (name) => normalizeHeaderKey(name) === target
  );
  return foundName ? wb.Sheets[foundName] : null;
}

export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const warnings: string[] = [];
  const mcqs: ParsedMcqRow[] = [];
  const scenarios: ParsedScenarioRow[] = [];

  const mcqSheet = findSheetByName(workbook, MCQ_SHEET_NAME);
  if (!mcqSheet) {
    warnings.push(
      `Không tìm thấy sheet "${MCQ_SHEET_NAME}" trong file Excel.`
    );
  } else {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      mcqSheet,
      { defval: "" }
    );
    rawRows.forEach((row, index) => {
      const package_name = getField(row, ["GoiCauHoi", "Goi", "Package"]);
      const question = getField(row, ["CauHoi", "Question"]);
      const option_a = getField(row, ["DapAnA", "A", "OptionA"]);
      const option_b = getField(row, ["DapAnB", "B", "OptionB"]);
      const option_c = getField(row, ["DapAnC", "C", "OptionC"]);
      const option_d = getField(row, ["DapAnD", "D", "OptionD"]);
      const rawCorrect = getField(row, ["DapAnDung", "Correct", "Answer"])
        .toUpperCase()
        .slice(0, 1);
      const explanation = getField(row, ["GiaiThich", "Explanation"]);

      if (
        !package_name &&
        !question &&
        !option_a &&
        !option_b &&
        !option_c &&
        !option_d
      ) {
        return;
      }

      const errors: string[] = [];
      if (!package_name) errors.push("Thiếu GoiCauHoi");
      if (!question) errors.push("Thiếu CauHoi");
      if (!option_a || !option_b || !option_c || !option_d) {
        errors.push("Thiếu đáp án A/B/C/D");
      }
      const correct_answer: CorrectAnswerKey | "" =
        rawCorrect === "A" ||
        rawCorrect === "B" ||
        rawCorrect === "C" ||
        rawCorrect === "D"
          ? rawCorrect
          : "";
      if (!correct_answer) {
        errors.push("DapAnDung phải là A, B, C hoặc D");
      }

      mcqs.push({
        rowNumber: index + 2,
        package_name,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        explanation,
        errors,
      });
    });
  }

  const scenarioSheet = findSheetByName(workbook, SCENARIO_SHEET_NAME);
  if (!scenarioSheet) {
    warnings.push(
      `Không tìm thấy sheet "${SCENARIO_SHEET_NAME}" trong file Excel.`
    );
  } else {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      scenarioSheet,
      { defval: "" }
    );
    rawRows.forEach((row, index) => {
      const package_name = getField(row, ["GoiCauHoi", "Goi", "Package"]);
      const title = getField(row, ["TieuDe", "Title"]);
      const content = getField(row, [
        "NoiDungTinhHuong",
        "NoiDung",
        "Content",
      ]);
      const grading_guide = getField(row, [
        "GoiYChamDiem",
        "GoiY",
        "GradingGuide",
      ]);

      if (!package_name && !title && !content && !grading_guide) {
        return;
      }

      const errors: string[] = [];
      if (!package_name) errors.push("Thiếu GoiCauHoi");
      if (!title) errors.push("Thiếu TieuDe");
      if (!content) errors.push("Thiếu NoiDungTinhHuong");

      scenarios.push({
        rowNumber: index + 2,
        package_name,
        title,
        content,
        grading_guide,
        errors,
      });
    });
  }

  return {
    fileName: file.name,
    mcqs,
    scenarios,
    warnings,
  };
}
