import { CheckCircle2, ShieldCheck } from "lucide-react";

const RULES = [
  "Không lưu chứng từ gốc lên blockchain",
  "Không token, không đầu tư, không thanh toán crypto",
  "AI chỉ cảnh báo sai lệch, không tự kết luận gian lận",
  "Mỗi bên chỉ xác nhận dữ liệu thuộc chặng mình chịu trách nhiệm",
] as const;

export function ComplianceBanner() {
  return (
    <section id="safety" className="border-t border-white/5 bg-[#060810] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-[#080d1a] p-6 sm:p-8">
          <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <ShieldCheck className="size-3.5" />
                Ranh giới an toàn
              </div>
              <h3 className="mt-3 text-2xl font-black text-white">Minh bạch hơn, không biến sản phẩm thành crypto.</h3>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">Check-Di dùng blockchain như lớp kiểm tra tính toàn vẹn, không phải hệ thống giao dịch tài sản.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {RULES.map((rule) => (
                <div key={rule} className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-slate-950/60 p-3 text-xs text-slate-300">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
