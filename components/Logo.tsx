"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  href?: string | null;
  className?: string;
  dark?: boolean;
}

export default function Logo({
  size = "md",
  showTagline = true,
  href = "/",
  className = "",
  dark = false,
}: LogoProps) {
  const iconBoxSizes = {
    sm: "w-9 h-9 rounded-xl",
    md: "w-11 h-11 rounded-2xl",
    lg: "w-12 h-12 rounded-2xl",
  }[size];

  const iconSvgSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-6 h-6",
  }[size];

  const titleSizes = {
    sm: "text-base",
    md: "text-lg sm:text-xl",
    lg: "text-xl sm:text-2xl",
  }[size];

  const taglineSizes = {
    sm: "text-[10px]",
    md: "text-[11px] sm:text-xs",
    lg: "text-xs",
  }[size];

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`${iconBoxSizes} bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 flex items-center justify-center shadow-xs shrink-0 transition-transform group-hover:scale-105`}
      >
        <ShieldCheck className={`${iconSvgSizes} text-stone-950 stroke-[2.2]`} />
      </div>
      <div className="text-left">
        <div
          className={`font-black tracking-tight leading-tight transition-colors ${
            dark
              ? "text-white group-hover:text-amber-300"
              : "text-stone-900 group-hover:text-amber-800"
          } ${titleSizes}`}
        >
          SafeReport
        </div>
        {showTagline && (
          <div
            className={`font-medium leading-tight ${
              dark ? "text-stone-400" : "text-stone-500"
            } ${taglineSizes}`}
          >
            Layanan Pengaduan Bullying Sekolah
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
