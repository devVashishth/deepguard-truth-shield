import { useState } from "react";
import { Video, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Dropzone } from "@/components/Dropzone";
import { VerdictCard } from "@/components/VerdictCard";
import { Button } from "@/components/ui/button";
import { extractVideoFrames, runAnalysis, uploadMedia } from "@/lib/analyze";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function VideoDetect() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [frames, setFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string>("");
  const [result, setResult] = useState<any | null>(null);

  const onFile = async (f: File) => {
    setFile(f);
    setResult(null);
    setFrames([]);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const analyze = async () => {
    if (!file || !user) return;
    setLoading(true);
    try {
      setStep("Extracting frames…");
      const fr = await extractVideoFrames(file, 6);
      setFrames(fr);
      setStep("Analyzing frames…");
      const { result } = await runAnalysis({ type: "video", frames: fr });
      setResult(result);
      setStep("Saving…");
      const { signedUrl } = await uploadMedia(user.id, file);
      await supabase.from("analyses").insert({
        user_id: user.id,
        type: "video",
        verdict: result.verdict,
        confidence: result.confidence,
        title: file.name,
        media_url: signedUrl,
        result,
      });
    } catch (e: any) {
      toast.error(e.message ?? "Analysis failed");
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  return (
    <div className="container py-8">
      <PageHeader
        icon={Video}
        title="Video Deepfake Detection"
        description="Upload a short clip. We extract sample frames, score each, and aggregate to a single verdict."
      />

      {!file && <Dropzone accept="video/*" onFile={onFile} hint="MP4, MOV, WebM — keep it short for fastest results" />}

      {file && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {previewUrl && (
              <video src={previewUrl} controls className="rounded-xl border border-border w-full max-h-[420px] bg-black" />
            )}
            {frames.length > 0 && (
              <div className="grid grid-cols-6 gap-1">
                {frames.map((f, i) => (
                  <img key={i} src={f} alt={`frame ${i}`} className="rounded border border-border" />
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={analyze} disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? step || "Analyzing..." : "Run analysis"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setPreviewUrl("");
                  setFrames([]);
                }}
                disabled={loading}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {result && (
              <>
                <VerdictCard verdict={result.verdict} confidence={result.confidence} summary={result.summary} />
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Frame-by-frame</div>
                  <div className="space-y-2">
                    {(result.frame_results ?? []).map((fr: any) => (
                      <div key={fr.index} className="flex items-center gap-3 text-sm">
                        <div className="font-mono text-xs w-10 text-muted-foreground">#{fr.index}</div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            fr.verdict === "fake"
                              ? "bg-destructive/15 text-destructive"
                              : fr.verdict === "real"
                              ? "bg-success/15 text-success"
                              : "bg-warning/15 text-warning"
                          }`}
                        >
                          {fr.verdict} · {Math.round(fr.confidence)}%
                        </span>
                        <div className="text-muted-foreground truncate">{fr.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Detected artifacts</div>
                  <ul className="space-y-1.5 text-sm">
                    {(result.artifacts ?? []).map((a: string, i: number) => (
                      <li key={i} className="flex gap-2"><span className="text-primary">›</span>{a}</li>
                    ))}
                  </ul>
                </div>
                <DownloadReportButton
                  input={{
                    type: "video",
                    title: file?.name,
                    verdict: result.verdict,
                    confidence: result.confidence,
                    mediaUrl: frames[0] ?? null,
                    result,
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}