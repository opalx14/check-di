import { Building2, Factory, ScanLine, ShoppingBasket, Truck } from "lucide-react";

const GROUPS = [
  {
    icon: Factory,
    title: "Nhà sản xuất / nhà vườn",
    text: "Tạo lô, ghi nhận thu hoạch hoặc sản xuất và gắn hồ sơ ban đầu cho sản phẩm.",
  },
  {
    icon: Building2,
    title: "Đóng gói / kiểm định",
    text: "Bổ sung chứng từ, kết quả kiểm tra và xác nhận dữ liệu thuộc phần mình chịu trách nhiệm.",
  },
  {
    icon: Truck,
    title: "Logistics / kho",
    text: "Cập nhật điểm nhận, điểm giao và trạng thái vận chuyển theo từng chặng của lô.",
  },
  {
    icon: ShoppingBasket,
    title: "Điểm bán / người tiêu dùng",
    text: "Điểm bán xác nhận đã nhận hàng; người mua quét QR để xem lại toàn bộ hành trình.",
  },
] as const;

export function DualTrackSection() {
  return (
    <section id="participants" className="border-t border-white/5 bg-[#080b14]/70 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-3.5 py-1 text-xs font-semibold text-purple-300">
            <ScanLine className="size-3.5" />
            Một mã QR · Nhiều bên cùng chịu trách nhiệm
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Không phải một bên tự kể toàn bộ câu chuyện.</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            Mỗi tổ chức chỉ xác nhận dữ liệu của chặng mình. Check-Di nối các chặng đó thành một hành trình mà người mua có thể kiểm tra.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.title} className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
                <div className="flex size-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
                  <Icon className="size-4.5" />
                </div>
                <h3 className="mt-5 text-base font-bold text-white">{group.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{group.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-cyan-500/15 bg-cyan-950/10 p-5 text-center text-sm text-slate-300">
          Với UniHackFest, <strong className="text-white">Technical Build</strong> chứng minh AI + hash + QR + Solana; <strong className="text-white">Product & Business</strong> chứng minh nhu cầu truy xuất nguồn gốc và mô hình triển khai cho các bên trong chuỗi cung ứng. Cả hai dùng cùng một Check-Di.
        </div>
      </div>
    </section>
  );
}
