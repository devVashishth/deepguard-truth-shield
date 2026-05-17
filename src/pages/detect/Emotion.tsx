import { useState } from "react";
import { Smile, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import { fileToDataUrl, runAnalysis, uploadMedia } from "@/lib/analyze";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emojis: Record<string, string> = {
  happy: "😄",
  sad: "😢",
  angry: "😠",
  neutral: "😐",
  surprised: "😲",
  fearful: "😨",
  disgusted: "🤢",
  no_face: "🚫",
};

export default function Emotion() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const onFile = (f: File) => {
    setFile(f);
    setResult(null);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const analyze = async () => {
    if (!file || !user) return;
    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const { result } = await runAnalysis({ type: "emotion", imageUrl: dataUrl });
      setResult(result);
      const { signedUrl } = await uploadMedia(user.id, file);
      await supabase.from("analyses").insert({
        user_id: user.id,
        type: "emotion",
        verdict: null,
        confidence: result.confidence,
        title: `${result.dominant} · ${file.name}`,
        media_url: signedUrl,
        result,
      });
    } catch (e: any) {
      toast.error(e.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const scores: [string, number][] = result
    ? Object.entries(result.scores ?? {}).sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, number][]
    : [];

  return (
    <div className="container py-8">
      <PageHeader
        icon={Smile}
        title="Facial Emotion & Mood Analysis"
        description="Detect the dominant facial emotion and per-class confidence scores from any photo containing a face."
      />

      {!file && <Dropzone accept="image/*" onFile={onFile} hint="A clear photo of a face works best" />}

      {file && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {previewUrl && <img src={previewUrl} alt="preview" className="rounded-xl border border-border w-full" />}
            <div className="flex gap-2">
              <Button onClick={analyze} disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? "Analyzing…" : "Detect mood"}
              </Button>
              <Button variant="outline" onClick={() => { setFile(null); setResult(null); setPreviewUrl(""); }}>
                Reset
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {result && (
              <>
                <div className="rounded-2xl bg-gradient-primary p-6 text-primary-foreground shadow-elegant flex items-center gap-5 animate-scale-in">
                  <div className="text-6xl leading-none">{emojis[result.dominant] ?? "🙂"}</div>
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wider opacity-80">Dominant emotion</div>
                    <div className="text-3xl font-semibold capitalize">{result.dominant.replace("_", " ")}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-3xl font-semibold">{Math.round(result.confidence)}%</div>
                    <div className="text-xs opacity-80">confidence</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Per-emotion scores</div>
                  {scores.map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize flex items-center gap-2">{emojis[k]} {k}</span>
                        <span className="font-mono text-xs text-muted-foreground">{Math.round(v)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-primary" style={{ width: `${Math.min(100, v)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {result.notes && (
                  <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                    {result.notes}
                  </div>
                )}
                <DownloadReportButton
                  input={{
                    type: "emotion",
                    title: file ? `${result.dominant} · ${file.name}` : result.dominant,
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