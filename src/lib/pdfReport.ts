import { jsPDF } from "jspdf";

export interface ReportInput {
  type: "image" | "video" | "fakenews" | "emotion" | "webcam";
  title?: string | null;
  createdAt?: string;
  verdict?: string | null;
  confidence?: number | null;
  mediaUrl?: string | null;
  inputPreview?: string | null;
  result: any;
}

const TYPE_LABEL: Record<string, string> = {
  image: "Image Deepfake Analysis",
  video: "Video Deepfake Analysis",
  fakenews: "Fake News Verification",
  emotion: "Facial Emotion Analysis",
  webcam: "Webcam Live Detection",
};

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateAnalysisPdf(input: ReportInput): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const text = (s: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    const { size = 11, bold = false, color = [30, 30, 35], gap = 4 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(s, pageW - margin * 2);
    ensureSpace(lines.length * size * 1.2 + gap);
    doc.text(lines, margin, y);
    y += lines.length * size * 1.2 + gap;
  };

  const divider = () => {
    ensureSpace(14);
    doc.setDrawColor(220);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  };

  // Header brand bar
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageW, 8, "F");
  y = margin;
  text("DeepGuard AI", { size: 18, bold: true, color: [20, 20, 30], gap: 2 });
  text(TYPE_LABEL[input.type] ?? "Analysis Report", { size: 12, color: [110, 110, 120], gap: 10 });

  // Meta
  const meta: string[] = [];
  if (input.title) meta.push(`Title: ${input.title}`);
  meta.push(`Generated: ${new Date().toLocaleString()}`);
  if (input.createdAt) meta.push(`Analyzed: ${new Date(input.createdAt).toLocaleString()}`);
  meta.forEach((m) => text(m, { size: 10, color: [100, 100, 110], gap: 2 }));
  y += 6;
  divider();

  // Verdict block
  if (input.verdict || input.confidence != null) {
    const v = (input.verdict ?? "uncertain").toLowerCase();
    const colors: Record<string, [number, number, number]> = {
      real: [34, 160, 90],
      fake: [220, 60, 70],
      uncertain: [200, 140, 30],
    };
    const col = colors[v] ?? [99, 102, 241];
    ensureSpace(70);
    doc.setFillColor(...col);
    doc.roundedRect(margin, y, pageW - margin * 2, 60, 8, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(v.toUpperCase(), margin + 20, y + 28);
    if (input.confidence != null) {
      doc.setFontSize(28);
      const confTxt = `${Math.round(Number(input.confidence))}%`;
      const w = doc.getTextWidth(confTxt);
      doc.text(confTxt, pageW - margin - 20 - w, y + 32);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const sub = "confidence";
      const sw = doc.getTextWidth(sub);
      doc.text(sub, pageW - margin - 20 - sw, y + 46);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(input.type === "fakenews" ? "Content credibility verdict" : "Authenticity verdict", margin + 20, y + 46);
    y += 76;
  }

  const r = input.result ?? {};

  if (r.summary) {
    text("Summary", { size: 13, bold: true, gap: 6 });
    text(String(r.summary), { size: 11, gap: 10 });
  }

  // Media thumbnail
  if (input.mediaUrl && input.type !== "fakenews") {
    const dataUrl = await urlToDataUrl(input.mediaUrl);
    if (dataUrl && dataUrl.startsWith("data:image")) {
      try {
        const img = new Image();
        img.src = dataUrl;
        await new Promise((res) => { img.onload = res; img.onerror = res; });
        const maxW = pageW - margin * 2;
        const maxH = 220;
        const ratio = img.width && img.height ? img.width / img.height : 1.6;
        let w = maxW, h = w / ratio;
        if (h > maxH) { h = maxH; w = h * ratio; }
        ensureSpace(h + 12);
        doc.addImage(dataUrl, "JPEG", margin, y, w, h, undefined, "FAST");
        y += h + 12;
      } catch { /* ignore */ }
    }
  }

  // Type-specific sections
  if (input.type === "image" || input.type === "webcam") {
    if (r.ai_generated_likelihood != null) text(`AI-generated likelihood: ${Math.round(r.ai_generated_likelihood)}%`, { size: 11, bold: true, gap: 6 });
    if (r.face_present != null) text(`Face detected: ${r.face_present ? "Yes" : "No"}`, { size: 11, gap: 8 });
    if (Array.isArray(r.artifacts) && r.artifacts.length) {
      text("Detected artifacts", { size: 13, bold: true, gap: 6 });
      r.artifacts.forEach((a: string) => text(`• ${a}`, { size: 11, gap: 2 }));
      y += 6;
    }
    if (Array.isArray(r.regions) && r.regions.length) {
      text(`Suspicious regions flagged: ${r.regions.length}`, { size: 11, color: [110, 110, 120], gap: 8 });
    }
  }

  if (input.type === "video") {
    if (Array.isArray(r.frame_results) && r.frame_results.length) {
      text("Frame-by-frame analysis", { size: 13, bold: true, gap: 6 });
      r.frame_results.forEach((f: any) => {
        text(`Frame #${f.index} — ${f.verdict} (${Math.round(f.confidence)}%)`, { size: 11, bold: true, gap: 2 });
        if (f.reason) text(f.reason, { size: 10, color: [100, 100, 110], gap: 6 });
      });
    }
    if (Array.isArray(r.artifacts) && r.artifacts.length) {
      y += 4;
      text("Aggregate artifacts", { size: 13, bold: true, gap: 6 });
      r.artifacts.forEach((a: string) => text(`• ${a}`, { size: 11, gap: 2 }));
    }
  }

  if (input.type === "fakenews") {
    if (input.inputPreview) {
      text("Analyzed text (excerpt)", { size: 13, bold: true, gap: 6 });
      text(input.inputPreview, { size: 10, color: [80, 80, 90], gap: 10 });
    }
    if (Array.isArray(r.misleading_phrases) && r.misleading_phrases.length) {
      text("Misleading phrases", { size: 13, bold: true, gap: 6 });
      r.misleading_phrases.forEach((p: string) => text(`• ${p}`, { size: 11, gap: 2 }));
      y += 6;
    }
    if (Array.isArray(r.red_flags) && r.red_flags.length) {
      text("Red flags", { size: 13, bold: true, color: [200, 60, 70], gap: 6 });
      r.red_flags.forEach((p: string) => text(`• ${p}`, { size: 11, gap: 2 }));
      y += 6;
    }
    if (Array.isArray(r.supporting_signals) && r.supporting_signals.length) {
      text("Supporting signals", { size: 13, bold: true, color: [34, 160, 90], gap: 6 });
      r.supporting_signals.forEach((p: string) => text(`• ${p}`, { size: 11, gap: 2 }));
    }
  }

  if (input.type === "emotion") {
    if (r.dominant) text(`Dominant emotion: ${String(r.dominant).replace("_", " ")}`, { size: 12, bold: true, gap: 6 });
    if (r.scores && typeof r.scores === "object") {
      text("Per-emotion scores", { size: 13, bold: true, gap: 6 });
      Object.entries(r.scores)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .forEach(([k, v]) => text(`${k}: ${Math.round(Number(v))}%`, { size: 11, gap: 2 }));
      y += 6;
    }
    if (r.notes) text(String(r.notes), { size: 11, color: [100, 100, 110], gap: 4 });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`DeepGuard AI · Page ${i} of ${pages}`, margin, pageH - 20);
    doc.text("Generated by AI — review results before relying on them.", pageW - margin, pageH - 20, { align: "right" });
  }

  const slug = (input.title || input.type).toString().replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
  doc.save(`deepguard-${input.type}-${slug}.pdf`);
}