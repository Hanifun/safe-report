import { StatusLaporan } from "@/types";
import { CheckCircle2, Clock, Eye, ShieldCheck } from "lucide-react";

const TIMELINE = [
  {
    status: "baru" as StatusLaporan,
    icon: <Clock className="w-5 h-5" />,
    label: "Laporan Diterima",
    desc: "Laporan sudah masuk ke sistem dan menunggu ditinjau oleh Admin.",
    color: "rose",
  },
  {
    status: "diverifikasi" as StatusLaporan,
    icon: <Eye className="w-5 h-5" />,
    label: "Diverifikasi",
    desc: "Admin sudah membaca dan memverifikasi laporan ini.",
    color: "amber",
  },
  {
    status: "diproses" as StatusLaporan,
    icon: <ShieldCheck className="w-5 h-5" />,
    label: "Sedang Diproses",
    desc: "Tindakan dan mediasi sedang berlangsung.",
    color: "blue",
  },
  {
    status: "selesai" as StatusLaporan,
    icon: <CheckCircle2 className="w-5 h-5" />,
    label: "Selesai",
    desc: "Kasus sudah ditangani sesuai prosedur sekolah.",
    color: "emerald",
  },
];

const ORDER: StatusLaporan[] = ["baru", "diverifikasi", "diproses", "selesai"];

const colorMap: Record<string, { ring: string; bg: string; text: string; line: string }> = {
  rose:    { ring: "ring-rose-400",    bg: "bg-rose-100",    text: "text-rose-600",    line: "bg-rose-200" },
  amber:   { ring: "ring-amber-400",   bg: "bg-amber-100",   text: "text-amber-600",   line: "bg-amber-200" },
  blue:    { ring: "ring-blue-400",    bg: "bg-blue-100",    text: "text-blue-600",    line: "bg-blue-200" },
  emerald: { ring: "ring-emerald-400", bg: "bg-emerald-100", text: "text-emerald-600", line: "bg-emerald-200" },
};

export default function TimelineStatus({ status }: { status: StatusLaporan }) {
  const currentIdx = ORDER.indexOf(status);

  return (
    <div className="relative">
      {TIMELINE.map((step, idx) => {
        const isDone = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const isLast = idx === TIMELINE.length - 1;
        const c = isDone ? colorMap[step.color] : colorMap.rose;

        return (
          <div key={step.status} className="flex gap-4">
            {/* Left: dot + line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  isDone
                    ? `${c.bg} ${c.text} ${isCurrent ? `ring-2 ${c.ring} ring-offset-1` : ""}`
                    : "bg-stone-100 text-stone-300"
                }`}
              >
                {step.icon}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 my-1 flex-1 min-h-[24px] ${
                    idx < currentIdx ? c.line : "bg-stone-100"
                  }`}
                />
              )}
            </div>

            {/* Right: text */}
            <div className={`pb-5 ${isLast ? "" : ""}`}>
              <p
                className={`font-bold text-sm ${
                  isCurrent ? c.text : isDone ? "text-stone-600" : "text-stone-300"
                }`}
              >
                {step.label}
                {isCurrent && (
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700 font-bold uppercase tracking-wide">
                    Saat ini
                  </span>
                )}
              </p>
              <p
                className={`text-xs leading-relaxed ${
                  isDone ? "text-stone-500" : "text-stone-300"
                }`}
              >
                {step.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
