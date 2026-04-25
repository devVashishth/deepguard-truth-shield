import { useEffect, useRef, useState } from "react";

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  severity: number;
}

export function HeatmapOverlay({ src, regions }: { src: string; regions: Region[] }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const onResize = () => {
      if (imgRef.current) {
        setSize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [src]);

  return (
    <div className="relative inline-block w-full max-w-2xl rounded-xl overflow-hidden shadow-soft border border-border">
      <img
        ref={imgRef}
        src={src}
        alt="Analyzed"
        onLoad={(e) => setSize({ w: e.currentTarget.clientWidth, h: e.currentTarget.clientHeight })}
        className="block w-full h-auto"
      />
      <div className="absolute inset-0 pointer-events-none">
        {regions.map((r, i) => {
          const sev = Math.max(0, Math.min(1, r.severity));
          const hue = Math.round((1 - sev) * 60); // 0=red, 60=yellow
          return (
            <div
              key={i}
              className="absolute rounded-md border-2 backdrop-blur-[1px] animate-fade-in"
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 100}%`,
                background: `hsl(${hue} 90% 55% / ${0.18 + sev * 0.25})`,
                borderColor: `hsl(${hue} 90% 55% / 0.9)`,
                boxShadow: `0 0 24px hsl(${hue} 90% 55% / 0.5)`,
              }}
            >
              <span className="absolute -top-6 left-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-foreground text-background whitespace-nowrap">
                {r.label} · {Math.round(sev * 100)}
              </span>
            </div>
          );
        })}
      </div>
      {size.w > 0 && regions.length === 0 && (
        <div className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-foreground/80 text-background">
          No suspicious regions detected
        </div>
      )}
    </div>
  );
}