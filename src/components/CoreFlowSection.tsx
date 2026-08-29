import { Bot, Building2, Hash, QrCode, Route } from "lucide-react";

const STEPS = [
  {
    icon: Building2,
    title: "Mỗi bên ghi nhận chặng của mình",
    text: "Nhà vườn, đơn vị đóng gói, kiểm định, logistics và điểm bán cập nhật dữ liệu của lô hàng.",
  },
  {
    icon: Bot,
    title: "AI đối chiếu chứng từ",
    text: "AI đọc phiếu kiểm nghiệm, packing list, hóa đơn và cảnh báo khi ngày, số lượng hoặc mã lô không khớp.",
  },
  {
    icon: Hash,
    title: "Dữ liệu được tạo hash",
    text: "Sau khi đơn vị xác nhận, dữ liệu của chặng được chuẩn hóa và tạo mã kiểm tra tính toàn vẹn.",
  },
  {
    icon: QrCode,
    title: "Người mua quét QR",
    text: "Trang truy xuất hiển thị timeline, địa điểm, đơn vị xác nhận và trạng thái dữ liệu của cả hành trình.",
  },
] as const;

export function CoreFlowSection() {
  return (
    <section id="journey" className="border-t border-white/5 bg-[#080c17]/60 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-semibold text-cyan-300">
            <Route className="size-3.5" />
            Một lô hàng · Một hành trình
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Giống tracking đơn hàng, nhưng cho nguồn gốc sản phẩm.</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            Mỗi chặng để lại một dấu vết có thể kiểm tra thay vì chỉ có một tem QR trỏ tới thông tin tĩnh.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-slate-900/55 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                    <Icon className="size-4.5" />
                  </div>
                  <span className="font-mono text-xs text-slate-600">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-base font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{step.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
