import { ArrowDown, CheckCircle2, Factory, MapPin, PackageCheck, QrCode, Sprout, Truck } from "lucide-react";

const JOURNEY = [
  { icon: Sprout, label: "Nhà vườn", place: "Đắk Lắk" },
  { icon: Factory, label: "Đóng gói", place: "Buôn Ma Thuột" },
  { icon: PackageCheck, label: "Kiểm định", place: "Trạm QC" },
  { icon: Truck, label: "Vận chuyển", place: "Đắk Lắk → TP.HCM" },
  { icon: MapPin, label: "Điểm bán", place: "TP.HCM" },
] as const;

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-20">
      <div className="pointer-events-none absolute -top-48 left-1/2 -z-10 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-cyan-500/15 via-purple-600/15 to-emerald-500/10 blur-[130px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1.5 text-xs font-semibold text-cyan-300">
              <span className="size-2 rounded-full bg-cyan-400" />
              Dự án UniHackFest 2026
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              Từ nơi sản xuất
              <span className="block bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                đến tay người mua.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Check-Di ghi lại từng chặng của một lô hàng. Người mua chỉ cần quét QR để xem sản phẩm đã đi qua đâu, ai xác nhận và dữ liệu có còn nguyên vẹn hay không.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5 text-xs">
              {["Theo dõi từng chặng", "AI kiểm tra chứng từ", "QR cho người tiêu dùng"].map((item) => (
                <span key={item} className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-1.5 text-slate-200">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap gap-4">
              <a href="#demo" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-500/20">
                <QrCode className="size-4" />
                Quét thử một lô hàng
              </a>
              <a href="#journey" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200">
                Xem hành trình hoạt động
                <ArrowDown className="size-4" />
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-emerald-500/20 blur-xl" />
            <div className="relative rounded-3xl border border-white/10 bg-[#0c121e]/92 p-6 shadow-2xl shadow-black/60 sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Lô hàng mẫu</p>
                  <h2 className="mt-1 text-xl font-bold text-white">Sầu riêng Ri6 · DUR-260830-01</h2>
                  <p className="mt-1 text-xs text-slate-400">Hành trình từ Đắk Lắk đến TP.HCM</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                  <CheckCircle2 className="size-3" />
                  Dữ liệu mẫu
                </span>
              </div>

              <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#080d17] p-5">
                <div className="pointer-events-none absolute inset-0 opacity-30 bg-grid-pattern" />
                <div className="relative flex items-center justify-between gap-2">
                  {JOURNEY.map((stage, index) => {
                    const Icon = stage.icon;
                    return (
                      <div key={stage.label} className="relative z-10 flex min-w-0 flex-1 flex-col items-center text-center">
                        <div className="flex size-10 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                          <Icon className="size-4" />
                        </div>
                        <p className="mt-2 text-[11px] font-semibold text-white">{stage.label}</p>
                        <p className="mt-0.5 max-w-[90px] text-[10px] leading-tight text-slate-500">{stage.place}</p>
                        {index < JOURNEY.length - 1 && (
                          <div className="absolute left-[60%] top-5 h-px w-[80%] bg-gradient-to-r from-cyan-500/60 to-emerald-500/30" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5">
                  <p className="text-[11px] text-slate-500">Chặng gần nhất</p>
                  <p className="mt-1 text-sm font-semibold text-white">Đã nhập điểm bán</p>
                  <p className="mt-1 text-xs text-slate-400">TP.HCM · 03/09/2026</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5">
                  <p className="text-[11px] text-emerald-300">Khi quét QR</p>
                  <p className="mt-1 text-sm font-semibold text-white">Xem toàn bộ timeline</p>
                  <p className="mt-1 text-xs text-slate-400">Địa điểm · chứng từ · hash · đơn vị xác nhận</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
