"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  MessageSquareQuote,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { downloadSampleExcel, parseExcelFile } from "@/lib/excel";
import {
  deleteMcq,
  deleteScenario,
  importMcqs,
  importScenarios,
  saveMcq,
  saveScenario,
} from "@/lib/supabase";
import type {
  CorrectAnswerKey,
  ExcelParseResult,
  McqInput,
  McqQuestion,
  ScenarioInput,
  ScenarioQuestion,
} from "@/lib/types";

interface QuestionsTabProps {
  mcqs: McqQuestion[];
  scenarios: ScenarioQuestion[];
  onRefresh: () => Promise<void>;
  onToast: (type: "success" | "error", message: string) => void;
}

const EMPTY_MCQ: McqInput = {
  package_name: "Gói 1 - Công dân số",
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A",
  explanation: "",
  order_index: 1,
};

const EMPTY_SCENARIO: ScenarioInput = {
  package_name: "Gói 1 - Công dân số",
  title: "",
  content: "",
  grading_guide: "",
  order_index: 1,
};

export function QuestionsTab({
  mcqs,
  scenarios,
  onRefresh,
  onToast,
}: QuestionsTabProps) {
  const [subTab, setSubTab] = useState<"mcq" | "scenario">("mcq");
  const [selectedPkg, setSelectedPkg] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // State Modal Thêm/Sửa
  const [editingMcq, setEditingMcq] = useState<McqInput | null>(null);
  const [editingScenario, setEditingScenario] = useState<ScenarioInput | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  // State Modal Import Excel Preview
  const [excelPreview, setExcelPreview] = useState<ExcelParseResult | null>(
    null
  );
  const [previewSheet, setPreviewSheet] = useState<"mcq" | "scenario">("mcq");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importing, setImporting] = useState(false);

  const packages = useMemo(() => {
    const source = subTab === "mcq" ? mcqs : scenarios;
    const set = new Set<string>();
    source.forEach((item) => {
      if (item.package_name.trim()) set.add(item.package_name.trim());
    });
    return Array.from(set);
  }, [mcqs, scenarios, subTab]);

  const filteredMcqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mcqs.filter((item) => {
      if (selectedPkg !== "ALL" && item.package_name !== selectedPkg) {
        return false;
      }
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.package_name.toLowerCase().includes(q) ||
        item.option_a.toLowerCase().includes(q) ||
        item.option_b.toLowerCase().includes(q) ||
        item.option_c.toLowerCase().includes(q) ||
        item.option_d.toLowerCase().includes(q)
      );
    });
  }, [mcqs, searchQuery, selectedPkg]);

  const filteredScenarios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scenarios.filter((item) => {
      if (selectedPkg !== "ALL" && item.package_name !== selectedPkg) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.package_name.toLowerCase().includes(q)
      );
    });
  }, [scenarios, searchQuery, selectedPkg]);

  const handleSelectExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const result = await parseExcelFile(file);
      setExcelPreview(result);
      setPreviewSheet(result.mcqs.length > 0 ? "mcq" : "scenario");
      setImportMode("append");
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Không thể đọc file Excel"
      );
    }
  };

  const handleConfirmImport = async () => {
    if (!excelPreview) return;

    const validMcqs = excelPreview.mcqs
      .filter((row) => row.errors.length === 0 && row.correct_answer !== "")
      .map((row, idx) => ({
        package_name: row.package_name,
        question: row.question,
        option_a: row.option_a,
        option_b: row.option_b,
        option_c: row.option_c,
        option_d: row.option_d,
        correct_answer: row.correct_answer as CorrectAnswerKey,
        explanation: row.explanation,
        order_index: idx + 1,
      }));

    const validScenarios = excelPreview.scenarios
      .filter((row) => row.errors.length === 0)
      .map((row, idx) => ({
        package_name: row.package_name,
        title: row.title,
        content: row.content,
        grading_guide: row.grading_guide,
        order_index: idx + 1,
      }));

    if (validMcqs.length === 0 && validScenarios.length === 0) {
      onToast("error", "Không có dòng dữ liệu hợp lệ nào để đẩy lên Supabase.");
      return;
    }

    setImporting(true);
    try {
      if (validMcqs.length > 0) {
        await importMcqs(validMcqs, importMode);
      }
      if (validScenarios.length > 0) {
        await importScenarios(validScenarios, importMode);
      }
      await onRefresh();
      setExcelPreview(null);
      onToast(
        "success",
        `Đã import thành công ${validMcqs.length} câu Trắc nghiệm và ${validScenarios.length} câu Tình huống!`
      );
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Lỗi khi đẩy dữ liệu lên Supabase"
      );
    } finally {
      setImporting(false);
    }
  };

  const handleSaveMcqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMcq) return;
    if (
      !editingMcq.package_name.trim() ||
      !editingMcq.question.trim() ||
      !editingMcq.option_a.trim() ||
      !editingMcq.option_b.trim() ||
      !editingMcq.option_c.trim() ||
      !editingMcq.option_d.trim()
    ) {
      onToast("error", "Vui lòng điền đầy đủ gói câu hỏi, câu hỏi và 4 đáp án.");
      return;
    }

    setSubmitting(true);
    try {
      await saveMcq(editingMcq);
      await onRefresh();
      setEditingMcq(null);
      onToast("success", "Đã lưu câu hỏi trắc nghiệm thành công!");
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Không thể lưu câu hỏi"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMcq = async (item: McqQuestion) => {
    if (!window.confirm(`Xóa câu hỏi "${item.question.slice(0, 60)}..."?`)) {
      return;
    }
    try {
      await deleteMcq(item.id);
      await onRefresh();
      onToast("success", "Đã xóa câu hỏi trắc nghiệm.");
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Không thể xóa câu hỏi"
      );
    }
  };

  const handleSaveScenarioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScenario) return;
    if (
      !editingScenario.package_name.trim() ||
      !editingScenario.title.trim() ||
      !editingScenario.content.trim()
    ) {
      onToast(
        "error",
        "Vui lòng điền đầy đủ gói câu hỏi, tiêu đề và nội dung tình huống."
      );
      return;
    }

    setSubmitting(true);
    try {
      await saveScenario(editingScenario);
      await onRefresh();
      setEditingScenario(null);
      onToast("success", "Đã lưu câu hỏi tình huống thành công!");
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Không thể lưu tình huống"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteScenario = async (item: ScenarioQuestion) => {
    if (!window.confirm(`Xóa tình huống "${item.title}"?`)) return;
    try {
      await deleteScenario(item.id);
      await onRefresh();
      onToast("success", "Đã xóa câu hỏi tình huống.");
    } catch (err) {
      onToast(
        "error",
        err instanceof Error ? err.message : "Không thể xóa tình huống"
      );
    }
  };

  const validMcqCount =
    excelPreview?.mcqs.filter((r) => r.errors.length === 0).length ?? 0;
  const validScenarioCount =
    excelPreview?.scenarios.filter((r) => r.errors.length === 0).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Thanh công cụ Excel (.xlsx) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Nhập / Xuất bộ đề bằng Excel (.xlsx)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hỗ trợ file chuẩn 2 sheet{" "}
              <span className="font-mono text-sky-300">TracNghiem</span> và{" "}
              <span className="font-mono text-amber-300">TinhHuong</span> kèm
              bảng xem trước trước khi đẩy lên Supabase.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              downloadSampleExcel();
              onToast("success", "Đã tải file Excel mẫu (.xlsx) về máy.");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-sky-400" />
            Tải file Excel mẫu (.xlsx)
          </button>

          <label className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition cursor-pointer shadow-lg">
            <Upload className="h-4 w-4" />
            Import từ Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => void handleSelectExcel(e)}
            />
          </label>
        </div>
      </div>

      {/* Bộ chuyển Trắc nghiệm / Tình huống + Lọc + Tìm kiếm + Thêm thủ công */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 self-start">
            <button
              type="button"
              onClick={() => {
                setSubTab("mcq");
                setSelectedPkg("ALL");
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition cursor-pointer ${
                subTab === "mcq"
                  ? "bg-sky-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ListChecks className="h-4 w-4" />
              Trắc nghiệm ({mcqs.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSubTab("scenario");
                setSelectedPkg("ALL");
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition cursor-pointer ${
                subTab === "scenario"
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquareQuote className="h-4 w-4" />
              Tình huống ({scenarios.length})
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedPkg}
              onChange={(e) => setSelectedPkg(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="ALL">Tất cả bộ đề ({packages.length} gói)</option>
              {packages.map((pkg) => (
                <option key={pkg} value={pkg}>
                  {pkg}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nội dung..."
                className="rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none w-52"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (subTab === "mcq") {
                  setEditingMcq({
                    ...EMPTY_MCQ,
                    package_name:
                      selectedPkg !== "ALL"
                        ? selectedPkg
                        : packages[0] || "Gói 1 - Công dân số",
                    order_index: filteredMcqs.length + 1,
                  });
                } else {
                  setEditingScenario({
                    ...EMPTY_SCENARIO,
                    package_name:
                      selectedPkg !== "ALL"
                        ? selectedPkg
                        : packages[0] || "Gói 1 - Công dân số",
                    order_index: filteredScenarios.length + 1,
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {subTab === "mcq" ? "Thêm câu Trắc nghiệm" : "Thêm Tình huống"}
            </button>
          </div>
        </div>

        {/* Danh sách câu hỏi Trắc nghiệm */}
        {subTab === "mcq" ? (
          filteredMcqs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Không có câu hỏi trắc nghiệm nào phù hợp.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMcqs.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/75 p-4 space-y-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-md bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-xs font-bold text-sky-300">
                          {item.package_name}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                      <p className="text-sm md:text-base font-semibold text-white leading-snug">
                        {item.question}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingMcq({ ...item })}
                        className="rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 p-2 text-slate-300 hover:text-sky-300 transition cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteMcq(item)}
                        className="rounded-lg border border-slate-700 bg-slate-900 hover:bg-rose-500/20 p-2 text-slate-300 hover:text-rose-300 transition cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {(["A", "B", "C", "D"] as CorrectAnswerKey[]).map((key) => {
                      const text =
                        key === "A"
                          ? item.option_a
                          : key === "B"
                          ? item.option_b
                          : key === "C"
                          ? item.option_c
                          : item.option_d;
                      const isCorrect = item.correct_answer === key;
                      return (
                        <div
                          key={key}
                          className={`rounded-lg px-3 py-2 border flex items-center gap-2 ${
                            isCorrect
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold"
                              : "bg-slate-900/70 border-slate-800 text-slate-300"
                          }`}
                        >
                          <span className="font-mono font-bold">{key}.</span>
                          <span className="flex-1">{text}</span>
                          {isCorrect && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {item.explanation && (
                    <p className="text-xs text-slate-400 bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800/80">
                      <strong className="text-slate-300">Giải thích:</strong>{" "}
                      {item.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        ) : filteredScenarios.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Không có câu hỏi tình huống nào phù hợp.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredScenarios.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-950/75 p-4 space-y-2.5 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-300">
                        {item.package_name}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Tình huống #{idx + 1}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingScenario({ ...item })}
                      className="rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 p-2 text-slate-300 hover:text-amber-300 transition cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteScenario(item)}
                      className="rounded-lg border border-slate-700 bg-slate-900 hover:bg-rose-500/20 p-2 text-slate-300 hover:text-rose-300 transition cursor-pointer"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {item.content}
                </p>

                {item.grading_guide && (
                  <div className="text-xs text-emerald-200/90 bg-emerald-950/35 border border-emerald-500/25 rounded-lg px-3 py-2.5 whitespace-pre-line">
                    <strong className="text-emerald-300 block mb-1">
                      Gợi ý chấm điểm:
                    </strong>
                    {item.grading_guide}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL THÊM / SỬA CÂU HỎI TRẮC NGHIỆM */}
      {editingMcq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setEditingMcq(null)}
        >
          <form
            onSubmit={(e) => void handleSaveMcqSubmit(e)}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingMcq.id
                  ? "Chỉnh sửa câu hỏi Trắc nghiệm"
                  : "Thêm câu hỏi Trắc nghiệm mới"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingMcq(null)}
                className="rounded-lg p-1.5 hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Tên bộ đề (GoiCauHoi) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMcq.package_name}
                    onChange={(e) =>
                      setEditingMcq({
                        ...editingMcq,
                        package_name: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Đáp án đúng *
                  </label>
                  <select
                    value={editingMcq.correct_answer}
                    onChange={(e) =>
                      setEditingMcq({
                        ...editingMcq,
                        correct_answer: e.target.value as CorrectAnswerKey,
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-emerald-300"
                  >
                    <option value="A">Đáp án A</option>
                    <option value="B">Đáp án B</option>
                    <option value="C">Đáp án C</option>
                    <option value="D">Đáp án D</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nội dung câu hỏi *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editingMcq.question}
                  onChange={(e) =>
                    setEditingMcq({ ...editingMcq, question: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    { field: "option_a", label: "Đáp án A *" },
                    { field: "option_b", label: "Đáp án B *" },
                    { field: "option_c", label: "Đáp án C *" },
                    { field: "option_d", label: "Đáp án D *" },
                  ] as const
                ).map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      required
                      value={editingMcq[field]}
                      onChange={(e) =>
                        setEditingMcq({
                          ...editingMcq,
                          [field]: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Giải thích đáp án (hiện khi mở kết quả)
                </label>
                <textarea
                  rows={2}
                  value={editingMcq.explanation}
                  onChange={(e) =>
                    setEditingMcq({
                      ...editingMcq,
                      explanation: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
              <button
                type="button"
                onClick={() => setEditingMcq(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 px-5 py-2 text-sm font-bold text-slate-950 cursor-pointer"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Lưu câu hỏi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL THÊM / SỬA CÂU HỎI TÌNH HUỐNG */}
      {editingScenario && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setEditingScenario(null)}
        >
          <form
            onSubmit={(e) => void handleSaveScenarioSubmit(e)}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingScenario.id
                  ? "Chỉnh sửa Tình huống"
                  : "Thêm Tình huống mới"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingScenario(null)}
                className="rounded-lg p-1.5 hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Tên bộ đề (GoiCauHoi) *
                </label>
                <input
                  type="text"
                  required
                  value={editingScenario.package_name}
                  onChange={(e) =>
                    setEditingScenario({
                      ...editingScenario,
                      package_name: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Tiêu đề tình huống *
                </label>
                <input
                  type="text"
                  required
                  value={editingScenario.title}
                  onChange={(e) =>
                    setEditingScenario({
                      ...editingScenario,
                      title: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nội dung tình huống *
                </label>
                <textarea
                  required
                  rows={4}
                  value={editingScenario.content}
                  onChange={(e) =>
                    setEditingScenario({
                      ...editingScenario,
                      content: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Gợi ý chấm điểm cho Ban giám khảo
                </label>
                <textarea
                  rows={4}
                  value={editingScenario.grading_guide}
                  onChange={(e) =>
                    setEditingScenario({
                      ...editingScenario,
                      grading_guide: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
              <button
                type="button"
                onClick={() => setEditingScenario(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 px-5 py-2 text-sm font-bold text-slate-950 cursor-pointer"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Lưu tình huống
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL XEM TRƯỚC IMPORT EXCEL (PREVIEW) */}
      {excelPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setExcelPreview(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Xem trước dữ liệu Import Excel
                  </h3>
                  <p className="text-xs text-slate-400">
                    File: <span className="font-mono">{excelPreview.fileName}</span>{" "}
                    • Hợp lệ: {validMcqCount} Trắc nghiệm, {validScenarioCount}{" "}
                    Tình huống
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExcelPreview(null)}
                className="rounded-lg p-1.5 hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {excelPreview.warnings.length > 0 && (
              <div className="mx-6 mt-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 space-y-1">
                {excelPreview.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="px-6 pt-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewSheet("mcq")}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
                    previewSheet === "mcq"
                      ? "bg-sky-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sheet TracNghiem ({excelPreview.mcqs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSheet("scenario")}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
                    previewSheet === "scenario"
                      ? "bg-amber-400 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sheet TinhHuong ({excelPreview.scenarios.length})
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={importMode === "append"}
                    onChange={() => setImportMode("append")}
                    className="accent-emerald-400"
                  />
                  Thêm vào bộ đề hiện có
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-rose-300">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                    className="accent-rose-400"
                  />
                  Thay thế bộ đề cũ
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-6">
              {previewSheet === "mcq" ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 pr-3">Dòng</th>
                      <th className="py-2 pr-3">Gói câu hỏi</th>
                      <th className="py-2 pr-3">Câu hỏi</th>
                      <th className="py-2 pr-3">Đáp án</th>
                      <th className="py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {excelPreview.mcqs.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="py-2.5 pr-3 font-mono text-slate-500">
                          {row.rowNumber}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-sky-300 whitespace-nowrap">
                          {row.package_name || "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-200 max-w-md">
                          {row.question || "—"}
                        </td>
                        <td className="py-2.5 pr-3 font-mono font-bold text-emerald-300">
                          {row.correct_answer || "?"}
                        </td>
                        <td className="py-2.5">
                          {row.errors.length === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-emerald-300 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Hợp lệ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-rose-300 font-semibold">
                              {row.errors.join("; ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 pr-3">Dòng</th>
                      <th className="py-2 pr-3">Gói câu hỏi</th>
                      <th className="py-2 pr-3">Tiêu đề</th>
                      <th className="py-2 pr-3">Nội dung</th>
                      <th className="py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {excelPreview.scenarios.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="py-2.5 pr-3 font-mono text-slate-500">
                          {row.rowNumber}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-amber-300 whitespace-nowrap">
                          {row.package_name || "—"}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-white">
                          {row.title || "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-300 max-w-md truncate">
                          {row.content || "—"}
                        </td>
                        <td className="py-2.5">
                          {row.errors.length === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-emerald-300 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Hợp lệ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-rose-300 font-semibold">
                              {row.errors.join("; ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-slate-800 bg-slate-950/70">
              <p className="text-xs text-slate-400">
                Các dòng báo lỗi sẽ tự động được bỏ qua.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setExcelPreview(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={
                    importing ||
                    (validMcqCount === 0 && validScenarioCount === 0)
                  }
                  onClick={() => void handleConfirmImport()}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-5 py-2 text-sm font-bold text-slate-950 cursor-pointer"
                >
                  {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Xác nhận đẩy {validMcqCount + validScenarioCount} câu lên hệ
                  thống
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
