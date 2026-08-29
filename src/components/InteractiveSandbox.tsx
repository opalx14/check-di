"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileCheck2,
  Hash,
  MapPin,
  PackageCheck,
  Pause,
  Play,
  QrCode,
  Route,
  Sprout,
  Truck,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type TraceStage = {
  id: string;
  title: string;
  organization: string;
  location: string;
  time: string;
  detail: string;
  hash: string;
  icon: typeof Sprout;
  aiCheck?: string;
  x: number;
  y: number;
  shortPlace: string;
};

const STAGES: TraceStage[] = [
  {
    id: "farm",
    title: "Thu hoạch",
    organization: "Vườn Minh Phát",
    location: "Krông Pắc, Đắk Lắk",
    time: "30/08/2026 · 06:40",
    detail: "Lô Ri6 1.200 kg được tạo và gắn mã DUR-260830-01.",
    hash: "a81c...92fa",
    icon: Sprout,
    x: 11,
    y: 64,
    shortPlace: "Krông Pắc",
  },
  {
    id: "packing",
    title: "Đóng gói",
    organization: "HTX Đắk Farm",
    location: "Buôn Ma Thuột, Đắk Lắk",
    time: "30/08/2026 · 14:15",
    detail: "Nhận 1.200 kg, đóng gói 1.080 kg; hao hụt được khai báo 10%.",
    hash: "bf21...4ac8",
    icon: Warehouse,
    aiCheck: "Khối lượng đầu vào và đầu ra khớp với mức hao hụt đã khai báo.",
    x: 29,
    y: 42,
    shortPlace: "Buôn Ma Thuột",
  },
  {
    id: "inspection",
    title: "Kiểm định",
    organization: "Trung tâm QC Demo",
    location: "Đắk Lắk",
    time: "31/08/2026 · 09:20",
    detail: "Phiếu kiểm nghiệm được liên kết với đúng mã lô và ngày lấy mẫu.",
    hash: "c902...e113",
    icon: PackageCheck,
    aiCheck: "Mã lô và ngày trên phiếu kiểm nghiệm khớp với dữ liệu đóng gói.",
    x: 47,
    y: 57,
    shortPlace: "Trạm QC",
  },
  {
    id: "logistics",
    title: "Vận chuyển",
    organization: "Green Route Logistics",
    location: "Đắk Lắk → TP.HCM",
    time: "01/09/2026 · 05:30",
    detail: "Xe lạnh nhận lô hàng và cập nhật điểm đến là kho TP.HCM.",
    hash: "d710...33bd",
    icon: Truck,
    x: 68,
    y: 34,
    shortPlace: "Đang vận chuyển",
  },
  {
    id: "retail",
    title: "Điểm bán",
    organization: "Cửa hàng Fresh Market",
    location: "Quận 7, TP.HCM",
    time: "03/09/2026 · 08:10",
    detail: "Điểm bán xác nhận đã nhận lô và mở trạng thái cho người tiêu dùng tra cứu.",
    hash: "e445...81cc",
    icon: MapPin,
    x: 88,
    y: 68,
    shortPlace: "Quận 7",
  },
];

const ROUTE_PATH = "M55 225 C145 165 165 105 245 155 S370 215 440 120 S570 70 690 195 S805 275 890 225";

