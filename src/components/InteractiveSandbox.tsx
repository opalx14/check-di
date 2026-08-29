"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode2,
  FileText,
  GitPullRequest,
  ShieldCheck,
  UserCheck,
  Cpu,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Layers,
  Terminal,
} from "lucide-react";

type Scenario = {
  id: string;
  role: string;
  title: string;
  artifactType: "github_pr" | "commit" | "doc";
  artifactUri: string;
  artifactSnippet: string;
  skillName: string;
  rubricRef: string;
  confidence: number;
  aiReasoning: string;
  evidencePointers: string[];
  suggestedAction: "approve" | "needs_review";
  reviewerNoteDefault: string;
  mockTx: string;
  mockPda: string;
  mockEvidenceRoot: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "solana-builder",
    role: "Solana / Rust Developer",
    title: "PR #42: Anchor PDA Attestation Registry",
    artifactType: "github_pr",
    artifactUri: "https://github.com/check-di/check-di/pull/42",
    artifactSnippet: `pub fn issue_attestation(ctx: Context<IssueAttestation>, subject: [u8; 32], evidence_root: [u8; 32]) -> Result<()> {
    let attestation = &mut ctx.accounts.attestation;
    attestation.issuer = ctx.accounts.issuer.key();
    attestation.subject_commitment = subject;
    attestation.evidence_root = evidence_root;
    attestation.status = AttestationStatus::Active;
    Ok(())
}`,
    skillName: "Anchor Smart Contract & PDA Architecture",
    rubricRef: "RUBRIC-SOL-01 (Solana Program Security & PDA Seed Validation)",
    confidence: 96,
    aiReasoning:
      "Phát hiện struct khởi tạo PDA chuẩn với seeds = [b'attestation', issuer.key(), subject]. 100% test coverage trên Devnet, không vi phạm invariant.",
    evidencePointers: [
      "programs/check_di_registry/src/lib.rs:L18-L45",
      "tests/anchor/registry.spec.ts:L12-L89 (14 assertions passing)",
      "Zero private key leakage detected in commit history",
    ],
    suggestedAction: "approve",
    reviewerNoteDefault:
      "Đã đối soát code Anchor và chạy thử nghiệm anchor test. Code đáp ứng đầy đủ tiêu chí bảo mật on-chain.",
    mockTx: "5K2Lq9Z8WjU7bX1vYm3n4P6rTa8sEdFgHjKlZxQv9c8B",
    mockPda: "4uQW7XyZ9aBcDeFgH1jK2LmNoPqRsTuVwXyZ3b8b29",
    mockEvidenceRoot: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  {
    id: "ai-engineer",
    role: "AI / LLM Engineer",
    title: "Commit 7d9f21: Structured Evidence Extractor",
    artifactType: "commit",
    artifactUri: "https://github.com/check-di/check-di/commit/7d9f210a",
    artifactSnippet: `export async function extractEvidenceClaims(artifact: ArtifactInput, rubric: RubricSchema): Promise<EvidenceOutput> {
  const normalized = normalizeArtifact(artifact);
  const prompt = buildDeterministicEvidencePrompt(normalized, rubric);
  const response = await aiClient.generateStructured(prompt, EvidenceOutputSchema);
  return enforceZeroHallucinationGuardrails(response, normalized);
}`,
    skillName: "Deterministic AI Output & Guardrail Engineering",
    rubricRef: "RUBRIC-AI-03 (Strict Schema Validation & Citation Integrity)",
    confidence: 94,
    aiReasoning:
      "Function định nghĩa pipeline chuẩn với strict JSON schema và guardrails đối soát trực tiếp raw text, triệt tiêu ảo giác (hallucination).",
    evidencePointers: [
      "src/lib/ai/pipeline.ts:L30-L78",
      "tests/ai/fixtures/sample_repo.json (100% schema match)",
      "Output strictly references existing AST node lines",
    ],
    suggestedAction: "approve",
    reviewerNoteDefault:
      "Kiểm tra guardrails hoạt động tốt, không cho phép AI tự gán skill khi thiếu bằng chứng dòng code.",
    mockTx: "3M8zW9kPvY1xTa4nQ7bU6rEdFgHjKlZxQv9c8B5K2Lq",
    mockPda: "7bK9uQW2LmNoPqRsTuVwXyZ3b8b294uQW7XyZ9aBcDe",
    mockEvidenceRoot: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
  },
  {
    id: "product-manager",
    role: "Product & UX Architect",
    title: "PRD v1.2: Check-Di Trust Framework & GTM",
    artifactType: "doc",
    artifactUri: "https://github.com/check-di/check-di/blob/main/docs/product/PRD.md",
    artifactSnippet: `# PRD 1.2: User Consent & Data Privacy Boundaries
- Core Rule: All PII & raw code artifacts are stored in encrypted off-chain storage.
- On-chain Attestation: Only stores SHA-256 Merkle root & issuer public key.
- Pilot Issuer Onboarding: Universities, Hackathons, Tech Mentorship Programs.`,
    skillName: "Product Requirement Definition & Compliance Architecture",
    rubricRef: "RUBRIC-PRD-02 (Data Privacy, Boundary Specification & GTM Roadmap)",
    confidence: 91,
    aiReasoning:
      "Tài liệu phân định ranh giới on-chain/off-chain rành mạch, bảo đảm tuân thủ GDPR và triệt tiêu rủi ro lưu thông tin cá nhân lên blockchain.",
    evidencePointers: [
      "docs/product/01-problem-statement.md:L1-L40",
      "docs/compliance/01-privacy.md:L25-L60",
      "User flows mapped for both Issuer, Builder and Verifier",
    ],
    suggestedAction: "approve",
    reviewerNoteDefault:
      "Tài liệu PRD hoàn chỉnh, phân tích bài toán người dùng và ranh giới bảo mật rất chặt chẽ.",
    mockTx: "9B1aTa4nQ7bU6rEdFgHjKlZxQv9c8B5K2Lq3M8zW9kPv",
    mockPda: "9aBcDeFgH1jK2LmNoPqRsTuVwXyZ3b8b294uQW7XyZ",
    mockEvidenceRoot: "1a8565a9dae530e266d601f71a94a9f939e6a0d4cf965cb2362b46764506c483",
  },
];

