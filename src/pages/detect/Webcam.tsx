import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Play, Square } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { captureWebcamFrame, runAnalysis } from "@/lib/analyze";
import { toast } from "sonner";

export default function Webcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [running, setRunning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [auto, setAuto] = useState(false);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
    } catch (e: any) {
      toast.error(e.message ?? "Could not access camera");
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRunning(false);
    setAuto(false);
  };

  const analyzeOnce = async () => {
    if (!videoRef.current || analyzing) return;
    setAnalyzing(true);
    try {
      const dataUrl = await captureWebcamFrame(videoRef.current);
      const { result } = await runAnalysis({ type: "webcam", imageUrl: dataUrl });
      setResult(result);
    } catch (e: any) {
      toast.error(e.message ?? "Analysis failed");
      setAuto(false);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!auto || !running) return;
    const id = setInterval(() => {
      if (!analyzing) analyzeOnce();
    }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, running, analyzing]);

  useEffect(() => () => stop(), []);

  const verdict = result?.verdict;
  const aiLikelihood = result?.ai_generated_likelihood ?? 0;

  return (
    <div className="container py-8">
      <PageHeader
        icon={Camera}
        title="Real-time Webcam Detection"
        description="Open your camera and detect whether the face in frame is a real human or AI-generated / manipulated."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {!running && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Camera off
              </div>
            )}
            {running && verdict && (
              <div
                className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur ${
                  verdict === "fake"
                    ? "bg-destructive/85 text-destructive-foreground"
                    : verdict === "real"
                    ? "bg-success/85 text-success-foreground"
                    : "bg-warning/85 text-warning-foreground"
                }`}
              >
                {verdict === "fake" ? "AI Generated" : verdict === "real" ? "Real Human" : "Uncertain"}
              </div>
            )}
            {analyzing && (
              <div className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-background/85 backdrop-blur">
                <Loader2 className="h-3 w-3 animate-spin" /> analyzing…
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!running ? (
              <Button onClick={start}><Play className="h-4 w-4 mr-2" /> Start camera</Button>
            ) : (
              <>
                <Button variant="outline" onClick={stop}><Square className="h-4 w-4 mr-2" /> Stop</Button>
                <Button onClick={analyzeOnce} disabled={analyzing}>
                  {analyzing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Analyze frame
                </Button>
                <Button variant={auto ? "default" : "secondary"} onClick={() => setAuto((a) => !a)}>
                  {auto ? "Auto-detect: ON" : "Auto-detect: OFF"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {result ? (
            <>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">AI-generated likelihood</div>
                <div className="mt-2 flex items-end gap-3">
                  <div className="font-mono text-5xl font-semibold text-gradient">{Math.round(aiLikelihood)}%</div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-primary" style={{ width: `${Math.min(100, aiLikelihood)}%` }} />
                </div>
              </div>
              {result.summary && (
                <div className="rounded-2xl border border-border bg-card p-5 text-sm">{result.summary}</div>
              )}
              {result.artifacts?.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Cues observed</div>
                  <ul className="space-y-1.5 text-sm">
                    {result.artifacts.map((a: string, i: number) => (
                      <li key={i} className="flex gap-2"><span className="text-primary">›</span>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground bg-card">
              Start the camera and click <span className="font-medium text-foreground">Analyze frame</span>, or enable auto-detect for continuous monitoring.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}