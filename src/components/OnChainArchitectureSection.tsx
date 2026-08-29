import { Database, FileLock2, Hash, Link2, ShieldCheck } from "lucide-react";

const CHAIN = [
  { label: "Thu hoạch", hash: "a81c...92fa" },
  { label: "Đóng gói", hash: "bf21...4ac8" },
  { label: "Kiểm định", hash: "c902...e113" },
  { label: "Vận chuyển", hash: "d710...33bd" },
  { label: "Điểm bán", hash: "e445...81cc" },
] as const;

export function OnChainArchitectureSection() {
  return (
    <section id="technology" className="border-t border-white/5 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-1 text-xs font-semibold text-emerald-300">
            <Hash className="size-3.5" />
            Hash dùng để kiểm tra dữ liệu đã xác nhận
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Blockchain không thay thế dữ liệu thật. Nó giữ dấu vết của dữ liệu đã được xác nhận.</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            Chứng từ và dữ liệu chi tiết vẫn ở off-chain. Mỗi chặng tạo một payload chuẩn hóa và hash; Solana dự kiến dùng làm lớp công khai để kiểm tra hash, đơn vị xác nhận, thời điểm và trạng thái.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-[#0a0f1b] p-6">
            <div className="flex items-center gap-2 text-cyan-300">
              <Link2 className="size-4" />
              <p className="text-xs font-bold">CHUỖI HASH MINH HỌA</p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-5">
              {CHAIN.map((item, index) => (
                <div key={item.label} className="relative rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center">
                  <p className="text-xs font-semibold text-white">{item.label}</p>
                  <p className="mt-2 font-mono text-[11px] text-cyan-300">{item.hash}</p>
                  {index < CHAIN.length - 1 && <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-600 sm:block">→</span>}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-200/90">
              Các hash trên chỉ là dữ liệu mẫu. Program Solana thật chưa được deploy ở giai đoạn này.
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5">
              <div className="flex items-center gap-2 text-emerald-300">
                <Database className="size-4" />
                <h3 className="text-sm font-bold text-white">Off-chain giữ dữ liệu chi tiết</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">Chứng từ, hình ảnh, địa chỉ chi tiết, hồ sơ doanh nghiệp và dữ liệu cần cập nhật/xóa được lưu ngoài blockchain.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5">
              <div className="flex items-center gap-2 text-cyan-300">
                <ShieldCheck className="size-4" />
                <h3 className="text-sm font-bold text-white">On-chain chỉ giữ proof tối thiểu</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">Hash của lô/chặng, đơn vị xác nhận, phiên bản, thời điểm và trạng thái là những dữ liệu dự kiến cần công khai để đối soát.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-purple-300">
                <FileLock2 className="size-4" />
                <h3 className="text-sm font-bold text-white">Sửa dữ liệu thì phải tạo phiên bản mới</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">Nếu nội dung đã xác nhận thay đổi, hash cũ không còn khớp. Hệ thống phải ghi nhận phiên bản mới thay vì âm thầm ghi đè lịch sử.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