export function InteractiveSandbox() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SCENARIOS[0].id);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [humanDecision, setHumanDecision] = useState<"approved" | "needs_review" | "rejected">(
    "approved"
  );
  const [reviewerNote, setReviewerNote] = useState<string>(SCENARIOS[0].reviewerNoteDefault);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  const handleScenarioChange = (newId: string) => {
    setSelectedScenarioId(newId);
    const newSc = SCENARIOS.find((s) => s.id === newId) || SCENARIOS[0];
    setReviewerNote(newSc.reviewerNoteDefault);
    setHumanDecision(newSc.suggestedAction === "approve" ? "approved" : "needs_review");
    setActiveStep(1);
  };

  const handleRunAiAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setActiveStep(2);
    }, 600);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <section id="sandbox" className="relative py-16 sm:py-24">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[140px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/50 px-4 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur">
            <Sparkles className="size-3.5 text-cyan-400" />
            <span>Interactive Simulator</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Trải nghiệm quy trình kiểm định Check-Di
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Chọn một bài nộp mẫu, xem AI Evidence Engine trích dẫn bằng chứng thực tế, tự mình phê duyệt
            với vai trò Hội đồng/Issuer và kiểm tra kết quả Attestation trên Solana Devnet.
          </p>
        </div>

        {/* Scenario Selector Tabs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {SCENARIOS.map((s) => {
            const isSelected = s.id === selectedScenarioId;
            return (
              <button
                key={s.id}
                onClick={() => handleScenarioChange(s.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "border-cyan-500/50 bg-cyan-950/80 text-cyan-300 shadow-lg shadow-cyan-500/20"
                    : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {s.artifactType === "github_pr" ? (
                  <GitPullRequest className="size-4 text-cyan-400" />
                ) : s.artifactType === "commit" ? (
                  <FileCode2 className="size-4 text-purple-400" />
                ) : (
                  <FileText className="size-4 text-emerald-400" />
                )}
                <span>{s.role}</span>
              </button>
            );
          })}
        </div>

        {/* Stepper Header */}
        <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
          {[
            { step: 1, title: "01. Nộp Artifact", icon: GitPullRequest, desc: "Git PR / Code / PRD" },
            { step: 2, title: "02. AI Bóc tách", icon: Cpu, desc: "Evidence & Rubric" },
            { step: 3, title: "03. Thẩm định", icon: UserCheck, desc: "Human Reviewer" },
            { step: 4, title: "04. Solana Proof", icon: ShieldCheck, desc: "PDA Attestation" },
          ].map((item) => {
            const isCurrent = activeStep === item.step;
            const isDone = activeStep > item.step;
            const Icon = item.icon;
            return (
              <button
                key={item.step}
                onClick={() => setActiveStep(item.step)}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                  isCurrent
                    ? "border-cyan-500/60 bg-cyan-950/40 shadow-md shadow-cyan-500/20"
                    : isDone
                    ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-400"
                    : "border-white/5 bg-slate-900/40 opacity-70 hover:opacity-100"
                }`}
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                    isCurrent
                      ? "bg-cyan-500 text-slate-950"
                      : isDone
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isDone ? <Check className="size-4" /> : <Icon className="size-4" />}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold truncate ${
                      isCurrent ? "text-white" : isDone ? "text-emerald-300" : "text-slate-400"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Workbench Container */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          {/* STEP 1: SUBMIT ARTIFACT */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    Bước 1 · Thu thập minh chứng (Artifact Ingestion)
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">{scenario.title}</h3>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-slate-400 border border-white/5">
                  <span>Target Role:</span>
                  <span className="font-semibold text-white">{scenario.role}</span>
                </div>
              </div>

              {/* Artifact Metadata */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
                  <p className="text-xs font-medium text-slate-400">Artifact URI</p>
                  <a
                    href={scenario.artifactUri}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-cyan-400 hover:underline"
                  >
                    <span className="truncate max-w-[280px] sm:max-w-[320px]">
                      {scenario.artifactUri}
                    </span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
                  <p className="text-xs font-medium text-slate-400">Target Skill to Verify</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-400">{scenario.skillName}</p>
                </div>
              </div>

              {/* Code / Artifact Preview Box */}
              <div>
                <div className="flex items-center justify-between rounded-t-xl bg-slate-900 px-4 py-2.5 border border-white/10 border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-red-500/80" />
                    <span className="size-2.5 rounded-full bg-amber-500/80" />
                    <span className="size-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-xs text-slate-400">
                      artifact_preview.rs
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400">Raw Input AST</span>
                </div>
                <pre className="overflow-x-auto rounded-b-xl border border-white/10 bg-[#050811] p-4 font-mono text-xs leading-relaxed text-slate-200">
                  <code>{scenario.artifactSnippet}</code>
                </pre>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleRunAiAnalysis}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="size-4 animate-spin text-cyan-200" />
                      <span>Đang bóc tách bằng chứng...</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-4 fill-white" />
                      <span>Chạy AI Evidence Engine</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: AI EVIDENCE ENGINE */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    Bước 2 · Kết quả trích xuất AI (AI Evidence Attribution)
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    Định vị bằng chứng theo tiêu chuẩn Rubric
                  </h3>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/60 px-3 py-1 text-xs font-semibold text-cyan-300">
                  <Cpu className="size-3.5" />
                  <span>Deterministic Parser v1.0</span>
                </div>
              </div>

              {/* Score & Rubric Banner */}
              <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-6 text-center">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    AI Confidence Score
                  </span>
                  <p className="mt-2 text-4xl font-black text-cyan-400">{scenario.confidence}%</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    <CheckCircle2 className="size-3" /> HIGH INTEGRITY
                  </span>
                </div>

                <div className="flex flex-col justify-center rounded-2xl border border-white/5 bg-slate-900/60 p-5">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    Đối chiếu tiêu chí đánh giá (Rubric Criterion)
                  </span>
                  <p className="mt-1 text-sm font-bold text-white">{scenario.rubricRef}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {scenario.aiReasoning}
                  </p>
                </div>
              </div>

              {/* Exact Evidence Pointers */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Các trích dẫn dòng code / artifact cụ thể (Evidence Pointers)
                </h4>
                <div className="mt-3 space-y-2">
                  {scenario.evidencePointers.map((pointer, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#070b16] p-3.5 text-xs"
                    >
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono text-[10px] font-bold">
                        #{i + 1}
                      </div>
                      <span className="font-mono text-cyan-200 break-all">{pointer}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Governance Disclaimer */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3.5 text-xs text-amber-300/90 flex items-start gap-2.5">
                <Lock className="size-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Quy tắc AI Governance:</strong> AI chỉ hỗ trợ trích dẫn và tổng hợp số liệu
                  dựa trên artifact thực tế, không có quyền tự cấp chứng chỉ. Quyết định cuối cùng thuộc
                  về Hội đồng/Issuer ở bước tiếp theo.
                </span>
              </div>

              {/* Next Button */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  onClick={() => setActiveStep(1)}
                  className="text-xs font-semibold text-slate-400 hover:text-white"
                >
                  ← Quay lại xem Artifact
                </button>
                <button
                  onClick={() => setActiveStep(3)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <UserCheck className="size-4" />
                  <span>Chuyển sang Hội đồng Thẩm định</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: HUMAN REVIEW */}
          {activeStep === 3 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                    Bước 3 · Thẩm định con người (Human-in-the-Loop Review)
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    Hội đồng chuyên môn & Issuer quyết định
                  </h3>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/60 px-3 py-1 text-xs font-semibold text-purple-300">
                  <UserCheck className="size-3.5" />
                  <span>Jury Review Mode</span>
                </div>
              </div>

              {/* Reviewer Action Radio Buttons */}
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  onClick={() => setHumanDecision("approved")}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all ${
                    humanDecision === "approved"
                      ? "border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-lg shadow-emerald-500/20"
                      : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>Phê duyệt (Approve)</span>
                  </div>
                  <p className="text-xs text-slate-400">Bằng chứng đầy đủ, đáp ứng 100% tiêu chí rubric.</p>
                </button>

                <button
                  onClick={() => setHumanDecision("needs_review")}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all ${
                    humanDecision === "needs_review"
                      ? "border-amber-500 bg-amber-950/40 text-amber-300 shadow-lg shadow-amber-500/20"
                      : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <AlertTriangle className="size-4 text-amber-400" />
                    <span>Cần bổ sung (Review)</span>
                  </div>
                  <p className="text-xs text-slate-400">Cần nộp thêm video demo hoặc test report phụ.</p>
                </button>

                <button
                  onClick={() => setHumanDecision("rejected")}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all ${
                    humanDecision === "rejected"
                      ? "border-red-500 bg-red-950/40 text-red-300 shadow-lg shadow-red-500/20"
                      : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <XCircle className="size-4 text-red-400" />
                    <span>Từ chối (Reject)</span>
                  </div>
                  <p className="text-xs text-slate-400">Artifact không khớp với kỹ năng đã claim.</p>
                </button>
              </div>

              {/* Reviewer Note Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Ghi chú của Giám khảo / Tổ chức cấp (Issuer Sign-off Notes)
                </label>
                <textarea
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-3.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Nhập nhận xét thẩm định..."
                />
              </div>

              {/* Signer Identity details */}
              <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Authorized Issuer:</span>
                  <span className="font-bold text-white">UniHackFest 2026 Jury Committee</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-slate-400">
                  <span>Cryptographic Authority:</span>
                  <span className="font-mono text-cyan-300">UniHackFest_Devnet_Authority_v1</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  onClick={() => setActiveStep(2)}
                  className="text-xs font-semibold text-slate-400 hover:text-white"
                >
                  ← Xem lại kết quả AI
                </button>
                <button
                  onClick={() => setActiveStep(4)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ShieldCheck className="size-4" />
                  <span>Ký & Mint Attestation lên Solana</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SOLANA ATTESTATION PROOF */}
          {activeStep === 4 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Bước 4 · Chứng thực On-chain (Solana Devnet Proof)
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    Attestation đã được neo vĩnh viễn trên Solana
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  <span>Anchor Registry: Confirmed</span>
                </div>
              </div>

              {/* Verification Hero Badge Card */}
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900/60 to-cyan-950/30 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                      Verified Skill Certificate
                    </span>
                    <h4 className="text-2xl font-black text-white mt-1">{scenario.skillName}</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Cấp bởi <strong className="text-white">UniHackFest 2026</strong> · Thẩm định
                      bởi Hội đồng chuyên môn
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-center">
                    <span className="text-[10px] font-bold uppercase text-emerald-300">Status</span>
                    <p className="text-sm font-black text-emerald-400 uppercase">
                      {humanDecision === "approved" ? "ACTIVE · VERIFIED" : humanDecision.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cryptographic Fields Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  On-chain Attestation State (Không lưu PII, chỉ lưu Merkle Proof)
                </h4>

                <div className="space-y-2 rounded-2xl border border-white/10 bg-[#060913] p-4 font-mono text-xs">
                  {/* PDA */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/5 pb-2">
                    <span className="text-slate-400">solana_pda_account:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-300">{scenario.mockPda}</span>
                      <button
                        onClick={() => handleCopy(scenario.mockPda, "pda")}
                        className="rounded p-1 text-slate-400 hover:text-white"
                        title="Copy PDA"
                      >
                        {copiedField === "pda" ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Evidence Root */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/5 pb-2">
                    <span className="text-slate-400">evidence_merkle_root:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-300 truncate max-w-[240px] sm:max-w-none">
                        {scenario.mockEvidenceRoot}
                      </span>
                      <button
                        onClick={() => handleCopy(scenario.mockEvidenceRoot, "root")}
                        className="rounded p-1 text-slate-400 hover:text-white"
                        title="Copy Merkle Root"
                      >
                        {copiedField === "root" ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Transaction Signature */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/5 pb-2">
                    <span className="text-slate-400">solana_tx_signature:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-300 truncate max-w-[240px] sm:max-w-none">
                        {scenario.mockTx}
                      </span>
                      <button
                        onClick={() => handleCopy(scenario.mockTx, "tx")}
                        className="rounded p-1 text-slate-400 hover:text-white"
                        title="Copy Tx Signature"
                      >
                        {copiedField === "tx" ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Reviewer signature hash */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
                    <span className="text-slate-400">reviewer_notes:</span>
                    <span className="font-sans text-slate-200 truncate max-w-[340px]">
                      &quot;{reviewerNote}&quot;
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                <button
                  onClick={() => {
                    setActiveStep(1);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Chạy lại với Scenario khác</span>
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href="#onchain"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 hover:bg-cyan-400"
                  >
                    <span>Xem On-chain Contract State</span>
                    <ArrowRight className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
