import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

export function VerdictCard({
  verdict,
  confidence,
  summary,
}: {
  verdict: "real" | "fake" | "uncertain";
  confidence: number;
  summary?: string;
}) {
  const map = {
    real: {
      bg: "bg-gradient-success",
      icon: CheckCircle2,
      label: "Authentic",
      sub: "Likely real / unmanipulated",
    },
    fake: {
      bg: "bg-gradient-danger",
      icon: AlertTriangle,
      label: "Manipulated",
      sub: "Likely deepfake / synthetic",
    },
    uncertain: {
      bg: "bg-gradient-primary",
      icon: HelpCircle,
      label: "Uncertain",
      sub: "Mixed signals — review details",
    },
  } as const;
  const cfg = map[verdict];
  const Icon = cfg.icon;
  return (
    <div className={cn("rounded-2xl p-6 text-primary-foreground shadow-elegant animate-scale-in", cfg.bg)}>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="text-2xl font-semibold tracking-tight">{cfg.label}</div>
          <div className="text-sm opacity-90">{cfg.sub}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-semibold">{Math.round(confidence)}%</div>
          <div className="text-xs opacity-80">confidence</div>
        </div>
      </div>
      {summary && <p className="mt-4 text-sm opacity-95 leading-relaxed">{summary}</p>}
    </div>
  );
}