export function InteractiveSandbox() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showConsumerView, setShowConsumerView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const selected = STAGES[selectedIndex];

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setSelectedIndex((current) => {
        if (current >= STAGES.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1150);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const progress = useMemo(
    () => (selectedIndex / (STAGES.length - 1)) * 100,
    [selectedIndex],
  );

  const selectStage = (index: number) => {
    setIsPlaying(false);
    setSelectedIndex(index);
  };

  const playJourney = () => {
    if (selectedIndex === STAGES.length - 1) setSelectedIndex(0);
    setIsPlaying(true);
  };

  return (
    <section id="demo" className="relative border-t border-white/5 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
              Dữ liệu mô phỏng
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Theo dõi một lô hàng như theo dõi đơn.</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
              Bản đồ cho biết lô hàng đang ở chặng nào; chọn từng điểm để xem đơn vị, thời gian, chứng từ, AI kiểm tra và hash của chặng đó.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!showConsumerView && (
              <button
                type="button"
                onClick={isPlaying ? () => setIsPlaying(false) : playJourney}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:border-cyan-500/30 hover:bg-slate-800"
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                {isPlaying ? "Tạm dừng" : "Chạy hành trình"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowConsumerView((value) => !value)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
            >
              <QrCode className="size-4" />
              {showConsumerView ? "Quay lại bản đồ" : "Mô phỏng quét QR"}
            </button>
          </div>
        </div>

        {!showConsumerView ? (
          <div className="mt-10 space-y-6">
            <JourneyMap
              selectedIndex={selectedIndex}
              progress={progress}
              isPlaying={isPlaying}
              onSelect={selectStage}
            />

            <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
              <div className="rounded-3xl border border-white/10 bg-[#0a0f1b] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-cyan-300">5 CHẶNG</p>
                    <h3 className="mt-1 text-lg font-black text-white">Hành trình lô DUR-260830-01</h3>
                  </div>
                  <Route className="size-5 text-cyan-400" />
                </div>

                <div className="mt-5 space-y-2">
                  {STAGES.map((stage, index) => {
                    const Icon = stage.icon;
                    const active = index === selectedIndex;
                    const complete = index < selectedIndex;
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => selectStage(index)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                          active
                            ? "border-cyan-500/50 bg-cyan-500/10"
                            : complete
                              ? "border-emerald-500/15 bg-emerald-500/[0.04]"
                              : "border-white/5 bg-slate-900/40 hover:border-white/10"
                        }`}
                      >
                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${active ? "border-cyan-300 bg-cyan-500 text-slate-950" : complete ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-slate-950 text-slate-400"}`}>
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-white">{index + 1}. {stage.title}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-slate-500">{stage.shortPlace}</span>
                        </span>
                        {complete && <CheckCircle2 className="size-4 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <StageDetail stage={selected} />
            </div>
          </div>
        ) : (
          <ConsumerView />
        )}
      </div>
    </section>
  );
}

function JourneyMap({
  selectedIndex,
  progress,
  isPlaying,
  onSelect,
  compact = false,
}: {
  selectedIndex: number;
  progress: number;
  isPlaying: boolean;
  onSelect?: (index: number) => void;
  compact?: boolean;
}) {
  const selected = STAGES[selectedIndex];

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#09111d] shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <Route className="size-4" />
            BẢN ĐỒ HÀNH TRÌNH LÔ HÀNG
          </div>
          <p className="mt-1 text-sm font-semibold text-white">Đắk Lắk → TP.HCM · Sầu riêng Ri6</p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-slate-400">Chặng {selectedIndex + 1}/5</span>
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 font-semibold text-cyan-300">{selected.title}</span>
        </div>
      </div>

      <div className={`relative overflow-hidden ${compact ? "h-[250px]" : "h-[370px] sm:h-[430px]"}`}>
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_66%,rgba(34,211,238,.11),transparent_18%),radial-gradient(circle_at_88%_68%,rgba(16,185,129,.10),transparent_18%)]" />

        <svg viewBox="0 0 960 320" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d="M20 255 C80 215 80 105 150 75 S255 115 300 70 S370 45 420 90" fill="none" stroke="rgba(148,163,184,.07)" strokeWidth="1" />
          <path d="M510 265 C565 205 600 265 655 210 S765 150 820 190 S875 225 940 160" fill="none" stroke="rgba(148,163,184,.07)" strokeWidth="1" />
          <path d="M170 310 C220 245 245 285 305 220 S410 175 485 230" fill="none" stroke="rgba(148,163,184,.06)" strokeWidth="1" />
          <path d="M555 40 C625 85 685 45 745 90 S845 110 930 75" fill="none" stroke="rgba(148,163,184,.06)" strokeWidth="1" />

          <path d={ROUTE_PATH} fill="none" stroke="rgba(148,163,184,.20)" strokeWidth="5" strokeDasharray="8 10" strokeLinecap="round" />
          <path
            d={ROUTE_PATH}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - progress}
            style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1)" }}
          />
          <defs>
            <linearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute left-[5%] top-[10%] text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">ĐẮK LẮK</div>
        <div className="absolute right-[4%] top-[13%] text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">TP.HCM</div>
        {!compact && (
          <>
            <div className="absolute left-[37%] top-[19%] rounded-md border border-white/5 bg-slate-950/60 px-2 py-1 text-[9px] text-slate-600">QL14</div>
            <div className="absolute right-[25%] top-[36%] rounded-md border border-white/5 bg-slate-950/60 px-2 py-1 text-[9px] text-slate-600">QL1A</div>
          </>
        )}

        <div
          className={`pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-700 ease-out ${isPlaying ? "scale-110" : ""}`}
          style={{ left: `${selected.x}%`, top: `${selected.y}%` }}
        >
          <span className="relative flex size-8 items-center justify-center rounded-full border border-cyan-300 bg-cyan-400 text-slate-950 shadow-[0_0_30px_rgba(34,211,238,.55)]">
            {selected.id === "logistics" ? <Truck className="size-4" /> : <MapPin className="size-4" />}
            <span className="absolute -inset-2 -z-10 animate-ping rounded-full border border-cyan-400/40" />
          </span>
        </div>

        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const active = index === selectedIndex;
          const complete = index < selectedIndex;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={onSelect ? () => onSelect(index) : undefined}
              style={{ left: `${stage.x}%`, top: `${stage.y}%` }}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center"
              aria-label={`Chặng ${index + 1}: ${stage.title}`}
            >
              <span className={`mx-auto flex size-11 items-center justify-center rounded-full border-2 shadow-lg transition-all duration-300 ${active ? "scale-110 border-cyan-300 bg-cyan-500 text-slate-950 shadow-cyan-500/30" : complete ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300" : "border-white/15 bg-slate-950/95 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300"}`}>
                <Icon className="size-4" />
              </span>
              {!compact && (
                <span className={`mt-2 block rounded-lg border px-2 py-1 text-[10px] font-bold backdrop-blur ${active ? "border-cyan-500/30 bg-cyan-950/80 text-cyan-200" : "border-white/5 bg-slate-950/75 text-slate-400"}`}>
                  {index + 1}. {stage.title}
                </span>
              )}
            </button>
          );
        })}

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/78 px-4 py-3 text-[11px] backdrop-blur-xl">
          <div className="flex items-center gap-2 text-slate-400">
            <MapPin className="size-3.5 text-cyan-400" />
            <span>{selected.shortPlace}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>Tiến độ</span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10 sm:w-40">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700" style={{ width: `${Math.max(progress, 4)}%` }} />
            </div>
            <span className="font-mono text-cyan-300">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageDetail({ stage }: { stage: TraceStage }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c121e]/90 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold text-cyan-300">CHẶNG ĐANG XEM</p>
          <h3 className="mt-1 text-2xl font-black text-white">{stage.title}</h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
          <CheckCircle2 className="size-3" />
          Đã ghi nhận
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Info label="Đơn vị" value={stage.organization} />
        <Info label="Địa điểm" value={stage.location} />
        <Info label="Thời gian" value={stage.time} />
        <Info label="Mã lô" value="DUR-260830-01" />
      </div>

      <div className="mt-4 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
        <p className="text-xs font-semibold text-white">Dữ liệu của chặng</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{stage.detail}</p>
      </div>

      {stage.aiCheck ? (
        <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4">
          <div className="flex items-center gap-2 text-cyan-300">
            <Bot className="size-4" />
            <p className="text-xs font-bold">AI đối chiếu chứng từ</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">{stage.aiCheck}</p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/5 bg-slate-900/40 p-4 text-xs text-slate-400">
          Chặng này chưa cần AI đối chiếu thêm trong dữ liệu mẫu.
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4">
          <div className="flex items-center gap-2 text-purple-300">
            <FileCheck2 className="size-4" />
            <p className="text-xs font-bold">Chứng từ liên quan</p>
          </div>
          <p className="mt-2 text-xs text-slate-300">Dữ liệu mẫu đã gắn với hồ sơ của đúng chặng.</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2 text-emerald-300">
            <Hash className="size-4" />
            <p className="text-xs font-bold">Hash dữ liệu</p>
          </div>
          <p className="mt-2 font-mono text-sm text-white">{stage.hash}</p>
          <p className="mt-1 text-[11px] text-slate-500">Mã rút gọn dùng cho demo.</p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/55 p-3.5">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-semibold text-white">{value}</p>
    </div>
  );
}

