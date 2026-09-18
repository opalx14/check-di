"use client";

import { ArrowLeft, Loader2, PackagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TourGuide, type TourStep } from "@/components/TourGuide";
import {
  DEFAULT_PRODUCT,
  PRODUCT_CATALOG,
  productVisualForName,
} from "@/lib/product-visuals";

const NEW_BATCH_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="new-batch-visual"]',
    title: "Visual Preview tự động",
    description: "Hình ảnh đại diện chất lượng cao được đồng bộ tự động theo loại nông sản bạn chọn (dưa hấu Hắc Mỹ Nhân, sầu riêng Ri6, xoài cát, thanh long...).",
  },
  {
    target: '[data-tour="new-batch-catalog"]',
    title: "Catalog hơn 20 loại nông sản",
    description: "Nhấn chọn nhanh từ danh mục trái cây và nông thủy sản Việt Nam phong phú để thiết lập cấu hình lô hàng.",
  },
  {
    target: '[data-tour="new-batch-origin"]',
    title: "Xuất xứ & Vùng canh tác",
    description: "Nhập địa danh nơi sản xuất hoặc hợp tác xã (ví dụ Châu Thành, Long An; Krông Pắc, Đắk Lắk). Thông tin này sẽ xuất hiện trên mã QR công khai.",
  },
  {
    target: '[data-tour="new-batch-submit"]',
    title: "Khởi tạo và thêm hành trình",
    description: "Nhấn 'Tạo và thêm hành trình' để tạo lô hàng. Tiếp theo, hệ thống sẽ đưa bạn sang trang chụp ảnh sản phẩm nguồn và quản lý chặng.",
  },
];

function messageFor(error: string) {
  if (error === "public_id_exists") return "Mã lô này đã tồn tại.";
  if (error === "invalid_public_id") return "Mã lô chưa hợp lệ.";
  if (error === "unauthorized") return "Bạn cần đăng nhập nhà cung cấp.";
  if (error === "organization_wallet_required") return "Hãy thiết lập ví ký cho tổ chức trước khi tạo lô.";
  return "Không thể tạo lô. Vui lòng thử lại.";
}

export default function NewBatchPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productName, setProductName] = useState(DEFAULT_PRODUCT.name);
  const visual = productVisualForName(productName);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productName: form.get("productName"),
        origin: form.get("origin"),
        publicId: form.get("publicId") || undefined,
      }),
    });

    const payload = (await response.json()) as {
      ok: boolean;
      error?: string;
      links?: { manage: string };
    };

    if (!response.ok || !payload.links?.manage) {
      setError(messageFor(payload.error ?? "unknown_error"));
      setSubmitting(false);
      return;
    }

    router.push(`${payload.links.manage}?tour=1`);
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-20" />
      <div className="relative mx-auto max-w-5xl">
        <a href="/supplier" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="size-4" />
          Kho sản phẩm
        </a>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="relative min-h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c]" data-tour="new-batch-visual">
            <img src={visual.imageUrl} alt={productName || "Sản phẩm"} className="absolute inset-0 size-full object-cover" />
            <div className={`absolute inset-0 bg-gradient-to-t ${visual.accent} via-black/10 to-black/10`} />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                {visual.label}
              </span>
              <h2 className="font-display mt-3 text-3xl font-extrabold text-white">{productName || "Tên sản phẩm"}</h2>
              <p className="mt-1 text-sm text-slate-300">Ảnh đại diện được chọn tự động theo loại sản phẩm.</p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 shadow-2xl shadow-black/25 sm:p-7">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
              <PackagePlus className="size-5" />
            </div>
            <h1 className="font-display mt-4 text-2xl font-extrabold text-white sm:text-3xl">Tạo sản phẩm</h1>
            <p className="mt-2 text-sm text-slate-400">Mỗi sản phẩm tương ứng một lô có QR và hành trình riêng.</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="productName" className="text-xs font-semibold text-slate-300">Chọn sản phẩm</label>
                  <span className="text-[10px] text-slate-500">26 loại trái cây + nông/hải sản</span>
                </div>
                <div className="mt-2 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3" data-tour="new-batch-catalog">
                  {PRODUCT_CATALOG.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setProductName(item.name)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                        productName === item.name
                          ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
                          : "border-white/8 bg-white/[0.025] text-slate-300 hover:border-white/15"
                      }`}
                    >
                      <span className="text-base">{item.emoji}</span>
                      <span className="line-clamp-1">{item.name}</span>
                    </button>
                  ))}
                </div>
                <input
                  id="productName"
                  name="productName"
                  required
                  value={productName}
                  onChange={(event) => setProductName(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
                />
              </div>

              <Field label="Nguồn gốc" name="origin" placeholder="Châu Thành, Long An" required dataTour="new-batch-origin" />
              <Field label="Mã lô công khai" name="publicId" placeholder="WM-260917-01 · để trống sẽ tự sinh" mono />

              {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                data-tour="new-batch-submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
                {submitting ? "Đang tạo..." : "Tạo và thêm hành trình"}
              </button>
            </form>
          </section>
        </div>
      </div>

      <TourGuide
        tourKey="new_batch"
        flowTitle="Hướng dẫn tạo lô"
        role="supplier"
        steps={NEW_BATCH_TOUR_STEPS}
      />
    </main>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  mono,
  dataTour,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  mono?: boolean;
  dataTour?: string;
}) {
  return (
    <div data-tour={dataTour}>
      <label htmlFor={name} className="text-xs font-semibold text-slate-300">{label}</label>
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className={`mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50 ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
