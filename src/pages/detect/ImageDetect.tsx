import { useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Dropzone } from "@/components/Dropzone";
import { VerdictCard } from "@/components/VerdictCard";
import { HeatmapOverlay } from "@/components/HeatmapOverlay";
import { Button } from "@/components/ui/button";
import { fileToDataUrl, runAnalysis, uploadMedia } from "@/lib/analyze";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ImageDetect() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const onFile = async (f: File) => {
    setFile(f);
    setResult(null);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const analyze = async () => {
    if (!file || !user) return;
    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const { result } = await runAnalysis({ type: "image", imageUrl: dataUrl });
      setResult(result);

      // upload + persist
      const { signedUrl } = await uploadMedia(user.id, file);
      await supabase.from("analyses").insert({
        user_id: user.id,
        type: "image",
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
    }
  };

  return (
    <div className="container py-8">
      <PageHeader
        icon={ImageIcon}
        title="Image Deepfake Detection"
        description="Drop an image to analyze it for face-swap, GAN/diffusion artifacts and synthetic-media cues. You'll get an explainable heatmap of suspicious regions."
      />

      {!file && <Dropzone accept="image/*" onFile={onFile} hint="JPG, PNG, WebP — up to 10MB" />}

      {file && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {previewUrl &&
              (result?.regions?.length ? (
                <HeatmapOverlay src={previewUrl} regions={result.regions} />
              ) : (
                <img src={previewUrl} alt="preview" className="rounded-xl border border-border w-full" />
              ))}
            <div className="flex gap-2">
              <Button onClick={analyze} disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? "Analyzing..." : "Run analysis"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setPreviewUrl("");
                }}
                disabled={loading}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {!result && !loading && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground bg-card">
                Click <span className="font-medium text-foreground">Run analysis</span> to inspect this image.
              </div>
            )}
            {loading && <ResultSkeleton />}
            {result && (
              <>
                <VerdictCard verdict={result.verdict} confidence={result.confidence} summary={result.summary} />
                <DetailGrid result={result} />
                <DownloadReportButton
                  input={{
                    type: "image",
                    title: file?.name,
                    verdict: result.verdict,
                    confidence: result.confidence,
                    mediaUrl: previewUrl,
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

function ResultSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-32 rounded-2xl bg-muted animate-pulse" />
      <div className="h-24 rounded-2xl bg-muted animate-pulse" />
    </div>
  );
}

function DetailGrid({ result }: { result: any }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <DetailCard label="AI-generated likelihood" value={`${Math.round(result.ai_generated_likelihood ?? 0)}%`} />
      <DetailCard label="Face present" value={result.face_present ? "Yes" : "No"} />
      <div className="sm:col-span-2 rounded-2xl border border-border bg-card p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Detected artifacts</div>
        {(result.artifacts ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground">No notable artifacts detected.</div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {result.artifacts.map((a: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">›</span>
                {a}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold font-mono mt-1">{value}</div>
    </div>
  );
}