function ConsumerView() {
  return (
    <div className="mt-10 space-y-6">
      <JourneyMap
        selectedIndex={STAGES.length - 1}
        progress={100}
        isPlaying={false}
        compact
      />

      <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#0c121e]/92 p-5 sm:p-7">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="size-4" />
              <span className="text-xs font-bold">Có dữ liệu ở đủ 5 chặng</span>
            </div>
            <h3 className="mt-2 text-2xl font-black text-white">Sầu riêng Ri6</h3>
            <p className="mt-1 text-sm text-slate-400">Lô DUR-260830-01 · Dữ liệu mô phỏng</p>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 text-center">
            <QrCode className="mx-auto size-7 text-cyan-300" />
            <p className="mt-1 text-[11px] text-slate-400">QR công khai của lô</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.id} className="relative rounded-2xl border border-white/5 bg-slate-900/45 p-4">
                {index < STAGES.length - 1 && <div className="absolute -right-3 top-8 hidden h-px w-3 bg-emerald-500/30 md:block" />}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex size-9 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    <Icon className="size-4" />
                  </div>
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                </div>
                <p className="mt-3 text-xs font-bold text-white">{index + 1}. {stage.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{stage.shortPlace}</p>
                <p className="mt-3 font-mono text-[10px] text-slate-500">{stage.hash}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-200/90">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Đây là giao diện mô phỏng. Hash và tổ chức trong ví dụ chưa phải dữ liệu xác nhận thực tế trên Solana Devnet.
        </div>
      </div>
    </div>
  );
}
