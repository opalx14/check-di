"use client";

import { ArrowRight, Boxes, QrCode } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { productVisualForName } from "@/lib/product-visuals";

const SUPPLIER_IMAGE = productVisualForName("Dưa hấu Hắc Mỹ Nhân").imageUrl;
const CLIENT_IMAGE = productVisualForName("Thanh long ruột đỏ").imageUrl;

export function RolePathsSection() {
  const { dict } = useI18n();

  return (
    <section className="border-t border-white/5 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{dict.rolePaths.eyebrow}</p>
            <h2 className="font-display mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{dict.rolePaths.title}</h2>
          </div>
          <p className="hidden max-w-sm text-right text-xs leading-relaxed text-slate-500 sm:block">{dict.rolePaths.description}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RoleCard
            image={SUPPLIER_IMAGE}
            icon={Boxes}
            eyebrow={dict.rolePaths.supplierEyebrow}
            title={dict.rolePaths.supplierTitle}
            text={dict.rolePaths.supplierText}
            href="/supplier"
            cta={dict.rolePaths.supplierCta}
          />
          <RoleCard
            image={CLIENT_IMAGE}
            icon={QrCode}
            eyebrow={dict.rolePaths.consumerEyebrow}
            title={dict.rolePaths.consumerTitle}
            text={dict.rolePaths.consumerText}
            href="/scan"
            cta={dict.rolePaths.consumerCta}
          />
        </div>
      </div>
    </section>
  );
}

function RoleCard({
  image,
  icon: Icon,
  eyebrow,
  title,
  text,
  href,
  cta,
}: {
  image: string;
  icon: typeof Boxes;
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="group relative min-h-[330px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c]">
      <img src={image} alt="" className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.025]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07101a] via-[#07101a]/70 to-black/15" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <div className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-black/35 text-cyan-200 backdrop-blur">
          <Icon className="size-4" />
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>
        <h3 className="font-display mt-1 text-2xl font-bold tracking-tight text-white">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">{text}</p>
        <a
          href={href}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/15"
        >
          {cta}
          <ArrowRight className="size-3.5" />
        </a>
      </div>
    </article>
  );
}
